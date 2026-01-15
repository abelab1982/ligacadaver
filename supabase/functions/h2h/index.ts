import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface H2HFixture {
  fixture: {
    id: number;
    date: string;
  };
  teams: {
    home: { id: number; name: string; winner: boolean | null };
    away: { id: number; name: string; winner: boolean | null };
  };
  goals: { home: number; away: number };
  league: { name: string; round: string };
}

interface H2HSummary {
  fixtures: Array<{
    id: number;
    date: string;
    homeTeam: string;
    awayTeam: string;
    homeId: number;
    awayId: number;
    homeGoals: number;
    awayGoals: number;
    winner: "home" | "away" | "draw";
  }>;
  stats: {
    total: number;
    homeWins: number;
    awayWins: number;
    draws: number;
    homeGoals: number;
    awayGoals: number;
    last5: Array<"home" | "away" | "draw">;
  };
  cachedAt: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const homeId = parseInt(url.searchParams.get("homeId") || "0");
    const awayId = parseInt(url.searchParams.get("awayId") || "0");

    if (!homeId || !awayId) {
      return new Response(
        JSON.stringify({ error: "homeId and awayId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Canonical key: siempre menor-mayor para evitar duplicados
    const canonicalKey = homeId < awayId ? `${homeId}-${awayId}` : `${awayId}-${homeId}`;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar en cache
    const { data: cached } = await supabase
      .from("h2h_cache")
      .select("*")
      .eq("canonical_key", canonicalKey)
      .single();

    const now = new Date();
    const cacheAge = cached ? (now.getTime() - new Date(cached.fetched_at).getTime()) / 1000 / 60 / 60 : Infinity;

    // Si cache < 24h, devolver
    if (cached && cacheAge < 24) {
      console.log(`Cache hit for ${canonicalKey}, age: ${cacheAge.toFixed(2)}h`);
      return new Response(
        JSON.stringify(cached.payload),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Cache miss for ${canonicalKey}, fetching from API-Football`);

    // 2. Llamar a API-Football
    const apiKey = Deno.env.get("API_FOOTBALL_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API_FOOTBALL_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiUrl = `https://v3.football.api-sports.io/fixtures/headtohead?h2h=${homeId}-${awayId}&last=10`;
    
    const apiResponse = await fetch(apiUrl, {
      headers: {
        "x-apisports-key": apiKey,
      },
    });

    if (!apiResponse.ok) {
      console.error("API-Football error:", await apiResponse.text());
      return new Response(
        JSON.stringify({ error: "Failed to fetch from API-Football" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiData = await apiResponse.json();
    
    if (apiData.errors && Object.keys(apiData.errors).length > 0) {
      console.error("API-Football errors:", apiData.errors);
      return new Response(
        JSON.stringify({ error: "API-Football returned errors", details: apiData.errors }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fixtures: H2HFixture[] = apiData.response || [];

    // 3. Guardar fixtures individuales
    for (const fixture of fixtures) {
      const { error } = await supabase
        .from("h2h_fixtures")
        .upsert({
          api_fixture_id: fixture.fixture.id,
          home_team_id: fixture.teams.home.id,
          away_team_id: fixture.teams.away.id,
          raw_json: fixture,
          fixture_date: fixture.fixture.date,
        }, { onConflict: "api_fixture_id" });

      if (error) {
        console.warn("Error upserting fixture:", error);
      }
    }

    // 4. Construir payload resumido
    const processedFixtures = fixtures.map((f) => {
      let winner: "home" | "away" | "draw" = "draw";
      if (f.goals.home > f.goals.away) winner = "home";
      else if (f.goals.away > f.goals.home) winner = "away";

      return {
        id: f.fixture.id,
        date: f.fixture.date,
        homeTeam: f.teams.home.name,
        awayTeam: f.teams.away.name,
        homeId: f.teams.home.id,
        awayId: f.teams.away.id,
        homeGoals: f.goals.home,
        awayGoals: f.goals.away,
        winner,
      };
    });

    // Calcular stats considerando homeId/awayId originales del request
    let homeWins = 0;
    let awayWins = 0;
    let draws = 0;
    let homeGoals = 0;
    let awayGoals = 0;

    for (const f of processedFixtures) {
      if (f.homeId === homeId) {
        homeGoals += f.homeGoals;
        awayGoals += f.awayGoals;
        if (f.winner === "home") homeWins++;
        else if (f.winner === "away") awayWins++;
        else draws++;
      } else {
        // Invertido
        homeGoals += f.awayGoals;
        awayGoals += f.homeGoals;
        if (f.winner === "away") homeWins++;
        else if (f.winner === "home") awayWins++;
        else draws++;
      }
    }

    const last5 = processedFixtures.slice(0, 5).map((f) => {
      if (f.homeId === homeId) return f.winner;
      // Invertir
      if (f.winner === "home") return "away" as const;
      if (f.winner === "away") return "home" as const;
      return "draw" as const;
    });

    const payload: H2HSummary = {
      fixtures: processedFixtures,
      stats: {
        total: processedFixtures.length,
        homeWins,
        awayWins,
        draws,
        homeGoals,
        awayGoals,
        last5,
      },
      cachedAt: now.toISOString(),
    };

    // 5. Guardar en cache (upsert)
    const { error: cacheError } = await supabase
      .from("h2h_cache")
      .upsert({
        canonical_key: canonicalKey,
        home_team_id: Math.min(homeId, awayId),
        away_team_id: Math.max(homeId, awayId),
        payload,
        fetched_at: now.toISOString(),
      }, { onConflict: "canonical_key" });

    if (cacheError) {
      console.warn("Error caching H2H:", cacheError);
    }

    // 6. Devolver payload
    return new Response(
      JSON.stringify(payload),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("H2H function error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
