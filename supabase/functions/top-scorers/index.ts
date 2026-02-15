// Top Scorers Edge Function - Liga 1 2026
// Uses /players/topscorers endpoint + supplements with specific player lookups
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CACHE_HOURS = 12;
const LEAGUE_ID = 281;
const SEASON = 2026;

interface PlayerRow {
  player_id: number;
  player_name: string;
  player_photo: string | null;
  team_name: string;
  team_logo: string | null;
  goals: number;
  assists: number;
  games_played: number;
  penalty_goals: number;
  minutes_played: number;
  last_updated: string;
}

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

    const url = new URL(req.url);
    let forceRefresh = url.searchParams.get("force") === "true";
    if (!forceRefresh && req.method === "POST") {
      try {
        const body = await req.json();
        forceRefresh = body?.force === true;
      } catch { /* no body */ }
    }

    if (hoursSince < CACHE_HOURS && !forceRefresh) {
      return new Response(
        JSON.stringify({ message: "Data is fresh", hours_since: Math.round(hoursSince * 10) / 10 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("API_FOOTBALL_KEY");
    if (!apiKey) {
      throw new Error("API_FOOTBALL_KEY not configured");
    }

    const headers = { "x-apisports-key": apiKey };

    // Strategy: Use ONLY topscorers endpoint (1 API call, returns top 20)
    const scorers: PlayerRow[] = [];
    const now = new Date().toISOString();

    const topRes = await fetch(
      `https://v3.football.api-sports.io/players/topscorers?league=${LEAGUE_ID}&season=${SEASON}`,
      { headers }
    );

    if (!topRes.ok) {
      throw new Error(`API returned ${topRes.status}`);
    }

    const topData = await topRes.json();
    for (const entry of topData.response ?? []) {
      const row = parsePlayer(entry, now);
      if (row && row.goals > 0) {
        scorers.push(row);
      }
    }
    console.log(`topscorers: ${scorers.length} players (1 API call)`);

    const allScorers = scorers;
    allScorers.sort((a, b) => b.goals - a.goals || b.assists - a.assists);

    console.log(`Total scorers found: ${allScorers.length}`);

    if (allScorers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No scorers found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clear old data and upsert fresh
    await supabase.from("liga1_top_scorers").delete().neq("player_id", 0);

    const { error } = await supabase
      .from("liga1_top_scorers")
      .upsert(allScorers, { onConflict: "player_id" });

    if (error) {
      throw new Error(`Upsert failed: ${error.message}`);
    }

    return new Response(
      JSON.stringify({ 
        message: "Updated", 
        count: allScorers.length,
        api_calls: 1,
      }),
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

function parsePlayer(entry: any, now: string): PlayerRow | null {
  const player = entry.player;
  const stats = entry.statistics?.[0];
  if (!player?.id) return null;

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
}
