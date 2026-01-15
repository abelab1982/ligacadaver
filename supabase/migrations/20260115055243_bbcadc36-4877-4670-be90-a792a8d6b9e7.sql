-- Drop the public read policy that exposes sensitive data
DROP POLICY IF EXISTS "API request log is publicly readable" ON public.api_request_log;

-- Create a restrictive policy - only service role can access (edge functions use service role)
-- No public access allowed since this table contains sensitive API response data
CREATE POLICY "Only service role can access api_request_log"
ON public.api_request_log
FOR ALL
USING (false)
WITH CHECK (false);

-- Note: Edge functions use SUPABASE_SERVICE_ROLE_KEY which bypasses RLS,
-- so they can still read/write to this table while blocking public access