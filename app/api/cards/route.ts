import { NextRequest, NextResponse } from "next/server";
import { createCardRecord, isCardRecord } from "@/lib/cardRecord";
import type { ContentType } from "@/lib/detectType";
import type { Explanation } from "@/lib/explain";
import { saveCard } from "@/lib/cardStore";
import { rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import { reportError } from "@/lib/reportError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID: ContentType[] = ["equation", "reaction", "concept"];

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, "cards-list", 30, 10 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests. Wait a few minutes." },
      { status: 429, headers: rateLimitHeaders(limited) }
    );
  }
  return NextResponse.json(
    { error: "Cards are only available by their private link." },
    { status: 404 }
  );
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "cards", 30, 10 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many saves. Wait a few minutes." },
      { status: 429, headers: rateLimitHeaders(limited) }
    );
  }

  type SaveBody = {
    input?: string;
    contentType?: ContentType;
    explanation?: Explanation | null;
    themeMode?: "light" | "dark";
    themeAccent?: "graphite" | "navy" | "forest";
    aspectRatioId?: "landscape" | "square" | "portrait";
  };
  let body: SaveBody;
  try {
    body = (await req.json()) as SaveBody;
  } catch {
    return NextResponse.json(
      { error: "The card data could not be read." },
      { status: 400 }
    );
  }

  try {
    const input = (body.input ?? "").trim();
    if (!input) {
      return NextResponse.json({ error: "input is required" }, { status: 400 });
    }
    if (input.length > 8000) {
      return NextResponse.json({ error: "input is too long" }, { status: 413 });
    }
    if (!body.contentType || !VALID.includes(body.contentType)) {
      return NextResponse.json(
        { error: "contentType must be equation | reaction | concept" },
        { status: 400 }
      );
    }

    const card = createCardRecord({
      input,
      contentType: body.contentType,
      explanation: body.explanation ?? null,
      themeMode: body.themeMode,
      themeAccent: body.themeAccent,
      aspectRatioId: body.aspectRatioId,
    });

    if (!isCardRecord(card)) {
      return NextResponse.json({ error: "Could not build card" }, { status: 500 });
    }

    await saveCard(card);
    return NextResponse.json(
      { card },
      { status: 201, headers: rateLimitHeaders(limited) }
    );
  } catch (err) {
    await reportError(err, { route: "cards" });
    return NextResponse.json(
      { error: "Could not save this card. Try again." },
      { status: 500 }
    );
  }
}
