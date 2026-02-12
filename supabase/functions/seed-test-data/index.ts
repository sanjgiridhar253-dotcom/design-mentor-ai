import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const users = [
      { email: "designer1@test.com", password: "Test1234!", role: "designer", name: "Alice Chen" },
      { email: "designer2@test.com", password: "Test1234!", role: "designer", name: "Bob Martinez" },
      { email: "designer3@test.com", password: "Test1234!", role: "designer", name: "Clara Kim" },
      { email: "recruiter1@test.com", password: "Test1234!", role: "recruiter", name: "Dana Recruiter" },
    ];

    const createdUsers = [];

    for (const u of users) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
      });

      if (error) {
        console.log(`User ${u.email} may already exist: ${error.message}`);
        // Try to get existing user
        const { data: listData } = await supabase.auth.admin.listUsers();
        const existing = listData?.users?.find((x: any) => x.email === u.email);
        if (existing) {
          createdUsers.push({ ...u, id: existing.id });
        }
        continue;
      }

      createdUsers.push({ ...u, id: data.user.id });
    }

    // Insert roles and profiles
    for (const u of createdUsers) {
      await supabase.from("user_roles").upsert(
        { user_id: u.id, role: u.role },
        { onConflict: "user_id" }
      );

      await supabase.from("profiles").upsert(
        { user_id: u.id, email: u.email, full_name: u.name },
        { onConflict: "user_id" }
      );
    }

    // Add designs for designers
    const designers = createdUsers.filter((u) => u.role === "designer");
    const designData = [
      { title: "Mobile Banking App", category: "UI Design", description: "A modern fintech mobile app with dark theme" },
      { title: "E-commerce Dashboard", category: "Dashboard", description: "Analytics dashboard for online store" },
      { title: "Travel Booking App", category: "UI Design", description: "Minimal travel booking experience" },
      { title: "Social Media Redesign", category: "Redesign", description: "Instagram-style social app concept" },
      { title: "Health Tracker", category: "UI Design", description: "Fitness and wellness tracking app" },
    ];

    let designIdx = 0;
    for (const designer of designers) {
      const count = designer.email === "designer1@test.com" ? 2 : designer.email === "designer2@test.com" ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const d = designData[designIdx % designData.length];
        await supabase.from("designs").insert({
          designer_id: designer.id,
          title: d.title,
          category: d.category,
          description: d.description,
          image_url: "https://placehold.co/800x600/1a1a2e/e94560?text=" + encodeURIComponent(d.title),
        });
        designIdx++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, users: createdUsers.map((u) => ({ email: u.email, role: u.role })) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
