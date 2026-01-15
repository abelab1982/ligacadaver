import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT_MAX = 5; // 5 requests per minute per IP

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
  providerError?: string;
}

function buildRequestKey(homeId: number, awayId: number): string {
  const pairKey = homeId < awayId ? `${homeId}-${awayId}` : `${awayId}-${homeId}`;
  return `h2h:${pairKey}`;
}

function getMinuteBucket(): string {
  const now = new Date();
  now.setSeconds(0, 0);
  return now.toISOString();
}

function getClientIP(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
    || req.headers.get("x-real-ip") 
    || "unknown";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

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

    const requestKey = buildRequestKey(homeId, awayId);
    const canonicalKey = homeId < awayId ? `${homeId}-${awayId}` : `${awayId}-${homeId}`;

    // ========== 1. CACHE-FIRST: Return immediately if cache exists ==========
    const { data: cachedLog } = await supabase
      .from("api_request_log")
      .select("response_body, fetched_at")
      .eq("request_key", requestKey)
      .maybeSingle();

    if (cachedLog?.response_body) {
      console.log(`✅ Cache hit for ${requestKey} (cached at ${cachedLog.fetched_at})`);
      return new Response(
        JSON.stringify(cachedLog.response_body),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Also check h2h_cache for backwards compatibility
    const { data: h2hCached } = await supabase
      .from("h2h_cache")
      .select("payload, fetched_at")
      .eq("canonical_key", canonicalKey)
      .maybeSingle();

    if (h2hCached?.payload) {
      console.log(`✅ h2h_cache hit for ${canonicalKey}`);
      return new Response(
        JSON.stringify(h2hCached.payload),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== 2. RATE LIMITING ==========
    const clientIP = getClientIP(req);
    const minuteBucket = getMinuteBucket();

    // Check and increment rate limit
    const { data: rateData } = await supabase
      .from("h2h_rate_limit")
      .select("request_count")
      .eq("ip_address", clientIP)
      .eq("minute_bucket", minuteBucket)
      .maybeSingle();

    const currentCount = rateData?.request_count || 0;

    if (currentCount >= RATE_LIMIT_MAX) {
      console.warn(`⚠️ Rate limit exceeded for IP ${clientIP}`);
      
      // Return graceful response with providerError (no 429)
      const emptyResponse: H2HSummary = {
        fixtures: [],
        stats: { total: 0, homeWins: 0, awayWins: 0, draws: 0, homeGoals: 0, awayGoals: 0, last5: [] },
        cachedAt: new Date().toISOString(),
        providerError: "Rate limit exceeded. Try again in a minute.",
      };
      
      return new Response(
        JSON.stringify(emptyResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert rate limit counter
    await supabase
      .from("h2h_rate_limit")
      .upsert({
        ip_address: clientIP,
        minute_bucket: minuteBucket,
        request_count: currentCount + 1,
      }, { onConflict: "ip_address,minute_bucket" });

    // ========== 3. NO CACHE EXISTS: Fetch from API-Football ==========
    console.log(`❌ Cache miss for ${requestKey}, fetching from API-Football`);

    const apiKey = Deno.env.get("API_FOOTBALL_KEY");
    if (!apiKey) {
      const emptyResponse: H2HSummary = {
        fixtures: [],
        stats: { total: 0, homeWins: 0, awayWins: 0, draws: 0, homeGoals: 0, awayGoals: 0, last5: [] },
        cachedAt: new Date().toISOString(),
        providerError: "API key not configured",
      };
      return new Response(
        JSON.stringify(emptyResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiUrl = `https://v3.football.api-sports.io/fixtures/headtohead?h2h=${homeId}-${awayId}`;
    
    let apiData: any;
    let fetchError: string | null = null;

    try {
      const apiResponse = await fetch(apiUrl, {
        headers: { "x-apisports-key": apiKey },
      });

      if (!apiResponse.ok) {
        fetchError = `HTTP ${apiResponse.status}`;
      } else {
        apiData = await apiResponse.json();
        
        if (apiData.errors && Object.keys(apiData.errors).length > 0) {
          fetchError = JSON.stringify(apiData.errors);
        }
      }
    } catch (e) {
      fetchError = String(e);
    }

    // If fetch failed, return graceful empty response
    if (fetchError) {
      console.error(`API-Football error: ${fetchError}`);
      
      const emptyResponse: H2HSummary = {
        fixtures: [],
        stats: { total: 0, homeWins: 0, awayWins: 0, draws: 0, homeGoals: 0, awayGoals: 0, last5: [] },
        cachedAt: new Date().toISOString(),
        providerError: "Failed to fetch data from provider",
      };
      
      return new Response(
        JSON.stringify(emptyResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== 4. PROCESS RESPONSE ==========
    const allFixtures: H2HFixture[] = apiData.response || [];
    const fixtures = allFixtures.slice(0, 10);

    // BULK INSERT h2h_fixtures (single upsert operation)
    if (fixtures.length > 0) {
      const fixtureRows = fixtures.map((f) => ({
        api_fixture_id: f.fixture.id,
        home_team_id: f.teams.home.id,
        away_team_id: f.teams.away.id,
        raw_json: f,
        fixture_date: f.fixture.date,
      }));

      const { error: bulkError } = await supabase
        .from("h2h_fixtures")
        .upsert(fixtureRows, { onConflict: "api_fixture_id", ignoreDuplicates: false });

      if (bulkError) {
        console.warn("Bulk insert error:", bulkError);
      }
    }

    // Build processed payload
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

    // Calculate stats
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

    // ========== 5. SAVE TO CACHE ==========
    await supabase.from("api_request_log").upsert({
      request_key: requestKey,
      provider: "api-football",
      endpoint: "fixtures/headtohead",
      request_params: { homeId, awayId },
      response_status: 200,
      response_body: payload,
      fetched_at: now.toISOString(),
      error: null,
    }, { onConflict: "request_key" });

    // Also update h2h_cache for compatibility
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
    
    // Graceful error - never crash
    const emptyResponse: H2HSummary = {
      fixtures: [],
      stats: { total: 0, homeWins: 0, awayWins: 0, draws: 0, homeGoals: 0, awayGoals: 0, last5: [] },
      cachedAt: new Date().toISOString(),
      providerError: "Internal error",
    };
    
    return new Response(
      JSON.stringify(emptyResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
