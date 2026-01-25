import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UpdateScoreRequest {
  fixtureId: string;
  homeScore: number;
  awayScore: number;
}

interface UpdateStatusRequest {
  fixtureId: string;
  status: "NS" | "LIVE" | "FT";
  homeScore?: number;
  awayScore?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // GET: Fetch all fixtures or by round
    if (req.method === "GET") {
      const round = url.searchParams.get("round");
      
      let query = supabase
        .from("fixtures")
        .select("*")
        .order("round", { ascending: true });
      
      if (round) {
        query = query.eq("round", parseInt(round));
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return new Response(JSON.stringify({ fixtures: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: Update score or status
    if (req.method === "POST") {
      const body = await req.json();
      
      // Action: update-score (manual prediction)
      if (action === "update-score") {
        const { fixtureId, homeScore, awayScore } = body as UpdateScoreRequest;
        
        // Validate inputs
        if (!fixtureId || homeScore === undefined || awayScore === undefined) {
          return new Response(
            JSON.stringify({ error: "Missing required fields" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Check if fixture is locked
        const { data: fixture, error: fetchError } = await supabase
          .from("fixtures")
          .select("is_locked, status")
          .eq("id", fixtureId)
          .maybeSingle();
        
        if (fetchError) throw fetchError;
        
        if (!fixture) {
          return new Response(
            JSON.stringify({ error: "Fixture not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        if (fixture.is_locked) {
          return new Response(
            JSON.stringify({ error: "Fixture is locked", status: fixture.status }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Update the score
        const { data, error } = await supabase
          .from("fixtures")
          .update({ home_score: homeScore, away_score: awayScore })
          .eq("id", fixtureId)
          .select()
          .single();
        
        if (error) throw error;
        
        return new Response(JSON.stringify({ fixture: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // Action: update-status (admin/backend only - for livescore sync)
      if (action === "update-status") {
        const { fixtureId, status, homeScore, awayScore } = body as UpdateStatusRequest;
        
        if (!fixtureId || !status) {
          return new Response(
            JSON.stringify({ error: "Missing required fields" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Determine if should be locked
        const isLocked = status === "LIVE" || status === "FT";
        
        const updateData: Record<string, unknown> = {
          status,
          is_locked: isLocked,
        };
        
        // If scores provided, update them
        if (homeScore !== undefined) updateData.home_score = homeScore;
        if (awayScore !== undefined) updateData.away_score = awayScore;
        
        const { data, error } = await supabase
          .from("fixtures")
          .update(updateData)
          .eq("id", fixtureId)
          .select()
          .single();
        
        if (error) throw error;
        
        return new Response(JSON.stringify({ fixture: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // Action: seed (import from fixture.json)
      if (action === "seed") {
        const { fixtures } = body as { fixtures: Array<{
          id: string;
          round: number;
          homeId: string;
          awayId: string;
          homeScore: number | null;
          awayScore: number | null;
          status: string;
        }> };
        
        const records = fixtures.map(f => ({
          id: f.id,
          round: f.round,
          home_id: f.homeId,
          away_id: f.awayId,
          home_score: f.homeScore,
          away_score: f.awayScore,
          status: f.status === "played" ? "FT" : "NS",
          is_locked: f.status === "played",
        }));
        
        const { data, error } = await supabase
          .from("fixtures")
          .upsert(records, { onConflict: "id" })
          .select();
        
        if (error) throw error;
        
        return new Response(JSON.stringify({ inserted: data?.length || 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(
        JSON.stringify({ error: "Unknown action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
