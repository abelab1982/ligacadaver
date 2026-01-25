import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type MatchStatus = "NS" | "LIVE" | "FT";

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
  // Local prediction (not saved to DB for now)
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
  status: db.status,
  isLocked: db.is_locked,
  kickOff: db.kick_off,
  homePrediction: null,
  awayPrediction: null,
});

export function useFixtures() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch fixtures from Supabase
  const fetchFixtures = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("fixtures")
        .select("*")
        .order("round", { ascending: true });

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        setFixtures(data.map(mapDbToFixture));
      }
    } catch (err) {
      console.error("Error fetching fixtures:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch fixtures");
    } finally {
      setLoading(false);
    }
  }, []);

  // Set up realtime subscription for live updates
  useEffect(() => {
    fetchFixtures();

    let channel: RealtimeChannel | null = null;

    const setupRealtime = async () => {
      channel = supabase
        .channel("fixtures-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "fixtures",
          },
          (payload) => {
            if (payload.eventType === "UPDATE" && payload.new) {
              const updated = mapDbToFixture(payload.new as DbFixture);
              setFixtures((prev) =>
                prev.map((f) => (f.id === updated.id ? { ...f, ...updated } : f))
              );
            } else if (payload.eventType === "INSERT" && payload.new) {
              const newFixture = mapDbToFixture(payload.new as DbFixture);
              setFixtures((prev) => [...prev, newFixture]);
            }
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchFixtures]);

  // Update local prediction (client-side only for unlocked fixtures)
  const updatePrediction = useCallback(
    (fixtureId: string, homePrediction: number | null, awayPrediction: number | null) => {
      setFixtures((prev) =>
        prev.map((f) => {
          if (f.id !== fixtureId) return f;
          // Only allow updates if not locked
          if (f.isLocked) return f;
          return { ...f, homePrediction, awayPrediction };
        })
      );
    },
    []
  );

  // Reset all predictions
  const resetPredictions = useCallback(() => {
    setFixtures((prev) =>
      prev.map((f) => ({
        ...f,
        homePrediction: null,
        awayPrediction: null,
      }))
    );
  }, []);

  // Get fixtures by round
  const getFixturesByRound = useCallback(
    (round: number) => fixtures.filter((f) => f.round === round),
    [fixtures]
  );

  // Get unique rounds
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
