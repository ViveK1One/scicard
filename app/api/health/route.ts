import { NextRequest, NextResponse } from "next/server";
import { cardStoreKind } from "@/lib/cardStore";
import { rateLimit, rateLimitHeaders, redisConfigured } from "@/lib/rateLimit";
import { getUsageSnapshot } from "@/lib/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public health. Usage counters require Authorization: Bearer <USAGE_STATS_TOKEN>.
 * The token is not accepted in the query string, so it does not land in access logs.
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
  if (wantStats && url.searchParams.get("token")) {
    return NextResponse.json(
      {
        error:
          "Send the usage token as Authorization: Bearer, not in the URL.",
      },
      { status: 400 }
    );
  }
  const header = req.headers.get("authorization") || "";
  const token = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
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
  });
}
