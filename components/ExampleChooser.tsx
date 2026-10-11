"use client";

import type { ContentType } from "@/lib/detectType";

const CHOICES: { type: ContentType; label: string; hint: string }[] = [
  { type: "equation", label: "Equation", hint: "Heat exchanger formula" },
  { type: "reaction", label: "Reaction", hint: "Methane combustion" },
  { type: "concept", label: "Concept", hint: "Le Chatelier's principle" },
];

export default function ExampleChooser({
  onPick,
}: {
  onPick: (type: ContentType) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {CHOICES.map((choice) => (
        <button
          key={choice.type}
          type="button"
          onClick={() => onPick(choice.type)}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-left transition-colors hover:border-[var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--accent)]">
            {choice.label}
          </span>
          <span className="mt-1 block text-sm font-medium text-[var(--ink)]">
            {choice.hint}
          </span>
        </button>
      ))}
    </div>
  );
}
