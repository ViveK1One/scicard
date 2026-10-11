import type { Metadata } from "next";
import { headers } from "next/headers";
import SavedCardView from "@/components/SavedCardView";
import { cardTitle } from "@/lib/cardRecord";
import { readCard } from "@/lib/cardStore";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const card = await readCard(params.id);
  if (!card) {
    return { title: "Card not found — SciCard" };
  }
  const title = cardTitle(card);
  const description = (
    card.explanation?.takeaway ||
    card.explanation?.explanation ||
    card.input
  ).slice(0, 180);
  const headerList = headers();
  const host = headerList.get("x-forwarded-host") || headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") || "http";
  const image = host ? `${proto}://${host}/c/${params.id}/og` : `/c/${params.id}/og`;

  return {
    title: `${title} — SciCard`,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default function CardPage({ params }: { params: { id: string } }) {
  return <SavedCardView id={params.id} />;
}
