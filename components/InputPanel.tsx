"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { ContentType, detectType } from "@/lib/detectType";

const TYPE_OPTIONS: { value: ContentType; label: string }[] = [
  { value: "equation", label: "Equation" },
  { value: "reaction", label: "Reaction" },
  { value: "concept", label: "Text" },
];

const PLACEHOLDERS: Record<ContentType, string> = {
  equation:
    "Paste LaTeX or a formula…\ne.g. Q = U A \\Delta T_{lm}",
  reaction:
    "Paste a reaction, name, or SMILES…\ne.g. caffeine  or  CH4 + 2 O2 -> CO2 + 2 H2O",
  concept:
    "Paste a concept, lecture note, or abstract excerpt…",
};

export interface InputPanelProps {
  value: string;
  onValueChange: (value: string) => void;
  contentType: ContentType;
  onContentTypeChange: (type: ContentType) => void;
  /** When true, auto-detect is paused and Teach me must not overwrite the type. */
  manualOverride: boolean;
  onManualOverrideChange: (locked: boolean) => void;
}

export default function InputPanel({
  value,
  onValueChange,
  contentType,
  onContentTypeChange,
  manualOverride,
  onManualOverrideChange,
}: InputPanelProps) {
  const prevDetected = useRef<ContentType | null>(null);

  // Manual tab selection pauses heuristics; paste changes do not override the lock.
  useEffect(() => {
    if (manualOverride) return;

    const detected = detectType(value);
    if (detected !== prevDetected.current) {
      prevDetected.current = detected;
      onContentTypeChange(detected);
    }
  }, [value, manualOverride, onContentTypeChange]);

  function handleTypeSelect(type: ContentType) {
    onManualOverrideChange(true);
    onContentTypeChange(type);
  }

  function handleTabKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const index = TYPE_OPTIONS.findIndex((option) => option.value === contentType);
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const next = TYPE_OPTIONS[(index + direction + TYPE_OPTIONS.length) % TYPE_OPTIONS.length];
    handleTypeSelect(next.value);
    const tab = event.currentTarget.querySelector<HTMLButtonElement>(
      `[data-type="${next.value}"]`
    );
    tab?.focus();
  }

  /** Re-enable detectType and apply it immediately to the current paste. */
  function handleResetAutoDetect() {
    onManualOverrideChange(false);
    const detected = detectType(value);
    prevDetected.current = detected;
    onContentTypeChange(detected);
  }

  return (
    <section className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Content type"
          onKeyDown={handleTabKey}
          className="inline-flex rounded-md border border-[var(--border)] bg-[var(--surface)] p-0.5"
        >
          {TYPE_OPTIONS.map(({ value: option, label }) => {
            const selected = contentType === option;
            return (
              <button
                key={option}
                type="button"
                role="tab"
                data-type={option}
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => handleTypeSelect(option)}
                className={[
                  "rounded-[5px] px-3.5 py-1.5 text-sm tracking-wide transition-colors",
                  selected
                    ? "bg-[var(--ink)] text-[var(--paper)]"
                    : "text-[var(--muted)] hover:text-[var(--ink)]",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}
        </div>

        {manualOverride && (
          <button
            type="button"
            onClick={handleResetAutoDetect}
            className="text-xs text-[var(--muted)] underline-offset-2 hover:text-[var(--ink)] hover:underline"
          >
            Use auto-detect
          </button>
        )}
      </div>

      <label className="sr-only" htmlFor="scicard-input">
        STEM content input
      </label>
      <textarea
        id="scicard-input"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={PLACEHOLDERS[contentType]}
        spellCheck={contentType === "concept"}
        rows={8}
        className="w-full resize-y rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 font-[family-name:var(--font-geist-mono)] text-sm leading-relaxed text-[var(--ink)] placeholder:text-[var(--muted)] outline-none transition-[border-color,box-shadow] focus:border-[var(--ink)] focus:shadow-[0_0_0_1px_var(--ink)]"
      />

      <p className="text-xs text-[var(--muted)]">
        {manualOverride
          ? "Type locked manually — switch tabs or restore auto-detect."
          : "Type auto-selected from your paste — override anytime."}
      </p>
    </section>
  );
}
