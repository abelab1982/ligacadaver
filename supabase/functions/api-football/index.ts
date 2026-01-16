import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============ CACHE CONFIG ============
const CACHE_TTL_MS: Record<string, number> = {
  '/standings': 6 * 60 * 60 * 1000,       // 6 hours
  '/teams': 7 * 24 * 60 * 60 * 1000,      // 7 days
  '/leagues': 7 * 24 * 60 * 60 * 1000,    // 7 days
  '/countries': 30 * 24 * 60 * 60 * 1000, // 30 days
  '/venues': 7 * 24 * 60 * 60 * 1000,     // 7 days
  '/coaches': 24 * 60 * 60 * 1000,        // 24 hours
  '/players/squads': 24 * 60 * 60 * 1000, // 24 hours
  '/headtohead': 24 * 60 * 60 * 1000,     // 24 hours
  '/predictions': 6 * 60 * 60 * 1000,     // 6 hours
  '/odds': 15 * 60 * 1000,                // 15 minutes
  '/injuries': 6 * 60 * 60 * 1000,        // 6 hours
  '/transfers': 24 * 60 * 60 * 1000,      // 24 hours
  '/trophies': 7 * 24 * 60 * 60 * 1000,   // 7 days
  '/sidelined': 24 * 60 * 60 * 1000,      // 24 hours
};

// Fixtures TTL depends on whether it's past or future
const FIXTURES_PAST_TTL = 30 * 24 * 60 * 60 * 1000;  // 30 days
const FIXTURES_FUTURE_TTL = 15 * 60 * 1000;          // 15 minutes
const DEFAULT_TTL = 60 * 60 * 1000;                   // 1 hour fallback

// In-memory cache
interface MemoryCacheEntry {
  data: unknown;
  expiresAt: number;
}
const memoryCache = new Map<string, MemoryCacheEntry>();

// Cleanup memory cache periodically
function cleanupMemoryCache() {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt <= now) {
      memoryCache.delete(key);
    }
  }
}
setInterval(cleanupMemoryCache, 60000); // Every minute

// ============ RATE LIMITING CONFIG ============
const RATE_LIMITS = {
  global: { requests: 60, windowMs: 60000 },
  sensitive: { requests: 20, windowMs: 60000 },
};

const SENSITIVE_ROUTES = ['/fixtures', '/predictions', '/odds', '/headtohead'];

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

const ipBuckets = new Map<string, TokenBucket>();
const routeBuckets = new Map<string, TokenBucket>();

const BUCKET_CONFIG = {
  global: { capacity: 10, refillRate: 10, refillInterval: 1000 },
  sensitive: { capacity: 5, refillRate: 5, refillInterval: 1000 },
};

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

function cleanupOldEntries() {
  const now = Date.now();
  const maxAge = 120000;
  
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
setInterval(cleanupOldEntries, 60000);

// ============ CACHE FUNCTIONS ============

function getCacheKey(path: string, queryString: string): string {
  return `${path}${queryString}`;
}

function getEndpointFromPath(path: string): string {
  // Extract base endpoint (e.g., "/fixtures" from "/fixtures?season=2024")
  const match = path.match(/^(\/[a-z]+(?:\/[a-z]+)?)/i);
  return match ? match[1] : path;
}

function getTTLForRequest(path: string, queryString: string): number {
  const endpoint = getEndpointFromPath(path);
  
  // Special handling for fixtures - check if past or future
  if (endpoint === '/fixtures') {
    const params = new URLSearchParams(queryString);
    const dateParam = params.get('date');
    
    if (dateParam) {
      const fixtureDate = new Date(dateParam);
      const now = new Date();
      // If the fixture date is in the past, use longer TTL
      if (fixtureDate < now) {
        return FIXTURES_PAST_TTL;
      }
    }
    return FIXTURES_FUTURE_TTL;
  }
  
  return CACHE_TTL_MS[endpoint] || DEFAULT_TTL;
}

function getFromMemoryCache(cacheKey: string): unknown | null {
  const entry = memoryCache.get(cacheKey);
  if (!entry) return null;
  
  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(cacheKey);
    return null;
  }
  
  return entry.data;
}

function setMemoryCache(cacheKey: string, data: unknown, ttlMs: number): void {
  memoryCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

// deno-lint-ignore no-explicit-any
async function getFromDbCache(supabase: any, cacheKey: string): Promise<{ data: unknown; status: number } | null> {
  try {
    const { data, error } = await supabase
      .from('api_request_log')
      .select('response_body, response_status, expires_at')
      .eq('request_key', cacheKey)
      .eq('provider', 'api-football')
      .maybeSingle();
    
    if (error || !data) return null;
    
    // Check if cache is still valid
    const expiresAt = new Date(data.expires_at).getTime();
    if (expiresAt <= Date.now()) {
      return null;
    }
    
    return {
      data: data.response_body,
      status: data.response_status || 200,
    };
  } catch (err) {
    console.error('Error reading from DB cache:', err);
    return null;
  }
}

// deno-lint-ignore no-explicit-any
async function setDbCache(
  supabase: any,
  cacheKey: string,
  endpoint: string,
  queryParams: Record<string, string>,
  responseBody: unknown,
  status: number,
  ttlMs: number
): Promise<void> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);
    
    // Upsert: insert or update on conflict
    const { error } = await supabase
      .from('api_request_log')
      .upsert({
        request_key: cacheKey,
        endpoint,
        request_params: queryParams,
        response_body: responseBody,
        response_status: status,
        fetched_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        provider: 'api-football',
      }, {
        onConflict: 'request_key',
      });
    
    if (error) {
      console.error('Error writing to DB cache:', error);
    }
  } catch (err) {
    console.error('Error writing to DB cache:', err);
  }
}

