import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ===========================================
// CORS Configuration - Allowlist only
// ===========================================
const ALLOWED_ORIGINS = [
  "https://calculadoraliga1.lovable.app",
  "https://preview--calculadoraliga1.lovable.app",
  "https://liga1calc.pe",
  "https://www.liga1calc.pe",
  "https://lovable.app",
  "https://www.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

function isOriginAllowed(origin: string): boolean {
  // Explicit allowlist + controlled suffix checks (NO "*.lovable.app" literal)
  return (
    origin === "https://liga1calc.pe" ||
    origin === "https://www.liga1calc.pe" ||
    origin === "https://lovable.app" ||
    origin === "https://www.lovable.app" ||
    origin === "https://calculadoraliga1.lovable.app" ||
    origin === "https://preview--calculadoraliga1.lovable.app" ||
    origin === "http://localhost:5173" ||
    origin === "http://localhost:8080" ||
    origin.endsWith(".lovable.app") ||
    // Needed for Lovable editor/preview origins (e.g. *.lovableproject.com)
    origin.endsWith(".lovableproject.com")
  );
}

function getCorsHeaders(origin: string): Record<string, string> {
  return {
    // Always reflect Origin (browser will still be blocked by our 403 when not allowed)
    "Access-Control-Allow-Origin": origin || "null",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

// ===========================================
// Rate Limiting Configuration
// ===========================================
const RATE_LIMIT_MAX_PER_IP = 5;           // 5 req/min per IP
const RATE_LIMIT_MAX_PER_KEY = 3;          // 3 req/min per canonical pair
const CACHE_MISS_THRESHOLD = 10;           // Max cache misses per IP in cooldown window
const CACHE_MISS_COOLDOWN_MINUTES = 10;    // Cooldown window for cache-miss tracking

// Liga 1 Peru league ID in API-Football
const LIGA1_LEAGUE_ID = 281;

// All seasons to query (historical) - descending order
const SEASONS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018];

// Cache TTL in milliseconds (24 hours)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// In-memory locks to prevent duplicate fetches
const fetchLocks = new Map<string, Promise<H2HSummary>>();

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

// Structured logging
interface LogEntry {
  timestamp: string;
  cacheHit: boolean;
  cacheMiss: boolean;
  externalApiCalled: boolean;
  reason: string;
  canonicalKey?: string;
  fixturesCount?: number;
  cacheAge?: number;
  stale?: boolean;
}

function log(entry: LogEntry) {
  console.info(JSON.stringify({
    ...entry,
    service: "h2h",
  }));
}

// Build a canonical key for caching (smaller ID first for consistency)
function buildCacheKey(teamA: number, teamB: number): string {
  const [first, second] = teamA < teamB ? [teamA, teamB] : [teamB, teamA];
  return `fixtures:${first}-${second}`;
}

// Get canonical key for pair
function getCanonicalKey(homeId: number, awayId: number): string {
  return homeId < awayId ? `${homeId}-${awayId}` : `${awayId}-${homeId}`;
}

// Get the current minute bucket for rate limiting
function getMinuteBucket(): string {
  const now = new Date();
  now.setSeconds(0, 0);
  return now.toISOString();
}

// Get 10-minute bucket for cache-miss tracking
function getCooldownBucket(): string {
  const now = new Date();
  const minutes = Math.floor(now.getMinutes() / CACHE_MISS_COOLDOWN_MINUTES) * CACHE_MISS_COOLDOWN_MINUTES;
  now.setMinutes(minutes, 0, 0);
  return now.toISOString();
}

// Extract client IP from request headers (sanitized)
function getClientIP(req: Request): string {
  const ip = (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
  // Hash/truncate for privacy in logs
  return ip.substring(0, 16);
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
  const playedFixtures = fixtures.filter(
    f => f.homeGoals !== null && f.awayGoals !== null && f.winner !== null
  );
  
  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;
  let homeGoals = 0;
  let awayGoals = 0;
  
  for (const f of playedFixtures) {
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

// Fetch fresh data from API-Football (used by lock mechanism)
// deno-lint-ignore no-explicit-any
async function fetchFromProvider(
  supabase: any,
  homeId: number,
  awayId: number,
  canonicalKey: string,
  cacheKey: string,
  apiKey: string
): Promise<H2HSummary> {
  const allFixtures: ProcessedFixture[] = [];
  const fixtureIds = new Set<number>();
  let providerError: string | undefined;
  
  for (const season of SEASONS) {
    try {
      const apiUrl = `https://v3.football.api-sports.io/fixtures?league=${LIGA1_LEAGUE_ID}&season=${season}&team=${homeId}`;
      
      const response = await fetch(apiUrl, {
        headers: { "x-apisports-key": apiKey },
      });

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      
      if (data.errors && Object.keys(data.errors).length > 0) {
        continue;
      }

      const fixturesForPair = (data.response as APIFixture[]).filter(
        (f) =>
          (f.teams.home.id === homeId && f.teams.away.id === awayId) ||
          (f.teams.home.id === awayId && f.teams.away.id === homeId)
      );

      for (const f of fixturesForPair) {
        if (!fixtureIds.has(f.fixture.id)) {
          fixtureIds.add(f.fixture.id);
          allFixtures.push(processFixture(f));
        }
      }

      if (SEASONS.indexOf(season) < SEASONS.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    } catch {
      providerError = "Some historical data may be incomplete";
    }
  }

  allFixtures.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const now = new Date().toISOString();
  
  // Save individual fixtures
  if (allFixtures.length > 0) {
    const fixtureRows = allFixtures.map(f => ({
      api_fixture_id: f.id,
      home_team_id: f.homeId,
      away_team_id: f.awayId,
      fixture_date: f.date,
      raw_json: f,
    }));

    await supabase
      .from("h2h_fixtures")
      .upsert(fixtureRows, { onConflict: "api_fixture_id" })
      .then(() => {});
  }

  // Build payload
  const payload: H2HSummary = {
    fixtures: allFixtures,
    stats: calculateStats(allFixtures, homeId),
    cachedAt: now,
    dataSource: "fixtures-api-fresh",
  };

  if (providerError) {
    payload.providerError = providerError;
  }

  // Save to cache
  await supabase.from("h2h_cache").upsert({
    canonical_key: canonicalKey,
    home_team_id: Math.min(homeId, awayId),
    away_team_id: Math.max(homeId, awayId),
    payload: { fixtures: allFixtures, dataSource: "fixtures-api" },
    fetched_at: now,
  }, { onConflict: "canonical_key" });

  // Log API request
  await supabase.from("api_request_log").insert({
    endpoint: "fixtures",
    provider: "api-football",
    request_key: cacheKey,
    request_params: { homeId, awayId, seasons: SEASONS, league: LIGA1_LEAGUE_ID },
    response_status: 200,
    response_body: { fixtureCount: allFixtures.length },
    fetched_at: now,
  });

  return payload;
}

Deno.serve(async (req) => {
  // CORS: Extract + validate origin
  const origin = req.headers.get("origin") ?? "";
  const isAllowed = isOriginAllowed(origin);
  const corsHeaders = getCorsHeaders(origin);

  // Temporary debug logging (remove once confirmed)
  console.log("origin", origin, "method", req.method, "allowed", isAllowed);

  // Preflight: respond immediately
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Block disallowed origins (but still return CORS headers so browser can read JSON)
  if (!isAllowed) {
    console.log("CORS blocked: origin not allowed");
    return new Response(
      JSON.stringify({ error: "CORS origin not allowed" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Only allow GET
  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Parse query parameters - IGNORE refresh parameter (hardcoded cache-first)
    const url = new URL(req.url);
    const homeId = parseInt(url.searchParams.get("homeId") || "0", 10);
    const awayId = parseInt(url.searchParams.get("awayId") || "0", 10);
    // forceRefresh is IGNORED - always cache-first

    if (!homeId || !awayId || homeId === awayId) {
      return new Response(
        JSON.stringify({ error: "Valid homeId and awayId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cacheKey = buildCacheKey(homeId, awayId);
    const canonicalKey = getCanonicalKey(homeId, awayId);
    const clientIP = getClientIP(req);
    const minuteBucket = getMinuteBucket();
    const cooldownBucket = getCooldownBucket();

    // ===========================================
    // STEP 1: ALWAYS check cache first (Cache-First Strategy)
    // ===========================================
    const { data: cachedData, error: cacheError } = await supabase
      .from("h2h_cache")
      .select("payload, fetched_at")
      .eq("canonical_key", canonicalKey)
      .maybeSingle();

    if (cachedData && !cacheError && cachedData.payload) {
      const cacheAge = Date.now() - new Date(cachedData.fetched_at).getTime();
      const isStale = cacheAge > CACHE_TTL_MS;

      log({
        timestamp: new Date().toISOString(),
        cacheHit: true,
        cacheMiss: false,
        externalApiCalled: false,
        reason: isStale ? "cache-hit-stale" : "cache-hit-fresh",
        canonicalKey,
        cacheAge: Math.round(cacheAge / 1000),
        stale: isStale,
      });

      // Return cached data immediately
      const payload = cachedData.payload as { fixtures: ProcessedFixture[]; dataSource?: string };
      const fixtures = payload.fixtures || [];
      
      fixtures.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const stats = calculateStats(fixtures, homeId);
      
      const response: H2HSummary = {
        fixtures,
        stats,
        cachedAt: cachedData.fetched_at,
        dataSource: isStale ? "fixtures-api-stale" : "fixtures-api-cached",
      };

      // Stale-While-Revalidate: trigger background refresh if stale and no lock
      if (isStale && !fetchLocks.has(canonicalKey)) {
        const apiKey = Deno.env.get("API_FOOTBALL_KEY");
        if (apiKey) {
          // Fire-and-forget background refresh
          const refreshPromise = fetchFromProvider(supabase, homeId, awayId, canonicalKey, cacheKey, apiKey)
            .finally(() => fetchLocks.delete(canonicalKey));
          fetchLocks.set(canonicalKey, refreshPromise);
        }
      }

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===========================================
    // STEP 2: Cache miss - Check rate limits
    // ===========================================
    
    // 2a. Check per-IP rate limit
    const { data: ipRateData } = await supabase
      .from("h2h_rate_limit")
      .select("request_count")
      .eq("ip_address", clientIP)
      .eq("minute_bucket", minuteBucket)
      .maybeSingle();

    const ipCount = ipRateData?.request_count || 0;

    if (ipCount >= RATE_LIMIT_MAX_PER_IP) {
      log({
        timestamp: new Date().toISOString(),
        cacheHit: false,
        cacheMiss: true,
        externalApiCalled: false,
        reason: "rate-limit-ip-exceeded",
        canonicalKey,
      });

      return new Response(
        JSON.stringify({
          fixtures: [],
          stats: { total: 0, homeWins: 0, awayWins: 0, draws: 0, homeGoals: 0, awayGoals: 0, last5: [] },
          cachedAt: new Date().toISOString(),
          providerError: "Rate limit exceeded. Please try again in a minute.",
          dataSource: "rate-limited",
        } satisfies H2HSummary),
        { 
          status: 429, 
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } 
        }
      );
    }

    // 2b. Check per-key rate limit (prevent spam of specific pairs)
    const keyRateLimitKey = `key:${canonicalKey}`;
    const { data: keyRateData } = await supabase
      .from("h2h_rate_limit")
      .select("request_count")
      .eq("ip_address", keyRateLimitKey)
      .eq("minute_bucket", minuteBucket)
      .maybeSingle();

    const keyCount = keyRateData?.request_count || 0;

    if (keyCount >= RATE_LIMIT_MAX_PER_KEY) {
      log({
        timestamp: new Date().toISOString(),
        cacheHit: false,
        cacheMiss: true,
        externalApiCalled: false,
        reason: "rate-limit-key-exceeded",
        canonicalKey,
      });

      return new Response(
        JSON.stringify({
          fixtures: [],
          stats: { total: 0, homeWins: 0, awayWins: 0, draws: 0, homeGoals: 0, awayGoals: 0, last5: [] },
          cachedAt: new Date().toISOString(),
          providerError: "Too many requests for this match. Please wait.",
          dataSource: "rate-limited",
        } satisfies H2HSummary),
        { 
          status: 429, 
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } 
        }
      );
    }

    // 2c. Check cache-miss cooldown (protect API quota from exploration attacks)
    const cooldownKey = `miss:${clientIP}`;
    const { data: cooldownData } = await supabase
      .from("h2h_rate_limit")
      .select("request_count")
      .eq("ip_address", cooldownKey)
      .eq("minute_bucket", cooldownBucket)
      .maybeSingle();

    const cooldownCount = cooldownData?.request_count || 0;

    if (cooldownCount >= CACHE_MISS_THRESHOLD) {
      log({
        timestamp: new Date().toISOString(),
        cacheHit: false,
        cacheMiss: true,
        externalApiCalled: false,
        reason: "cache-miss-cooldown",
        canonicalKey,
      });

      return new Response(
        JSON.stringify({
          fixtures: [],
          stats: { total: 0, homeWins: 0, awayWins: 0, draws: 0, homeGoals: 0, awayGoals: 0, last5: [] },
          cachedAt: new Date().toISOString(),
          providerError: "Too many uncached requests. Please try again later.",
          dataSource: "rate-limited",
        } satisfies H2HSummary),
        { 
          status: 429, 
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "300" } 
        }
      );
    }

    // ===========================================
    // STEP 3: Increment rate limit counters
    // ===========================================
    await Promise.all([
      supabase.from("h2h_rate_limit").upsert(
        { ip_address: clientIP, minute_bucket: minuteBucket, request_count: ipCount + 1 },
        { onConflict: "ip_address,minute_bucket" }
      ),
      supabase.from("h2h_rate_limit").upsert(
        { ip_address: keyRateLimitKey, minute_bucket: minuteBucket, request_count: keyCount + 1 },
        { onConflict: "ip_address,minute_bucket" }
      ),
      supabase.from("h2h_rate_limit").upsert(
        { ip_address: cooldownKey, minute_bucket: cooldownBucket, request_count: cooldownCount + 1 },
        { onConflict: "ip_address,minute_bucket" }
      ),
    ]);

    // ===========================================
    // STEP 4: Check if there's already a fetch in progress (lock)
    // ===========================================
    if (fetchLocks.has(canonicalKey)) {
      log({
        timestamp: new Date().toISOString(),
        cacheHit: false,
        cacheMiss: true,
        externalApiCalled: false,
        reason: "waiting-for-lock",
        canonicalKey,
      });

      try {
        const result = await fetchLocks.get(canonicalKey)!;
        // Recalculate stats for this specific homeId perspective
        const stats = calculateStats(result.fixtures, homeId);
        return new Response(
          JSON.stringify({ ...result, stats }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch {
        // Lock holder failed, continue to fetch ourselves
      }
    }

    // ===========================================
    // STEP 5: Fetch from API-Football
    // ===========================================
    const apiKey = Deno.env.get("API_FOOTBALL_KEY");
    
    if (!apiKey) {
      log({
        timestamp: new Date().toISOString(),
        cacheHit: false,
        cacheMiss: true,
        externalApiCalled: false,
        reason: "no-api-key",
        canonicalKey,
      });

      return new Response(
        JSON.stringify({
          fixtures: [],
          stats: { total: 0, homeWins: 0, awayWins: 0, draws: 0, homeGoals: 0, awayGoals: 0, last5: [] },
          cachedAt: new Date().toISOString(),
          providerError: "Service temporarily unavailable",
          dataSource: "error",
        } satisfies H2HSummary),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log({
      timestamp: new Date().toISOString(),
      cacheHit: false,
      cacheMiss: true,
      externalApiCalled: true,
      reason: "cache-miss-fetching",
      canonicalKey,
    });

    // Set lock and fetch
    const fetchPromise = fetchFromProvider(supabase, homeId, awayId, canonicalKey, cacheKey, apiKey)
      .finally(() => fetchLocks.delete(canonicalKey));
    
    fetchLocks.set(canonicalKey, fetchPromise);

    const result = await fetchPromise;

    log({
      timestamp: new Date().toISOString(),
      cacheHit: false,
      cacheMiss: true,
      externalApiCalled: true,
      reason: "fetch-complete",
      canonicalKey,
      fixturesCount: result.fixtures.length,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    log({
      timestamp: new Date().toISOString(),
      cacheHit: false,
      cacheMiss: true,
      externalApiCalled: false,
      reason: `error: ${error instanceof Error ? error.message : "unknown"}`,
    });
    
    return new Response(
      JSON.stringify({
        fixtures: [],
        stats: { total: 0, homeWins: 0, awayWins: 0, draws: 0, homeGoals: 0, awayGoals: 0, last5: [] },
        cachedAt: new Date().toISOString(),
        providerError: "Unable to fetch match data at this time",
        dataSource: "error",
      } satisfies H2HSummary),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
