import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { operatorDetails } from "@/lib/operator";

export const metadata: Metadata = { title: "Datenschutz — SciCard" };

export default function PrivacyPage() {
  const operator = operatorDetails();
  const contact = operator.configured
    ? `${operator.name}, ${operator.address}, ${operator.email}`
    : "die Angaben im Impressum, sobald Name, Anschrift und E-Mail hinterlegt sind";

  return (
    <LegalPage title="Datenschutz">
      <h2 className="text-base font-medium text-[var(--ink)]">Verantwortlicher</h2>
      <p>
        Verantwortlich für diese Seite ist {contact}. Es gibt kein Nutzerkonto.
      </p>

      <h2 className="text-base font-medium text-[var(--ink)]">Welche Daten anfallen</h2>
      <p>
        Wenn du Text einfügst, verarbeitet SciCard diesen Text, um eine Karte zu
        zeichnen. „Teach me“ erzeugt eine Erklärung. Ein PNG entsteht in deinem
        Browser und auf dem Server. Speichern legt den Text, die Erklärung, das
        Farbschema und das Format unter einer zufälligen Adresse ab. Wer den
        Link hat, kann die Karte lesen.
      </p>
      <p>
        Für die Begrenzung von Missbrauch wird die IP-Adresse kurz gezählt. Es
        werden keine Werbe-Cookies gesetzt.
      </p>

      <h2 className="text-base font-medium text-[var(--ink)]">
        Auftragsverarbeiter
      </h2>
      <p>Diese Stellen verarbeiten Daten für den Betrieb der Seite:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          Vercel Inc., USA: Hosting der Next.js-App und Web Analytics ohne
          Cookies (Seitenaufrufe, keine Profile).
        </li>
        <li>
          Neon, USA: Postgres-Datenbank für gespeicherte Karten. Der konkrete
          Speicherort ist die Region des Neon-Projekts.
        </li>
        <li>
          Upstash, USA: Redis für Ratenbegrenzung, den Zwischenspeicher der
          Erklärungen und Nutzungszähler. Die Region folgt dem Upstash-Projekt.
        </li>
        <li>
          Groq, USA: der Text, den du an „Teach me“ schickst, wird dort von
          einem Sprachmodell erklärt. Die Erklärung kann falsch sein.
        </li>
        <li>
          Chemie-Dienst (Railway oder Render, regelmäßig USA), nur wenn
          Strukturformeln gezeichnet werden: die übergebene Formel oder SMILES.
          Zeichnen von Reaktionen ist eine Beta-Funktion.
        </li>
      </ul>

      <h2 className="text-base font-medium text-[var(--ink)]">Rechtsgrundlagen</h2>
      <p>
        Art. 6 Abs. 1 lit. b DSGVO: die Karte, die Erklärung und der Export sind
        der Dienst, den du abrufst.
      </p>
      <p>
        Art. 6 Abs. 1 lit. f DSGVO: Ratenbegrenzung, der Schutz vor Missbrauch,
        kurze Fehlerberichte und die cookie-freie Besuchszählung. Das Interesse
        ist ein betriebsfähiger Dienst. Es entsteht kein Profil und keine
        Werbung. Du kannst dieser Verarbeitung widersprechen (Art. 21 DSGVO).
      </p>

      <h2 className="text-base font-medium text-[var(--ink)]">Speicherdauer</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Gespeicherte Karten: bis du die Löschung an die Kontaktadresse schreibst.</li>
        <li>Zwischenspeicher einer Teach-me-Erklärung: 24 Stunden.</li>
        <li>Zähler der Ratenbegrenzung: 10 Minuten.</li>
        <li>
          Nutzungszähler in Redis: bis sie im Projekt gelöscht werden. Sie
          enthalten keine Karteninhalte.
        </li>
        <li>
          Server-Logs beim Hoster: nach dessen üblicher Frist, in der Regel
          Tage bis wenige Wochen.
        </li>
      </ul>

      <h2 className="text-base font-medium text-[var(--ink)]">
        Übermittlung außerhalb der EU
      </h2>
      <p>
        Groq, Vercel und je nach gewählter Region auch Neon und Upstash
        sitzen in den USA oder können von dort auf Daten zugreifen. Dafür gelten
        die Standardvertragsklauseln nach Art. 46 Abs. 2 lit. c DSGVO. Liegt
        das Neon- oder Upstash-Projekt in der EU, bleibt die Speicherung dort;
        ein Zugriff des US-Anbieters ist trotzdem eine Übermittlung.
      </p>

      <h2 className="text-base font-medium text-[var(--ink)]">Deine Rechte</h2>
      <p>
        Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung
        der Verarbeitung und Datenübertragbarkeit, soweit die Voraussetzungen
        der Art. 15 bis 20 DSGVO vorliegen. Gegen Verarbeitungen nach Art. 6
        Abs. 1 lit. f DSGVO kannst du Widerspruch einlegen (Art. 21 DSGVO).
        Es gibt keine ausschließlich automatisierte Entscheidung mit rechtlicher
        Wirkung.
      </p>
      <p>
        Beschwerden richtest du an die Datenschutzaufsicht deines Bundeslandes
        oder an den Bundesbeauftragten für den Datenschutz und die
        Informationsfreiheit. Anfragen an die Impressum-Adresse reichen wir
        innerhalb eines Monats.
      </p>
    </LegalPage>
  );
}
