"use client";

import { useMemo } from "react";
import { renderLatexToHtml } from "@/lib/katexRender";
import type { Explanation } from "@/lib/explain";
import TeachStatus from "@/components/TeachStatus";

export interface EquationCardProps {
  latex: string;
  explanation?: Explanation | null;
  teachBusy?: boolean;
  teachError?: string | null;
  className?: string;
  /** CSS aspect-ratio value, e.g. "1 / 1" */
  aspectRatio?: string;
}

export default function EquationCard({
  latex,
  explanation = null,
  teachBusy = false,
  teachError = null,
  className = "",
  aspectRatio = "1.91 / 1",
}: EquationCardProps) {
  const { html, error } = useMemo(() => renderLatexToHtml(latex), [latex]);
  const hasContent = latex.trim().length > 0;
  const variables = explanation?.variables ?? [];
  const hasTeach = !!explanation && !teachBusy && !teachError;
  const showTeachScroll = hasTeach || teachBusy || !!teachError;

  return (
    <article
      data-scicard="equation"
      className={[
        "flex w-full flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]",
        className,
      ].join(" ")}
      style={{ aspectRatio }}
    >
      <div className="flex min-h-0 flex-1 flex-col px-8 pb-3 pt-7 sm:px-10 sm:pt-8">
        <div className="flex shrink-0 items-start justify-between gap-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--accent)]">
            Equation
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
              Your rendered equation will appear here
            </p>
          )}

          {hasContent && error && (
            <p className="max-w-md text-center text-sm text-red-700/80">
              Couldn’t render LaTeX — check your syntax.
            </p>
          )}

          {hasContent && !error && html && (
            <div className="max-w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:thin]">
              <div
                data-equation-render
                className="scicard-katex inline-block px-2 text-[1.25rem] sm:text-[1.5rem]"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
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
            idleHint="Term labels will appear here once you run Teach me"
          >
            {explanation && (
              <>
                <p className="text-sm leading-relaxed text-[var(--ink)]">
                  {explanation.explanation}
                </p>

                {variables.length > 0 && (
                  <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
                    {variables.map((term) => (
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
