import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TopScorer {
  id: number;
  player_id: number;
  player_name: string;
  player_photo: string | null;
  team_name: string;
  team_logo: string | null;
  goals: number;
  assists: number;
  games_played: number;
  penalty_goals: number;
  minutes_played: number;
  last_updated: string;
}

export const useTopScorers = () => {
  return useQuery({
    queryKey: ["top-scorers"],
    queryFn: async (): Promise<TopScorer[]> => {
      const { data, error } = await supabase
        .from("liga1_top_scorers")
        .select("*")
        .order("goals", { ascending: false });

      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
};
