/**
 * Hardening regression checks for Tasks 1–3.
 * Run: npx tsx scripts/qa-hardening.ts
 */
import { detectType } from "../lib/detectType";
import { resolveThemeColors } from "../lib/themes";

const BASE = "http://localhost:3000";

type Row = {
  id: string;
  pass: boolean;
  detail: string;
};

const rows: Row[] = [];

function record(id: string, pass: boolean, detail: string) {
  rows.push({ id, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${id}\n  ${detail}\n`);
}

async function exportPng(body: Record<string, unknown>) {
  const res = await fetch(`${BASE}/api/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const size = res.headers.get("X-SciCard-Size");
  const pr = res.headers.get("X-SciCard-Pixel-Ratio");
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { status: res.status, bytes: 0, size, pr, data };
  }
  const buf = await res.arrayBuffer();
  return { status: res.status, bytes: buf.byteLength, size, pr, data: null };
}

async function main() {
  // --- Task 1 samples ---
  record(
    "T1-ambiguous-x=5",
    detectType("x = 5") === "equation",
    `detect=${detectType("x = 5")}`
  );
  record(
    "T1-mixed-prose-formula",
    detectType("Newton's second law is F = ma when mass is constant.") ===
      "concept",
    `detect=${detectType("Newton's second law is F = ma when mass is constant.")}`
  );

  // --- Task 3 exports ---
  const lmtd = String.raw`Q = U A \Delta T_{lm}`;
  const nabla = String.raw`\nabla^2 T = \frac{1}{\alpha} \frac{\partial T}{\partial t}`;
  const rxn = "CH4 + 2 O2 -> CO2 + 2 H2O";
  const concept =
    "Le Chatelier's principle explains why raising pressure shifts equilibrium toward fewer gas moles.";

  const combos: Array<{
    id: string;
    contentType: string;
    input: string;
    w: number;
    h: number;
    mode: "light" | "dark";
    transparent?: boolean;
    pixelRatio: number;
  }> = [
    {
      id: "T3-eq-1:1-light@2",
      contentType: "equation",
      input: lmtd,
      w: 1080,
      h: 1080,
      mode: "light",
      pixelRatio: 2,
    },
    {
      id: "T3-eq-4:5-dark@2",
      contentType: "equation",
      input: lmtd,
      w: 1080,
      h: 1350,
      mode: "dark",
      pixelRatio: 2,
    },
    {
      id: "T3-eq-nabla-1:1@2",
      contentType: "equation",
      input: nabla,
      w: 1080,
      h: 1080,
      mode: "light",
      pixelRatio: 2,
    },
    {
      id: "T3-eq-lmtd-transparent@2",
      contentType: "equation",
      input: lmtd,
      w: 1080,
      h: 1080,
      mode: "light",
      transparent: true,
      pixelRatio: 2,
    },
    {
      id: "T3-rxn-1:1-light@2",
      contentType: "reaction",
      input: rxn,
      w: 1080,
      h: 1080,
      mode: "light",
      pixelRatio: 2,
    },
    {
      id: "T3-rxn-4:5-dark@2",
      contentType: "reaction",
      input: rxn,
      w: 1080,
      h: 1350,
      mode: "dark",
      pixelRatio: 2,
    },
    {
      id: "T3-concept-1:1-light@2",
      contentType: "concept",
      input: concept,
      w: 1080,
      h: 1080,
      mode: "light",
      pixelRatio: 2,
    },
    {
      id: "T3-concept-4:5-dark@3",
      contentType: "concept",
      input: concept,
      w: 1080,
      h: 1350,
      mode: "dark",
      pixelRatio: 3,
    },
  ];

  for (const c of combos) {
    const theme = resolveThemeColors(c.mode, "graphite");
    const r = await exportPng({
      contentType: c.contentType,
      input: c.input,
      format: "png",
      width: c.w,
      height: c.h,
      pixelRatio: c.pixelRatio,
      transparentBackground: !!c.transparent,
      theme,
    });
    const expectW = Math.round(c.w * c.pixelRatio);
    const expectH = Math.round(c.h * c.pixelRatio);
    const sizeOk = r.size === `${expectW}x${expectH}`;
    const pass = r.status === 200 && r.bytes > 2000 && sizeOk;
    record(
      c.id,
      pass,
      `status=${r.status} bytes=${r.bytes} size=${r.size} (expect ${expectW}x${expectH}) pr=${r.pr} transparent=${!!c.transparent}`
    );
  }

  const passed = rows.filter((r) => r.pass).length;
  console.log("==========");
  console.log(`${passed}/${rows.length} PASS`);
  process.exit(passed === rows.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
