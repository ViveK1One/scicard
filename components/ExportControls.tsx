"use client";

import { useState } from "react";
import { toPng } from "html-to-image";
import type { ContentType } from "@/lib/detectType";
import { snapshotEquationForExport } from "@/lib/exportEquationSnapshot";
import { snapshotReactionSvgForExport } from "@/lib/exportReactionSnapshot";
import {
  ASPECT_RATIOS,
  type AspectRatioId,
  getAspectRatio,
} from "@/lib/aspectRatios";
import {
  resolveThemeColors,
  type ThemeAccent,
  type ThemeMode,
} from "@/lib/themes";
import type { Explanation } from "@/lib/explain";
import { trackProductEvent } from "@/lib/analytics";

export interface ExportControlsProps {
  input: string;
  contentType: ContentType;
  explanation?: Explanation | null;
  disabled?: boolean;
  aspectRatioId: AspectRatioId;
  onAspectRatioChange: (id: AspectRatioId) => void;
  mode: ThemeMode;
  accent: ThemeAccent;
}

function selectorsFor(contentType: ContentType): {
  card: string;
  visual: string;
} {
  switch (contentType) {
    case "reaction":
      return {
        card: '[data-scicard="reaction"]',
        visual: "[data-reaction-render]",
      };
    case "concept":
      return {
        card: '[data-scicard="concept"]',
        visual: "[data-concept-render]",
      };
    default:
      return {
        card: '[data-scicard="equation"]',
        visual: "[data-equation-render]",
      };
  }
}

/** Prefer 2×, bump to 3× on high-DPR displays; never below 2 for downloads. */
function exportPixelRatio(): number {
  if (typeof window === "undefined") return 2;
  const dpr = window.devicePixelRatio || 1;
  return Math.min(Math.max(Math.round(dpr), 2), 3);
}

/**
 * Temporarily disable scroll containers so html-to-image does not capture
 * scrollbar chrome or clip long teach/quote content (BUG 3).
 */
async function withExportOverflowVisible<T>(
  card: HTMLElement,
  run: () => Promise<T>
): Promise<T> {
  const nodes = [
    card,
    ...Array.from(
      card.querySelectorAll<HTMLElement>("[data-scicard-scroll]")
    ),
  ];
  const prev = nodes.map((el) => ({
    el,
    overflow: el.style.overflow,
    overflowX: el.style.overflowX,
    overflowY: el.style.overflowY,
    maxHeight: el.style.maxHeight,
  }));
  for (const el of nodes) {
    el.style.overflow = "visible";
    el.style.overflowX = "visible";
    el.style.overflowY = "visible";
    if (el.hasAttribute("data-scicard-scroll")) {
      el.style.maxHeight = "none";
    }
  }
  try {
    return await run();
  } finally {
    for (const p of prev) {
      p.el.style.overflow = p.overflow;
      p.el.style.overflowX = p.overflowX;
      p.el.style.overflowY = p.overflowY;
      p.el.style.maxHeight = p.maxHeight;
    }
  }
}

export default function ExportControls({
  input,
  contentType,
  explanation = null,
  disabled = false,
  aspectRatioId,
  onAspectRatioChange,
  mode,
  accent,
}: ExportControlsProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transparentBackground, setTransparentBackground] = useState(false);
  const ratio = getAspectRatio(aspectRatioId);
  const colors = resolveThemeColors(mode, accent);

  async function handleDownloadPng() {
    if (disabled || busy) return;
    setBusy(true);
    setError(null);

    try {
      const { card: cardSelector, visual: visualSelector } =
        selectorsFor(contentType);

      const card = document.querySelector(cardSelector) as HTMLElement | null;
      if (!card) {
        throw new Error("Card preview not found");
      }

      const pixelRatio = exportPixelRatio();
      let visualImage: string | undefined;

      await withExportOverflowVisible(card, async () => {
        if (contentType === "equation") {
          visualImage = await snapshotEquationForExport(input, {
            ink: colors.ink,
            surface: colors.surface,
            pixelRatio,
            transparentBackground,
          });
        } else if (contentType === "reaction") {
          // Prefer SVG data URL so transparent exports don't bake a white chem plate
          visualImage = snapshotReactionSvgForExport(visualSelector);
          if (!visualImage) {
            const visualEl = document.querySelector(
              visualSelector
            ) as HTMLElement | null;
            if (visualEl) {
              try {
                visualImage = await toPng(visualEl, {
                  pixelRatio,
                  backgroundColor: transparentBackground
                    ? "rgba(0,0,0,0)"
                    : colors.surface,
                  cacheBust: true,
                  style: { overflow: "visible" },
                });
              } catch {
                visualImage = undefined;
              }
            }
          }
        } else {
          const visualEl = document.querySelector(
            visualSelector
          ) as HTMLElement | null;
          if (visualEl) {
            try {
              visualImage = await toPng(visualEl, {
                pixelRatio,
                backgroundColor: transparentBackground
                  ? "rgba(0,0,0,0)"
                  : colors.surface,
                cacheBust: true,
                style: { overflow: "visible" },
              });
            } catch {
              visualImage = undefined;
            }
          }
        }
      });

      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType,
          input,
          latex: input,
          equationImage: visualImage,
          visualImage,
          explanation,
          format: "png",
          width: ratio.width,
          height: ratio.height,
          pixelRatio,
          transparentBackground,
          mode,
          accent,
          theme: colors,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error || `Export failed (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const bgTag = transparentBackground ? "transparent" : mode;
      a.download = `scicard-${aspectRatioId}-${bgTag}@${pixelRatio}x.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      trackProductEvent("export_png", {
        contentType,
        aspectRatio: aspectRatioId,
        transparent: transparentBackground,
        mode,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
          Export size
        </span>
        <div
          role="group"
          aria-label="Aspect ratio"
          className="inline-flex flex-wrap rounded-md border border-[var(--border)] bg-[var(--surface)] p-0.5"
        >
          {ASPECT_RATIOS.map((opt) => {
            const selected = aspectRatioId === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                title={opt.hint}
                onClick={() => onAspectRatioChange(opt.id)}
                className={[
                  "rounded-[5px] px-3 py-1.5 text-sm transition-colors",
                  selected
                    ? "bg-[var(--accent)] text-[var(--paper)]"
                    : "text-[var(--muted)] hover:text-[var(--ink)]",
                ].join(" ")}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <label className="inline-flex cursor-pointer items-start gap-2 text-xs text-[var(--muted)]">
        <input
          type="checkbox"
          checked={transparentBackground}
          onChange={(e) => setTransparentBackground(e.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 accent-[var(--accent)]"
        />
        <span>
          Transparent background
          <span className="mt-0.5 block text-[10px] leading-snug opacity-80">
            Download only: clear pixels around the card; the card itself keeps
            your theme fill so text stays readable (Dark = light text on dark
            panel).
          </span>
        </span>
      </label>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={handleDownloadPng}
          disabled={disabled || busy}
          className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--accent)] px-5 text-sm font-medium text-[var(--paper)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Exporting…" : `Download PNG · ${ratio.label}`}
        </button>
        {error && <p className="text-xs text-red-700/80">{error}</p>}
      </div>
    </div>
  );
}
