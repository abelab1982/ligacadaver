import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============ RATE LIMITING CONFIG ============
const RATE_LIMITS = {
  global: { requests: 60, windowMs: 60000 },  // 60 req/min per IP
  sensitive: { requests: 20, windowMs: 60000 }, // 20 req/min for sensitive routes
};

const SENSITIVE_ROUTES = ['/fixtures', '/predictions', '/odds', '/headtohead'];

// Token bucket for burst protection
interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

const ipBuckets = new Map<string, TokenBucket>();
const routeBuckets = new Map<string, TokenBucket>();

const BUCKET_CONFIG = {
  global: { capacity: 10, refillRate: 10, refillInterval: 1000 }, // 10 tokens, refill 10/sec
  sensitive: { capacity: 5, refillRate: 5, refillInterval: 1000 }, // 5 tokens, refill 5/sec
};

// Simple in-memory rate limit tracking
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const ipRateLimits = new Map<string, RateLimitEntry>();
const sensitiveRateLimits = new Map<string, RateLimitEntry>();

// ============ RATE LIMITING FUNCTIONS ============

function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         req.headers.get('x-real-ip') ||
         req.headers.get('cf-connecting-ip') ||
         'unknown';
}

function getTokenBucket(key: string, bucketMap: Map<string, TokenBucket>, config: typeof BUCKET_CONFIG.global): TokenBucket {
  const now = Date.now();
  let bucket = bucketMap.get(key);
  
  if (!bucket) {
    bucket = { tokens: config.capacity, lastRefill: now };
    bucketMap.set(key, bucket);
    return bucket;
  }
  
  // Refill tokens based on elapsed time
  const elapsed = now - bucket.lastRefill;
  const tokensToAdd = Math.floor(elapsed / config.refillInterval) * config.refillRate;
  
  if (tokensToAdd > 0) {
    bucket.tokens = Math.min(config.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }
  
  return bucket;
}

function consumeToken(key: string, bucketMap: Map<string, TokenBucket>, config: typeof BUCKET_CONFIG.global): boolean {
  const bucket = getTokenBucket(key, bucketMap, config);
  
  if (bucket.tokens > 0) {
    bucket.tokens--;
    return true;
  }
  return false;
}

function checkRateLimit(key: string, limitMap: Map<string, RateLimitEntry>, config: typeof RATE_LIMITS.global): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  let entry = limitMap.get(key);
  
  if (!entry || now - entry.windowStart >= config.windowMs) {
    // New window
    limitMap.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfter: 0 };
  }
  
  if (entry.count >= config.requests) {
    const retryAfter = Math.ceil((config.windowMs - (now - entry.windowStart)) / 1000);
    return { allowed: false, retryAfter };
  }
  
  entry.count++;
  return { allowed: true, retryAfter: 0 };
}

function isSensitiveRoute(path: string): boolean {
  return SENSITIVE_ROUTES.some(route => 
    path === route || path.startsWith(`${route}?`) || path.startsWith(`${route}/`)
  );
}

// Cleanup old entries periodically (prevent memory leak)
function cleanupOldEntries() {
  const now = Date.now();
  const maxAge = 120000; // 2 minutes
  
  for (const [key, entry] of ipRateLimits.entries()) {
    if (now - entry.windowStart > maxAge) ipRateLimits.delete(key);
  }
  for (const [key, entry] of sensitiveRateLimits.entries()) {
    if (now - entry.windowStart > maxAge) sensitiveRateLimits.delete(key);
  }
  for (const [key, bucket] of ipBuckets.entries()) {
    if (now - bucket.lastRefill > maxAge) ipBuckets.delete(key);
  }
  for (const [key, bucket] of routeBuckets.entries()) {
    if (now - bucket.lastRefill > maxAge) routeBuckets.delete(key);
  }
}

// Run cleanup every minute
setInterval(cleanupOldEntries, 60000);

// ============ ENDPOINT CONFIG ============

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
  '/headtohead',
];

