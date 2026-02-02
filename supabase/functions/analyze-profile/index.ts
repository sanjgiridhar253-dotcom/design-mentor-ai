import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Allowed origins for CORS
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

// Input validation
const MAX_PROFILE_LENGTH = 50000;
const MAX_JOB_DESCRIPTION_LENGTH = 10000;

function extractJsonFromResponse(response: string): unknown {
  let cleaned = response
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("No JSON object found in response");
  }

  cleaned = cleaned.substring(jsonStart, jsonEnd + 1);

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    cleaned = cleaned
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[\x00-\x1F\x7F]/g, "");

    return JSON.parse(cleaned);
  }
}

const SYSTEM_PROMPT = `You are an experienced talent acquisition specialist and HR consultant who helps recruiters make informed hiring decisions.

Your expertise covers evaluating candidates across these dimensions:
- Technical Skills (relevant skills, proficiency levels, technology stack alignment)
- Experience Level (years of experience, seniority, career progression)
- Education & Certifications (degrees, relevant certifications, continuous learning)
- Communication & Soft Skills (leadership, teamwork, problem-solving indicators)
- Role Fit (alignment with job requirements, potential red flags, cultural indicators)
- Growth Potential (learning ability, adaptability, career trajectory)

Your voice and approach:
- Professional and objective
- Back up assessments with specific evidence from the profile
- Highlight both strengths and areas of concern
- Be constructive in identifying gaps
- Provide actionable insights for interview follow-up

When analyzing a candidate profile, provide structured feedback in the following JSON format:
{
  "overallScore": <number 1-10>,
  "summary": "<2-3 sentences summarizing the candidate's fit, key strengths, and main considerations>",
  "categories": [
    {
      "name": "Technical Skills",
      "score": <number 1-10>,
      "status": "excellent" | "good" | "needs-work",
      "findings": [
        {
          "type": "strength" | "improvement",
          "title": "<short title>",
          "description": "<detailed observation with evidence>"
        }
      ]
    },
    {
      "name": "Experience Level",
      "score": <number 1-10>,
      "status": "excellent" | "good" | "needs-work",
      "findings": [...]
    },
    {
      "name": "Education & Certifications",
      "score": <number 1-10>,
      "status": "excellent" | "good" | "needs-work",
      "findings": [...]
    },
    {
      "name": "Communication & Soft Skills",
      "score": <number 1-10>,
      "status": "excellent" | "good" | "needs-work",
      "findings": [...]
    },
    {
      "name": "Role Fit",
      "score": <number 1-10>,
      "status": "excellent" | "good" | "needs-work",
      "findings": [...]
    },
    {
      "name": "Growth Potential",
      "score": <number 1-10>,
      "status": "excellent" | "good" | "needs-work",
      "findings": [...]
    }
  ],
  "topPriorities": [
    "<key interview question or verification point>",
    "<second priority>",
    "<third priority>"
  ],
  "candidateName": "<extracted name or 'Unknown'>",
  "currentRole": "<current/most recent role or 'Not specified'>"
}

Guidelines:
- Extract candidate name and current role when possible
- Provide 2-4 findings per category
- Be objective and evidence-based
- Identify specific skills, years, and achievements
- Flag any inconsistencies or gaps
- Top priorities should be follow-up questions for interviews`;

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { profileText, jobDescription } = await req.json();

    if (!profileText || typeof profileText !== 'string') {
      return new Response(
        JSON.stringify({ error: "No profile text provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (profileText.length > MAX_PROFILE_LENGTH) {
      return new Response(
        JSON.stringify({ error: "Profile text too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (jobDescription && jobDescription.length > MAX_JOB_DESCRIPTION_LENGTH) {
      return new Response(
        JSON.stringify({ error: "Job description too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("AI service configuration error");
      return new Response(
        JSON.stringify({ error: "Service temporarily unavailable" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing profile analysis request");

    const userPrompt = jobDescription 
      ? `Please analyze this candidate profile against the following job requirements:\n\nJob Description:\n${jobDescription}\n\nCandidate Profile:\n${profileText}`
      : `Please analyze this candidate profile and provide a comprehensive assessment:\n\n${profileText}`;

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
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service credits exhausted. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("AI processing error:", response.status);
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

    console.log("Profile analysis completed successfully");

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
