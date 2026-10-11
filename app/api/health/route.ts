import { NextResponse } from "next/server";
import { cardStoreKind } from "@/lib/cardStore";
import { getUsageSnapshot } from "@/lib/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public health + optional usage (gated by USAGE_STATS_TOKEN).
 * - GET /api/health → { ok: true }
 * - GET /api/health?stats=1&token=... → usage counters when token matches
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const wantStats = url.searchParams.get("stats") === "1";
  const token = url.searchParams.get("token") || "";
  const expected = process.env.USAGE_STATS_TOKEN || "";

  if (wantStats && expected && token === expected) {
    return NextResponse.json({
      ok: true,
      service: "scicard",
      usage: getUsageSnapshot(),
    });
  }

  return NextResponse.json({
    ok: true,
    service: "scicard",
    chemConfigured: Boolean(process.env.CHEM_SERVICE_URL),
    groqConfigured: Boolean(process.env.GROQ_API_KEY),
    cardStore: cardStoreKind(),
  });
}
