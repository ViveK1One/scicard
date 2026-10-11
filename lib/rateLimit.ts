/**
 * Sliding-window rate limit. Uses Upstash Redis when configured.
 * Falls back to this process's memory in local development.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();
const limiters = new Map<string, Ratelimit>();
let redisClient: Redis | null | undefined;

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
  limit: number;
};

export function redisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

function redis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  if (!redisConfigured()) {
    redisClient = null;
    return null;
  }
  redisClient = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  return redisClient;
}

function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

function windowLabel(windowMs: number): `${number} ms` | `${number} s` | `${number} m` {
  if (windowMs % 60000 === 0) return `${windowMs / 60000} m`;
  if (windowMs % 1000 === 0) return `${windowMs / 1000} s`;
  return `${windowMs} ms`;
}

function memoryLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  if (bucket.timestamps.length >= limit) {
    buckets.set(key, bucket);
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSec = Math.max(
      1,
      Math.ceil((windowMs - (now - oldest)) / 1000)
    );
    return { ok: false, remaining: 0, retryAfterSec, limit };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return {
    ok: true,
    remaining: Math.max(0, limit - bucket.timestamps.length),
    retryAfterSec: 0,
    limit,
  };
}

export async function rateLimit(
  req: Request,
  keySuffix: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const key = `${keySuffix}:${clientIp(req)}`;
  const client = redis();
  if (!client) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[rate-limit] UPSTASH_REDIS_REST_URL is missing in production; using process memory"
      );
    }
    return memoryLimit(key, limit, windowMs);
  }

  const limiterKey = `${keySuffix}:${limit}:${windowMs}`;
  let limiter = limiters.get(limiterKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: client,
      limiter: Ratelimit.slidingWindow(limit, windowLabel(windowMs)),
      prefix: `scicard:rl:${keySuffix}`,
      analytics: false,
    });
    limiters.set(limiterKey, limiter);
  }

  const result = await limiter.limit(key);
  const resetMs = result.reset > 1_000_000_000_000 ? result.reset : result.reset * 1000;
  const retryAfterSec = result.success
    ? 0
    : Math.max(1, Math.ceil((resetMs - Date.now()) / 1000));

  return {
    ok: result.success,
    remaining: result.remaining,
    retryAfterSec,
    limit: result.limit,
  };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    ...(result.ok ? {} : { "Retry-After": String(result.retryAfterSec) }),
  };
}
