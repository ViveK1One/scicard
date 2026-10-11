"use client";

import type { Explanation } from "@/lib/explain";

const fieldClass =
  "w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]";

export default function TeachEditor({
  explanation,
  onChange,
}: {
  explanation: Explanation;
  onChange: (next: Explanation) => void;
}) {
  function patch(partial: Partial<Explanation>) {
    onChange({ ...explanation, ...partial });
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
        Edit before you post
      </p>
      <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
        Title
        <input
          className={fieldClass}
          value={explanation.title}
          onChange={(event) => patch({ title: event.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
        Explanation
        <textarea
          className={`${fieldClass} min-h-[4.5rem] resize-y`}
          value={explanation.explanation}
          onChange={(event) => patch({ explanation: event.target.value })}
        />
      </label>
      {(explanation.variables?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-[var(--muted)]">Terms</p>
          {explanation.variables?.map((term, index) => (
            <div key={`${term.symbol}-${index}`} className="grid grid-cols-[5rem_1fr] gap-2">
              <input
                className={fieldClass}
                value={term.symbol}
                aria-label={`Symbol ${index + 1}`}
                onChange={(event) => {
                  const variables = explanation.variables?.map((row, rowIndex) =>
                    rowIndex === index
                      ? { ...row, symbol: event.target.value }
                      : row
                  );
                  patch({ variables });
                }}
              />
              <input
                className={fieldClass}
                value={term.meaning}
                aria-label={`Meaning ${index + 1}`}
                onChange={(event) => {
                  const variables = explanation.variables?.map((row, rowIndex) =>
                    rowIndex === index
                      ? { ...row, meaning: event.target.value }
                      : row
                  );
                  patch({ variables });
                }}
              />
            </div>
          ))}
        </div>
      )}
      <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
        Used in
        <input
          className={fieldClass}
          value={explanation.applications.join(" · ")}
          onChange={(event) =>
            patch({
              applications: event.target.value
                .split("·")
                .map((item) => item.trim())
                .filter(Boolean)
                .slice(0, 3),
            })
          }
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
        Takeaway
        <textarea
          className={`${fieldClass} min-h-[3rem] resize-y`}
          value={explanation.takeaway}
          onChange={(event) => patch({ takeaway: event.target.value })}
        />
      </label>
      <p className="text-xs text-[var(--muted)]">
        The preview and the PNG use this text. Save the card to keep it on the link.
      </p>
    </div>
  );
}
