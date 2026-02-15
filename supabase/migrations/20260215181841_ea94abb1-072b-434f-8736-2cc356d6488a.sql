
-- Create top scorers table
CREATE TABLE public.liga1_top_scorers (
  id SERIAL PRIMARY KEY,
  player_id INTEGER UNIQUE NOT NULL,
  player_name TEXT NOT NULL,
  player_photo TEXT,
  team_name TEXT NOT NULL,
  team_logo TEXT,
  goals INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  penalty_goals INTEGER NOT NULL DEFAULT 0,
  minutes_played INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.liga1_top_scorers ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Top scorers are publicly readable"
ON public.liga1_top_scorers
FOR SELECT
USING (true);

-- No public writes (service_role only)
