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
  rateLimited: boolean;
  fetchH2H: (homeApiId: number, awayApiId: number) => Promise<void>;
  reset: () => void;
  retry: () => void;
}

// Rate limit config
const RATE_LIMIT_COOLDOWN_MS = 10000; // 10 seconds cooldown after 429

export function useH2H(): UseH2HReturn {
  const [data, setData] = useState<H2HData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  
  // Guard to prevent duplicate fetches
  const fetchingRef = useRef(false);
  const lastFetchKeyRef = useRef<string | null>(null);
  const lastParamsRef = useRef<{ homeApiId: number; awayApiId: number } | null>(null);
  const rateLimitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchH2H = useCallback(async (homeApiId: number, awayApiId: number) => {
    const fetchKey = `${homeApiId}-${awayApiId}`;
    
    // Store params for potential retry
    lastParamsRef.current = { homeApiId, awayApiId };
    
    // Guard: prevent duplicate calls if already loading or same pair
    if (fetchingRef.current) {
      console.log(`[H2H] Skipping duplicate fetch - already loading`);
      return;
    }
    
    if (lastFetchKeyRef.current === fetchKey && data) {
      console.log(`[H2H] Skipping fetch - same pair already loaded`);
      return;
    }

    // Clear any existing rate limit timeout
    if (rateLimitTimeoutRef.current) {
      clearTimeout(rateLimitTimeoutRef.current);
      rateLimitTimeoutRef.current = null;
    }

    fetchingRef.current = true;
    lastFetchKeyRef.current = fetchKey;
    setLoading(true);
    setError(null);
    setData(null);
    setRateLimited(false);

    try {
      // Use the h2h edge function proxy - never call external API directly
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/h2h?homeId=${homeApiId}&awayId=${awayApiId}`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      // Handle rate limiting (429)
      if (response.status === 429) {
        setRateLimited(true);
        setError("Mucho tráfico, intenta en unos segundos");
        
        // Auto-clear rate limit state after cooldown (soft retry indicator)
        rateLimitTimeoutRef.current = setTimeout(() => {
          setRateLimited(false);
          setError(null);
        }, RATE_LIMIT_COOLDOWN_MS);
        
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
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
    setRateLimited(false);
    lastFetchKeyRef.current = null;
    lastParamsRef.current = null;
    
    if (rateLimitTimeoutRef.current) {
      clearTimeout(rateLimitTimeoutRef.current);
      rateLimitTimeoutRef.current = null;
    }
  }, []);

  // Soft retry - only works if we have stored params and not currently fetching
  const retry = useCallback(() => {
    if (lastParamsRef.current && !fetchingRef.current && !loading) {
      const { homeApiId, awayApiId } = lastParamsRef.current;
      // Clear the fetch key to allow re-fetch
      lastFetchKeyRef.current = null;
      fetchH2H(homeApiId, awayApiId);
    }
  }, [fetchH2H, loading]);

  return { data, loading, error, rateLimited, fetchH2H, reset, retry };
}
