/**
 * detectType unit cases — run: npx tsx lib/detectType.test.ts
 */
import { detectType, getChemKind } from "./detectType";

type Case = { name: string; input: string; expected: ReturnType<typeof detectType> };

const cases: Case[] = [
  {
    name: "ambiguous short assign x = 5 → equation",
    input: "x = 5",
    expected: "equation",
  },
  {
    name: "ambiguous short F = ma → equation",
    input: "F = ma",
    expected: "equation",
  },
  {
    name: "mixed prose embeds formula → concept",
    input:
      "Newton's second law is F = ma when mass is constant.",
    expected: "concept",
  },
  {
    name: "mixed paragraph with LaTeX mid-sentence → concept",
    input:
      "Use the heat equation $\\nabla^2 T = \\frac{1}{\\alpha}\\frac{\\partial T}{\\partial t}$ when designing fins.",
    expected: "concept",
  },
  {
    name: "pure LaTeX equation → equation",
    input: String.raw`Q = U A \Delta T_{lm}`,
    expected: "equation",
  },
  {
    name: "reaction baseline → reaction",
    input: "CH4 + 2 O2 -> CO2 + 2 H2O",
    expected: "reaction",
  },
  {
    name: "short concept no punctuation → concept",
    input: "entropy always increases in an isolated system",
    expected: "concept",
  },
  {
    name: "special chars / emoji prose with ≥ → concept",
    input: "熵 increases — ΔS ≥ 0 ✅ and エネルギー保存 (energy conservation)",
    expected: "concept",
  },
  {
    name: "compact math symbols only → equation",
    input: "ΔS ≥ 0",
    expected: "equation",
  },
  {
    name: "empty → equation default",
    input: "   ",
    expected: "equation",
  },
];

let failed = 0;
for (const c of cases) {
  const actual = detectType(c.input);
  const ok = actual === c.expected;
  if (!ok) failed += 1;
  console.log(
    `${ok ? "PASS" : "FAIL"} ${c.name}\n  expected=${c.expected} actual=${actual}`
  );
}

const chemCases: {
  name: string;
  input: string;
  kind: ReturnType<typeof getChemKind>;
}[] = [
  {
    name: "glucose SMILES → structure",
    input: "C([C@@H]1[C@H]([C@@H]([C@H](C(O1)O)O)O)O)O",
    kind: "structure",
  },
  {
    name: "methane combustion → reaction",
    input: "CH4 + 2 O2 -> CO2 + 2 H2O",
    kind: "reaction",
  },
  {
    name: "SMILES reaction >> → reaction",
    input: "CCO>>CC=O",
    kind: "reaction",
  },
];

for (const c of chemCases) {
  const actual = getChemKind(c.input);
  const ok = actual === c.kind;
  if (!ok) failed += 1;
  console.log(
    `${ok ? "PASS" : "FAIL"} ${c.name}\n  expected=${c.kind} actual=${actual}`
  );
}

const total = cases.length + chemCases.length;
console.log(`\n${total - failed}/${total} passed`);
if (failed > 0) process.exit(1);
