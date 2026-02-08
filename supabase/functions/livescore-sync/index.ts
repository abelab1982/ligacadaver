import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// API-Football status codes mapping
// Reference: https://www.api-football.com/documentation-v3#tag/Fixtures/operation/get-fixtures
const LIVE_STATUSES = ["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"];
const FINISHED_STATUSES = ["FT", "AET", "PEN", "AWD", "WO"];
const NOT_STARTED_STATUSES = ["TBD", "NS", "PST", "CANC", "ABD"];

interface ApiFixtureResponse {
  fixture: {
    id: number;
    status: {
      short: string;
      long: string;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

interface CandidateFixture {
  id: string;
  api_fixture_id: number;
  status: string;
  home_score: number | null;
  away_score: number | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const logs: string[] = [];
  
  const log = (message: string) => {
    const timestamp = new Date().toISOString();
    logs.push(`[${timestamp}] ${message}`);
    console.log(message);
  };

  // ============ CRON SECRET VALIDATION ============
  // Only allow requests with valid X-Cron-Secret header
  const cronSecret = Deno.env.get("CRON_SECRET");
  const providedSecret = req.headers.get("X-Cron-Secret");

  if (!cronSecret) {
    log("ERROR: CRON_SECRET not configured");
    return new Response(
      JSON.stringify({ success: false, error: "Server misconfigured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!providedSecret || providedSecret !== cronSecret) {
    log("UNAUTHORIZED: Invalid or missing X-Cron-Secret");
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiFootballKey = Deno.env.get("API_FOOTBALL_KEY");

    if (!apiFootballKey) {
      log("ERROR: API_FOOTBALL_KEY not configured");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "API_FOOTBALL_KEY not configured",
          logs 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Query candidate fixtures from database
    // Two queries:
    // A) Normal window: NOT finished, kick_off within -2h to +6h
    // B) Rescue sweep: Any fixture stuck as LIVE (regardless of time window)
    log("Querying candidate fixtures from database...");
    
    const { data: windowCandidates, error: windowError } = await supabase
      .from("fixtures")
      .select("id, api_fixture_id, status, home_score, away_score")
      .neq("status", "FT")
      .not("api_fixture_id", "is", null)
      .not("kick_off", "is", null)
      .gte("kick_off", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .lte("kick_off", new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString());

    if (windowError) {
      log(`ERROR querying window candidates: ${windowError.message}`);
      throw windowError;
    }

    // Rescue sweep: catch LIVE fixtures that fell outside the normal window
    const { data: rescueCandidates, error: rescueError } = await supabase
      .from("fixtures")
      .select("id, api_fixture_id, status, home_score, away_score")
      .eq("status", "LIVE")
      .not("api_fixture_id", "is", null);

    if (rescueError) {
      log(`ERROR querying rescue candidates: ${rescueError.message}`);
      throw rescueError;
    }

    // Merge and deduplicate by id
    const allCandidatesMap = new Map<string, CandidateFixture>();
    for (const c of (windowCandidates || []) as CandidateFixture[]) {
      allCandidatesMap.set(c.id, c);
    }
    for (const c of (rescueCandidates || []) as CandidateFixture[]) {
      allCandidatesMap.set(c.id, c);
    }
    const candidateFixtures = Array.from(allCandidatesMap.values());

    const rescueCount = (rescueCandidates || []).filter(
      (r: CandidateFixture) => !windowCandidates?.some((w: CandidateFixture) => w.id === r.id)
    ).length;
    log(`Found ${candidateFixtures.length} candidate fixture(s) (${rescueCount} from rescue sweep)`);

    // Step 2: If no candidates, exit early without calling API
    if (candidateFixtures.length === 0) {
      log("No candidate fixtures found. Skipping API call.");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No candidate fixtures to check",
          candidates_checked: 0,
          api_called: false,
          updates: 0,
          duration_ms: Date.now() - startTime,
          logs,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Build fixture IDs for API request
    const fixtureIds = candidateFixtures
      .map((f) => f.api_fixture_id)
      .filter((id): id is number => id !== null);

    if (fixtureIds.length === 0) {
      log("No valid api_fixture_ids found. Skipping API call.");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No valid API fixture IDs",
          candidates_checked: candidateFixtures.length,
          api_called: false,
          updates: 0,
          duration_ms: Date.now() - startTime,
          logs,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 4: Call API-Football with fixture IDs
    // API allows multiple IDs with 'ids' parameter (comma-separated)
    const idsParam = fixtureIds.join("-");
    const apiUrl = `https://v3.football.api-sports.io/fixtures?ids=${idsParam}`;
    
    log(`Calling API-Football for ${fixtureIds.length} fixture(s): ${idsParam}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    let apiResponse: Response;
    try {
      apiResponse = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "x-apisports-key": apiFootballKey,
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!apiResponse.ok) {
      log(`API-Football error: ${apiResponse.status} ${apiResponse.statusText}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `API-Football returned ${apiResponse.status}`,
          candidates_checked: candidateFixtures.length,
          api_called: true,
          updates: 0,
          duration_ms: Date.now() - startTime,
          logs,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiData = await apiResponse.json();
    const apiFixtures = (apiData.response || []) as ApiFixtureResponse[];
    
    log(`API returned ${apiFixtures.length} fixture(s)`);

    // Step 5: Process each fixture and update database
    let updatesCount = 0;
    const updateResults: Array<{ id: string; api_id: number; status: string; updated: boolean; error?: string }> = [];

    for (const apiFixture of apiFixtures) {
      const apiId = apiFixture.fixture.id;
      const apiStatus = apiFixture.fixture.status.short;
      const goalsHome = apiFixture.goals.home;
      const goalsAway = apiFixture.goals.away;

      // Find matching candidate
      const candidate = candidateFixtures.find((c) => c.api_fixture_id === apiId);
      if (!candidate) {
        log(`WARNING: API returned fixture ${apiId} but not in candidates`);
        continue;
      }

      // Determine new status and lock state
      let newStatus: "NS" | "LIVE" | "FT";
      let isLocked: boolean;

      if (FINISHED_STATUSES.includes(apiStatus)) {
        newStatus = "FT";
        isLocked = true;
      } else if (LIVE_STATUSES.includes(apiStatus)) {
        newStatus = "LIVE";
        isLocked = true;
      } else {
        newStatus = "NS";
        isLocked = false;
      }

      // Check if update is needed
      const needsUpdate =
        candidate.status !== newStatus ||
        candidate.home_score !== goalsHome ||
        candidate.away_score !== goalsAway;

      if (!needsUpdate) {
        log(`Fixture ${candidate.id} (API: ${apiId}) - No changes needed`);
        updateResults.push({ id: candidate.id, api_id: apiId, status: newStatus, updated: false });
        continue;
      }

      // Update the fixture
      log(`Updating fixture ${candidate.id}: status=${newStatus}, score=${goalsHome}-${goalsAway}, locked=${isLocked}`);

      const { error: updateError } = await supabase
        .from("fixtures")
        .update({
          status: newStatus,
          home_score: goalsHome,
          away_score: goalsAway,
          is_locked: isLocked,
        })
        .eq("id", candidate.id);

      if (updateError) {
        log(`ERROR updating fixture ${candidate.id}: ${updateError.message}`);
        updateResults.push({ id: candidate.id, api_id: apiId, status: newStatus, updated: false, error: updateError.message });
      } else {
        updatesCount++;
        updateResults.push({ id: candidate.id, api_id: apiId, status: newStatus, updated: true });
      }
    }

    const duration = Date.now() - startTime;
    log(`Sync complete: ${updatesCount} update(s) in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${apiFixtures.length} fixtures, ${updatesCount} updated`,
        candidates_checked: candidateFixtures.length,
        api_called: true,
        api_fixtures_returned: apiFixtures.length,
        updates: updatesCount,
        results: updateResults,
        duration_ms: duration,
        logs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log(`FATAL ERROR: ${message}`);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
        duration_ms: Date.now() - startTime,
        logs,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