// ============ ENDPOINT CONFIG ============

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

function isAllowedEndpoint(path: string): boolean {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  return ALLOWED_ENDPOINTS.some(allowed => 
    normalizedPath === allowed || normalizedPath.startsWith(`${allowed}?`) || normalizedPath.startsWith(`${allowed}/`)
  );
}

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

function successResponse(data: unknown, cached: boolean = false): Response {
  const responseData = data as { response?: unknown; paging?: unknown; results?: number };
  
  return new Response(
    JSON.stringify({
      success: true,
      data: responseData.response || data,
      paging: responseData.paging || null,
      results: responseData.results || 0,
      cached,
    }),
    {
      status: 200,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-Cache': cached ? 'HIT' : 'MISS',
      },
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

  const clientIP = getClientIP(req);
  const url = new URL(req.url);
  const fullPath = url.pathname;
  const functionIndex = fullPath.indexOf('/api-football');
  const apiPath = functionIndex !== -1 
    ? fullPath.substring(functionIndex + '/api-football'.length) 
    : '';
  const queryString = url.search;

  // ============ RATE LIMITING CHECKS ============
  
  if (!consumeToken(clientIP, ipBuckets, BUCKET_CONFIG.global)) {
    console.warn(`Burst limit exceeded for IP: ${clientIP}`);
    return errorResponse(429, 'Too many requests', 'Burst limit exceeded. Please slow down.', 1);
  }

  const globalCheck = checkRateLimit(clientIP, ipRateLimits, RATE_LIMITS.global);
  if (!globalCheck.allowed) {
    console.warn(`Global rate limit exceeded for IP: ${clientIP}`);
    return errorResponse(429, 'Rate limit exceeded', `Too many requests. Try again in ${globalCheck.retryAfter} seconds.`, globalCheck.retryAfter);
  }

  if (isSensitiveRoute(apiPath)) {
    const sensitiveKey = `${clientIP}:${apiPath.split('?')[0]}`;
    
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

  // ============ VALIDATION ============

  if (!apiPath || apiPath === '' || apiPath === '/') {
    return errorResponse(400, 'Missing endpoint', 'Please specify an API endpoint (e.g., /fixtures, /teams)');
  }

  if (!isAllowedEndpoint(apiPath)) {
    console.warn(`Blocked request to unauthorized endpoint: ${apiPath}`);
    return errorResponse(403, 'Endpoint not allowed', `The endpoint "${apiPath}" is not in the allowed list`);
  }

  // ============ CACHE LOOKUP ============

  const cacheKey = getCacheKey(apiPath, queryString);
  const ttlMs = getTTLForRequest(apiPath, queryString);
  const endpoint = getEndpointFromPath(apiPath);

  // 1. Check memory cache first
  const memoryCached = getFromMemoryCache(cacheKey);
  if (memoryCached) {
    console.info(`[CACHE HIT - Memory] ${cacheKey}`);
    return successResponse(memoryCached, true);
  }

  // 2. Check database cache
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase credentials not configured');
    return errorResponse(500, 'Server configuration error', 'Database not configured');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const dbCached = await getFromDbCache(supabase, cacheKey);
  if (dbCached) {
    console.info(`[CACHE HIT - DB] ${cacheKey}`);
    // Populate memory cache for faster subsequent hits
    setMemoryCache(cacheKey, dbCached.data, ttlMs);
    return successResponse(dbCached.data, true);
  }

  // ============ FETCH FROM API-FOOTBALL ============

  try {
    const apiKey = Deno.env.get('API_FOOTBALL_KEY');
    if (!apiKey) {
      console.error('API_FOOTBALL_KEY not configured');
      return errorResponse(500, 'Server configuration error', 'API key not configured');
    }

    const apiFootballUrl = `https://v3.football.api-sports.io${apiPath}${queryString}`;
    
    console.info(`[CACHE MISS] Fetching from API: ${apiPath}${queryString}`);

    const response = await fetch(apiFootballUrl, {
      method: 'GET',
      headers: {
        'x-apisports-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

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

    const data = await response.json();

    // Check for API-level errors
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

    // ============ STORE IN CACHE ============

    // Parse query params for logging
    const queryParams: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    // Store in memory cache
    setMemoryCache(cacheKey, data, ttlMs);

    // Store in database cache (async, don't block response)
    setDbCache(supabase, cacheKey, endpoint, queryParams, data, 200, ttlMs).catch(err => {
      console.error('Failed to write DB cache:', err);
    });

    console.info(`[CACHED] ${cacheKey} with TTL ${ttlMs / 1000}s`);

    return successResponse(data, false);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Proxy error:', errorMessage);
    return errorResponse(500, 'Internal server error', 'An unexpected error occurred');
  }
});
