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

function buildRequestKey(homeId: number, awayId: number): string {
  const pairKey = homeId < awayId ? `${homeId}-${awayId}` : `${awayId}-${homeId}`;
  return `h2h:${pairKey}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const homeId = parseInt(url.searchParams.get("homeId") || "0");
    const awayId = parseInt(url.searchParams.get("awayId") || "0");
    // Ignorar cualquier parámetro de refresh - siempre usar cache si existe
    // const forceRefresh = ... // DESHABILITADO para ahorrar requests

    if (!homeId || !awayId) {
      return new Response(
        JSON.stringify({ error: "homeId and awayId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestKey = buildRequestKey(homeId, awayId);
    const canonicalKey = homeId < awayId ? `${homeId}-${awayId}` : `${awayId}-${homeId}`;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar en api_request_log (cache permanente)
    const { data: cachedLog } = await supabase
      .from("api_request_log")
      .select("*")
      .eq("request_key", requestKey)
      .maybeSingle();

    // SIEMPRE devolver cache si existe (no hay bypass de refresh)
    if (cachedLog?.response_body) {
      console.log(`✅ Cache hit for ${requestKey} (cached at ${cachedLog.fetched_at})`);
      return new Response(
        JSON.stringify(cachedLog.response_body),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`❌ Cache miss for ${requestKey}, fetching from API-Football`);

    // 2. Llamar a API-Football
    const apiKey = Deno.env.get("API_FOOTBALL_KEY");
    if (!apiKey) {
      // Si no hay API key pero hay cache previo, usar fallback
      if (cachedLog?.response_body) {
        console.log(`⚠️ No API key, using stale cache for ${requestKey}`);
        return new Response(
          JSON.stringify(cachedLog.response_body),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "API_FOOTBALL_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiUrl = `https://v3.football.api-sports.io/fixtures/headtohead?h2h=${homeId}-${awayId}`;
    
    let apiResponse: Response | null = null;
    let apiData: any;
    let fetchError: string | null = null;

    try {
      apiResponse = await fetch(apiUrl, {
        headers: { "x-apisports-key": apiKey },
      });

      if (!apiResponse.ok) {
        fetchError = `HTTP ${apiResponse.status}: ${await apiResponse.text()}`;
      } else {
        apiData = await apiResponse.json();
        
        if (apiData.errors && Object.keys(apiData.errors).length > 0) {
          fetchError = JSON.stringify(apiData.errors);
        }
      }
    } catch (e) {
      fetchError = String(e);
    }

    // 3. Si fetch falló, usar cache previo como fallback
    if (fetchError) {
      console.error(`API-Football error: ${fetchError}`);
      
      // Registrar el error en api_request_log
      await supabase.from("api_request_log").upsert({
        request_key: requestKey,
        provider: "api-football",
        endpoint: "fixtures/headtohead",
        request_params: { homeId, awayId },
        response_status: apiResponse?.status || 0,
        response_body: null,
        fetched_at: new Date().toISOString(),
        error: fetchError,
      }, { onConflict: "request_key", ignoreDuplicates: false });

      if (cachedLog?.response_body) {
        console.log(`⚠️ API failed, using stale cache for ${requestKey}`);
        return new Response(
          JSON.stringify(cachedLog.response_body),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to fetch from API-Football", details: fetchError }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Procesar respuesta exitosa
    const allFixtures: H2HFixture[] = apiData.response || [];
    const fixtures = allFixtures.slice(0, 10);

    // Guardar fixtures individuales
    for (const fixture of fixtures) {
      await supabase.from("h2h_fixtures").upsert({
        api_fixture_id: fixture.fixture.id,
        home_team_id: fixture.teams.home.id,
        away_team_id: fixture.teams.away.id,
        raw_json: fixture,
        fixture_date: fixture.fixture.date,
      }, { onConflict: "api_fixture_id" });
    }

    // 5. Construir payload resumido
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

    // Calcular stats
    let homeWins = 0, awayWins = 0, draws = 0, homeGoals = 0, awayGoals = 0;

    for (const f of processedFixtures) {
      if (f.homeId === homeId) {
        homeGoals += f.homeGoals;
        awayGoals += f.awayGoals;
        if (f.winner === "home") homeWins++;
        else if (f.winner === "away") awayWins++;
        else draws++;
      } else {
        homeGoals += f.awayGoals;
        awayGoals += f.homeGoals;
        if (f.winner === "away") homeWins++;
        else if (f.winner === "home") awayWins++;
        else draws++;
      }
    }

    const last5 = processedFixtures.slice(0, 5).map((f) => {
      if (f.homeId === homeId) return f.winner;
      if (f.winner === "home") return "away" as const;
      if (f.winner === "away") return "home" as const;
      return "draw" as const;
    });

    const now = new Date();
    const payload: H2HSummary = {
      fixtures: processedFixtures,
      stats: {
        total: processedFixtures.length,
        homeWins, awayWins, draws, homeGoals, awayGoals, last5,
      },
      cachedAt: now.toISOString(),
    };

    // 6. Guardar respuesta COMPLETA en api_request_log (cache permanente)
    const { error: logError } = await supabase.from("api_request_log").upsert({
      request_key: requestKey,
      provider: "api-football",
      endpoint: "fixtures/headtohead",
      request_params: { homeId, awayId },
      response_status: 200,
      response_body: payload,
      fetched_at: now.toISOString(),
      error: null,
    }, { onConflict: "request_key" });

    if (logError) {
      console.warn("Error saving to api_request_log:", logError);
    }

    // También actualizar h2h_cache para compatibilidad
    await supabase.from("h2h_cache").upsert({
      canonical_key: canonicalKey,
      home_team_id: Math.min(homeId, awayId),
      away_team_id: Math.max(homeId, awayId),
      payload,
      fetched_at: now.toISOString(),
    }, { onConflict: "canonical_key" });

    console.log(`✅ Fetched and cached ${requestKey} (${processedFixtures.length} fixtures)`);

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
