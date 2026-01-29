-- Fix: Remove broken RLS policies that block service_role access
-- service_role bypasses RLS automatically when no restrictive policies exist

-- 1. Drop the broken policy on h2h_rate_limit
DROP POLICY IF EXISTS "Service role has full access to rate limit" ON public.h2h_rate_limit;

-- 2. Drop the broken policy on api_request_log
DROP POLICY IF EXISTS "Only service role can access api_request_log" ON public.api_request_log;

-- 3. Drop the broken policy on app_secrets
DROP POLICY IF EXISTS "Only service role can access app_secrets" ON public.app_secrets;

-- Note: RLS remains enabled on these tables, but with no policies:
-- - authenticated/anon roles cannot access (no permissive policies)
-- - service_role bypasses RLS entirely, so it has full access
-- This is the correct configuration for service-role-only tables