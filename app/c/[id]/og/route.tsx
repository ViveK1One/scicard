import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { reportError } from "@/lib/reportError";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { cardTitle } from "@/lib/cardRecord";
import { readCard } from "@/lib/cardStore";
import { loadExportFonts } from "@/lib/fonts";
import { resolveThemeColors } from "@/lib/themes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const limited = await rateLimit(req, "card-og", 60, 10 * 60 * 1000);
  if (!limited.ok) {
    return new NextResponse("Too many requests.", { status: 429 });
  }

  let card;
  try {
    card = await readCard(params.id);
  } catch (err) {
    await reportError(err, { route: "card-og" });
    return new NextResponse("Preview unavailable.", { status: 500 });
  }
  const colors = resolveThemeColors(
    card?.themeMode ?? "light",
    card?.themeAccent ?? "graphite"
  );
  const title = card ? cardTitle(card) : "SciCard";
  const detail =
    card?.explanation?.takeaway ||
    card?.explanation?.explanation ||
    "Visual knowledge for STEM";
  const fonts = await loadExportFonts();

  const svg = await satori(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: colors.paper,
        color: colors.ink,
        padding: "64px",
        fontFamily: "Inter",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 22,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: colors.accent,
        }}
      >
        SciCard
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 56,
          fontWeight: 600,
          marginTop: 40,
          lineHeight: 1.15,
        }}
      >
        {title.slice(0, 90)}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 28,
          marginTop: 28,
          lineHeight: 1.35,
          color: colors.muted,
        }}
      >
        {detail.slice(0, 160)}
      </div>
    </div>,
    { width: 1200, height: 630, fonts }
  );

  const png = new Resvg(svg).render().asPng();
  return new NextResponse(Buffer.from(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=300",
    },
  });
}
