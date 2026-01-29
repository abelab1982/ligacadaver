-- Drop the broken policy that blocks all access
DROP POLICY IF EXISTS "Only service role can access rate limit" ON public.h2h_rate_limit;

-- Create new policy that allows only service_role full access
-- Note: service_role bypasses RLS by default, but we add explicit policy for clarity
CREATE POLICY "Service role has full access to rate limit"
ON public.h2h_rate_limit
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);

-- The above policy explicitly denies authenticated/anon users
-- service_role bypasses RLS entirely, so it has full access automatically