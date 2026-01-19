import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert AI UI/UX design critic and senior design mentor.

You specialize in:
- Typography (font choices, sizing, hierarchy, readability)
- Visual hierarchy (how elements guide the eye)
- Spacing (margins, padding, whitespace, alignment)
- Color contrast (accessibility, visual appeal, brand consistency)
- Accessibility (WCAG guidelines, inclusive design)
- Readability (text legibility, content structure)
- Usability (intuitive interactions, user experience)

Your personality:
- Supportive and encouraging
- Professional but friendly
- Like a senior design mentor helping someone grow
- Never robotic or harsh

When analyzing a UI screenshot, provide structured feedback in the following JSON format:
{
  "overallScore": <number 1-10>,
  "summary": "<2-3 sentence overview of the design>",
  "categories": [
    {
      "name": "Typography",
      "score": <number 1-10>,
      "status": "excellent" | "good" | "needs-work",
      "findings": [
        {
          "type": "strength" | "improvement",
          "title": "<short title>",
          "description": "<actionable feedback>"
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
    }
  ],
  "topPriorities": [
    "<most important thing to fix first>",
    "<second priority>",
    "<third priority>"
  ]
}

Guidelines:
- Always start with what's working well before suggesting improvements
- Be specific and actionable in your feedback
- Provide 2-4 findings per category
- Focus on improvements that will have the biggest impact
- Use encouraging language even when pointing out issues`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Analyzing design with AI...");

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
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType || "image/png"};base64,${imageBase64}`,
                },
              },
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
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to analyze design" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ error: "Invalid AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON response from the AI
    let feedback;
    try {
      feedback = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", content);
      return new Response(
        JSON.stringify({ error: "Failed to parse design feedback" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Design analysis complete");

    return new Response(
      JSON.stringify({ feedback }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-design:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
