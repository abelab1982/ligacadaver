-- Create api_request_log table for caching ALL API responses
CREATE TABLE public.api_request_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL DEFAULT 'api-football',
  endpoint text NOT NULL,
  request_key text NOT NULL UNIQUE,
  request_params jsonb,
  response_status integer,
  response_body jsonb,
  fetched_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  error text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_api_request_log_key ON public.api_request_log (request_key);
CREATE INDEX idx_api_request_log_provider_endpoint ON public.api_request_log (provider, endpoint);

-- Enable RLS
ALTER TABLE public.api_request_log ENABLE ROW LEVEL SECURITY;

-- Public read access (for edge functions we use service role anyway)
CREATE POLICY "API request log is publicly readable"
ON public.api_request_log
FOR SELECT
USING (true);

-- Add comment
COMMENT ON TABLE public.api_request_log IS 'Cache for external API responses to minimize API calls';