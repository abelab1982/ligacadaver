import { useEffect, useState, useCallback, useRef } from "react";

export type MatchStatus = "NS" | "LIVE" | "FT";
export type TournamentType = "A" | "C";

export interface DbFixture {
  id: string;
  round: number;
  home_id: string;
  away_id: string;
  home_score: number | null;
  away_score: number | null;
  status: MatchStatus;
  is_locked: boolean;
  kick_off: string | null;
  api_fixture_id: number | null;
  tournament: string;
  created_at: string;
  updated_at: string;
}

export interface Fixture {
  id: string;
  round: number;
  homeId: string;
  awayId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  isLocked: boolean;
  kickOff: string | null;
  tournament: TournamentType;
  homePrediction: number | null;
  awayPrediction: number | null;
}

const mapDbToFixture = (db: DbFixture): Fixture => ({
  id: db.id,
  round: db.round,
  homeId: db.home_id,
  awayId: db.away_id,
  homeScore: db.home_score,
  awayScore: db.away_score,
  status: db.status as MatchStatus,
  isLocked: db.is_locked,
  kickOff: db.kick_off,
  tournament: (db.tournament || 'A') as TournamentType,
  homePrediction: null,
  awayPrediction: null,
});

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function useFixtures() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Fetch fixtures via raw fetch (no Supabase JS client = no auth interference)
  const fetchFixtures = useCallback(async () => {
    setLoading(true);
    setError(null);

    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const url = `${SUPABASE_URL}/rest/v1/fixtures?select=*&order=round.asc`;
        const response = await fetch(url, {
          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: DbFixture[] = await response.json();

        if (!mountedRef.current) return;

        if (data && data.length > 0) {
          setFixtures(data.map(mapDbToFixture));
        }
        setLoading(false);
        return;
      } catch (err) {
        console.error(`Error fetching fixtures (attempt ${attempt}/${maxRetries}):`, err);
        if (attempt === maxRetries) {
          if (mountedRef.current) {
            setError(err instanceof Error ? err.message : "Failed to fetch fixtures");
            setLoading(false);
          }
        } else {
          await new Promise(r => setTimeout(r, attempt * 500));
        }
      }
    }
  }, []);

  // Poll for updates every 30s instead of realtime (avoids Supabase client entirely)
  useEffect(() => {
    mountedRef.current = true;
    fetchFixtures();

    const interval = setInterval(() => {
      fetchFixtures();
    }, 30000);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchFixtures]);

  const updatePrediction = useCallback(
    (fixtureId: string, homePrediction: number | null, awayPrediction: number | null) => {
      setFixtures((prev) =>
        prev.map((f) => {
          if (f.id !== fixtureId) return f;
          if (f.isLocked) return f;
          return { ...f, homePrediction, awayPrediction };
        })
      );
    },
    []
  );

  const resetPredictions = useCallback(() => {
    setFixtures((prev) =>
      prev.map((f) => ({
        ...f,
        homePrediction: null,
        awayPrediction: null,
      }))
    );
  }, []);

  const getFixturesByRound = useCallback(
    (round: number) => fixtures.filter((f) => f.round === round),
    [fixtures]
  );

  const rounds = [...new Set(fixtures.map((f) => f.round))].sort((a, b) => a - b);
  const totalRounds = rounds.length > 0 ? Math.max(...rounds) : 17;

  return {
    fixtures,
    loading,
    error,
    totalRounds,
    updatePrediction,
    resetPredictions,
    getFixturesByRound,
    refetch: fetchFixtures,
  };
}
