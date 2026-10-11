export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.NODE_ENV !== "production") return;

  const missing: string[] = [];
  if (!process.env.DATABASE_URL?.trim()) missing.push("DATABASE_URL");
  if (!process.env.UPSTASH_REDIS_REST_URL?.trim()) {
    missing.push("UPSTASH_REDIS_REST_URL");
  }
  if (!process.env.UPSTASH_REDIS_REST_TOKEN?.trim()) {
    missing.push("UPSTASH_REDIS_REST_TOKEN");
  }
  if (!process.env.GROQ_API_KEY?.trim()) missing.push("GROQ_API_KEY");

  if (missing.length > 0) {
    throw new Error(
      `SciCard cannot start in production. Missing: ${missing.join(", ")}.`
    );
  }
}
