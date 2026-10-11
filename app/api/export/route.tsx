import { NextRequest, NextResponse } from "next/server";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { loadExportFonts } from "@/lib/fonts";
import type { ThemeColors } from "@/lib/themes";
import { resolveThemeColors } from "@/lib/themes";
import type { Explanation } from "@/lib/explain";
import { getChemKind } from "@/lib/detectType";
import { rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import { trackUsage } from "@/lib/usage";

export const runtime = "nodejs";

/** Soft launch: 40 exports / IP / 10 minutes */
const EXPORT_LIMIT = 40;
const EXPORT_WINDOW_MS = 10 * 60 * 1000;

type ExportBody = {
  contentType?: "equation" | "reaction" | "concept";
  input?: string;
  latex?: string;
  equationImage?: string;
  visualImage?: string;
  format?: "png" | "svg";
  width?: number;
  height?: number;
  /** Logical CSS pixel size multiplier for retina (2 or 3). */
  pixelRatio?: number;
  /** When true, clear canvas around the card; card panel stays theme-solid. */
  transparentBackground?: boolean;
  theme?: Partial<ThemeColors>;
  /** Preferred: resolve colors server-side from mode + accent. */
  mode?: "light" | "dark";
  accent?: "graphite" | "navy" | "forest";
  /** Teach-me payload — when present, replaces the idle placeholder in export. */
  explanation?: Explanation | null;
};

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 628;

function idleHint(contentType: string, input: string): string {
  if (contentType === "reaction") {
    return getChemKind(input) === "reaction"
      ? "Reaction context will appear here once Teach me is enabled"
      : "Structure context will appear here once Teach me is enabled";
  }
  if (contentType === "concept") {
    return "Explanation will appear here once Teach me is enabled";
  }
  return "Term labels will appear here once Teach me is enabled";
}

function SciCardExportSvg({
  width,
  height,
  label,
  contentType,
  visualImage,
  fallbackText,
  explanation,
  idleFooterHint,
  colors,
  transparentBackground,
}: {
  width: number;
  height: number;
  label: string;
  contentType: string;
  visualImage?: string;
  fallbackText: string;
  explanation?: Explanation | null;
  idleFooterHint: string;
  colors: ThemeColors;
  transparentBackground: boolean;
}) {
  const footerH = Math.round(height * 0.1);
  const padX = Math.round(width * 0.055);
  const padY = Math.round(height * 0.06);
  const clear = "rgba(0, 0, 0, 0)";
  // Transparent = clear *canvas* around the card. The card panel itself always
  // keeps solid theme surface/footer so ink (light or dark) stays readable.
  const canvasBg = transparentBackground ? clear : colors.surface;
  const inset = transparentBackground ? Math.round(Math.min(width, height) * 0.02) : 0;
  const cardW = width - inset * 2;
  const cardH = height - inset * 2;
  const hasTeach = !!(
    explanation &&
    (explanation.explanation?.trim() || explanation.title?.trim())
  );
  const variables = explanation?.variables?.slice(0, 6) ?? [];
  const applications = explanation?.applications?.slice(0, 3) ?? [];
  const tallness = cardH / Math.max(cardW, 1);
  const isPortrait = tallness >= 1.15;
  const isChem = contentType === "reaction";
  // Portrait chem: use more vertical space for the structure (BUG 2)
  let visualFrac = hasTeach ? 0.32 : 0.42;
  if (isChem && isPortrait) {
    visualFrac = hasTeach ? 0.44 : 0.56;
  } else if (isChem && tallness >= 0.95) {
    visualFrac = hasTeach ? 0.38 : 0.48;
  }
  const visualH = Math.round(cardH * visualFrac);
  const visualW = Math.round(cardW * (isPortrait && isChem ? 0.9 : 0.82));
  const titleSize = Math.max(14, Math.round(cardW * 0.014));
  const bodySize = Math.max(15, Math.round(cardW * 0.015));
  const labelSize = Math.max(11, Math.round(cardW * 0.012));

  const card = (
    <div
      style={{
        width: cardW,
        height: cardH,
        display: "flex",
        flexDirection: "column",
        backgroundColor: colors.surface,
        color: colors.ink,
        fontFamily: "Inter",
        borderRadius: transparentBackground ? 16 : 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: `${padY}px ${padX}px ${Math.round(padY * 0.4)}px`,
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              fontSize: labelSize,
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: colors.accent,
              display: "flex",
            }}
          >
            {label}
          </div>
          {hasTeach && explanation?.title ? (
            <div
              style={{
                fontSize: titleSize,
                fontWeight: 600,
                color: colors.ink,
                textAlign: "right",
                maxWidth: "68%",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              {explanation.title}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 16,
            paddingBottom: 12,
            minHeight: visualH,
          }}
        >
          {visualImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={visualImage}
              alt=""
              width={visualW}
              height={visualH}
              style={{
                objectFit: "contain",
                display: "flex",
              }}
            />
          ) : (
            <div
              style={{
                fontSize: Math.min(36, Math.round(width * 0.028)),
                fontWeight: 500,
                textAlign: "center",
                color: colors.ink,
                maxWidth: Math.round(width * 0.85),
                lineHeight: 1.35,
                display: "flex",
                justifyContent: "center",
              }}
            >
              {fallbackText || " "}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderTop: `1px solid ${colors.border}`,
            paddingTop: 14,
            minHeight: hasTeach ? Math.round(height * 0.22) : 48,
          }}
        >
          {!hasTeach ? (
            <div
              style={{ fontSize: bodySize, color: colors.muted, display: "flex" }}
            >
              {idleFooterHint}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
              }}
            >
              {explanation?.explanation ? (
                <div
                  style={{
                    fontSize: bodySize,
                    color: colors.ink,
                    lineHeight: 1.4,
                    display: "flex",
                    marginBottom: variables.length || applications.length ? 10 : 8,
                  }}
                >
                  {explanation.explanation}
                </div>
              ) : null}

              {variables.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    width: "100%",
                    marginBottom: 8,
                  }}
                >
                  {variables.map((term) => (
                    <div
                      key={term.symbol}
                      style={{
                        display: "flex",
                        fontSize: Math.max(13, bodySize - 1),
                        color: colors.ink,
                        marginRight: 18,
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{term.symbol}</span>
                      <span style={{ color: colors.muted }}>
                        {` — ${term.meaning}`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              {applications.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    marginBottom: explanation?.takeaway ? 8 : 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: Math.max(10, labelSize - 1),
                      fontWeight: 600,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: colors.muted,
                      display: "flex",
                      marginBottom: 4,
                    }}
                  >
                    Used in
                  </div>
                  <div
                    style={{
                      fontSize: bodySize,
                      color: colors.ink,
                      display: "flex",
                    }}
                  >
                    {applications.join(" · ")}
                  </div>
                </div>
              ) : null}

              {explanation?.takeaway ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    backgroundColor: colors.accentSoft,
                    borderRadius: 8,
                    padding: "10px 12px",
                    marginTop: 2,
                  }}
                >
                  <div
                    style={{
                      fontSize: Math.max(10, labelSize - 1),
                      fontWeight: 600,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: colors.muted,
                      display: "flex",
                      marginBottom: 4,
                    }}
                  >
                    Takeaway
                  </div>
                  <div
                    style={{
                      fontSize: bodySize,
                      fontWeight: 600,
                      color: colors.ink,
                      lineHeight: 1.35,
                      display: "flex",
                    }}
                  >
                    {explanation.takeaway}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: footerH,
          paddingLeft: padX,
          paddingRight: padX,
          borderTop: `1px solid ${colors.border}`,
          backgroundColor: colors.footer,
        }}
      >
        <div
          style={{
            fontSize: Math.max(18, Math.round(cardW * 0.018)),
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: colors.accent,
            display: "flex",
          }}
        >
          SciCard
        </div>
        <div
          style={{
            fontSize: Math.max(11, Math.round(cardW * 0.01)),
            fontWeight: 500,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: colors.muted,
            display: "flex",
          }}
        >
          Visual knowledge
        </div>
      </div>
    </div>
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: canvasBg,
      }}
    >
      {card}
    </div>
  );
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "export", EXPORT_LIMIT, EXPORT_WINDOW_MS);
  if (!limited.ok) {
    trackUsage("rateLimited");
    return NextResponse.json(
      {
        error: "Too many exports. Please wait a few minutes.",
        retryAfterSec: limited.retryAfterSec,
      },
      { status: 429, headers: rateLimitHeaders(limited) }
    );
  }

  try {
    const body = (await req.json()) as ExportBody;
    const format = body.format === "svg" ? "svg" : "png";
    const contentType = body.contentType ?? "equation";
    const logicalWidth = Math.min(
      Math.max(body.width ?? DEFAULT_WIDTH, 400),
      2400
    );
    const logicalHeight = Math.min(
      Math.max(body.height ?? DEFAULT_HEIGHT, 400),
      2400
    );
    const pixelRatio = Math.min(
      Math.max(Math.round(body.pixelRatio ?? 2), 1),
      3
    );
    const maxEdge = 4200;
    const scale = Math.min(
      pixelRatio,
      maxEdge / logicalWidth,
      maxEdge / logicalHeight
    );
    const width = Math.round(logicalWidth * scale);
    const height = Math.round(logicalHeight * scale);

    const text = (body.input ?? body.latex ?? "").trim();
    const visualImage = (
      body.visualImage?.startsWith("data:")
        ? body.visualImage
        : body.equationImage?.startsWith("data:")
          ? body.equationImage
          : undefined
    );
    const transparentBackground = !!body.transparentBackground;
    const explanation =
      body.explanation &&
      typeof body.explanation === "object" &&
      typeof body.explanation.explanation === "string"
        ? body.explanation
        : null;

    const mode = body.mode === "dark" ? "dark" : "light";
    const accent =
      body.accent === "navy" || body.accent === "forest"
        ? body.accent
        : "graphite";
    // Prefer mode/accent (consistent ink↔surface). Partial theme overrides last.
    const colors: ThemeColors = {
      ...resolveThemeColors(mode, accent),
      ...(body.theme ?? {}),
    };

    if (!text && !visualImage) {
      return NextResponse.json(
        { error: "Provide input/latex or visualImage" },
        { status: 400 }
      );
    }

    const fonts = await loadExportFonts();
    const label =
      contentType === "reaction"
        ? getChemKind(text) === "reaction"
          ? "Reaction"
          : "Structure"
        : contentType === "concept"
          ? "Concept"
          : "Equation";

    const svg = await satori(
      <SciCardExportSvg
        width={width}
        height={height}
        label={label}
        contentType={contentType}
        visualImage={visualImage}
        fallbackText={text}
        explanation={explanation}
        idleFooterHint={idleHint(contentType, text)}
        colors={colors}
        transparentBackground={transparentBackground}
      />,
      { width, height, fonts }
    );

    if (format === "svg") {
      return new NextResponse(svg, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml",
          "Content-Disposition": 'attachment; filename="scicard.svg"',
          "Cache-Control": "no-store",
        },
      });
    }

    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: width },
      ...(transparentBackground
        ? { background: "rgba(0, 0, 0, 0)" }
        : { background: colors.surface }),
    });
    const png = resvg.render().asPng();
    trackUsage("export");

    return new NextResponse(Buffer.from(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": 'attachment; filename="scicard.png"',
        "Cache-Control": "no-store",
        "X-SciCard-Pixel-Ratio": String(scale),
        "X-SciCard-Size": `${width}x${height}`,
        ...rateLimitHeaders(limited),
      },
    });
  } catch (err) {
    console.error("[export]", err);
    const message = err instanceof Error ? err.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
