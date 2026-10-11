/**
 * Capture the live reaction/chem SVG for PNG export without baking a white plate.
 */

function stripOpaqueSvgBackground(svg: string): string {
  let out = svg;
  // RDKit / common drawers: full-size white (or near-white) rect behind the drawing
  out = out.replace(
    /<rect[^>]*fill\s*=\s*["'](?:#fff(?:fff)?|#FFFFFF|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))["'][^>]*\/?>/gi,
    ""
  );
  // Ensure root svg has no solid background fill
  out = out.replace(
    /(<svg\b[^>]*?)\sfill\s*=\s*["'](?:#fff(?:fff)?|#FFFFFF|white)["']/i,
    "$1"
  );
  if (!/\bstyle\s*=/.test(out.match(/<svg\b[^>]*>/i)?.[0] ?? "")) {
    out = out.replace(
      /<svg\b/i,
      '<svg style="background:transparent"'
    );
  }
  return out;
}

/** Serialize the on-screen chem SVG to a data URL suitable for Satori. */
export function snapshotReactionSvgForExport(
  rootSelector = "[data-reaction-render]"
): string | undefined {
  const host = document.querySelector(rootSelector);
  if (!host) return undefined;

  const svgEl = host.querySelector("svg");
  if (!svgEl) return undefined;

  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  if (!clone.getAttribute("xmlns")) {
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }

  let serialized = new XMLSerializer().serializeToString(clone);
  serialized = stripOpaqueSvgBackground(serialized);

  const encoded = encodeURIComponent(serialized)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");

  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}
