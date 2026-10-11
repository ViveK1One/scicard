import { createHash } from "crypto";
import { getChemKind, type ContentType } from "@/lib/detectType";

export type ExplanationVariable = {
  symbol: string;
  meaning: string;
};

export type Explanation = {
  content_type: ContentType;
  title: string;
  explanation: string;
  variables?: ExplanationVariable[];
  applications: string[];
  takeaway: string;
};

/** Placeholder provider: Groq free tier today → swap to Anthropic Claude when funded. */
export const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

export function hashInput(
  raw: string,
  detectedType: ContentType,
  model: string
): string {
  return createHash("sha256")
    .update(`${model}\n${detectedType}\n${raw.trim()}`)
    .digest("hex");
}

export const SYSTEM_PROMPT = `You are the explanation engine inside SciCard, a tool that turns STEM content into
teaching-quality visual cards. You will receive raw input (an equation, chemical
reaction, formula, or concept) and must return a structured explanation that helps
a student or professional understand it at a glance.

RULES:
- Be scientifically accurate. If you are not confident about a detail (e.g. an
  obscure variable meaning or edge-case application), omit it rather than guess.
- Be concise. This will be displayed on a visual card, not read as an essay.
- Match the level to the content: an undergraduate heat-transfer equation should
  read as clearly as a sol-gel synthesis reaction, without dumbing down or
  over-complicating either.
- Never invent citations, named theorems, or historical attributions you are not
  certain of.
- If the input is plain text/a concept with no formula, skip variable definitions
  and applications sections that don't apply — return only what's relevant.

OUTPUT FORMAT — return ONLY valid JSON, no markdown fences, no preamble:

{
  "content_type": "equation" | "reaction" | "concept",
  "title": "short descriptive name, e.g. 'LMTD heat exchanger equation'",
  "explanation": "1-2 sentences, plain language, what this is and why it matters",
  "variables": [
    { "symbol": "Q", "meaning": "heat duty" },
    { "symbol": "U", "meaning": "overall heat transfer coefficient" }
  ],
  "applications": ["short phrase", "short phrase"],
  "takeaway": "one sentence, the single most useful thing to remember"
}

If content_type is "concept" (no formula), omit the "variables" field entirely
rather than returning an empty array.

Keep "applications" to a maximum of 3 items, each under 6 words.
Keep "explanation" to a maximum of 2 sentences.
Keep "takeaway" to a single sentence, under 20 words.`;

export function buildUserMessage(
  rawInput: string,
  detectedType: ContentType
): string {
  let chemSubtypeNote = "";
  if (detectedType === "reaction") {
    const kind = getChemKind(rawInput);
    chemSubtypeNote =
      kind === "structure"
        ? `
Chemistry subtype: structure (single molecule / SMILES — no reaction arrow).
Explain what the molecule is (name if clear, key functional groups / skeleton).
Do NOT invent reaction conditions, stoichiometry, reagents, or products.
Keep content_type as "reaction" in the JSON (schema compatibility); focus the prose on structure.
`
        : `
Chemistry subtype: reaction (reactants → products).
Explain the transformation briefly; mention key reactants/products if clear.
Do not invent catalysts or conditions you are not confident about.
`;
  }

  return `Here is the raw input pasted by the user:

<input>
${rawInput}
</input>

Detected type (from client-side heuristic, may be wrong — verify and correct if needed): ${detectedType}
${chemSubtypeNote}
Return the JSON object as specified.`;
}

export function buildRepairMessage(invalidRaw: string): string {
  return `Your previous reply was not valid SciCard JSON. Fix it and return ONLY the JSON object — no markdown, no commentary.

Previous reply:
${invalidRaw.slice(0, 1200)}`;
}

function wordCount(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function clampSentences(text: string, maxSentences: number): string {
  const trimmed = text.trim();
  // Split on sentence terminators while keeping abbreviations roughly intact
  const parts = trimmed
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length <= maxSentences) return trimmed;
  return parts.slice(0, maxSentences).join(" ");
}

function clampWords(text: string, maxWords: number): string {
  const words = text
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(" ");
}

/** Pull the outermost JSON object from messy model output. */
export function extractJsonObject(text: string): string {
  let s = text.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }

  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model response");
  }
  return s.slice(start, end + 1);
}

/**
 * Strict parse + sanitize for open-source model output.
 * Throws if required fields are missing or unusable after cleanup.
 */
export function parseExplanation(raw: string): Explanation {
  const cleaned = extractJsonObject(raw);
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    throw new Error("Model response is not valid JSON");
  }

  const contentType = parsed.content_type;
  if (
    contentType !== "equation" &&
    contentType !== "reaction" &&
    contentType !== "concept"
  ) {
    throw new Error("Invalid content_type in model response");
  }

  if (typeof parsed.title !== "string" || !parsed.title.trim()) {
    throw new Error("Missing title in model response");
  }
  if (typeof parsed.explanation !== "string" || !parsed.explanation.trim()) {
    throw new Error("Missing explanation in model response");
  }
  if (typeof parsed.takeaway !== "string" || !parsed.takeaway.trim()) {
    throw new Error("Missing takeaway in model response");
  }

  let title = parsed.title.trim().replace(/\s+/g, " ");
  if (title.length > 80) title = title.slice(0, 77).trimEnd() + "…";

  let explanation = clampSentences(
    parsed.explanation.trim().replace(/\s+/g, " "),
    2
  );
  if (explanation.length > 320) {
    explanation = clampSentences(explanation.slice(0, 320), 2);
  }
  if (!explanation) {
    throw new Error("Explanation empty after sanitization");
  }

  let takeaway = clampSentences(
    parsed.takeaway.trim().replace(/\s+/g, " "),
    1
  );
  takeaway = clampWords(takeaway, 20);
  // Drop trailing incomplete fragments if model cut off mid-sentence oddly
  if (wordCount(takeaway) < 3) {
    throw new Error("Takeaway too short after sanitization");
  }

  const applications: string[] = [];
  if (Array.isArray(parsed.applications)) {
    for (const item of parsed.applications) {
      if (typeof item !== "string") continue;
      const phrase = clampWords(item.trim().replace(/\s+/g, " "), 6);
      if (!phrase || wordCount(phrase) === 0) continue;
      if (phrase.length > 48) continue;
      applications.push(phrase);
      if (applications.length >= 3) break;
    }
  }

  const result: Explanation = {
    content_type: contentType,
    title,
    explanation,
    applications,
    takeaway,
  };

  if (contentType === "concept") {
    // Schema: omit variables entirely for concepts
    return result;
  }

  if (Array.isArray(parsed.variables)) {
    const variables: ExplanationVariable[] = [];
    for (const v of parsed.variables) {
      if (!v || typeof v !== "object") continue;
      const row = v as Record<string, unknown>;
      if (typeof row.symbol !== "string" || typeof row.meaning !== "string") {
        continue;
      }
      const symbol = row.symbol.trim().replace(/\s+/g, " ");
      const meaning = row.meaning.trim().replace(/\s+/g, " ");
      if (!symbol || !meaning) continue;
      if (symbol.length > 24 || meaning.length > 100) continue;
      // Skip vague / hedging meanings — prefer omit over guess
      if (/^(unknown|n\/?a|unclear|not sure)\b/i.test(meaning)) continue;
      variables.push({ symbol, meaning });
      if (variables.length >= 12) break;
    }
    if (variables.length > 0) {
      result.variables = variables;
    }
  }

  return result;
}
