import { useState, useCallback, useRef } from "react";

export interface H2HFixture {
  id: number;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeId: number;
  awayId: number;
  homeGoals: number | null;
  awayGoals: number | null;
  winner: "home" | "away" | "draw" | null;
  season?: number;
  round?: string;
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
  providerError?: string;
  dataSource?: string;
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
  
  // Guard to prevent duplicate fetches
  const fetchingRef = useRef(false);
  const lastFetchKeyRef = useRef<string | null>(null);

  const fetchH2H = useCallback(async (homeApiId: number, awayApiId: number) => {
    const fetchKey = `${homeApiId}-${awayApiId}`;
    
    // Guard: prevent duplicate calls if already loading or same pair
    if (fetchingRef.current) {
      console.log(`[H2H] Skipping duplicate fetch - already loading`);
      return;
    }
    
    if (lastFetchKeyRef.current === fetchKey && data) {
      console.log(`[H2H] Skipping fetch - same pair already loaded`);
      return;
    }

    fetchingRef.current = true;
    lastFetchKeyRef.current = fetchKey;
    setLoading(true);
    setError(null);
    setData(null);

    try {
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
      
      // Log if there was a provider error (graceful)
      if (h2hData.providerError) {
        console.warn(`[H2H] Provider warning: ${h2hData.providerError}`);
      }
    } catch (err) {
      console.error("H2H fetch error:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [data]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
    lastFetchKeyRef.current = null;
  }, []);

  return { data, loading, error, fetchH2H, reset };
}
