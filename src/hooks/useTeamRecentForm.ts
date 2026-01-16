import { useState, useCallback, useRef, useEffect } from "react";

export interface TeamFixture {
  id: number;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeId: number;
  awayId: number;
  homeGoals: number | null;
  awayGoals: number | null;
  status: string;
  round?: string;
  league?: string;
}

export interface TeamRecentFormData {
  results: ("V" | "E" | "D")[];
  goalsFor: number;
  goalsAgainst: number;
  matchesPlayed: number;
  fixtures: TeamFixture[];
  isPartial: boolean; // less than 5 matches available
}

interface UseTeamRecentFormReturn {
  data: TeamRecentFormData | null;
  loading: boolean;
  error: string | null;
}

// Finished match statuses from API-Football
const FINISHED_STATUSES = ["FT", "AET", "PEN", "WO", "AWD"];

export function useTeamRecentForm(apiTeamId: number | null): UseTeamRecentFormReturn {
  const [data, setData] = useState<TeamRecentFormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchingRef = useRef(false);
  const lastTeamIdRef = useRef<number | null>(null);

  const fetchRecentForm = useCallback(async (teamId: number) => {
    // Guard: prevent duplicate fetches
    if (fetchingRef.current || lastTeamIdRef.current === teamId) {
      console.log(`[TeamForm] Skipping fetch for team ${teamId} - already loading or cached`);
      return;
    }

    fetchingRef.current = true;
    lastTeamIdRef.current = teamId;
    setLoading(true);
    setError(null);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/api-football/fixtures?team=${teamId}&last=10`;
      
      console.log(`[TeamForm] Fetching last fixtures for team ${teamId}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      const fixtures = result.data || [];
      
      console.log(`[TeamForm] Received ${fixtures.length} fixtures for team ${teamId}`);

      // Filter only finished matches
      const finishedFixtures: TeamFixture[] = fixtures
        .filter((f: any) => {
          const status = f.fixture?.status?.short || f.status?.short || "";
          const isFinished = FINISHED_STATUSES.includes(status);
          console.log(`[TeamForm] Fixture ${f.fixture?.id || f.id}: status=${status}, finished=${isFinished}`);
          return isFinished;
        })
        .map((f: any): TeamFixture => ({
          id: f.fixture?.id || f.id,
          date: f.fixture?.date || f.date,
          homeTeam: f.teams?.home?.name || "",
          awayTeam: f.teams?.away?.name || "",
          homeId: f.teams?.home?.id || 0,
          awayId: f.teams?.away?.id || 0,
          homeGoals: f.goals?.home ?? f.score?.fulltime?.home ?? null,
          awayGoals: f.goals?.away ?? f.score?.fulltime?.away ?? null,
          status: f.fixture?.status?.short || f.status?.short || "",
          round: f.league?.round || "",
          league: f.league?.name || "",
        }))
        // Sort by date DESC (most recent first)
        .sort((a: TeamFixture, b: TeamFixture) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )
        // Take first 5
        .slice(0, 5);

      console.log(`[TeamForm] Filtered to ${finishedFixtures.length} finished fixtures for team ${teamId}`);

      // Calculate form
      const results: ("V" | "E" | "D")[] = [];
      let goalsFor = 0;
      let goalsAgainst = 0;

      finishedFixtures.forEach((match) => {
        const isHome = match.homeId === teamId;
        const teamGoals = isHome ? match.homeGoals : match.awayGoals;
        const opponentGoals = isHome ? match.awayGoals : match.homeGoals;

        if (teamGoals !== null && opponentGoals !== null) {
          goalsFor += teamGoals;
          goalsAgainst += opponentGoals;

          if (teamGoals > opponentGoals) {
            results.push("V");
          } else if (teamGoals < opponentGoals) {
            results.push("D");
          } else {
            results.push("E");
          }
        }
      });

      console.log(`[TeamForm] Team ${teamId} form: ${results.join("")} (${results.length} matches)`);

      setData({
        results,
        goalsFor,
        goalsAgainst,
        matchesPlayed: results.length,
        fixtures: finishedFixtures,
        isPartial: results.length > 0 && results.length < 5,
      });
    } catch (err) {
      console.error(`[TeamForm] Error fetching form for team ${teamId}:`, err);
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // Auto-fetch when apiTeamId changes
  useEffect(() => {
    if (apiTeamId && apiTeamId !== lastTeamIdRef.current) {
      fetchRecentForm(apiTeamId);
    }
  }, [apiTeamId, fetchRecentForm]);

  // Reset when teamId becomes null
  useEffect(() => {
    if (!apiTeamId) {
      setData(null);
      setError(null);
      setLoading(false);
      lastTeamIdRef.current = null;
    }
  }, [apiTeamId]);

  return { data, loading, error };
}
