-- Create a secure table to store the cron secret (only accessible by service role)
CREATE TABLE IF NOT EXISTS public.app_secrets (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS - deny all public access
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table
CREATE POLICY "Only service role can access app_secrets"
ON public.app_secrets
FOR ALL
USING (false)
WITH CHECK (false);

-- Create a security definer function to get the cron secret
-- This function runs with elevated privileges but only returns specific secret
CREATE OR REPLACE FUNCTION public.get_cron_secret()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM public.app_secrets WHERE key = 'CRON_SECRET' LIMIT 1;
$$;

-- Revoke execute from public, only allow postgres role (used by pg_cron)
REVOKE EXECUTE ON FUNCTION public.get_cron_secret() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cron_secret() TO postgres;