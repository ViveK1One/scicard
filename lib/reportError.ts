/** Server log for unexpected failures. Do not pass API keys or card text. */
export async function reportError(
  err: unknown,
  context?: Record<string, string>
): Promise<void> {
  console.error("[scicard]", context?.route ?? "error", err);
}
