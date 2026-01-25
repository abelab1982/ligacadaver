-- Create the update_updated_at_column function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create fixtures table for match status and scores
CREATE TABLE public.fixtures (
  id TEXT NOT NULL PRIMARY KEY,
  round INTEGER NOT NULL,
  home_id TEXT NOT NULL REFERENCES public.teams(id),
  away_id TEXT NOT NULL REFERENCES public.teams(id),
  home_score INTEGER,
  away_score INTEGER,
  status TEXT NOT NULL DEFAULT 'NS' CHECK (status IN ('NS', 'LIVE', 'FT')),
  is_locked BOOLEAN NOT NULL DEFAULT false,
  kick_off TIMESTAMP WITH TIME ZONE,
  api_fixture_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fixtures ENABLE ROW LEVEL SECURITY;

-- Everyone can read fixtures
CREATE POLICY "Fixtures are publicly readable"
ON public.fixtures
FOR SELECT
USING (true);

-- Only service role can modify fixtures (for backend updates)
CREATE POLICY "Only service role can modify fixtures"
ON public.fixtures
FOR ALL
USING (false)
WITH CHECK (false);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_fixtures_updated_at
BEFORE UPDATE ON public.fixtures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for quick lookups
CREATE INDEX idx_fixtures_round ON public.fixtures(round);
CREATE INDEX idx_fixtures_status ON public.fixtures(status);

-- Enable realtime for live score updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.fixtures;