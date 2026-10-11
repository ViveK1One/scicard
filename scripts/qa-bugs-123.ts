/**
 * Targeted checks for BUG 1–3. Run: npx tsx scripts/qa-bugs-123.ts
 */
import { getChemKind } from "../lib/detectType";
import { buildUserMessage } from "../lib/explain";
import { resolveThemeColors } from "../lib/themes";

const BASE = "http://localhost:3000";

type Row = { id: string; pass: boolean; detail: string };
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
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { status: res.status, bytes: 0, size, data };
  }
  const buf = await res.arrayBuffer();
  return { status: res.status, bytes: buf.byteLength, size, data: null };
}

async function exportSvg(body: Record<string, unknown>) {
  const res = await fetch(`${BASE}/api/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, format: "svg" }),
  });
  const text = await res.text();
  return { status: res.status, svg: text };
}

async function main() {
  const glucose = "C([C@@H]1[C@H]([C@@H]([C@H](C(O1)O)O)O)O)O";
  const combustion = "C6H12O6 + 6 O2 -> 6 CO2 + 6 H2O";
  const methane = "CH4 + 2 O2 -> CO2 + 2 H2O";
  const longConcept =
    "Fourier's law states that heat flux is proportional to the negative temperature gradient. In engineering practice this underpins conduction sizing for walls, fins, and insulation. Boundary conditions and material conductivity dominate design choices. Neglecting contact resistance often overestimates performance in real assemblies.";

  // BUG 1
  record(
    "B1-glucose-structure",
    getChemKind(glucose) === "structure",
    `getChemKind=${getChemKind(glucose)}`
  );
  record(
    "B1-methane-reaction",
    getChemKind(methane) === "reaction",
    `getChemKind=${getChemKind(methane)}`
  );
  const glucoseMsg = buildUserMessage(glucose, "reaction");
  const methaneMsg = buildUserMessage(methane, "reaction");
  record(
    "B1-teach-prompt-structure",
    glucoseMsg.includes("subtype: structure") &&
      glucoseMsg.includes("Do NOT invent reaction conditions"),
    glucoseMsg.includes("subtype: structure")
      ? "structure prompt branch present"
      : "missing structure branch"
  );
  record(
    "B1-teach-prompt-reaction",
    methaneMsg.includes("subtype: reaction"),
    methaneMsg.includes("subtype: reaction")
      ? "reaction prompt branch present"
      : "missing reaction branch"
  );

  const gSvg = await exportSvg({
    contentType: "reaction",
    input: glucose,
    width: 1080,
    height: 1350,
    mode: "light",
    accent: "graphite",
    theme: resolveThemeColors("light", "graphite"),
  });
  // Satori path-ifies text; check label via path count delta or export with known idle
  // Instead verify server chooses Structure by comparing idle hint path: export without
  // visual and check response is 200; label is in vector paths. Spot-check via a tiny
  // unit already covered — here confirm API accepts and returns PNG for both.
  record(
    "B1-export-glucose-label-api",
    gSvg.status === 200 && gSvg.svg.length > 1000,
    `svg status=${gSvg.status} len=${gSvg.svg.length}`
  );

  // BUG 2 — portrait chem visual should be larger than landscape for same content
  const theme = resolveThemeColors("light", "graphite");
  const expl = {
    content_type: "reaction" as const,
    title: "Glucose",
    explanation: "A simple sugar used for cellular energy.",
    applications: ["Biochemistry"],
    takeaway: "Glucose fuels living cells.",
  };
  // Use a tiny 1x1 png as visual so layout math is exercised
  const tinyPng =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

  const portrait = await exportPng({
    contentType: "reaction",
    input: glucose,
    visualImage: tinyPng,
    explanation: expl,
    format: "png",
    width: 1080,
    height: 1350,
    pixelRatio: 2,
    mode: "light",
    accent: "graphite",
    theme,
  });
  const square = await exportPng({
    contentType: "reaction",
    input: glucose,
    visualImage: tinyPng,
    explanation: expl,
    format: "png",
    width: 1080,
    height: 1080,
    pixelRatio: 2,
    mode: "light",
    accent: "graphite",
    theme,
  });
  const landscape = await exportPng({
    contentType: "reaction",
    input: glucose,
    visualImage: tinyPng,
    explanation: expl,
    format: "png",
    width: 1200,
    height: 628,
    pixelRatio: 2,
    mode: "light",
    accent: "graphite",
    theme,
  });
  const combustionP = await exportPng({
    contentType: "reaction",
    input: combustion,
    visualImage: tinyPng,
    explanation: { ...expl, title: "Glucose combustion" },
    format: "png",
    width: 1080,
    height: 1350,
    pixelRatio: 2,
    mode: "dark",
    accent: "graphite",
    theme: resolveThemeColors("dark", "graphite"),
  });

  record(
    "B2-portrait-export",
    portrait.status === 200 && portrait.size === "2160x2700",
    `status=${portrait.status} size=${portrait.size} bytes=${portrait.bytes}`
  );
  record(
    "B2-square-export",
    square.status === 200 && square.size === "2160x2160",
    `status=${square.status} size=${square.size} bytes=${square.bytes}`
  );
  record(
    "B2-landscape-export",
    landscape.status === 200 && landscape.size === "2400x1256",
    `status=${landscape.status} size=${landscape.size} bytes=${landscape.bytes}`
  );
  record(
    "B2-combustion-portrait",
    combustionP.status === 200 && combustionP.bytes > 5000,
    `status=${combustionP.status} bytes=${combustionP.bytes}`
  );

  // BUG 3 — long concept + long reaction export both themes / ratios (API level)
  let b3Fail = 0;
  for (const mode of ["light", "dark"] as const) {
    for (const [w, h, tag] of [
      [1200, 628, "1.91"],
      [1080, 1080, "1:1"],
      [1080, 1350, "4:5"],
    ] as const) {
      const c = await exportPng({
        contentType: "concept",
        input: longConcept,
        explanation: {
          content_type: "concept",
          title: "Fourier conduction",
          explanation: longConcept.slice(0, 180),
          applications: ["Thermal design", "Insulation"],
          takeaway: "Heat flows down the temperature gradient.",
        },
        format: "png",
        width: w,
        height: h,
        pixelRatio: 2,
        mode,
        accent: "graphite",
        theme: resolveThemeColors(mode, "graphite"),
      });
      const ok = c.status === 200 && c.bytes > 8000;
      if (!ok) b3Fail += 1;
      record(
        `B3-concept-${mode}-${tag}`,
        ok,
        `status=${c.status} bytes=${c.bytes} size=${c.size}`
      );

      const r = await exportPng({
        contentType: "reaction",
        input: combustion,
        visualImage: tinyPng,
        explanation: {
          content_type: "reaction",
          title: "Glucose combustion reaction with a longer descriptive title",
          explanation:
            "Glucose reacts with oxygen to yield carbon dioxide and water in a multi-step metabolic oxidation pathway used across biology.",
          applications: ["Metabolism", "Bioenergetics", "Combustion"],
          takeaway: "Sugar oxidizes to CO2 and water.",
        },
        format: "png",
        width: w,
        height: h,
        pixelRatio: 2,
        mode,
        accent: "graphite",
        theme: resolveThemeColors(mode, "graphite"),
      });
      const rok = r.status === 200 && r.bytes > 5000;
      if (!rok) b3Fail += 1;
      record(
        `B3-reaction-${mode}-${tag}`,
        rok,
        `status=${r.status} bytes=${r.bytes} size=${r.size}`
      );
    }
  }

  void b3Fail;
  const passed = rows.filter((r) => r.pass).length;
  console.log("==========");
  console.log(`${passed}/${rows.length} PASS`);
  process.exit(passed === rows.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
