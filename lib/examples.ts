import type { ContentType } from "@/lib/detectType";

export const EXAMPLES: Record<ContentType, string> = {
  equation: String.raw`Q = U A \Delta T_{lm}`,
  reaction: "CH4 + 2 O2 -> CO2 + 2 H2O",
  concept:
    "Le Chatelier's principle explains why raising pressure shifts equilibrium toward fewer gas moles",
};

export function isExampleContent(
  contentType: ContentType,
  input: string
): boolean {
  return input.trim() === EXAMPLES[contentType].trim();
}
