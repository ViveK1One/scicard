"use client";

import {
  THEME_ACCENTS,
  THEME_MODES,
  type ThemeAccent,
  type ThemeMode,
} from "@/lib/themes";

export interface ThemeControlsProps {
  mode: ThemeMode;
  accent: ThemeAccent;
  onModeChange: (mode: ThemeMode) => void;
  onAccentChange: (accent: ThemeAccent) => void;
}

export default function ThemeControls({
  mode,
  accent,
  onModeChange,
  onAccentChange,
}: ThemeControlsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
          Theme
        </span>
        <div
          role="group"
          aria-label="Color mode"
          className="inline-flex rounded-md border border-[var(--border)] bg-[var(--surface)] p-0.5"
        >
          {THEME_MODES.map((opt) => {
            const selected = mode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onModeChange(opt.id)}
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

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
          Accent
        </span>
        <div
          role="group"
          aria-label="Accent palette"
          className="inline-flex gap-2"
        >
          {THEME_ACCENTS.map((opt) => {
            const selected = accent === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                title={opt.label}
                aria-label={opt.label}
                aria-pressed={selected}
                onClick={() => onAccentChange(opt.id)}
                className={[
                  "h-8 rounded-md border px-3 text-xs transition-colors",
                  selected
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)]",
                ].join(" ")}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
