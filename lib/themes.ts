export type ThemeMode = "light" | "dark";
export type ThemeAccent = "graphite" | "navy" | "forest";

export type ThemeColors = {
  paper: string;
  surface: string;
  ink: string;
  muted: string;
  border: string;
  accent: string;
  accentSoft: string;
  footer: string;
};

/** Academic palettes — flat colors only, no gradients. */
const LIGHT: Record<ThemeAccent, ThemeColors> = {
  graphite: {
    paper: "#f7f6f3",
    surface: "#ffffff",
    ink: "#1a1a1a",
    muted: "#6b6b6b",
    border: "#e2e0db",
    accent: "#1a1a1a",
    accentSoft: "#f0eeea",
    footer: "#f7f6f3",
  },
  navy: {
    paper: "#f4f6f8",
    surface: "#ffffff",
    ink: "#152033",
    muted: "#5c6678",
    border: "#d8dee8",
    accent: "#1e3a5f",
    accentSoft: "#e8eef5",
    footer: "#eef2f6",
  },
  forest: {
    paper: "#f5f6f3",
    surface: "#ffffff",
    ink: "#1a241c",
    muted: "#5e6b61",
    border: "#dce3dc",
    accent: "#2f4f3a",
    accentSoft: "#e8efe9",
    footer: "#eef2ec",
  },
};

const DARK: Record<ThemeAccent, ThemeColors> = {
  graphite: {
    paper: "#121212",
    surface: "#1c1c1c",
    ink: "#f2f1ed",
    muted: "#9a9a96",
    border: "#2e2e2e",
    accent: "#e8e6e1",
    accentSoft: "#262626",
    footer: "#161616",
  },
  navy: {
    paper: "#0f141c",
    surface: "#171d28",
    ink: "#e8eef6",
    muted: "#8b96a8",
    border: "#2a3344",
    accent: "#8eb0d6",
    accentSoft: "#1f2836",
    footer: "#121821",
  },
  forest: {
    paper: "#101411",
    surface: "#181e19",
    ink: "#e8efe9",
    muted: "#8e9a90",
    border: "#2a332c",
    accent: "#8fb89a",
    accentSoft: "#1f2821",
    footer: "#131816",
  },
};

export const THEME_MODES: { id: ThemeMode; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

export const THEME_ACCENTS: { id: ThemeAccent; label: string }[] = [
  { id: "graphite", label: "Graphite" },
  { id: "navy", label: "Navy" },
  { id: "forest", label: "Forest" },
];

export function resolveThemeColors(
  mode: ThemeMode,
  accent: ThemeAccent
): ThemeColors {
  return mode === "dark" ? DARK[accent] : LIGHT[accent];
}

export function applyThemeToDocument(mode: ThemeMode, accent: ThemeAccent) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-mode", mode);
  root.setAttribute("data-accent", accent);
  const colors = resolveThemeColors(mode, accent);
  root.style.setProperty("--paper", colors.paper);
  root.style.setProperty("--surface", colors.surface);
  root.style.setProperty("--ink", colors.ink);
  root.style.setProperty("--muted", colors.muted);
  root.style.setProperty("--border", colors.border);
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--accent-soft", colors.accentSoft);
  root.style.setProperty("--footer", colors.footer);
  root.style.setProperty("--background", colors.paper);
  root.style.setProperty("--foreground", colors.ink);
}
