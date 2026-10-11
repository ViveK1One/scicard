import { randomBytes } from "crypto";
import { getChemKind, type ChemKind, type ContentType } from "@/lib/detectType";
import type { Explanation } from "@/lib/explain";
import type { AspectRatioId } from "@/lib/aspectRatios";
import type { ThemeAccent, ThemeMode } from "@/lib/themes";

/**
 * Canonical SciCard record.
 * `toLumenObject` maps this onto Lumen's KnowledgeObject (type INFOGRAPHIC)
 * without SciCard depending on Lumen's database.
 */
export type CardRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  input: string;
  contentType: ContentType;
  chemKind: ChemKind | null;
  explanation: Explanation | null;
  themeMode: ThemeMode;
  themeAccent: ThemeAccent;
  aspectRatioId: AspectRatioId;
};

export type LumenKnowledgeDraft = {
  type: "INFOGRAPHIC";
  title: string;
  content: string;
  difficulty: number;
  minutes: number;
  externalRef: {
    provider: "scicard";
    id: string;
  };
  visual: {
    contentType: ContentType;
    chemKind: ChemKind | null;
    source: string;
    aspectRatioId: AspectRatioId;
    themeMode: ThemeMode;
    themeAccent: ThemeAccent;
  };
};

const CONTENT_TYPES: ContentType[] = ["equation", "reaction", "concept"];

export function createCardRecord(input: {
  input: string;
  contentType: ContentType;
  explanation?: Explanation | null;
  themeMode?: ThemeMode;
  themeAccent?: ThemeAccent;
  aspectRatioId?: AspectRatioId;
  id?: string;
  createdAt?: string;
}): CardRecord {
  const now = new Date().toISOString();
  const text = input.input.trim();
  const contentType = input.contentType;
  return {
    id: input.id ?? randomBytes(16).toString("base64url"),
    createdAt: input.createdAt ?? now,
    updatedAt: now,
    input: text,
    contentType,
    chemKind: contentType === "reaction" ? getChemKind(text) : null,
    explanation: input.explanation ?? null,
    themeMode: input.themeMode ?? "light",
    themeAccent: input.themeAccent ?? "graphite",
    aspectRatioId: input.aspectRatioId ?? "landscape",
  };
}

export function isCardRecord(value: unknown): value is CardRecord {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.input === "string" &&
    typeof row.contentType === "string" &&
    CONTENT_TYPES.includes(row.contentType as ContentType) &&
    typeof row.createdAt === "string"
  );
}

export function cardTitle(card: CardRecord): string {
  const fromTeach = card.explanation?.title?.trim();
  if (fromTeach) return fromTeach;
  const line = card.input.split("\n")[0]?.trim() ?? "SciCard";
  return line.length > 80 ? `${line.slice(0, 77)}…` : line || "SciCard";
}

/** Plain text Lumen can enrich. The visual spec stays in `visual`. */
export function toLumenObject(card: CardRecord): LumenKnowledgeDraft {
  const title = cardTitle(card);
  const parts = [
    card.input.trim(),
    card.explanation?.explanation?.trim(),
    card.explanation?.takeaway
      ? `Takeaway: ${card.explanation.takeaway.trim()}`
      : "",
  ].filter(Boolean);

  return {
    type: "INFOGRAPHIC",
    title,
    content: parts.join("\n\n"),
    difficulty: 2,
    minutes: 3,
    externalRef: { provider: "scicard", id: card.id },
    visual: {
      contentType: card.contentType,
      chemKind: card.chemKind,
      source: card.input,
      aspectRatioId: card.aspectRatioId,
      themeMode: card.themeMode,
      themeAccent: card.themeAccent,
    },
  };
}
