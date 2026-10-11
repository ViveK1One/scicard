import {
  smilesForFormulaToken,
  toRenderableSmiles,
  type ChemParseResult,
} from "@/lib/chemSmiles";

const ARROW_RE = /(?:->>|->|→|⇒|=>|>>)/;
const cache = new Map<string, string | null>();

function withCount(smiles: string, count: number): string {
  if (count <= 1) return smiles;
  return Array(count).fill(smiles).join(".");
}

function splitCoeff(token: string): { count: number; name: string } {
  const trimmed = token.trim();
  const spaced = trimmed.match(/^(\d+)\s+(.+)$/);
  if (spaced) {
    return {
      count: Math.min(parseInt(spaced[1], 10) || 1, 6),
      name: spaced[2].trim(),
    };
  }
  return { count: 1, name: trimmed };
}

function acceptableSmiles(text: string): string | null {
  const line = text
    .split(/\r?\n/)
    .map((part) => part.trim())
    .find(Boolean);
  if (!line || line.length > 2000) return null;
  if (/status:|error|<!doctype|<html/i.test(line)) return null;
  if (/\s/.test(line)) return null;
  return line;
}

async function fetchSmiles(
  url: string
): Promise<{ smiles: string | null; definitive: boolean }> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        Accept: "text/plain",
        "User-Agent": "SciCard/0.1 (STEM visual cards)",
      },
      cache: "no-store",
    });
    if (res.status >= 500) return { smiles: null, definitive: false };
    const text = await res.text();
    if (!res.ok) return { smiles: null, definitive: true };
    return { smiles: acceptableSmiles(text), definitive: true };
  } catch {
    return { smiles: null, definitive: false };
  }
}

async function lookupName(name: string): Promise<string | null> {
  const key = name.trim().toLowerCase();
  if (!key || key.length > 80) return null;
  if (key.split(/\s+/).length > 4) return null;
  if (!/^[a-z0-9 ,'\-()]+$/i.test(name.trim())) return null;
  if (cache.has(key)) return cache.get(key) ?? null;

  const encoded = encodeURIComponent(name.trim());
  const pubchem = await fetchSmiles(
    `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encoded}/property/CanonicalSMILES/TXT`
  );
  if (pubchem.smiles) {
    cache.set(key, pubchem.smiles);
    return pubchem.smiles;
  }
  const opsin = await fetchSmiles(
    `https://opsin.ch.cam.ac.uk/opsin/${encoded}.smi`
  );
  if (opsin.smiles) {
    cache.set(key, opsin.smiles);
    return opsin.smiles;
  }
  if (pubchem.definitive && opsin.definitive) cache.set(key, null);
  return null;
}

async function tokenToSmiles(token: string): Promise<string | null> {
  const local = smilesForFormulaToken(token);
  if (local) return local;
  const { count, name } = splitCoeff(token);
  const remote = await lookupName(name);
  if (!remote) return null;
  return withCount(remote, count);
}

async function sideToSmiles(side: string): Promise<string | null> {
  const parts = side
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 6);
  if (parts.length === 0) return null;
  const smiles: string[] = [];
  for (const part of parts) {
    const one = await tokenToSmiles(part);
    if (!one) return null;
    smiles.push(one);
  }
  return smiles.join(".");
}

/**
 * Local formula map first, then PubChem / OPSIN for ordinary chemical names.
 */
export async function resolveRenderableSmiles(
  input: string
): Promise<ChemParseResult | null> {
  const local = toRenderableSmiles(input);
  if (local) return local;

  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 500) return null;

  if (ARROW_RE.test(trimmed)) {
    const parts = trimmed.split(ARROW_RE);
    if (parts.length < 2) return null;
    const left = await sideToSmiles(parts[0]);
    const right = await sideToSmiles(parts[parts.length - 1]);
    if (!left || !right) return null;
    return { smiles: `${left}>>${right}`, isReaction: true, source: "lookup" };
  }

  if (trimmed.includes("+")) {
    const joined = await sideToSmiles(trimmed);
    if (!joined) return null;
    return { smiles: joined, isReaction: false, source: "lookup" };
  }

  const single = await tokenToSmiles(trimmed);
  if (!single) return null;
  return { smiles: single, isReaction: false, source: "lookup" };
}
