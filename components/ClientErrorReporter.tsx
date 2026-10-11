"use client";

import { useEffect } from "react";

/** Loads Sentry in the browser only when a public DSN was set at build time. */
export default function ClientErrorReporter() {
  useEffect(() => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) return;
    let detach = () => {};
    void import("@sentry/nextjs").then((Sentry) => {
      if (!Sentry.getClient()) {
        Sentry.init({
          dsn,
          tracesSampleRate: 0,
        });
      }
      const onError = (event: ErrorEvent) => {
        Sentry.captureException(event.error ?? event.message);
      };
      window.addEventListener("error", onError);
      detach = () => window.removeEventListener("error", onError);
    });
    return () => detach();
  }, []);

  return null;
}
