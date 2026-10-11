import { NextRequest, NextResponse } from "next/server";
import { resolveRenderableSmiles } from "@/lib/chemLookup";
import { rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import { trackUsage } from "@/lib/usage";

export const runtime = "nodejs";

type RenderChemBody = {
  /** Raw user paste OR already-normalized SMILES */
  input?: string;
  smiles?: string;
  format?: "svg" | "png";
  width?: number;
  height?: number;
};

const DEFAULT_CHEM_URL = "http://127.0.0.1:8000";
const CHEM_LIMIT = 60;
const CHEM_WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "chem", CHEM_LIMIT, CHEM_WINDOW_MS);
  if (!limited.ok) {
    trackUsage("rateLimited");
    return NextResponse.json(
      {
        error: "Too many chemistry renders. Please wait a few minutes.",
        retryAfterSec: limited.retryAfterSec,
      },
      { status: 429, headers: rateLimitHeaders(limited) }
    );
  }

  try {
    const body = (await req.json()) as RenderChemBody;
    const format = body.format === "png" ? "png" : "svg";
    const width = Math.min(Math.max(body.width ?? 720, 120), 2000);
    const height = Math.min(Math.max(body.height ?? 240, 80), 1200);

    let smiles = (body.smiles ?? "").trim();
    if (!smiles && body.input) {
      const parsed = await resolveRenderableSmiles(body.input);
      if (!parsed) {
        return NextResponse.json(
          {
            error:
              "Could not convert input to SMILES. Paste SMILES/SMARTS or a simple formula reaction.",
          },
          { status: 422 }
        );
      }
      smiles = parsed.smiles;
    }

    if (!smiles) {
      return NextResponse.json(
        { error: "Provide smiles or input" },
        { status: 400 }
      );
    }
    if (smiles.length > 4000) {
      return NextResponse.json(
        { error: "SMILES input is too long" },
        { status: 413 }
      );
    }

    const base = (process.env.CHEM_SERVICE_URL || DEFAULT_CHEM_URL).replace(
      /\/$/,
      ""
    );

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const secret = process.env.CHEM_SERVICE_SECRET;
    if (secret) {
      headers["x-scicard-chem-secret"] = secret;
    }

    const upstream = await fetch(`${base}/render`, {
      method: "POST",
      headers,
      body: JSON.stringify({ smiles, format, width, height }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      return NextResponse.json(
        {
          error: `Chem service error (${upstream.status})`,
          detail: detail.slice(0, 500),
        },
        { status: upstream.status === 422 ? 422 : 502 }
      );
    }

    const contentType =
      upstream.headers.get("content-type") ||
      (format === "png" ? "image/png" : "image/svg+xml");
    const buf = Buffer.from(await upstream.arrayBuffer());
    trackUsage("chem");

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
        "X-SciCard-Smiles": smiles.slice(0, 200),
        ...rateLimitHeaders(limited),
      },
    });
  } catch (err) {
    console.error("[render-chem]", err);
    const message =
      err instanceof Error ? err.message : "Chem render proxy failed";
    const unreachable =
      /ECONNREFUSED|fetch failed|ENOTFOUND/i.test(message) ||
      (err instanceof TypeError && message.includes("fetch"));
    return NextResponse.json(
      {
        error: unreachable
          ? "Chem service unreachable. Start chem-service on port 8000."
          : message,
      },
      { status: 502 }
    );
  }
}
