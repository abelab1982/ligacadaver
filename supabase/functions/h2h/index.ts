import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit: 5 requests per minute per IP
const RATE_LIMIT_MAX = 5;

// Liga 1 Peru league ID in API-Football
const LIGA1_LEAGUE_ID = 281;

// All seasons to query (historical) - descending order
const SEASONS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018];

interface APIFixture {
  fixture: {
    id: number;
    date: string;
    status: {
      short: string;
      long: string;
    };
  };
  league: {
    id: number;
    name: string;
    season: number;
    round: string;
  };
  teams: {
    home: {
      id: number;
      name: string;
      winner: boolean | null;
    };
    away: {
      id: number;
      name: string;
      winner: boolean | null;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

interface ProcessedFixture {
  id: number;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeId: number;
  awayId: number;
  homeGoals: number | null;
  awayGoals: number | null;
  winner: "home" | "away" | "draw" | null;
  season: number;
  round: string;
}

interface H2HSummary {
  fixtures: ProcessedFixture[];
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
  providerError?: string;
  dataSource: string;
}

// Build a canonical key for caching (smaller ID first for consistency)
function buildCacheKey(teamA: number, teamB: number): string {
  const [first, second] = teamA < teamB ? [teamA, teamB] : [teamB, teamA];
  return `fixtures:${first}-${second}`;
}

// Legacy key format for backwards compatibility check
function buildLegacyKey(homeId: number, awayId: number): string {
  const pairKey = homeId < awayId ? `${homeId}-${awayId}` : `${awayId}-${homeId}`;
  return `h2h:${pairKey}`;
}

// Get the current minute for rate limiting
function getMinuteBucket(): string {
  const now = new Date();
  now.setSeconds(0, 0);
  return now.toISOString();
}

// Extract client IP from request headers
function getClientIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

// Process API fixture into our format
function processFixture(f: APIFixture): ProcessedFixture {
  const homeGoals = f.goals.home;
  const awayGoals = f.goals.away;
  
  let winner: "home" | "away" | "draw" | null = null;
  if (homeGoals !== null && awayGoals !== null) {
    if (homeGoals > awayGoals) winner = "home";
    else if (awayGoals > homeGoals) winner = "away";
    else winner = "draw";
  }
  
  return {
    id: f.fixture.id,
    date: f.fixture.date,
    homeTeam: f.teams.home.name,
    awayTeam: f.teams.away.name,
    homeId: f.teams.home.id,
    awayId: f.teams.away.id,
    homeGoals,
    awayGoals,
    winner,
    season: f.league.season,
    round: f.league.round || "",
  };
}

// Calculate stats from fixtures
function calculateStats(fixtures: ProcessedFixture[], homeApiId: number): H2HSummary["stats"] {
  // Filter only played fixtures (with scores)
  const playedFixtures = fixtures.filter(
    f => f.homeGoals !== null && f.awayGoals !== null && f.winner !== null
  );
  
  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;
  let homeGoals = 0;
  let awayGoals = 0;
  
  for (const f of playedFixtures) {
    // Determine if the requested "home" team was actually home in this fixture
    const isHomeTeamHome = f.homeId === homeApiId;
    
    homeGoals += isHomeTeamHome ? (f.homeGoals ?? 0) : (f.awayGoals ?? 0);
    awayGoals += isHomeTeamHome ? (f.awayGoals ?? 0) : (f.homeGoals ?? 0);
    
    if (f.winner === "draw") {
      draws++;
    } else if (
      (f.winner === "home" && isHomeTeamHome) ||
      (f.winner === "away" && !isHomeTeamHome)
    ) {
      homeWins++;
    } else {
      awayWins++;
    }
  }
  
  // Last 5 results from the perspective of homeApiId
  const last5: Array<"home" | "away" | "draw"> = playedFixtures
    .slice(0, 5)
    .map((f) => {
      const isHomeTeamHome = f.homeId === homeApiId;
      if (f.winner === "draw") return "draw";
      if (
        (f.winner === "home" && isHomeTeamHome) ||
        (f.winner === "away" && !isHomeTeamHome)
      ) {
        return "home";
      }
      return "away";
    });
  
  return {
    total: playedFixtures.length,
    homeWins,
    awayWins,
    draws,
    homeGoals,
    awayGoals,
    last5,
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Parse query parameters
    const url = new URL(req.url);
    const homeId = parseInt(url.searchParams.get("homeId") || "0", 10);
    const awayId = parseInt(url.searchParams.get("awayId") || "0", 10);
    const forceRefresh = url.searchParams.get("refresh") === "true";

    if (!homeId || !awayId) {
      return new Response(
        JSON.stringify({ error: "homeId and awayId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cacheKey = buildCacheKey(homeId, awayId);
    const canonicalKey = homeId < awayId ? `${homeId}-${awayId}` : `${awayId}-${homeId}`;
    const clientIP = getClientIP(req);

    // ===========================================
    // STEP 1: Check h2h_cache first (Cache-First Strategy)
    // ===========================================
    if (!forceRefresh) {
      const { data: cachedData, error: cacheError } = await supabase
        .from("h2h_cache")
        .select("payload, fetched_at")
        .eq("canonical_key", canonicalKey)
        .maybeSingle();

      if (cachedData && !cacheError && cachedData.payload) {
        console.info(`✅ Cache hit for ${cacheKey} (cached at ${cachedData.fetched_at})`);
        
        // Return cached data, recalculating stats with current homeId perspective
        const payload = cachedData.payload as { fixtures: ProcessedFixture[]; dataSource?: string };
        const fixtures = payload.fixtures || [];
        
        // Sort by date DESC
        fixtures.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        const stats = calculateStats(fixtures, homeId);
        
        return new Response(
          JSON.stringify({
            fixtures,
            stats,
            cachedAt: cachedData.fetched_at,
            dataSource: payload.dataSource || "fixtures-api-cached",
          } satisfies H2HSummary),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ===========================================
    // STEP 2: Check rate limit
    // ===========================================
    const minuteBucket = getMinuteBucket();
    
    const { data: rateLimitData } = await supabase
      .from("h2h_rate_limit")
      .select("request_count")
      .eq("ip_address", clientIP)
      .eq("minute_bucket", minuteBucket)
      .maybeSingle();

    const currentCount = rateLimitData?.request_count || 0;

    if (currentCount >= RATE_LIMIT_MAX) {
      console.warn(`⚠️ Rate limit exceeded for IP ${clientIP}`);
      return new Response(
        JSON.stringify({
          fixtures: [],
          stats: { total: 0, homeWins: 0, awayWins: 0, draws: 0, homeGoals: 0, awayGoals: 0, last5: [] },
          cachedAt: new Date().toISOString(),
          providerError: "Rate limit exceeded. Please try again in a minute.",
          dataSource: "rate-limited",
        } satisfies H2HSummary),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment rate limit counter
    await supabase
      .from("h2h_rate_limit")
      .upsert(
        { ip_address: clientIP, minute_bucket: minuteBucket, request_count: currentCount + 1 },
        { onConflict: "ip_address,minute_bucket" }
      );

    // ===========================================
    // STEP 3: Fetch fixtures from API-Football for ALL seasons
    // Using the FIXTURES endpoint instead of H2H endpoint
    // ===========================================
    const apiKey = Deno.env.get("API_FOOTBALL_KEY");
    
    if (!apiKey) {
      console.error("API_FOOTBALL_KEY not configured");
      return new Response(
        JSON.stringify({
          fixtures: [],
          stats: { total: 0, homeWins: 0, awayWins: 0, draws: 0, homeGoals: 0, awayGoals: 0, last5: [] },
          cachedAt: new Date().toISOString(),
          providerError: "API key not configured",
          dataSource: "error",
        } satisfies H2HSummary),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.info(`🔄 Fetching fixtures from API-Football for teams ${homeId} vs ${awayId}`);
    
    const allFixtures: ProcessedFixture[] = [];
    const fixtureIds = new Set<number>(); // Track to avoid duplicates
    let providerError: string | undefined;
    
    // Fetch fixtures for each season using the FIXTURES endpoint
    // Query fixtures for homeId team and filter for matches against awayId
    for (const season of SEASONS) {
      try {
        const apiUrl = `https://v3.football.api-sports.io/fixtures?league=${LIGA1_LEAGUE_ID}&season=${season}&team=${homeId}`;
        
        const response = await fetch(apiUrl, {
          headers: { "x-apisports-key": apiKey },
        });

        if (!response.ok) {
          console.warn(`⚠️ API-Football returned ${response.status} for season ${season}`);
          continue;
        }

        const data = await response.json();
        
        if (data.errors && Object.keys(data.errors).length > 0) {
          console.warn(`⚠️ API-Football errors for season ${season}:`, data.errors);
          continue;
        }

        // Filter fixtures that involve BOTH teams (homeId vs awayId in any order)
        const fixturesForPair = (data.response as APIFixture[]).filter(
          (f) =>
            (f.teams.home.id === homeId && f.teams.away.id === awayId) ||
            (f.teams.home.id === awayId && f.teams.away.id === homeId)
        );

        console.info(`  Season ${season}: Found ${fixturesForPair.length} H2H fixtures`);

        for (const f of fixturesForPair) {
          // Avoid duplicates (same fixture could appear in multiple queries)
          if (!fixtureIds.has(f.fixture.id)) {
            fixtureIds.add(f.fixture.id);
            allFixtures.push(processFixture(f));
          }
        }

        // Small delay between requests to respect API rate limits (10 req/min on free tier)
        if (SEASONS.indexOf(season) < SEASONS.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      } catch (err) {
        console.error(`Error fetching season ${season}:`, err);
        providerError = `Error fetching some seasons: ${err instanceof Error ? err.message : "Unknown"}`;
      }
    }

    // Sort all fixtures by date DESC (most recent first)
    allFixtures.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    console.info(`✅ Found ${allFixtures.length} total H2H fixtures between teams ${homeId} and ${awayId}`);

    // ===========================================
    // STEP 4: Save to cache and h2h_fixtures
    // ===========================================
    const now = new Date().toISOString();
    
    // Save individual fixtures to h2h_fixtures for future reference
    if (allFixtures.length > 0) {
      const fixtureRows = allFixtures.map(f => ({
        api_fixture_id: f.id,
        home_team_id: f.homeId,
        away_team_id: f.awayId,
        fixture_date: f.date,
        raw_json: f,
      }));

      const { error: bulkError } = await supabase
        .from("h2h_fixtures")
        .upsert(fixtureRows, { onConflict: "api_fixture_id" });

      if (bulkError) {
        console.warn("Bulk insert error:", bulkError);
      }
    }

    // Build the payload to cache
    const payload: H2HSummary = {
      fixtures: allFixtures,
      stats: calculateStats(allFixtures, homeId),
      cachedAt: now,
      dataSource: "fixtures-api-fresh",
    };

    if (providerError) {
      payload.providerError = providerError;
    }

    // Save to h2h_cache
    await supabase.from("h2h_cache").upsert({
      canonical_key: canonicalKey,
      home_team_id: Math.min(homeId, awayId),
      away_team_id: Math.max(homeId, awayId),
      payload: { fixtures: allFixtures, dataSource: "fixtures-api" },
      fetched_at: now,
    }, { onConflict: "canonical_key" });

    // Log the API request
    await supabase.from("api_request_log").insert({
      endpoint: "fixtures",
      provider: "api-football",
      request_key: cacheKey,
      request_params: { homeId, awayId, seasons: SEASONS, league: LIGA1_LEAGUE_ID },
      response_status: 200,
      response_body: { fixtureCount: allFixtures.length },
      fetched_at: now,
    });

    console.info(`✅ Cached ${allFixtures.length} fixtures for ${cacheKey}`);

    // ===========================================
    // STEP 5: Return response
    // ===========================================
    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("H2H function error:", error);
    
    // Graceful error - never crash
    return new Response(
      JSON.stringify({
        fixtures: [],
        stats: { total: 0, homeWins: 0, awayWins: 0, draws: 0, homeGoals: 0, awayGoals: 0, last5: [] },
        cachedAt: new Date().toISOString(),
        providerError: error instanceof Error ? error.message : "Internal error",
        dataSource: "error",
      } satisfies H2HSummary),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
