
-- Add tournament column to fixtures table
ALTER TABLE public.fixtures 
ADD COLUMN tournament text NOT NULL DEFAULT 'A'
CHECK (tournament IN ('A', 'C'));

-- Update existing fixtures to explicitly be Apertura
UPDATE public.fixtures SET tournament = 'A' WHERE tournament = 'A';

-- Create index for efficient filtering by tournament
CREATE INDEX idx_fixtures_tournament ON public.fixtures (tournament);
CREATE INDEX idx_fixtures_tournament_round ON public.fixtures (tournament, round);
