export type ContentType = "equation" | "reaction" | "concept";

/** Chemistry subtype under the Reaction tab / content_type "reaction". */
export type ChemKind = "reaction" | "structure";

/** True reaction arrows (formula or reaction SMILES). */
export const REACTION_ARROW_RE = /->>|->|→|⇒|=>|>>/;

/**
 * Distinguish a real reaction from a single-molecule structure.
 * Used for card labels and Teach-me prompt context — both still route as
 * content_type "reaction" for tabs / API compatibility.
 */
export function getChemKind(input: string): ChemKind {
  return REACTION_ARROW_RE.test(input.trim()) ? "reaction" : "structure";
}

function wordCount(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function isProseHeavy(trimmed: string, words: number): boolean {
  if (/[.?!。！？]/.test(trimmed)) return true;
  if (/[\u0400-\u04FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/.test(trimmed)) {
    return true;
  }
  // Emoji / pictographs (avoid unicode property escapes for older TS targets)
  if (/(?:\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F\uDE80-\uDEFF]|[\u2600-\u27BF])/.test(trimmed)) {
    return true;
  }
  // Short English sentences without terminal punctuation still read as prose.
  // Avoid matching bare "A"/"An" as articles (common math variables).
  if (
    words >= 4 &&
    /\b(the|this|that|when|where|because|explains|states|means|always|equals|called)\b/i.test(
      trimmed
    )
  ) {
    return true;
  }
  if (words >= 4 && /(?:^|\s)(?:a|an)(?:\s|$)/.test(trimmed)) {
    return true;
  }
  // Prefer real English word density over raw token count — spaced LaTeX
  // like "Q = U A \\Delta T_{lm}" has 6 tokens but is not prose.
  // Ignore LaTeX command names (\Delta → Delta) when counting English words.
  const withoutLatexCmds = trimmed.replace(/\\[a-zA-Z]+/g, " ");
  const alphaWords = withoutLatexCmds.match(/\b[a-zA-Z]{3,}\b/g) ?? [];
  if (alphaWords.length >= 4) return true;
  if (words >= 12 && alphaWords.length >= 2) return true;
  return false;
}

/**
 * Compact formula line (ambiguous short assigns like "x = 5", "F = ma").
 * Whole paste must look like one formula — not a sentence containing "=".
 */
function isCompactFormulaLine(trimmed: string, words: number): boolean {
  if (words === 0 || words > 8) return false;
  if (/[.?!。！？]/.test(trimmed)) return false;
  if (trimmed.includes("\n")) return false;
  return /^(?:\$\$?)?[A-Za-z\\Δ∇∂α-ωΑ-Ω][^=\n]{0,40}=\s*\S/.test(trimmed);
}

/**
 * Heuristic content-type detector.
 *
 * Priority (first match wins):
 * 1. Empty → `"equation"` (UI default tab)
 * 2. Strong reaction signals (arrow / chem jargon / formula reaction / short SMILES),
 *    unless the paste is LaTeX-heavy *and* not prose
 * 3. LaTeX-heavy compact math → `"equation"`
 * 4. Compact math symbols / short assigns without prose → `"equation"`
 * 5. Else → `"concept"`
 *
 * Mixed-content rule: a sentence or paragraph that embeds a formula mid-prose
 * (e.g. "Newton's second law is F = ma when mass is constant.") is `"concept"`.
 * Auto-detect prefers the surrounding communicative intent. Users who want
 * Equation/Reaction rendering can lock the type with the manual toggle.
 *
 * Manual override: `InputPanel` pauses this heuristic when the user picks a
 * tab; "Use auto-detect" clears the lock and re-runs `detectType`.
 */
export function detectType(input: string): ContentType {
  const trimmed = input.trim();

  if (!trimmed) {
    return "equation";
  }

  const words = wordCount(trimmed);
  const latexHeavy =
    /\\[a-zA-Z]+|\$\$|\$[^$]+\$|\\frac|\\partial|\\sum|\\int/.test(trimmed);
  const prose = isProseHeavy(trimmed, words);

  // --- Strong chemistry signals ---
  // (Arrow reactions and single-molecule SMILES both return content_type
  // "reaction"; use getChemKind() for STRUCTURE vs REACTION labeling.)
  const chemKeywords =
    /\b(SMILES|SMARTS|reagent|catalyst|precursor|stoichiometr(?:y|ic))\b/i;
  const formulaReaction =
    /\b(?:[A-Z][a-z]?\d+[A-Za-z0-9]*|[A-Z][a-z]?(?:\d+[A-Za-z0-9]*)?)\s*\+\s*\d*\s*[A-Z][a-z]?\d*/;
  const hasChemDigitFormula = /\b[A-Z][a-z]?\d+\b/.test(trimmed);
  const smilesLike =
    /(?:^|[\s.])(?:c\d|C(?:C|O|N|=|#|\(|\[)|O=|N#|\[[A-Za-z])/;

  // Chemistry wins over embedded math when not a pure LaTeX block
  if (!latexHeavy || prose) {
    if (REACTION_ARROW_RE.test(trimmed)) {
      return "reaction";
    }
    if (chemKeywords.test(trimmed)) {
      return "reaction";
    }
    if (
      formulaReaction.test(trimmed) &&
      (hasChemDigitFormula || /\b(?:O2|N2|H2|CO2|H2O)\b/.test(trimmed))
    ) {
      return "reaction";
    }
    if (
      smilesLike.test(trimmed) &&
      /[=#()\[\]]/.test(trimmed) &&
      words <= 8 &&
      !prose
    ) {
      return "reaction";
    }
  }

  // Pure / compact LaTeX → equation. Mixed prose+LaTeX → concept (see header).
  if (latexHeavy && !prose) {
    return "equation";
  }

  const mathSymbols = /[≠≤≥∂∇∫∑√]/;

  if (!prose && mathSymbols.test(trimmed) && words <= 12) {
    return "equation";
  }

  if (!prose && isCompactFormulaLine(trimmed, words)) {
    return "equation";
  }

  return "concept";
}
