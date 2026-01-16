import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Whitelist of allowed API-Football endpoints
const ALLOWED_ENDPOINTS = [
  '/fixtures',
  '/teams',
  '/standings',
  '/players/squads',
  '/leagues',
  '/countries',
  '/venues',
  '/injuries',
  '/predictions',
  '/odds',
  '/transfers',
  '/trophies',
  '/sidelined',
  '/coaches',
];

// Validate if the requested path is allowed
function isAllowedEndpoint(path: string): boolean {
  // Remove leading slash if present for comparison
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  return ALLOWED_ENDPOINTS.some(allowed => 
    normalizedPath === allowed || normalizedPath.startsWith(`${allowed}?`) || normalizedPath.startsWith(`${allowed}/`)
  );
}

// Normalize error responses
function errorResponse(status: number, message: string, details?: string): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: status,
        message,
        details: details || null,
      },
    }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return errorResponse(405, 'Method not allowed', 'Only GET requests are permitted');
  }

  try {
    // Get API key from server-side secrets
    const apiKey = Deno.env.get('API_FOOTBALL_KEY');
    if (!apiKey) {
      console.error('API_FOOTBALL_KEY not configured');
      return errorResponse(500, 'Server configuration error', 'API key not configured');
    }

    // Parse the request URL to extract the endpoint path
    const url = new URL(req.url);
    
    // Extract the path after the function name
    // URL format: https://xxx.supabase.co/functions/v1/api-football/fixtures?param=value
    const fullPath = url.pathname;
    const functionIndex = fullPath.indexOf('/api-football');
    const apiPath = functionIndex !== -1 
      ? fullPath.substring(functionIndex + '/api-football'.length) 
      : '';
    
    // Validate the endpoint (just the path part, without query string)
    if (!apiPath || apiPath === '' || apiPath === '/') {
      return errorResponse(400, 'Missing endpoint', 'Please specify an API endpoint (e.g., /fixtures, /teams)');
    }

    if (!isAllowedEndpoint(apiPath)) {
      console.warn(`Blocked request to unauthorized endpoint: ${apiPath}`);
      return errorResponse(403, 'Endpoint not allowed', `The endpoint "${apiPath}" is not in the allowed list`);
    }

    // Build the API-Football URL with original query parameters
    const apiFootballUrl = `https://v3.football.api-sports.io${apiPath}${url.search}`;
    
    console.info(`Proxying request to: ${apiPath}${url.search}`);

    // Forward the request to API-Football
    const response = await fetch(apiFootballUrl, {
      method: 'GET',
      headers: {
        'x-apisports-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    // Handle API-Football specific errors
    if (response.status === 401) {
      return errorResponse(401, 'Authentication failed', 'Invalid API key');
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      return errorResponse(429, 'Rate limit exceeded', retryAfter ? `Retry after ${retryAfter} seconds` : 'Too many requests');
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API-Football error: ${response.status} - ${errorText}`);
      return errorResponse(response.status, 'API request failed', `Status: ${response.status}`);
    }

    // Parse and return the response
    const data = await response.json();

    // Check for API-level errors in the response
    if (data.errors && Object.keys(data.errors).length > 0) {
      console.warn('API-Football returned errors:', JSON.stringify(data.errors));
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 400,
            message: 'API returned errors',
            details: data.errors,
          },
          response: data.response || [],
        }),
        {
          status: 200, // Return 200 but with error info, as API-Football does
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Return successful response
    return new Response(
      JSON.stringify({
        success: true,
        data: data.response,
        paging: data.paging || null,
        results: data.results || 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Proxy error:', errorMessage);
    return errorResponse(500, 'Internal server error', 'An unexpected error occurred');
  }
});
