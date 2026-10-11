import Link from "next/link";
import type { ReactNode } from "react";

export default function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-10 text-[var(--ink)] sm:px-6">
      <Link href="/" className="text-sm font-semibold tracking-tight">
        SciCard
      </Link>
      <h1 className="mt-8 text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-[var(--muted)]">
        {children}
      </div>
    </main>
  );
}
