// Top Scorers Edge Function - Liga 1 2026
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CACHE_HOURS = 12;
const LEAGUE_ID = 281;
const SEASON = 2026;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Check last update time
    const { data: existing } = await supabase
      .from("liga1_top_scorers")
      .select("last_updated")
      .order("last_updated", { ascending: false })
      .limit(1);

    const lastUpdated = existing?.[0]?.last_updated;
    const hoursSince = lastUpdated
      ? (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60)
      : Infinity;

    const forceRefresh = new URL(req.url).searchParams.get("force") === "true";

    if (hoursSince < CACHE_HOURS && !forceRefresh) {
      return new Response(
        JSON.stringify({ message: "Data is fresh", hours_since: Math.round(hoursSince * 10) / 10 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch from API-Football
    const apiKey = Deno.env.get("API_FOOTBALL_KEY");
    if (!apiKey) {
      throw new Error("API_FOOTBALL_KEY not configured");
    }

    const apiUrl = `https://v3.football.api-sports.io/players/topscorers?league=${LEAGUE_ID}&season=${SEASON}`;
    const apiRes = await fetch(apiUrl, {
      headers: { "x-apisports-key": apiKey },
    });

    if (!apiRes.ok) {
      throw new Error(`API-Football returned ${apiRes.status}`);
    }

    const apiData = await apiRes.json();
    const players = apiData.response;

    if (!players || players.length === 0) {
      return new Response(
        JSON.stringify({ message: "No data from API", response: apiData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();
    const rows = players.map((entry: any) => {
      const player = entry.player;
      const stats = entry.statistics?.[0];
      return {
        player_id: player.id,
        player_name: player.name,
        player_photo: player.photo,
        team_name: stats?.team?.name ?? "Unknown",
        team_logo: stats?.team?.logo ?? null,
        goals: stats?.goals?.total ?? 0,
        assists: stats?.goals?.assists ?? 0,
        games_played: stats?.games?.appearences ?? 0,
        penalty_goals: stats?.penalty?.scored ?? 0,
        minutes_played: stats?.games?.minutes ?? 0,
        last_updated: now,
      };
    });

    // Upsert all players
    const { error } = await supabase
      .from("liga1_top_scorers")
      .upsert(rows, { onConflict: "player_id" });

    if (error) {
      throw new Error(`Upsert failed: ${error.message}`);
    }

    return new Response(
      JSON.stringify({ message: "Updated", count: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("top-scorers error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
