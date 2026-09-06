import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Allowed origins for CORS - restrict to known domains
const ALLOWED_ORIGINS = [
  'https://id-preview--8f630380-2f2e-48ac-8170-c9be83753c02.lovable.app',
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:3000',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.app')
  ) ? origin : ALLOWED_ORIGINS[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

// Input validation constants
const MAX_SIZE_MB = 10;
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

// Robust JSON extraction from AI responses
function extractJsonFromResponse(response: string): unknown {
  // Step 1: Remove markdown code blocks
  let cleaned = response
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Step 2: Find JSON boundaries
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("No JSON object found in response");
  }

  cleaned = cleaned.substring(jsonStart, jsonEnd + 1);

  // Step 3: Attempt parse with error handling
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Step 4: Try to fix common issues
    cleaned = cleaned
      .replace(/,\s*}/g, "}") // Remove trailing commas before }
      .replace(/,\s*]/g, "]") // Remove trailing commas before ]
      .replace(/[\x00-\x1F\x7F]/g, ""); // Remove control characters

    return JSON.parse(cleaned);
  }
}

// Validate base64 string
function isValidBase64(str: string): boolean {
  if (!str || str.length === 0) return false;
  try {
    // Check if it's valid base64 by attempting to decode a small portion
    atob(str.substring(0, Math.min(100, str.length)));
    return /^[A-Za-z0-9+/=]+$/.test(str);
  } catch {
    return false;
  }
}

