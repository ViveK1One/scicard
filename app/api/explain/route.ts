import { NextRequest, NextResponse } from "next/server";
import type { ContentType } from "@/lib/detectType";
import {
  DEFAULT_GROQ_MODEL,
  SYSTEM_PROMPT,
  buildRepairMessage,
  buildUserMessage,
  hashInput,
  parseExplanation,
  type Explanation,
} from "@/lib/explain";
import { rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import { trackUsage } from "@/lib/usage";

export const runtime = "nodejs";

/**
 * Teach-me provider: Groq (Llama 3.3 70B) as a free-tier placeholder.
 * Same prompt/schema — swap to Anthropic Claude later by replacing this
 * fetch with the Messages API and ANTHROPIC_API_KEY (keep parseExplanation).
 */

type ExplainBody = {
  input?: string;
  detectedType?: ContentType;
};

/** In-memory cache keyed by hash(model + detectedType + raw input) */
const cache = new Map<string, Explanation>();

const VALID_TYPES: ContentType[] = ["equation", "reaction", "concept"];

/** Soft launch: 20 Teach-me calls / IP / 10 minutes */
const EXPLAIN_LIMIT = 20;
const EXPLAIN_WINDOW_MS = 10 * 60 * 1000;

async function callGroq(
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[]
): Promise<string> {
  const groqRes = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 600,
        response_format: { type: "json_object" },
        messages,
      }),
    }
  );

  if (!groqRes.ok) {
    const errText = await groqRes.text().catch(() => "");
    console.error("[explain] Groq error", groqRes.status, errText);
    throw Object.assign(new Error(`Groq API error (${groqRes.status})`), {
      status: 502,
      detail: errText.slice(0, 500),
    });
  }

  const data = (await groqRes.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content?.trim()) {
    throw Object.assign(new Error("Empty response from Groq"), { status: 502 });
  }
  return content;
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "explain", EXPLAIN_LIMIT, EXPLAIN_WINDOW_MS);
  if (!limited.ok) {
    trackUsage("rateLimited");
    return NextResponse.json(
      {
        error: "Too many Teach me requests. Please wait a few minutes.",
        retryAfterSec: limited.retryAfterSec,
      },
      { status: 429, headers: rateLimitHeaders(limited) }
    );
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not configured on the server" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as ExplainBody;
    const input = (body.input ?? "").trim();
    const detectedType = body.detectedType;

    if (!input) {
      return NextResponse.json({ error: "input is required" }, { status: 400 });
    }
    if (input.length > 8000) {
      return NextResponse.json(
        { error: "input is too long (max 8000 characters)" },
        { status: 413 }
      );
    }
    if (!detectedType || !VALID_TYPES.includes(detectedType)) {
      return NextResponse.json(
        { error: "detectedType must be equation | reaction | concept" },
        { status: 400 }
      );
    }

    const model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
    const cacheKey = hashInput(input, detectedType, model);
    const cached = cache.get(cacheKey);
    if (cached) {
      trackUsage("explainCached");
      return NextResponse.json(
        { explanation: cached, cached: true },
        { headers: rateLimitHeaders(limited) }
      );
    }

    const baseMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserMessage(input, detectedType) },
    ];

    let raw = await callGroq(apiKey, model, baseMessages);
    let explanation: Explanation | null = null;
    let parseError: unknown = null;

    try {
      explanation = parseExplanation(raw);
    } catch (err) {
      parseError = err;
      try {
        raw = await callGroq(apiKey, model, [
          ...baseMessages,
          { role: "assistant", content: raw },
          { role: "user", content: buildRepairMessage(raw) },
        ]);
        explanation = parseExplanation(raw);
        parseError = null;
      } catch (retryErr) {
        parseError = retryErr;
      }
    }

    if (!explanation) {
      console.error("[explain] JSON validation failed", raw, parseError);
      return NextResponse.json(
        {
          error: "Model returned invalid JSON after validation",
          detail:
            parseError instanceof Error ? parseError.message : "parse failed",
          raw: raw.slice(0, 800),
        },
        { status: 502 }
      );
    }

    cache.set(cacheKey, explanation);
    trackUsage("explain");

    return NextResponse.json(
      {
        explanation,
        cached: false,
        provider: "groq",
        model,
      },
      { headers: rateLimitHeaders(limited) }
    );
  } catch (err) {
    console.error("[explain]", err);
    const status =
      err && typeof err === "object" && "status" in err
        ? Number((err as { status: number }).status)
        : 500;
    const detail =
      err && typeof err === "object" && "detail" in err
        ? String((err as { detail: string }).detail)
        : undefined;
    const message = err instanceof Error ? err.message : "Explain failed";
    return NextResponse.json(
      { error: message, detail },
      { status: status || 500 }
    );
  }
}
