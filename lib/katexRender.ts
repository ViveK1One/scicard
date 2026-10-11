import katex from "katex";

/** Strip common LaTeX delimiters so KaTeX receives raw math. */
export function normalizeLatex(input: string): string {
  const s = input.trim();
  if (!s) return "";

  if (s.startsWith("$$") && s.endsWith("$$") && s.length > 4) {
    return s.slice(2, -2).trim();
  }

  const displayBracket = s.match(/^\\\[([\s\S]*)\\\]$/);
  if (displayBracket) return displayBracket[1].trim();

  const inlineParen = s.match(/^\\\(([\s\S]*)\\\)$/);
  if (inlineParen) return inlineParen[1].trim();

  if (
    s.startsWith("$") &&
    s.endsWith("$") &&
    s.length > 2 &&
    !s.slice(1, -1).includes("$")
  ) {
    return s.slice(1, -1).trim();
  }

  return s;
}

export function renderLatexToHtml(
  input: string,
  options?: { displayMode?: boolean; throwOnError?: boolean }
): { html: string; error: string | null } {
  const latex = normalizeLatex(input);
  if (!latex) {
    return { html: "", error: null };
  }

  try {
    const html = katex.renderToString(latex, {
      displayMode: options?.displayMode ?? true,
      throwOnError: options?.throwOnError ?? false,
      strict: "ignore",
      trust: false,
    });
    return { html, error: null };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to render LaTeX";
    return { html: "", error: message };
  }
}
