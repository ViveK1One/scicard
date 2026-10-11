/**
 * Process-local usage counters for a free launch dashboard.
 * Reset on cold start / redeploy — fine for early signal, not billing.
 */

export type UsageSnapshot = {
  startedAt: string;
  explain: number;
  explainCached: number;
  export: number;
  chem: number;
  rateLimited: number;
};

const startedAt = new Date().toISOString();

const counts = {
  explain: 0,
  explainCached: 0,
  export: 0,
  chem: 0,
  rateLimited: 0,
};

export function trackUsage(
  event: keyof Omit<UsageSnapshot, "startedAt">
): void {
  counts[event] += 1;
}

export function getUsageSnapshot(): UsageSnapshot {
  return { startedAt, ...counts };
}
