export type AspectRatioId = "landscape" | "square" | "portrait";

export type AspectRatioOption = {
  id: AspectRatioId;
  label: string;
  hint: string;
  /** CSS aspect-ratio string for live preview */
  css: string;
  width: number;
  height: number;
};

/** Social-ready export sizes (plus landscape for link previews). */
export const ASPECT_RATIOS: AspectRatioOption[] = [
  {
    id: "landscape",
    label: "1.91:1",
    hint: "Landscape",
    css: "1.91 / 1",
    width: 1200,
    height: 628,
  },
  {
    id: "square",
    label: "1:1",
    hint: "Square · feed",
    css: "1 / 1",
    width: 1080,
    height: 1080,
  },
  {
    id: "portrait",
    label: "4:5",
    hint: "Portrait · IG",
    css: "4 / 5",
    width: 1080,
    height: 1350,
  },
];

export function getAspectRatio(id: AspectRatioId): AspectRatioOption {
  return ASPECT_RATIOS.find((r) => r.id === id) ?? ASPECT_RATIOS[0];
}
