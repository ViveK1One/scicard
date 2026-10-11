"use client";

import { forwardRef } from "react";
import { ContentType } from "@/lib/detectType";
import type { Explanation } from "@/lib/explain";
import EquationCard from "@/components/templates/EquationCard";
import ReactionCard from "@/components/templates/ReactionCard";
import ConceptCard from "@/components/templates/ConceptCard";

export interface CardPreviewProps {
  contentType: ContentType;
  input: string;
  explanation?: Explanation | null;
  teachBusy?: boolean;
  teachError?: string | null;
  aspectRatio?: string;
}

const CardPreview = forwardRef<HTMLDivElement, CardPreviewProps>(
  function CardPreview(
    {
      contentType,
      input,
      explanation = null,
      teachBusy = false,
      teachError = null,
      aspectRatio = "1.91 / 1",
    },
    ref
  ) {
    return (
      <div ref={ref} className="w-full">
        {contentType === "equation" && (
          <EquationCard
            latex={input}
            explanation={explanation}
            teachBusy={teachBusy}
            teachError={teachError}
            aspectRatio={aspectRatio}
          />
        )}

        {contentType === "reaction" && (
          <ReactionCard
            input={input}
            explanation={explanation}
            teachBusy={teachBusy}
            teachError={teachError}
            aspectRatio={aspectRatio}
          />
        )}

        {contentType === "concept" && (
          <ConceptCard
            text={input}
            explanation={explanation}
            teachBusy={teachBusy}
            teachError={teachError}
            aspectRatio={aspectRatio}
          />
        )}
      </div>
    );
  }
);

export default CardPreview;
