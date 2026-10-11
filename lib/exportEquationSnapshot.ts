import { toPng, getFontEmbedCSS } from "html-to-image";
import { renderLatexToHtml } from "@/lib/katexRender";

const EXPORT_MAX_WIDTH = 920;
const BASE_FONT_PX = 42;
const MIN_FONT_PX = 14;

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

/** True if PNG has almost no ink relative to its background. */
async function isMostlyBlankPng(
  dataUrl: string,
  backgroundColor?: string
): Promise<boolean> {
  const bg = backgroundColor ? parseHex(backgroundColor) : null;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const w = Math.min(img.naturalWidth, 400);
        const h = Math.min(img.naturalHeight, 200);
        if (w < 2 || h < 2) {
          resolve(true);
          return;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(false);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);
        let ink = 0;
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 20) continue;
          if (!bg) {
            // Transparent export: any opaque pixel counts as ink
            ink += 1;
            continue;
          }
          const dist =
            Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
          if (dist > 80) ink += 1;
        }
        resolve(ink < 8);
      } catch {
        resolve(false);
      }
    };
    img.onerror = () => resolve(true);
    img.src = dataUrl;
  });
}

async function rasterizeHost(
  host: HTMLElement,
  opts: { backgroundColor?: string; pixelRatio: number }
): Promise<string | undefined> {
  const fontEmbedCSS = await getFontEmbedCSS(host);
  const dataUrl = await toPng(host, {
    pixelRatio: opts.pixelRatio,
    backgroundColor: opts.backgroundColor,
    cacheBust: true,
    fontEmbedCSS,
    style: {
      overflow: "visible",
      opacity: "1",
      visibility: "visible",
    },
  });
  if (await isMostlyBlankPng(dataUrl, opts.backgroundColor)) return undefined;
  return dataUrl;
}

function shrinkToFit(inner: HTMLElement, available: number) {
  let fontSize = BASE_FONT_PX;
  inner.style.fontSize = `${fontSize}px`;
  while (inner.scrollWidth > available && fontSize > MIN_FONT_PX) {
    fontSize -= 1;
    inner.style.fontSize = `${fontSize}px`;
  }
  return fontSize;
}

export type EquationSnapshotOptions = {
  ink?: string;
  surface?: string;
  /** Device pixel ratio for sharp retina snapshots (2–3). */
  pixelRatio?: number;
  /** Omit solid fill behind KaTeX for transparent card exports. */
  transparentBackground?: boolean;
};

/**
 * Snapshot KaTeX for export: in-viewport host + embedded KaTeX webfonts + auto-shrink.
 * Returns undefined if rasterization yields a blank image (caller uses text fallback).
 */
export async function snapshotEquationForExport(
  latex: string,
  colors?: EquationSnapshotOptions
): Promise<string | undefined> {
  const { html, error } = renderLatexToHtml(latex);
  if (!html || error) return undefined;

  const ink = colors?.ink ?? "#1a1a1a";
  const transparent = !!colors?.transparentBackground;
  // Prefer undefined (no fill) for html-to-image alpha; avoid CSS "transparent"→black
  const surface = transparent ? undefined : (colors?.surface ?? "#ffffff");
  const pixelRatio = Math.min(Math.max(colors?.pixelRatio ?? 2, 1), 3);

  const host = document.createElement("div");
  host.setAttribute("data-scicard-export", "equation");
  Object.assign(host.style, {
    position: "fixed",
    left: "16px",
    top: "16px",
    width: `${EXPORT_MAX_WIDTH}px`,
    padding: "20px 24px",
    margin: "0",
    backgroundColor: surface ?? "transparent",
    color: ink,
    overflow: "visible",
    pointerEvents: "none",
    zIndex: "2147483000",
    boxSizing: "border-box",
  });

  const inner = document.createElement("div");
  inner.className = "scicard-katex scicard-katex-export";
  Object.assign(inner.style, {
    display: "inline-block",
    width: "max-content",
    overflow: "visible",
    whiteSpace: "nowrap",
    fontSize: `${BASE_FONT_PX}px`,
    lineHeight: "1.2",
    textAlign: "center",
    color: ink,
  });
  inner.innerHTML = html;
  host.appendChild(inner);
  document.body.appendChild(host);

  try {
    if (document.fonts?.ready) await document.fonts.ready;
    try {
      await Promise.all(
        [
          "KaTeX_Main",
          "KaTeX_Math",
          "KaTeX_Size1",
          "KaTeX_Size2",
          "KaTeX_Size3",
          "KaTeX_Size4",
        ].map((f) =>
          document.fonts.load(`400 16px "${f}"`).catch(() => undefined)
        )
      );
    } catch {
      /* ignore */
    }
    await waitForPaint();

    shrinkToFit(inner, EXPORT_MAX_WIDTH - 48);
    await waitForPaint();

    const contentW = Math.ceil(inner.getBoundingClientRect().width);
    const contentH = Math.ceil(inner.getBoundingClientRect().height);
    if (contentW < 4 || contentH < 4) return undefined;

    host.style.width = `${Math.min(Math.max(contentW + 48, 160), EXPORT_MAX_WIDTH)}px`;
    await waitForPaint();

    const fromFresh = await rasterizeHost(host, {
      backgroundColor: surface,
      pixelRatio,
    });
    if (fromFresh) return fromFresh;

    const live = document.querySelector(
      "[data-equation-render]"
    ) as HTMLElement | null;
    if (!live) return undefined;

    inner.innerHTML = live.innerHTML;
    shrinkToFit(inner, EXPORT_MAX_WIDTH - 48);
    await waitForPaint();
    const w2 = Math.ceil(inner.getBoundingClientRect().width);
    host.style.width = `${Math.min(Math.max(w2 + 48, 160), EXPORT_MAX_WIDTH)}px`;
    await waitForPaint();

    return await rasterizeHost(host, {
      backgroundColor: surface,
      pixelRatio,
    });
  } finally {
    host.remove();
  }
}
