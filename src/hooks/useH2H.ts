import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface H2HFixture {
  id: number;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeId: number;
  awayId: number;
  homeGoals: number;
  awayGoals: number;
  winner: "home" | "away" | "draw";
}

export interface H2HStats {
  total: number;
  homeWins: number;
  awayWins: number;
  draws: number;
  homeGoals: number;
  awayGoals: number;
  last5: Array<"home" | "away" | "draw">;
}

export interface H2HData {
  fixtures: H2HFixture[];
  stats: H2HStats;
  cachedAt: string;
}

interface UseH2HReturn {
  data: H2HData | null;
  loading: boolean;
  error: string | null;
  fetchH2H: (homeApiId: number, awayApiId: number) => Promise<void>;
  reset: () => void;
}

export function useH2H(): UseH2HReturn {
  const [data, setData] = useState<H2HData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchH2H = useCallback(async (homeApiId: number, awayApiId: number) => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const { data: responseData, error: fnError } = await supabase.functions.invoke("h2h", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        body: null,
      });

      // supabase.functions.invoke doesn't support query params directly
      // We need to call the function URL directly
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/h2h?homeId=${homeApiId}&awayId=${awayApiId}`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const h2hData = await response.json();
      setData(h2hData);
    } catch (err) {
      console.error("H2H fetch error:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, fetchH2H, reset };
}
