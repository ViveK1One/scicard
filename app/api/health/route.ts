import { NextRequest, NextResponse } from "next/server";
import { cardStoreKind } from "@/lib/cardStore";
import { rateLimit, rateLimitHeaders, redisConfigured } from "@/lib/rateLimit";
import { getUsageSnapshot } from "@/lib/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public health + optional usage (gated by USAGE_STATS_TOKEN).
 * - GET /api/health → { ok: true }
 * - GET /api/health?stats=1&token=... → usage counters when token matches
 */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, "health", 120, 10 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: rateLimitHeaders(limited) }
    );
  }

  const url = new URL(req.url);
  const wantStats = url.searchParams.get("stats") === "1";
  const token = url.searchParams.get("token") || "";
  const expected = process.env.USAGE_STATS_TOKEN || "";

  if (wantStats && expected && token === expected) {
    return NextResponse.json({
      ok: true,
      service: "scicard",
      usage: await getUsageSnapshot(),
    });
  }

  return NextResponse.json({
    ok: true,
    service: "scicard",
    chemConfigured: Boolean(process.env.CHEM_SERVICE_URL),
    groqConfigured: Boolean(process.env.GROQ_API_KEY),
    cardStore: cardStoreKind(),
    redisConfigured: redisConfigured(),
    sentryConfigured: Boolean(process.env.SENTRY_DSN),
  });
}
