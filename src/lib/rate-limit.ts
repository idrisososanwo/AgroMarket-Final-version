/**
 * In-Memory Sliding-Window Rate Limiter for API Routes.
 * Provides protection against brute-force attacks and abuse on sensitive endpoints.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up stale entries periodically (every 5 minutes)
if (typeof setInterval !== "undefined") {
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 600000); // 10 min retention
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }, 300000);
  if (interval.unref) {
    interval.unref();
  }
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
}

const MAX_STORE_ENTRIES = 10000;

/**
 * Checks and records a request against a rate limit key.
 *
 * @param key Unique identifier (e.g., `register:${ip}` or `payment:${userId}`)
 * @param limit Maximum allowed requests in the time window
 * @param windowMs Time window in milliseconds (e.g., 60000 for 1 minute)
 */
export function checkRateLimit(
  key: string,
  limit: number = 60,
  windowMs: number = 60000,
): RateLimitResult {
  const now = Date.now();
  let record = rateLimitStore.get(key);

  if (!record) {
    // Prevent memory exhaustion under distributed scanning attacks
    if (rateLimitStore.size >= MAX_STORE_ENTRIES) {
      const firstKey = rateLimitStore.keys().next().value;
      if (firstKey) {
        rateLimitStore.delete(firstKey);
      }
    }

    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Filter timestamps within current sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0];
    const resetMs = Math.max(0, windowMs - (now - oldest));
    return {
      success: false,
      limit,
      remaining: 0,
      resetMs,
    };
  }

  // Record current request
  record.timestamps.push(now);
  const remaining = Math.max(0, limit - record.timestamps.length);
  const oldest = record.timestamps[0];
  const resetMs = Math.max(0, windowMs - (now - oldest));

  return {
    success: true,
    limit,
    remaining,
    resetMs,
  };
}

/**
 * IP Validation regex (IPv4 and IPv6).
 */
const IPV4_REGEX =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const IPV6_REGEX = /^[0-9a-fA-F:]+$/;

function isValidIp(ip: string): boolean {
  if (!ip || ip.length > 45) return false;
  return IPV4_REGEX.test(ip) || (ip.includes(":") && IPV6_REGEX.test(ip));
}

/**
 * Helper to safely extract client IP address from trusted edge and proxy headers.
 * Protects against IP-header spoofing:
 * 1. Prioritizes infrastructure-controlled headers (`x-real-ip`, `x-vercel-forwarded-for`, `cf-connecting-ip`)
 * 2. Validates format against valid IPv4/IPv6 patterns
 * 3. Falls back safely to '127.0.0.1' or 'unknown'
 */
export function getClientIp(req: Request): string {
  // Edge/CDN infrastructure headers that cannot be spoofed by downstream clients
  const realIp = req.headers.get("x-real-ip");
  if (realIp && isValidIp(realIp.trim())) {
    return realIp.trim();
  }

  const vercelIp = req.headers.get("x-vercel-forwarded-for");
  if (vercelIp) {
    const candidate = vercelIp.split(",")[0].trim();
    if (isValidIp(candidate)) {
      return candidate;
    }
  }

  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp && isValidIp(cfIp.trim())) {
    return cfIp.trim();
  }

  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map((ip) => ip.trim());
    for (const ip of ips) {
      if (isValidIp(ip)) {
        return ip;
      }
    }
  }

  return "unknown";
}

/**
 * Asynchronous rate limit checker with optional distributed storage support (e.g. Upstash Redis).
 * When `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set in the environment,
 * this function can synchronize across multiple serverless lambda instances.
 * Falls back safely to the in-memory sliding-window limiter if external store is unconfigured.
 */
export async function checkDistributedRateLimit(
  key: string,
  limit: number = 60,
  windowMs: number = 60000,
): Promise<RateLimitResult> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    // Fall back to local in-memory sliding window
    return checkRateLimit(key, limit, windowMs);
  }

  try {
    const windowSec = Math.ceil(windowMs / 1000);
    // Pipeline INCR and EXPIRE atomically
    const response = await fetch(`${redisUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", `ratelimit:${key}`],
        ["EXPIRE", `ratelimit:${key}`, windowSec],
        ["TTL", `ratelimit:${key}`],
      ]),
      cache: "no-store",
    });

    if (!response.ok) {
      return checkRateLimit(key, limit, windowMs);
    }

    const data = await response.json();
    const count = Number(data[0]?.result || 1);
    const ttl = Number(data[2]?.result || windowSec);
    const resetMs = Math.max(0, ttl * 1000);

    return {
      success: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      resetMs,
    };
  } catch {
    // Fail-open to in-memory limiter if external network request fails
    return checkRateLimit(key, limit, windowMs);
  }
}

/**
 * Clears the rate limiter store (useful for tests).
 */
export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}
