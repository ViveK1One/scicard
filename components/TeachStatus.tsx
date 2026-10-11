"use client";

import type { ReactNode } from "react";

/**
 * Shared Teach-me status block for Equation / Reaction / Concept cards.
 * Renders idle hint, in-card thinking skeleton, error, or explanation children.
 */
export interface TeachStatusProps {
  teachBusy?: boolean;
  teachError?: string | null;
  hasTeach: boolean;
  idleHint: string;
  children?: ReactNode;
}

export default function TeachStatus({
  teachBusy = false,
  teachError = null,
  hasTeach,
  idleHint,
  children,
}: TeachStatusProps) {
  if (teachBusy) {
    return (
      <div
        className="flex flex-col gap-2.5 pr-1"
        role="status"
        aria-live="polite"
        aria-busy="true"
        data-teach-status="loading"
      >
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
          Thinking
          <span className="scicard-teach-dots" aria-hidden>
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </p>
        <div className="flex flex-col gap-2" aria-hidden>
          <div className="scicard-teach-skel h-3 w-[92%] rounded-sm" />
          <div className="scicard-teach-skel h-3 w-[78%] rounded-sm" />
          <div className="scicard-teach-skel h-3 w-[64%] rounded-sm" />
          <div className="scicard-teach-skel mt-1 h-10 w-full rounded-md" />
        </div>
      </div>
    );
  }

  if (teachError) {
    return (
      <p
        role="alert"
        data-teach-status="error"
        className="text-xs leading-relaxed text-red-700/90 dark:text-red-300/90"
      >
        Couldn&apos;t generate an explanation, try again.
        <span className="mt-1 block text-[var(--muted)]">{teachError}</span>
      </p>
    );
  }

  if (!hasTeach) {
    return (
      <p className="text-xs text-[var(--muted)]" data-teach-status="idle">
        {idleHint}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 pr-1" data-teach-status="ready">
      {children}
    </div>
  );
}
