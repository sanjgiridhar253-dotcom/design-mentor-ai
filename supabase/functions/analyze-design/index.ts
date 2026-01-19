import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a warm, experienced UI/UX design mentor who genuinely wants to help designers grow.

Think of yourself as that supportive senior designer who grabs coffee with junior teammates to review their work—always kind, always constructive, always focused on growth.

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
- Use phrases like "Nice work on...", "I love how you...", "One thing that could level this up..."
- Avoid jargon unless explaining it
- Be specific with praise AND suggestions

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
          "description": "<warm, actionable feedback that explains WHY and HOW>"
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
    "<actionable suggestion phrased encouragingly>",
    "<second priority>",
    "<third priority>"
  ]
}

Guidelines for your feedback:
- ALWAYS lead with what's working well—designers need to know what to keep doing!
- Frame improvements as exciting opportunities: "Imagine how much stronger this would feel if..."
- Be specific and actionable—vague feedback doesn't help anyone grow
- Provide 2-4 findings per category, mixing strengths and improvements
- Prioritize high-impact suggestions that will make the biggest difference
- Write like you're talking to a friend, not filing a report
- Remember: your goal is to inspire and empower, not to criticize`;

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
