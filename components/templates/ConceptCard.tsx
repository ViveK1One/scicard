"use client";

import type { Explanation } from "@/lib/explain";
import TeachStatus from "@/components/TeachStatus";

export interface ConceptCardProps {
  text: string;
  explanation?: Explanation | null;
  teachBusy?: boolean;
  teachError?: string | null;
  className?: string;
  aspectRatio?: string;
}

export default function ConceptCard({
  text,
  explanation = null,
  teachBusy = false,
  teachError = null,
  className = "",
  aspectRatio = "1.91 / 1",
}: ConceptCardProps) {
  const hasTeach = !!explanation && !teachBusy && !teachError;
  const showTeachScroll = hasTeach || teachBusy || !!teachError;
  const hasContent = text.trim().length > 0;
  const quote = text.trim();

  return (
    <article
      data-scicard="concept"
      className={[
        "flex w-full flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]",
        className,
      ].join(" ")}
      style={{ aspectRatio }}
    >
      <div className="flex min-h-0 flex-1 flex-col px-8 pb-3 pt-7 sm:px-10 sm:pt-8">
        <div className="flex shrink-0 items-start justify-between gap-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--accent)]">
            Concept
          </p>
          {hasTeach && explanation?.title && (
            <p className="max-w-[70%] text-right text-xs font-medium text-[var(--ink)]">
              {explanation.title}
            </p>
          )}
        </div>

        <div
          data-scicard-scroll="visual"
          className="flex min-h-0 flex-1 flex-col justify-center overflow-auto py-3"
        >
          {!hasContent && (
            <p className="text-sm text-[var(--muted)]">
              Your concept quote will appear here
            </p>
          )}

          {hasContent && (
            <blockquote
              data-concept-render
              className="relative border-l-2 border-[var(--accent)] pl-5 sm:pl-6"
            >
              <p className="text-base leading-snug tracking-[-0.01em] text-[var(--ink)] sm:text-lg sm:leading-snug">
                {quote}
              </p>
            </blockquote>
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
            idleHint="Explanation will appear here once you run Teach me"
          >
            {explanation && (
              <>
                <p className="text-sm leading-relaxed text-[var(--ink)]">
                  {explanation.explanation}
                </p>

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
