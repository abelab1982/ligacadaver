import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

interface FixtureUpdate {
  id: string;
  home_score?: number | null;
  away_score?: number | null;
  status?: "NS" | "LIVE" | "FT";
  is_locked?: boolean;
  kick_off?: string | null;
  api_fixture_id?: number | null;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check for cron secret (for livescore-sync trigger)
    const cronSecret = req.headers.get("x-cron-secret");
    const isCronRequest = cronSecret !== null;

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // For cron requests, validate the secret
    if (isCronRequest) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      const { data: secretData } = await supabaseAdmin.rpc("get_cron_secret");
      
      if (cronSecret !== secretData) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Trigger livescore-sync
      const livescoreUrl = `${supabaseUrl}/functions/v1/livescore-sync`;
      const response = await fetch(livescoreUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Cron-Secret": cronSecret,
        },
      });
      
      const result = await response.json();
      return new Response(
        JSON.stringify({ success: true, livescore: result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For regular requests, validate JWT and admin role
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - No token provided" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate token and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claimsData.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.user.id;

    // Check admin role using service role client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const path = url.pathname.replace("/admin-fixtures", "");

    // GET /admin-fixtures - List all fixtures
    if (req.method === "GET") {
      const filter = url.searchParams.get("filter");
      
      let query = supabaseAdmin
        .from("fixtures")
        .select("*")
        .order("round", { ascending: true })
        .order("id", { ascending: true });

      // Apply filters
      if (filter === "no-api-id") {
        query = query.is("api_fixture_id", null);
      } else if (filter === "ns-past-kickoff") {
        query = query
          .eq("status", "NS")
          .not("kick_off", "is", null)
          .lt("kick_off", new Date().toISOString());
      } else if (filter === "live-no-score") {
        query = query
          .eq("status", "LIVE")
          .or("home_score.is.null,away_score.is.null");
      } else if (filter === "locked") {
        query = query.eq("is_locked", true);
      }

      const { data, error } = await query;

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ fixtures: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PUT /admin-fixtures - Update fixture(s)
    if (req.method === "PUT") {
      const body: { fixtures: FixtureUpdate[] } = await req.json();
      
      if (!body.fixtures || !Array.isArray(body.fixtures)) {
        return new Response(
          JSON.stringify({ error: "Invalid request body - expected { fixtures: [...] }" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results = [];
      for (const fixture of body.fixtures) {
        const { id, ...updates } = fixture;
        
        if (!id) {
          results.push({ id, success: false, error: "Missing fixture id" });
          continue;
        }

        // Build update object with only provided fields
        const updateData: Record<string, unknown> = {};
        if (updates.home_score !== undefined) updateData.home_score = updates.home_score;
        if (updates.away_score !== undefined) updateData.away_score = updates.away_score;
        if (updates.status !== undefined) updateData.status = updates.status;
        if (updates.is_locked !== undefined) updateData.is_locked = updates.is_locked;
        if (updates.kick_off !== undefined) updateData.kick_off = updates.kick_off;
        if (updates.api_fixture_id !== undefined) updateData.api_fixture_id = updates.api_fixture_id;

        const { error } = await supabaseAdmin
          .from("fixtures")
          .update(updateData)
          .eq("id", id);

        if (error) {
          results.push({ id, success: false, error: error.message });
        } else {
          results.push({ id, success: true });
        }
      }

      return new Response(
        JSON.stringify({ results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /admin-fixtures - Create fixture(s)
    if (req.method === "POST") {
      const body: { fixtures: FixtureUpdate[] } = await req.json();
      
      if (!body.fixtures || !Array.isArray(body.fixtures)) {
        return new Response(
          JSON.stringify({ error: "Invalid request body - expected { fixtures: [...] }" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabaseAdmin
        .from("fixtures")
        .upsert(body.fixtures, { onConflict: "id" })
        .select();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ fixtures: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE /admin-fixtures?id=xxx - Delete fixture
    if (req.method === "DELETE") {
      const id = url.searchParams.get("id");
      
      if (!id) {
        return new Response(
          JSON.stringify({ error: "Missing fixture id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabaseAdmin
        .from("fixtures")
        .delete()
        .eq("id", id);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Admin fixtures error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
