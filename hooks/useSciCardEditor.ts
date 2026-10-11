"use client";

import { useEffect, useState } from "react";
import type { ContentType } from "@/lib/detectType";
import type { Explanation } from "@/lib/explain";
import { EXAMPLES, isExampleContent } from "@/lib/examples";
import { getAspectRatio, type AspectRatioId } from "@/lib/aspectRatios";
import {
  applyThemeToDocument,
  type ThemeAccent,
  type ThemeMode,
} from "@/lib/themes";
import { trackProductEvent } from "@/lib/analytics";
import type { CardRecord } from "@/lib/cardRecord";

export function useSciCardEditor() {
  const [input, setInput] = useState("");
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
  const [cardLoadError, setCardLoadError] = useState<string | null>(null);
  const [cardLoading, setCardLoading] = useState(false);

  const showingExample = isExampleContent(contentType, input);
  const inputEmpty = input.trim().length === 0;
  const canExport = !inputEmpty;
  const canTeach = !inputEmpty && !teachBusy;
  const aspect = getAspectRatio(aspectRatioId);

  useEffect(() => {
    applyThemeToDocument(mode, accent);
  }, [mode, accent]);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("card");
    if (!id) return;
    let cancelled = false;
    setCardLoading(true);
    setCardLoadError(null);
    void (async () => {
      try {
        const res = await fetch(`/api/cards/${id}`);
        const data = (await res.json()) as { card?: CardRecord; error?: string };
        if (cancelled) return;
        if (!res.ok || !data.card) {
          setCardLoadError(data.error || "This card could not be opened.");
          return;
        }
        setInput(data.card.input);
        setContentType(data.card.contentType);
        setExplanation(data.card.explanation);
        setMode(data.card.themeMode);
        setAccent(data.card.themeAccent);
        setAspectRatioId(data.card.aspectRatioId);
        setSavedId(data.card.id);
      } catch {
        if (!cancelled) setCardLoadError("This card could not be opened.");
      } finally {
        if (!cancelled) setCardLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    setCardLoadError(null);
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
        throw new Error(data.error || "Teach me is unavailable right now.");
      }

      const next =
        manualOverride && data.explanation.content_type !== contentType
          ? { ...data.explanation, content_type: contentType }
          : data.explanation;

      setExplanation(next);
      trackProductEvent("teach_me", { contentType, cached: false });

      if (!manualOverride && next.content_type !== contentType) {
        setContentType(next.content_type);
      }
    } catch (err) {
      setTeachError(
        err instanceof Error ? err.message : "Teach me is unavailable right now."
      );
    } finally {
      setTeachBusy(false);
    }
  }

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
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save card");
    } finally {
      setSaveBusy(false);
    }
  }

  return {
    input,
    contentType,
    manualOverride,
    setManualOverride,
    explanation,
    setExplanation,
    teachBusy,
    teachError,
    mode,
    setMode,
    accent,
    setAccent,
    aspectRatioId,
    setAspectRatioId,
    savedId,
    saveBusy,
    saveError,
    cardLoadError,
    cardLoading,
    showingExample,
    inputEmpty,
    canExport,
    canTeach,
    aspect,
    handleInputChange,
    handleTypeChange,
    loadExample,
    clearExample,
    handleTeachMe,
    handleSaveCard,
  };
}
