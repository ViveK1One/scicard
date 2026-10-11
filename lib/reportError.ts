/**
 * Server error log. Forwards to Sentry when SENTRY_DSN is set.
 * Never include request bodies or API keys in `context`.
 */

export async function reportError(
  err: unknown,
  context?: Record<string, string>
): Promise<void> {
  console.error("[scicard]", err);
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  try {
    const Sentry = await import("@sentry/nextjs");
    if (!Sentry.getClient()) {
      Sentry.init({
        dsn,
        tracesSampleRate: 0,
      });
    }
    Sentry.captureException(err, context ? { tags: context } : undefined);
  } catch (reportErr) {
    console.error("[sentry]", reportErr);
  }
}
