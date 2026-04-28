import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Fallback defaults (used when app_secrets is not readable, e.g., anon users)
const FALLBACK_DEFAULTS = {
  DEFAULT_ROUND_A: 13,
  DEFAULT_ROUND_C: 1,
};

export interface AppConfig {
  defaultRoundA: number;
  defaultRoundC: number;
  loading: boolean;
}

export function useAppConfig(): AppConfig {
  const [config, setConfig] = useState<AppConfig>({
    defaultRoundA: FALLBACK_DEFAULTS.DEFAULT_ROUND_A,
    defaultRoundC: FALLBACK_DEFAULTS.DEFAULT_ROUND_C,
    loading: true,
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await supabase
          .from("app_secrets")
          .select("key, value")
          .in("key", ["DEFAULT_ROUND_A", "DEFAULT_ROUND_C"]);

        const configMap = new Map(
          (data || []).map((row: { key: string; value: string }) => [row.key, row.value])
        );

        setConfig({
          defaultRoundA: configMap.has("DEFAULT_ROUND_A")
            ? parseInt(configMap.get("DEFAULT_ROUND_A")!, 10)
            : FALLBACK_DEFAULTS.DEFAULT_ROUND_A,
          defaultRoundC: configMap.has("DEFAULT_ROUND_C")
            ? parseInt(configMap.get("DEFAULT_ROUND_C")!, 10)
            : FALLBACK_DEFAULTS.DEFAULT_ROUND_C,
          loading: false,
        });
      } catch {
        setConfig((prev) => ({ ...prev, loading: false }));
      }
    };

    fetchConfig();
  }, []);

  return config;
}
