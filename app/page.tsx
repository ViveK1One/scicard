"use client";

import { useEffect, useState } from "react";
import InputPanel from "@/components/InputPanel";
import CardPreview from "@/components/CardPreview";
import ExportControls from "@/components/ExportControls";
import ThemeControls from "@/components/ThemeControls";
import { ContentType } from "@/lib/detectType";
import type { Explanation } from "@/lib/explain";
import { EXAMPLES, isExampleContent } from "@/lib/examples";
import {
  getAspectRatio,
  type AspectRatioId,
} from "@/lib/aspectRatios";
import {
  applyThemeToDocument,
  type ThemeAccent,
  type ThemeMode,
} from "@/lib/themes";
import { trackProductEvent } from "@/lib/analytics";
import type { CardRecord } from "@/lib/cardRecord";
import CardGallery, { type SavedCardSummary } from "@/components/CardGallery";
import TeachEditor from "@/components/TeachEditor";

export default function Home() {
  const [input, setInput] = useState(EXAMPLES.equation);
  const [contentType, setContentType] = useState<ContentType>("equation");
  const [manualOverride, setManualOverride] = useState(false);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [teachBusy, setTeachBusy] = useState(false);
  const [teachError, setTeachError] = useState<string | null>(null);
  const [mode, setMode] = useState<ThemeMode>("light");
  const [accent, setAccent] = useState<ThemeAccent>("graphite");
  const [aspectRatioId, setAspectRatioId] =
    useState<AspectRatioId>("landscape");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [library, setLibrary] = useState<SavedCardSummary[]>([]);

  const showingExample = isExampleContent(contentType, input);
  const inputEmpty = input.trim().length === 0;
  const canExport = !inputEmpty;
  const canTeach = !inputEmpty && !teachBusy;
  const aspect = getAspectRatio(aspectRatioId);

  useEffect(() => {
    applyThemeToDocument(mode, accent);
  }, [mode, accent]);

  useEffect(() => {
    let cancelled = false;
    async function loadLibrary() {
      const res = await fetch("/api/cards");
      if (!res.ok) return;
      const data = (await res.json()) as {
        cards?: SavedCardSummary[];
      };
      if (!cancelled) setLibrary(data.cards ?? []);
    }
    void loadLibrary();

    const id = new URLSearchParams(window.location.search).get("card");
    if (!id) return () => {
      cancelled = true;
    };
    void (async () => {
      const res = await fetch(`/api/cards/${id}`);
      const data = (await res.json()) as { card?: CardRecord };
      if (cancelled || !data.card) return;
      setInput(data.card.input);
      setContentType(data.card.contentType);
      setExplanation(data.card.explanation);
      setMode(data.card.themeMode);
      setAccent(data.card.themeAccent);
      setAspectRatioId(data.card.aspectRatioId);
      setSavedId(data.card.id);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSaveCard() {
    if (!canExport || saveBusy) return;
    setSaveBusy(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input,
          contentType,
          explanation,
          themeMode: mode,
          themeAccent: accent,
          aspectRatioId,
        }),
      });
      const data = (await res.json()) as { card?: CardRecord; error?: string };
      if (!res.ok || !data.card) {
        throw new Error(data.error || "Could not save card");
      }
      setSavedId(data.card.id);
      const url = `${window.location.origin}/c/${data.card.id}`;
      await navigator.clipboard.writeText(url).catch(() => undefined);
      const list = await fetch("/api/cards");
      if (list.ok) {
        const body = (await list.json()) as {
          cards?: SavedCardSummary[];
        };
        setLibrary(body.cards ?? []);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save card");
    } finally {
      setSaveBusy(false);
    }
  }

  function handleInputChange(value: string) {
    setInput(value);
    setExplanation(null);
    setTeachError(null);
  }

  function handleTypeChange(type: ContentType) {
    setContentType(type);
    setExplanation(null);
    setTeachError(null);
  }

  function loadExample(type: ContentType) {
    setManualOverride(false);
    setInput(EXAMPLES[type]);
    setContentType(type);
    setExplanation(null);
    setTeachError(null);
  }

  function clearExample() {
    setManualOverride(false);
    setInput("");
    setExplanation(null);
    setTeachError(null);
  }

  async function handleTeachMe() {
    if (!canTeach) return;
    setTeachBusy(true);
    setTeachError(null);

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input,
          detectedType: contentType,
        }),
      });

      const data = (await res.json()) as {
        explanation?: Explanation;
        error?: string;
      };

      if (!res.ok || !data.explanation) {
        throw new Error(data.error || `Explain failed (${res.status})`);
      }

      // Prefer the user's locked type so Teach me never undoes a manual override
      const explanation =
        manualOverride && data.explanation.content_type !== contentType
          ? { ...data.explanation, content_type: contentType }
          : data.explanation;

      setExplanation(explanation);
      trackProductEvent("teach_me", {
        contentType,
        cached: false,
      });

      if (
        !manualOverride &&
        explanation.content_type !== contentType
      ) {
        setContentType(explanation.content_type);
      }
    } catch (err) {
      setTeachError(err instanceof Error ? err.message : "Teach me failed");
    } finally {
      setTeachBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">SciCard</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Paste STEM content. Understand it. Share it.
            </p>
          </div>
          <ThemeControls
            mode={mode}
            accent={accent}
            onModeChange={setMode}
            onAccentChange={setAccent}
          />
        </div>
      </header>

      {library.length > 0 && (
        <div className="mx-auto max-w-5xl px-6 pt-8">
          <CardGallery cards={library} />
        </div>
      )}

      <main className="mx-auto grid max-w-5xl gap-10 px-6 py-10 lg:grid-cols-2 lg:gap-12">
        <div className="flex flex-col gap-6">
          <InputPanel
            value={input}
            onValueChange={handleInputChange}
            contentType={contentType}
            onContentTypeChange={handleTypeChange}
            manualOverride={manualOverride}
            onManualOverrideChange={setManualOverride}
          />

          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
            <button
              type="button"
              onClick={() => loadExample("equation")}
              className="underline-offset-2 hover:text-[var(--ink)] hover:underline"
            >
              Equation example
            </button>
            <span aria-hidden>·</span>
            <button
              type="button"
              onClick={() => loadExample("reaction")}
              className="underline-offset-2 hover:text-[var(--ink)] hover:underline"
            >
              Reaction example
            </button>
            <span aria-hidden>·</span>
            <button
              type="button"
              onClick={() => loadExample("concept")}
              className="underline-offset-2 hover:text-[var(--ink)] hover:underline"
            >
              Text example
            </button>
            {showingExample && (
              <>
                <span aria-hidden>·</span>
                <button
                  type="button"
                  onClick={clearExample}
                  className="font-medium text-[var(--accent)] underline-offset-2 hover:underline"
                >
                  Clear example & paste your own
                </button>
              </>
            )}
          </div>

          {showingExample && (
            <p className="rounded-md border border-[var(--border)] bg-[var(--accent-soft)] px-3 py-2 text-xs text-[var(--muted)]">
              Showing a sample {contentType}. Clear it anytime and paste your
              own content.
            </p>
          )}

          <div className="flex flex-col gap-4">
            {inputEmpty && (
              <p
                role="status"
                className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--muted)]"
              >
                Paste an equation, reaction, or concept to enable Teach me and
                Download PNG.
              </p>
            )}
            <button
              type="button"
              onClick={handleTeachMe}
              disabled={!canTeach}
              className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-[var(--accent)] bg-transparent px-5 text-sm font-medium text-[var(--accent)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {teachBusy ? "Teaching…" : "Teach me"}
            </button>
            {explanation && (
              <TeachEditor explanation={explanation} onChange={setExplanation} />
            )}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleSaveCard}
                disabled={!canExport || saveBusy}
                className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-5 text-sm font-medium text-[var(--ink)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saveBusy ? "Saving…" : "Save card & copy link"}
              </button>
              {savedId && (
                <p className="text-xs text-[var(--muted)]">
                  Link copied. Open{" "}
                  <a className="underline" href={`/c/${savedId}`}>
                    /c/{savedId.slice(0, 8)}…
                  </a>
                </p>
              )}
              {saveError && (
                <p className="text-xs text-red-700/80">{saveError}</p>
              )}
            </div>
            <ExportControls
              input={input}
              contentType={contentType}
              explanation={explanation}
              disabled={!canExport}
              aspectRatioId={aspectRatioId}
              onAspectRatioChange={setAspectRatioId}
              mode={mode}
              accent={accent}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
              Live preview
            </p>
            <p className="text-xs text-[var(--muted)]">{aspect.hint}</p>
          </div>
          <CardPreview
            contentType={contentType}
            input={input}
            explanation={explanation}
            teachBusy={teachBusy}
            teachError={teachError}
            aspectRatio={aspect.css}
          />
        </div>
      </main>
    </div>
  );
}