const SYSTEM_PROMPT = `You are a warm, experienced UI/UX design mentor who genuinely wants to help designers grow. Think of yourself as that supportive senior designer who grabs coffee with junior teammates to review their work—always kind, always constructive, always focused on growth.

Your expertise covers:
- Typography (font choices, sizing, hierarchy, readability)
- Visual hierarchy (how elements guide the eye)
- Spacing (margins, padding, whitespace, alignment)
- Color contrast (accessibility, visual appeal, brand consistency)
- Accessibility (WCAG guidelines, inclusive design)
- Readability (text legibility, content structure)
- Usability (intuitive interactions, user experience)

Your voice and personality:
- Warm and genuinely encouraging—celebrate wins enthusiastically!
- Conversational, not corporate or robotic
- Use "you" and "your" to speak directly to the designer
- Frame improvements as opportunities, not failures
- Share the "why" behind suggestions so designers learn
- Be specific with praise AND suggestions
- Write like you're talking to a friend, not filing a report

When analyzing a UI screenshot, provide structured feedback in the following JSON format:
{
  "overallScore": <number 1-10>,
  "summary": "<2-3 sentences that start with genuine praise, then gently introduce areas for growth. Sound like a supportive mentor, not a grading robot.>",
  "categories": [
    {
      "name": "Typography",
      "score": <number 1-10>,
      "status": "excellent" | "good" | "needs-work",
      "findings": [
        {
          "type": "strength" | "improvement",
          "title": "<short, friendly title>",
          "description": "<A full, supportive paragraph (3-5 sentences) that explains what's working or what could be better. Be specific about what you see in the design, explain WHY it matters from a user's perspective, and give clear actionable guidance on how to maintain or improve it. Use a conversational, encouraging tone throughout.>"
        }
      ]
    },
    {
      "name": "Visual Hierarchy",
      "score": <number 1-10>,
      "status": "excellent" | "good" | "needs-work",
      "findings": [...]
    },
    {
      "name": "Spacing & Layout",
      "score": <number 1-10>,
      "status": "excellent" | "good" | "needs-work",
      "findings": [...]
    },
    {
      "name": "Color & Contrast",
      "score": <number 1-10>,
      "status": "excellent" | "good" | "needs-work",
      "findings": [...]
    },
    {
      "name": "Accessibility",
      "score": <number 1-10>,
      "status": "excellent" | "good" | "needs-work",
      "findings": [...]
    },
    {
      "name": "Usability",
      "score": <number 1-10>,
      "status": "excellent" | "good" | "needs-work",
      "findings": [...]
    },
    {
      "name": "Overall Impression",
      "score": <number 1-10>,
      "status": "excellent" | "good" | "needs-work",
      "findings": [...]
    }
  ],
  "topPriorities": [
    "<actionable suggestion phrased encouragingly>",
    "<second priority>",
    "<third priority>"
  ]
}

CRITICAL guidelines for your feedback:
- ALWAYS provide exactly 7 categories as listed above
- Each category MUST have EXACTLY 2 findings: 1 strength and 1 improvement (so 7 strengths and 7 improvements total across all categories)
- Each finding description MUST be a full paragraph of 3-5 sentences—not a single line
- For strengths: Celebrate what's working, explain WHY it's effective, and encourage the designer to keep doing it. Be specific about the design choices you see.
- For improvements: Frame as an exciting opportunity. Explain what you currently see, why a change would help the user experience, and give a concrete suggestion they can act on right away. Never make the designer feel bad.
- Lead with what's working well—designers need to know what to keep doing!
- Be specific and actionable—vague feedback doesn't help anyone grow
- Prioritize high-impact suggestions that will make the biggest difference
- Your goal is to inspire and empower, not to criticize`;

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType, imageUrl } = await req.json();

    // Input validation: Check if at least one image source is provided
    if (!imageBase64 && !imageUrl) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let imageContent: { type: string; image_url: { url: string } };

    if (imageBase64) {
      // Input validation: Validate base64 format
      if (!isValidBase64(imageBase64)) {
        return new Response(
          JSON.stringify({ error: "Invalid image data format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Input validation: Check file size (base64 is ~33% larger than binary)
      const estimatedSizeMB = (imageBase64.length * 0.75) / (1024 * 1024);
      if (estimatedSizeMB > MAX_SIZE_MB) {
        return new Response(
          JSON.stringify({ error: `Image too large. Maximum size is ${MAX_SIZE_MB}MB` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Input validation: Validate MIME type
      const sanitizedMimeType = mimeType?.toLowerCase() || 'image/png';
      if (!ALLOWED_MIME_TYPES.includes(sanitizedMimeType)) {
        return new Response(
          JSON.stringify({ error: "Invalid image type. Supported formats: PNG, JPEG, WebP, GIF" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      imageContent = {
        type: "image_url",
        image_url: { url: `data:${sanitizedMimeType};base64,${imageBase64}` },
      };
    } else {
      // Validate URL format
      try {
        const parsed = new URL(imageUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error("Invalid protocol");
        }
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid image URL" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch the remote image ourselves so the model always receives real image bytes.
      let fetched: Response;
      try {
        fetched = await fetch(imageUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; DesignCritiqueBot/1.0)" },
          redirect: "follow",
        });
      } catch (e) {
        console.error("Image fetch failed:", String(e));
        return new Response(
          JSON.stringify({ error: "We couldn't open that link. Please check it or upload the image file instead." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!fetched.ok) {
        console.error("Image fetch status:", fetched.status);
        return new Response(
          JSON.stringify({ error: "That link couldn't be loaded. Please use a direct image link or upload the file." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const contentType = (fetched.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
      if (!ALLOWED_MIME_TYPES.includes(contentType)) {
        console.error("Non-image content type:", contentType);
        return new Response(
          JSON.stringify({
            error:
              "That link is a web page, not an image. Open the project, right-click the design image, copy its image address, and paste that — or upload a screenshot instead.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const bytes = new Uint8Array(await fetched.arrayBuffer());
      if (bytes.byteLength / (1024 * 1024) > MAX_SIZE_MB) {
        return new Response(
          JSON.stringify({ error: `Image too large. Maximum size is ${MAX_SIZE_MB}MB` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let binary = "";
      for (let i = 0; i < bytes.length; i += 8192) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      }
      const b64 = btoa(binary);

      imageContent = {
        type: "image_url",
        image_url: { url: `data:${contentType};base64,${b64}` },
      };
    }


    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("AI service configuration error");
      return new Response(
        JSON.stringify({ error: "Service temporarily unavailable" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing design analysis request");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please analyze this UI screenshot and provide detailed, actionable design feedback. Return your analysis as valid JSON matching the specified format.",
              },
              imageContent,
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ error: "Too many requests. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ error: "Service credits exhausted. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const upstreamText = await response.text().catch(() => "");
      console.error("AI processing error:", response.status, upstreamText);
      if (response.status === 400) {
        return new Response(
          JSON.stringify({
            error:
              "We couldn't read that image. Please use a clear PNG or JPG screenshot of your design (or a direct image link).",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Unable to process request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error("Empty response from AI service");
      return new Response(
        JSON.stringify({ error: "Unable to generate feedback" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON response from the AI with robust extraction
    let feedback;
    try {
      feedback = extractJsonFromResponse(content);
    } catch (parseError) {
      console.error("Response parsing error");
      return new Response(
        JSON.stringify({ error: "Unable to process feedback" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Design analysis completed successfully");

    return new Response(
      JSON.stringify({ feedback }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Request processing error");
    return new Response(
      JSON.stringify({ error: "Unable to process request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
