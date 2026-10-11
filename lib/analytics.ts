"use client";

import { track } from "@vercel/analytics";

/** Fire-and-forget product events (no-ops if Analytics is disabled). */
export function trackProductEvent(
  name: "teach_me" | "export_png" | "type_override",
  props?: Record<string, string | number | boolean>
): void {
  try {
    track(name, props);
  } catch {
    /* ignore */
  }
}
