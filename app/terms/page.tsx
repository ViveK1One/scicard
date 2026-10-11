import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms — SciCard" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms">
      <p>
        SciCard turns what you paste into a visual card. Teach me text is
        produced by a language model. It can be incomplete or wrong. Do not use
        it as the only source for exams, lab work, medicine, or engineering
        decisions.
      </p>
      <p>
        You are responsible for what you paste and for any link you share. A
        saved card is visible to anyone who has the link. There is no account
        and no private library.
      </p>
      <p>
        The service is provided as available, without a warranty that a card,
        structure, or explanation is accurate. We may rate-limit or refuse
        requests that overload the service.
      </p>
    </LegalPage>
  );
}