// Validate if the requested path is allowed
function isAllowedEndpoint(path: string): boolean {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  return ALLOWED_ENDPOINTS.some(allowed => 
    normalizedPath === allowed || normalizedPath.startsWith(`${allowed}?`) || normalizedPath.startsWith(`${allowed}/`)
  );
}

// Normalize error responses
function errorResponse(status: number, message: string, details?: string, retryAfter?: number): Response {
  const headers: Record<string, string> = { ...corsHeaders, 'Content-Type': 'application/json' };
  
  if (retryAfter && status === 429) {
    headers['Retry-After'] = String(retryAfter);
  }
  
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: status,
        message,
        details: details || null,
        ...(retryAfter ? { retryAfter } : {}),
      },
    }),
    { status, headers }
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

  const clientIP = getClientIP(req);
  const url = new URL(req.url);
  const fullPath = url.pathname;
  const functionIndex = fullPath.indexOf('/api-football');
  const apiPath = functionIndex !== -1 
    ? fullPath.substring(functionIndex + '/api-football'.length) 
    : '';

  // ============ RATE LIMITING CHECKS ============
  
  // 1. Token bucket burst protection (global)
  if (!consumeToken(clientIP, ipBuckets, BUCKET_CONFIG.global)) {
    console.warn(`Burst limit exceeded for IP: ${clientIP}`);
    return errorResponse(429, 'Too many requests', 'Burst limit exceeded. Please slow down.', 1);
  }

  // 2. Global rate limit per IP
  const globalCheck = checkRateLimit(clientIP, ipRateLimits, RATE_LIMITS.global);
  if (!globalCheck.allowed) {
    console.warn(`Global rate limit exceeded for IP: ${clientIP}`);
    return errorResponse(429, 'Rate limit exceeded', `Too many requests. Try again in ${globalCheck.retryAfter} seconds.`, globalCheck.retryAfter);
  }

  // 3. Sensitive route rate limit
  if (isSensitiveRoute(apiPath)) {
    const sensitiveKey = `${clientIP}:${apiPath.split('?')[0]}`;
    
    // Token bucket for sensitive routes
    if (!consumeToken(sensitiveKey, routeBuckets, BUCKET_CONFIG.sensitive)) {
      console.warn(`Sensitive burst limit exceeded for: ${sensitiveKey}`);
      return errorResponse(429, 'Too many requests', 'Burst limit on sensitive endpoint exceeded.', 2);
    }
    
    const sensitiveCheck = checkRateLimit(sensitiveKey, sensitiveRateLimits, RATE_LIMITS.sensitive);
    if (!sensitiveCheck.allowed) {
      console.warn(`Sensitive rate limit exceeded for: ${sensitiveKey}`);
      return errorResponse(429, 'Rate limit exceeded', `Too many requests to this endpoint. Try again in ${sensitiveCheck.retryAfter} seconds.`, sensitiveCheck.retryAfter);
    }
  }

  // ============ MAIN PROXY LOGIC ============

  try {
    const apiKey = Deno.env.get('API_FOOTBALL_KEY');
    if (!apiKey) {
      console.error('API_FOOTBALL_KEY not configured');
      return errorResponse(500, 'Server configuration error', 'API key not configured');
    }

    // Validate the endpoint
    if (!apiPath || apiPath === '' || apiPath === '/') {
      return errorResponse(400, 'Missing endpoint', 'Please specify an API endpoint (e.g., /fixtures, /teams)');
    }

    if (!isAllowedEndpoint(apiPath)) {
      console.warn(`Blocked request to unauthorized endpoint: ${apiPath}`);
      return errorResponse(403, 'Endpoint not allowed', `The endpoint "${apiPath}" is not in the allowed list`);
    }

    // Build the API-Football URL
    const apiFootballUrl = `https://v3.football.api-sports.io${apiPath}${url.search}`;
    
    console.info(`Proxying request from ${clientIP} to: ${apiPath}${url.search}`);

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
      const retrySeconds = retryAfter ? parseInt(retryAfter) : 60;
      return errorResponse(429, 'Rate limit exceeded', retryAfter ? `Retry after ${retryAfter} seconds` : 'Too many requests', retrySeconds);
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
          status: 200,
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
