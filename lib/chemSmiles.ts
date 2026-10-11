/**
 * Convert common formula / reaction notation into RDKit-friendly SMILES
 * or reaction SMILES. Returns null when conversion isn't confident.
 */

/** Small-molecule formula → SMILES map (MVP heuristics, not a parser). */
const FORMULA_TO_SMILES: Record<string, string> = {
  H2: "[H][H]",
  O2: "O=O",
  N2: "N#N",
  H2O: "O",
  CO2: "O=C=O",
  CO: "[C-]#[O+]",
  CH4: "C",
  C2H6: "CC",
  C2H4: "C=C",
  C2H2: "C#C",
  C6H6: "c1ccccc1",
  // Glucose (pyranose, non-stereo) — combustion / metabolism examples
  C6H12O6: "OCC1OC(O)C(O)C(O)C1O",
  glucose: "OCC1OC(O)C(O)C(O)C1O",
  GLUCOSE: "OCC1OC(O)C(O)C(O)C1O",
  fructose: "OCC1(O)OCC(O)C1O",
  sucrose: "OCC1OC(CO)(OC2OC(CO)C(O)C(O)C2O)C(O)C1O",
  C12H22O11: "OCC1OC(CO)(OC2OC(CO)C(O)C(O)C2O)C(O)C1O",
  NH3: "N",
  HCl: "Cl",
  NaCl: "[Na+].[Cl-]",
  NaOH: "[Na+].[OH-]",
  H2SO4: "OS(=O)(=O)O",
  HNO3: "O[N+](=O)[O-]",
  CH3OH: "CO",
  C2H5OH: "CCO",
  EtOH: "CCO",
  MeOH: "CO",
  acetic: "CC(=O)O",
  CH3COOH: "CC(=O)O",
  acetone: "CC(=O)C",
  benzene: "c1ccccc1",
  toluene: "Cc1ccccc1",
};

const ARROW_RE = /(?:->>|->|→|⇒|=>|>>)/;

function normalizeFormulaToken(token: string): string {
  return token.trim().replace(/\s+/g, "");
}

function formulaToSmiles(token: string): string | null {
  const cleaned = normalizeFormulaToken(token);
  if (!cleaned) return null;

  // SMILES, not an English name: punctuation, or aromatic atoms plus a ring digit.
  if (
    /[=#\[\]()@\\\/]/.test(cleaned) ||
    (/[a-z]/.test(cleaned) && /\d/.test(cleaned))
  ) {
    return cleaned;
  }

  // Coefficient prefix: "2O2" or "2 O2"
  const coeffMatch = cleaned.match(/^(\d+)(.+)$/);
  const formula = coeffMatch ? coeffMatch[2] : cleaned;
  const count = coeffMatch ? Math.min(parseInt(coeffMatch[1], 10), 6) : 1;

  const smiles =
    FORMULA_TO_SMILES[formula] ||
    FORMULA_TO_SMILES[formula.toUpperCase()] ||
    null;

  if (!smiles) return null;

  if (count <= 1) return smiles;
  return Array(count).fill(smiles).join(".");
}

function sideToSmiles(side: string): string | null {
  const parts = side
    .split("+")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  const smilesParts: string[] = [];
  for (const part of parts) {
    // "2 O2" with space
    const spaced = part.match(/^(\d+)\s+(.+)$/);
    const token = spaced ? `${spaced[1]}${spaced[2]}` : part;
    const s = formulaToSmiles(token);
    if (!s) return null;
    smilesParts.push(s);
  }
  return smilesParts.join(".");
}

export type ChemParseResult = {
  /** RDKit-ready SMILES or reaction SMILES */
  smiles: string;
  /** Whether this is a reaction (has >>) */
  isReaction: boolean;
  /** How we got here */
  source: "smiles" | "reaction-smiles" | "formula" | "lookup";
};

/** Local formula/name map only. Remote name lookup lives in chemLookup. */
export function smilesForFormulaToken(token: string): string | null {
  return formulaToSmiles(token);
}

function isPlainChemicalName(input: string): boolean {
  const text = input.trim();
  if (text.length < 3 || text.length > 80) return false;
  if (!/^[A-Za-z][A-Za-z \-']+$/.test(text)) return false;
  return /[a-z]/.test(text);
}

/**
 * Best-effort conversion of user paste → SMILES for the chem service.
 */
export function toRenderableSmiles(input: string): ChemParseResult | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Already reaction SMILES / SMARTS with >>
  if (trimmed.includes(">>")) {
    return {
      smiles: trimmed.replace(/\s+/g, ""),
      isReaction: true,
      source: "reaction-smiles",
    };
  }

  // Local map before the loose SMILES check, so "glucose" and "benzene"
  // stay formulas and plain names like "caffeine" can be looked up.
  if (!ARROW_RE.test(trimmed) && !trimmed.includes("+")) {
    const mapped = formulaToSmiles(trimmed);
    if (mapped) {
      return { smiles: mapped, isReaction: false, source: "formula" };
    }
    if (isPlainChemicalName(trimmed)) return null;
  }

  // Single-molecule SMILES (punctuation, digits, or atom letters — not a plain name)
  if (
    !ARROW_RE.test(trimmed) &&
    (/[=#\[\]()@\\\/]/.test(trimmed) ||
      /\d/.test(trimmed) ||
      /[cnosp]/i.test(trimmed))
  ) {
    return { smiles: trimmed.replace(/\s+/g, ""), isReaction: false, source: "smiles" };
  }

  // Formula / arrow reaction: CH4 + 2 O2 -> CO2 + 2 H2O
  if (ARROW_RE.test(trimmed)) {
    const parts = trimmed.split(ARROW_RE);
    if (parts.length >= 2) {
      const left = sideToSmiles(parts[0]);
      const right = sideToSmiles(parts[parts.length - 1]);
      if (left && right) {
        return {
          smiles: `${left}>>${right}`,
          isReaction: true,
          source: "formula",
        };
      }
    }
  }

  // Bare formula like "C6H6"
  const single = formulaToSmiles(trimmed);
  if (single && !ARROW_RE.test(trimmed) && !trimmed.includes("+")) {
    return { smiles: single, isReaction: false, source: "formula" };
  }

  return null;
}
