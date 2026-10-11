import type { ContentType } from "@/lib/detectType";

export type SavedCardSummary = {
  id: string;
  title: string;
  contentType: ContentType;
  takeaway?: string | null;
};

const LABELS: Record<ContentType, string> = {
  equation: "Equation",
  reaction: "Reaction",
  concept: "Text",
};

export default function CardGallery({ cards }: { cards: SavedCardSummary[] }) {
  if (cards.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
        Cards
      </p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <li key={card.id}>
            <a
              href={`/c/${card.id}`}
              className="flex h-full flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition-colors hover:border-[var(--accent)]"
            >
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--accent)]">
                {LABELS[card.contentType]}
              </span>
              <span className="text-sm font-medium leading-snug text-[var(--ink)]">
                {card.title}
              </span>
              {card.takeaway && (
                <span className="line-clamp-2 text-xs leading-relaxed text-[var(--muted)]">
                  {card.takeaway}
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
