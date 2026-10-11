"use client";

import { useEffect, useMemo, useState } from "react";
import type { Explanation } from "@/lib/explain";
import { toRenderableSmiles } from "@/lib/chemSmiles";
import { getChemKind } from "@/lib/detectType";
import TeachStatus from "@/components/TeachStatus";

export interface ReactionCardProps {
  input: string;
  explanation?: Explanation | null;
  teachBusy?: boolean;
  teachError?: string | null;
  className?: string;
  aspectRatio?: string;
}

/** Parse CSS aspect-ratio like "4 / 5" → height/width. */
function aspectTallness(aspectRatio: string): number {
  const m = aspectRatio.match(/([\d.]+)\s*\/\s*([\d.]+)/);
  if (!m) return 1 / 1.91;
  const w = parseFloat(m[1]);
  const h = parseFloat(m[2]);
  if (!w || !h) return 1 / 1.91;
  return h / w;
}

function chemRenderSize(tallness: number): { width: number; height: number } {
  // Portrait (4:5 ≈ 1.25): taller canvas so RDKit draws a larger structure
  if (tallness >= 1.15) return { width: 900, height: 520 };
  if (tallness >= 0.95) return { width: 820, height: 400 };
  return { width: 720, height: 240 };
}

function chemSvgMaxClass(tallness: number): string {
  if (tallness >= 1.15) {
    return "[&_svg]:max-h-[min(100%,14rem)] sm:[&_svg]:max-h-[min(100%,16rem)]";
  }
  if (tallness >= 0.95) {
    return "[&_svg]:max-h-40 sm:[&_svg]:max-h-48";
  }
  return "[&_svg]:max-h-28 sm:[&_svg]:max-h-36";
}

export default function ReactionCard({
  input,
  explanation = null,
  teachBusy = false,
  teachError = null,
  className = "",
  aspectRatio = "1.91 / 1",
}: ReactionCardProps) {
  const [svg, setSvg] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const hasTeach = !!explanation && !teachBusy && !teachError;
  const showTeachScroll = hasTeach || teachBusy || !!teachError;
  const hasContent = input.trim().length > 0;
  const parsed = hasContent ? toRenderableSmiles(input) : null;
  const chemKind = getChemKind(input);
  const isReaction = chemKind === "reaction";
  const cardLabel = isReaction ? "Reaction" : "Structure";
  const tallness = useMemo(() => aspectTallness(aspectRatio), [aspectRatio]);
  const renderSize = useMemo(() => chemRenderSize(tallness), [tallness]);
  const svgMaxClass = chemSvgMaxClass(tallness);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!input.trim()) {
        setSvg(null);
        setRenderError(null);
        return;
      }

      const chem = toRenderableSmiles(input);
      if (!chem) {
        setSvg(null);
        setRenderError(
          "Couldn’t map this to SMILES — showing text. Try SMILES or a simple formula reaction."
        );
        return;
      }

      setBusy(true);
      setRenderError(null);

      try {
        const res = await fetch("/api/render-chem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            smiles: chem.smiles,
            format: "svg",
            width: renderSize.width,
            height: renderSize.height,
          }),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(data?.error || `Render failed (${res.status})`);
        }

        const text = await res.text();
        if (!cancelled) {
          setSvg(text);
          setRenderError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setSvg(null);
          setRenderError(
            err instanceof Error ? err.message : "Structure render failed"
          );
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [input, renderSize.width, renderSize.height]);

  return (
    <article
      data-scicard="reaction"
      data-chem-kind={chemKind}
      className={[
        "flex w-full flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]",
        className,
      ].join(" ")}
      style={{ aspectRatio }}
    >
      <div className="flex min-h-0 flex-1 flex-col px-8 pb-3 pt-7 sm:px-10 sm:pt-8">
        <div className="flex shrink-0 items-start justify-between gap-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--accent)]">
            {cardLabel}
          </p>
          {hasTeach && explanation?.title && (
            <p className="max-w-[70%] text-right text-xs font-medium text-[var(--ink)]">
              {explanation.title}
            </p>
          )}
        </div>

        <div
          data-scicard-scroll="visual"
          className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto py-3"
        >
          {!hasContent && (
            <p className="text-sm text-[var(--muted)]">
              {isReaction
                ? "Your reaction structure will appear here"
                : "Your molecular structure will appear here"}
            </p>
          )}

          {hasContent && busy && !svg && (
            <p className="text-sm text-[var(--muted)]">Rendering structure…</p>
          )}

          {hasContent && svg && (
            <div
              data-reaction-render
              className={[
                "scicard-chem w-full max-w-full [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:w-full",
                svgMaxClass,
              ].join(" ")}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          )}

          {hasContent && !svg && !busy && (
            <p className="max-w-lg text-center font-[family-name:var(--font-geist-mono)] text-base leading-relaxed text-[var(--ink)]">
              {input.trim()}
            </p>
          )}

          {renderError && (
            <p className="mt-2 max-w-md text-center text-xs text-[var(--muted)]">
              {renderError}
              {parsed ? ` · ${parsed.smiles}` : ""}
            </p>
          )}
        </div>

        <div
          data-scicard-scroll="teach"
          className={[
            "shrink-0 border-t border-[var(--border)] pt-3",
            showTeachScroll ? "max-h-[42%] overflow-y-auto" : "",
          ].join(" ")}
        >
          <TeachStatus
            teachBusy={teachBusy}
            teachError={teachError}
            hasTeach={hasTeach}
            idleHint={
              isReaction
                ? "Reaction context will appear here once you run Teach me"
                : "Structure context will appear here once you run Teach me"
            }
          >
            {explanation && (
              <>
                <p className="text-sm leading-relaxed text-[var(--ink)]">
                  {explanation.explanation}
                </p>

                {(explanation.variables?.length ?? 0) > 0 && (
                  <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
                    {explanation.variables!.map((term) => (
                      <li
                        key={term.symbol}
                        className="text-sm text-[var(--ink)]"
                      >
                        <span className="font-[family-name:var(--font-geist-mono)] font-medium">
                          {term.symbol}
                        </span>
                        <span className="text-[var(--muted)]">
                          {" "}
                          — {term.meaning}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {explanation.applications.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                      Used in
                    </p>
                    <p className="mt-1 text-sm text-[var(--ink)]">
                      {explanation.applications.join(" · ")}
                    </p>
                  </div>
                )}

                <div className="rounded-md bg-[var(--accent-soft)] px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                    Takeaway
                  </p>
                  <p className="mt-1 text-sm font-medium leading-snug text-[var(--ink)]">
                    {explanation.takeaway}
                  </p>
                </div>
              </>
            )}
          </TeachStatus>
        </div>
      </div>

      <footer className="flex shrink-0 items-center justify-between border-t border-[var(--border)] bg-[var(--footer)] px-8 py-3 sm:px-10">
        <span className="text-sm font-semibold tracking-tight text-[var(--accent)]">
          SciCard
        </span>
        <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
          Visual knowledge
        </span>
      </footer>
    </article>
  );
}
