import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  "https://id-preview--8f630380-2f2e-48ac-8170-c9be83753c02.lovable.app",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.some((a) => origin === a || origin.endsWith(".lovable.app"))
      ? origin
      : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

const MAX_SIZE_MB = 10;
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];

function extractJsonFromResponse(response: string): unknown {
  let cleaned = response.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in response");
  cleaned = cleaned.substring(start, end + 1);
  try {
    return JSON.parse(cleaned);
  } catch {
    cleaned = cleaned
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[\x00-\x1F\x7F]/g, "");
    return JSON.parse(cleaned);
  }
}

function isValidBase64(str: string): boolean {
  if (!str) return false;
  try {
    atob(str.substring(0, Math.min(100, str.length)));
    return /^[A-Za-z0-9+/=]+$/.test(str);
  } catch {
    return false;
  }
}

const CATEGORIES = [
  "Problem Understanding",
  "Problem Fit",
  "Usability",
  "Information Architecture",
  "Visual Hierarchy",
  "Accessibility",
  "Visual Design",
];

const SYSTEM_PROMPT = `You are a senior product design lead evaluating how well a designer SOLVED A SPECIFIC DESIGN PROBLEM. You are not a generic aesthetics critic: your job is to judge the submission as an answer to the brief you are given.

You are warm and constructive, but honest and specific. Always ground every judgement in what you can actually see in the screenshot AND in the challenge context (problem statement, target user, primary goal, constraints, evaluation criteria).

Return ONLY valid JSON in exactly this shape:
{
  "overallScore": <integer 0-100>,
  "summary": "<3-4 sentences: does this solution actually solve the stated problem for the stated user? Mention the strongest and weakest part.>",
  "rationale": "<A paragraph explaining HOW you reached this score: which criteria mattered most, what evidence in the design supported or undermined the brief, and any trade-offs you weighed.>",
  "categories": [
    {
      "name": "${CATEGORIES.join('" | "')}",
      "score": <integer 0-100>,
      "verdict": "strong" | "adequate" | "weak",
      "explanation": "<A full paragraph (3-5 sentences) judging this criterion in the context of the challenge, with specific references to what you see.>"
    }
  ],
  "strengths": ["<specific strength tied to the brief, one sentence each>"],
  "issues": ["<specific issue that weakens the solution relative to the brief>"],
  "recommendations": ["<concrete, actionable change that would make the solution fit the problem better>"]
}

Rules:
- Provide EXACTLY these ${CATEGORIES.length} categories, in this order: ${CATEGORIES.join(", ")}.
- Give 3-5 strengths, 3-5 issues, and 3-5 recommendations.
- Scores must be varied and evidence-based; never default to a middling score for everything.
- If the recruiter supplied weighted evaluation criteria, weight the overall score accordingly and say so in the rationale.
- Never invent screens or flows you cannot see. If something the brief requires is missing from the design, say so and score it down.`;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { imageBase64, mimeType, imageUrl, challenge } = body ?? {};

    if (!imageBase64 && !imageUrl) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let imageContent: { type: string; image_url: { url: string } };

    if (imageBase64) {
      if (!isValidBase64(imageBase64)) {
        return new Response(JSON.stringify({ error: "Invalid image data format" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if ((imageBase64.length * 0.75) / (1024 * 1024) > MAX_SIZE_MB) {
        return new Response(JSON.stringify({ error: `Image too large. Maximum size is ${MAX_SIZE_MB}MB` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const safeMime = (mimeType || "image/png").toLowerCase();
      if (!ALLOWED_MIME_TYPES.includes(safeMime)) {
        return new Response(JSON.stringify({ error: "Invalid image type. Supported formats: PNG, JPEG, WebP, GIF" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      imageContent = { type: "image_url", image_url: { url: `data:${safeMime};base64,${imageBase64}` } };
    } else {
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(imageUrl);
        if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error("bad protocol");
      } catch {
        return new Response(JSON.stringify({ error: "Invalid image URL" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const fetched = await fetch(imageUrl, {
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          Referer: `${parsedUrl.origin}/`,
        },
      }).catch(() => null);

      if (!fetched || !fetched.ok) {
        return new Response(
          JSON.stringify({
            error:
              "We couldn't download that design image. Please re-upload it as a PNG or JPG file and submit again.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const contentType = (fetched.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
      if (!ALLOWED_MIME_TYPES.includes(contentType)) {
        return new Response(
          JSON.stringify({ error: "That link is a web page, not an image. Please upload the design file instead." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const bytes = new Uint8Array(await fetched.arrayBuffer());
      if (bytes.byteLength / (1024 * 1024) > MAX_SIZE_MB) {
        return new Response(JSON.stringify({ error: `Image too large. Maximum size is ${MAX_SIZE_MB}MB` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      let binary = "";
      for (let i = 0; i < bytes.length; i += 8192) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      }
      imageContent = { type: "image_url", image_url: { url: `data:${contentType};base64,${btoa(binary)}` } };
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Service temporarily unavailable" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const criteria = Array.isArray(challenge?.evaluationCriteria)
      ? challenge.evaluationCriteria
          .map((c: { name?: string; weight?: number }) => `- ${c?.name ?? "Criterion"} (weight: ${c?.weight ?? 1})`)
          .join("\n")
      : "Not specified";

    const challengeContext = `DESIGN CHALLENGE CONTEXT
Title: ${challenge?.title ?? "Untitled challenge"}
Problem statement: ${challenge?.problemStatement ?? "Not specified"}
Target user: ${challenge?.targetUser ?? "Not specified"}
Primary goal: ${challenge?.primaryGoal ?? "Not specified"}
Constraints: ${challenge?.constraints ?? "None stated"}
Evaluation criteria and weights:
${criteria}

DESIGNER'S NOTES ABOUT THE SUBMISSION: ${challenge?.submissionNotes ?? "None"}

Evaluate the attached screenshot strictly as a solution to the problem above. Return valid JSON only.`;

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
          { role: "user", content: [{ type: "text", text: challengeContext }, imageContent] },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service credits exhausted. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const detail = await response.text().catch(() => "");
      console.error("AI evaluation error", response.status, detail);
      return new Response(
        JSON.stringify({ error: "We couldn't read that design. Please use a clear PNG or JPG screenshot." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(JSON.stringify({ error: "Unable to generate evaluation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let evaluation: any;
    try {
      evaluation = extractJsonFromResponse(content);
    } catch {
      return new Response(JSON.stringify({ error: "Unable to process evaluation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ evaluation, model: "google/gemini-2.5-flash" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Submission evaluation failed", error);
    return new Response(JSON.stringify({ error: "Unable to process request" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
