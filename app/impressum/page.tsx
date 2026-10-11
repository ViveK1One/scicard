import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { operatorDetails } from "@/lib/operator";

export const metadata: Metadata = { title: "Impressum — SciCard" };

export default function ImpressumPage() {
  const operator = operatorDetails();

  return (
    <LegalPage title="Impressum">
      <p>Angaben gemäß § 5 DDG (Digitale-Dienste-Gesetz).</p>
      {operator.configured ? (
        <>
          <p className="whitespace-pre-line text-[var(--ink)]">
            {operator.name}
            {"\n"}
            {operator.address}
          </p>
          <p>
            Kontakt:{" "}
            <a className="underline" href={`mailto:${operator.email}`}>
              {operator.email}
            </a>
          </p>
        </>
      ) : (
        <p>
          Die Anbieterkennzeichnung ist noch nicht hinterlegt. Vor dem
          öffentlichen Start müssen <code>IMPRESSUM_NAME</code>,{" "}
          <code>IMPRESSUM_ADDRESS</code> und <code>IMPRESSUM_EMAIL</code> gesetzt
          werden.
        </p>
      )}
      <p>SciCard ist ein Werkzeug für visuelle STEM-Karten. Es gibt kein Nutzerkonto.</p>
    </LegalPage>
  );
}
