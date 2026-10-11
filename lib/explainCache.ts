import { Redis } from "@upstash/redis";
import type { Explanation } from "@/lib/explain";
import { redisConfigured } from "@/lib/rateLimit";

const memory = new Map<string, Explanation>();
const TTL_SECONDS = 60 * 60 * 24;
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

export async function readExplanationCache(
  key: string
): Promise<Explanation | null> {
  const client = redis();
  if (!client) return memory.get(key) ?? null;
  const value = await client.get<Explanation>(`scicard:explain:${key}`);
  return value ?? null;
}

export async function writeExplanationCache(
  key: string,
  explanation: Explanation
): Promise<void> {
  const client = redis();
  if (!client) {
    memory.set(key, explanation);
    return;
  }
  await client.set(`scicard:explain:${key}`, explanation, { ex: TTL_SECONDS });
}
