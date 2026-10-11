"use client";

import InputPanel from "@/components/InputPanel";
import CardPreview from "@/components/CardPreview";
import ExportControls from "@/components/ExportControls";
import ThemeControls from "@/components/ThemeControls";
import ExampleChooser from "@/components/ExampleChooser";
import TeachEditor from "@/components/TeachEditor";
import { useSciCardEditor } from "@/hooks/useSciCardEditor";

export default function Home() {
  const editor = useSciCardEditor();

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">SciCard</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Paste STEM content. Understand it. Share it.
            </p>
          </div>
          <ThemeControls
            mode={editor.mode}
            accent={editor.accent}
            onModeChange={editor.setMode}
            onAccentChange={editor.setAccent}
          />
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-10 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-2 lg:gap-12">
        <div className="flex flex-col gap-6">
          {editor.cardLoading && (
            <p role="status" className="text-sm text-[var(--muted)]">
              Loading saved card…
            </p>
          )}
          {editor.cardLoadError && (
            <p
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {editor.cardLoadError}
            </p>
          )}

          {editor.inputEmpty && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-[var(--muted)]">
                Start from an example, or paste your own below.
              </p>
              <ExampleChooser onPick={editor.loadExample} />
            </div>
          )}

          <InputPanel
            value={editor.input}
            onValueChange={editor.handleInputChange}
            contentType={editor.contentType}
            onContentTypeChange={editor.handleTypeChange}
            manualOverride={editor.manualOverride}
            onManualOverrideChange={editor.setManualOverride}
          />

          {!editor.inputEmpty && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
              <button
                type="button"
                onClick={() => editor.loadExample("equation")}
                className="underline-offset-2 hover:text-[var(--ink)] hover:underline"
              >
                Equation example
              </button>
              <span aria-hidden>·</span>
              <button
                type="button"
                onClick={() => editor.loadExample("reaction")}
                className="underline-offset-2 hover:text-[var(--ink)] hover:underline"
              >
                Reaction example
              </button>
              <span aria-hidden>·</span>
              <button
                type="button"
                onClick={() => editor.loadExample("concept")}
                className="underline-offset-2 hover:text-[var(--ink)] hover:underline"
              >
                Text example
              </button>
              {editor.showingExample && (
                <>
                  <span aria-hidden>·</span>
                  <button
                    type="button"
                    onClick={editor.clearExample}
                    className="font-medium text-[var(--accent)] underline-offset-2 hover:underline"
                  >
                    Clear example
                  </button>
                </>
              )}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={editor.handleTeachMe}
              disabled={!editor.canTeach}
              className="inline-flex h-11 w-fit items-center justify-center rounded-md border border-[var(--accent)] bg-transparent px-5 text-sm font-medium text-[var(--accent)] transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {editor.teachBusy ? "Teaching…" : "Teach me"}
            </button>
            <p className="text-xs text-[var(--muted)]">
              Teach me is written by AI and may contain mistakes.
            </p>
            {editor.explanation && (
              <TeachEditor
                explanation={editor.explanation}
                onChange={editor.setExplanation}
              />
            )}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={editor.handleSaveCard}
                disabled={!editor.canExport || editor.saveBusy}
                className="inline-flex h-11 w-fit items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-5 text-sm font-medium text-[var(--ink)] transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {editor.saveBusy ? "Saving…" : "Save card & copy link"}
              </button>
              {editor.savedId && (
                <p className="text-xs text-[var(--muted)]">
                  Link copied. Open{" "}
                  <a className="underline" href={`/c/${editor.savedId}`}>
                    /c/{editor.savedId.slice(0, 8)}…
                  </a>
                </p>
              )}
              {editor.saveError && (
                <p role="alert" className="text-xs text-red-700/80">
                  {editor.saveError}
                </p>
              )}
            </div>
            <ExportControls
              input={editor.input}
              contentType={editor.contentType}
              explanation={editor.explanation}
              disabled={!editor.canExport}
              aspectRatioId={editor.aspectRatioId}
              onAspectRatioChange={editor.setAspectRatioId}
              mode={editor.mode}
              accent={editor.accent}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
              Live preview
            </p>
            <p className="text-xs text-[var(--muted)]">{editor.aspect.hint}</p>
          </div>
          <CardPreview
            contentType={editor.contentType}
            input={editor.input}
            explanation={editor.explanation}
            teachBusy={editor.teachBusy}
            teachError={editor.teachError}
            aspectRatio={editor.aspect.css}
          />
        </div>
      </main>
    </div>
  );
}
