import { NextRequest, NextResponse } from "next/server";
import { readCard } from "@/lib/cardStore";
import { rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import { reportError } from "@/lib/reportError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Params) {
  const limited = await rateLimit(req, "card-read", 60, 10 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests. Wait a few minutes." },
      { status: 429, headers: rateLimitHeaders(limited) }
    );
  }
  try {
    const card = await readCard(params.id);
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }
    return NextResponse.json(
      { card },
      { headers: rateLimitHeaders(limited) }
    );
  } catch (err) {
    await reportError(err, { route: "card-read" });
    return NextResponse.json(
      { error: "This card could not be loaded." },
      { status: 500 }
    );
  }
}
