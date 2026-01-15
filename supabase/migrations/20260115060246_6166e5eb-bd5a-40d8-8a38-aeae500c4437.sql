-- Create rate limit table for tracking requests by IP
CREATE TABLE IF NOT EXISTS public.h2h_rate_limit (
  ip_address TEXT NOT NULL,
  minute_bucket TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (ip_address, minute_bucket)
);

-- Enable RLS
ALTER TABLE public.h2h_rate_limit ENABLE ROW LEVEL SECURITY;

-- Only service role can access (edge function uses service role)
CREATE POLICY "Only service role can access rate limit"
ON public.h2h_rate_limit
FOR ALL
USING (false)
WITH CHECK (false);

-- Index for faster lookups and cleanup
CREATE INDEX idx_h2h_rate_limit_bucket ON public.h2h_rate_limit(minute_bucket);

-- Add unique constraint to h2h_fixtures for bulk upsert
ALTER TABLE public.h2h_fixtures 
ADD CONSTRAINT h2h_fixtures_api_fixture_id_unique UNIQUE (api_fixture_id);