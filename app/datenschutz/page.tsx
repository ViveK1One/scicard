import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { operatorDetails } from "@/lib/operator";

export const metadata: Metadata = { title: "Datenschutz — SciCard" };

export default function PrivacyPage() {
  const operator = operatorDetails();

  return (
    <LegalPage title="Datenschutz">
      <p>
        Verantwortlicher:{" "}
        {operator.configured
          ? `${operator.name}, ${operator.address}, ${operator.email}`
          : "wird vor dem öffentlichen Start im Impressum genannt."}
      </p>
      <p>
        SciCard speichert kein Konto und kein Passwort. Wenn du eine Karte
        speicherst, liegen der eingegebene Text, die Erklärung, das Thema und
        das Format unter einer zufälligen Adresse. Wer den Link hat, kann die
        Karte öffnen.
      </p>
      <p>
        „Teach me“ sendet den eingegebenen Text an Groq (USA), um eine kurze
        Erklärung zu erzeugen. Die Erklärung kann falsch sein. Gespeicherte
        Erklärungen bleiben in unserer Datenbank, bis du die Löschung an die
        Kontaktadresse schreibst.
      </p>
      <p>
        Zur Begrenzung von Missbrauch wird die IP-Adresse kurz in Redis
        gezählt. Diese Zähler laufen von selbst ab. Es werden keine
        Werbe-Cookies gesetzt. Vercel Web Analytics zählt Seitenaufrufe ohne
        Cookies und ohne Profil.
      </p>
      <p>
        Wenn Fehlerüberwachung aktiv ist, können technische Fehlermeldungen an
        Sentry gehen. Sie enthalten keine API-Schlüssel.
      </p>
      <p>
        Rechtsgrundlagen sind Art. 6 Abs. 1 lit. b DSGVO (Nutzung des Dienstes)
        und lit. f DSGVO (Missbrauchsschutz). Du kannst Auskunft und Löschung
        über die Impressum-Adresse verlangen und dich bei einer
        Datenschutzaufsicht beschweren.
      </p>
    </LegalPage>
  );
}
