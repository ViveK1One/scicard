import { headers } from "next/headers";
import { rateLimit, type RateLimitResult } from "@/lib/rateLimit";

/** Limit loads of a public card page, including its metadata request. */
export async function limitCardPage(): Promise<RateLimitResult> {
  const headerList = headers();
  const req = new Request("https://scicard.local/c", {
    headers: {
      "x-forwarded-for": headerList.get("x-forwarded-for") ?? "",
      "x-real-ip": headerList.get("x-real-ip") ?? "",
    },
  });
  return rateLimit(req, "card-page", 120, 10 * 60 * 1000);
}
