/**
 * Usage counters. Redis when Upstash is configured, otherwise this process.
 */

import { Redis } from "@upstash/redis";
import { redisConfigured } from "@/lib/rateLimit";

export type UsageSnapshot = {
  startedAt: string;
  explain: number;
  explainCached: number;
  export: number;
  chem: number;
  rateLimited: number;
};

const startedAt = new Date().toISOString();
const counts: Omit<UsageSnapshot, "startedAt"> = {
  explain: 0,
  explainCached: 0,
  export: 0,
  chem: 0,
  rateLimited: 0,
};

const EVENTS = [
  "explain",
  "explainCached",
  "export",
  "chem",
  "rateLimited",
] as const;

let redisClient: Redis | null | undefined;

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

function asCount(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function trackUsage(
  event: keyof Omit<UsageSnapshot, "startedAt">
): Promise<void> {
  const client = redis();
  if (!client) {
    counts[event] += 1;
    return;
  }
  await client.set("scicard:usage:startedAt", startedAt, { nx: true });
  await client.incr(`scicard:usage:${event}`);
}

export async function getUsageSnapshot(): Promise<UsageSnapshot> {
  const client = redis();
  if (!client) return { startedAt, ...counts };

  const keys = [
    "scicard:usage:startedAt",
    ...EVENTS.map((event) => `scicard:usage:${event}`),
  ];
  const values = await client.mget<(string | number | null)[]>(...keys);
  const snapshot = { ...counts };
  EVENTS.forEach((event, index) => {
    snapshot[event] = asCount(values[index + 1]);
  });
  return {
    startedAt: typeof values[0] === "string" && values[0] ? values[0] : startedAt,
    ...snapshot,
  };
}
