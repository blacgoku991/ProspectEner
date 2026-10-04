import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { DISPOSITIF_INFO, ENGINE_VERSION, formatEuros, type DispositifId } from "@/engine";
import { getPublishedRuleSet } from "@/lib/rulesets";

export const metadata: Metadata = {
  title: "Méthode et sources",
  description: "Comment fonctionne le simulateur de pré-éligibilité : dispositifs évalués, règles, sources officielles, limites.",
};

const fmt = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`)) : "—";

const VERIFICATION = { VERIFIED: "Vérifiées", PARTIAL: "Vérifiées partiellement", UNVERIFIED: "Non vérifiées (conclusion désactivée)" } as const;

export default async function MethodologyPage() {
  const ruleSet = await getPublishedRuleSet();
  const r = ruleSet.data;
  const ids = Object.keys(r.dispositifs) as DispositifId[];
  return (
    <LegalPage title="Méthode et sources" updated={`Barème en vigueur : « ${r.meta.label} » — version ${ruleSet.version}, moteur ${ENGINE_VERSION}`}>
      <h2>Principes</h2>
      <ul>
        <li>Un moteur déterministe, séparé de l&apos;interface : mêmes réponses, même date, même barème → même résultat.</li>
        <li>Chaque dispositif est évalué séparément, avec ses propres critères (ancienneté, statut, revenus, travaux…).</li>
        <li>Trois conclusions possibles par dispositif : potentiellement éligible, critères non remplis selon les réponses, vérification nécessaire. Les territoires et projets non couverts sont indiqués « hors périmètre ».</li>
        <li>Aucun montant n&apos;est calculé dans cette version : seule une pré-éligibilité expliquée est fournie.</li>
        <li>Une règle qui n&apos;a pas pu être vérifiée n&apos;est jamais inventée : la conclusion correspondante est désactivée.</li>
        <li>Chaque demande envoyée conserve la version du barème et du moteur utilisée.</li>
      </ul>

      <h2>Dispositifs évalués</h2>
      {ids.map((id) => {
        const d = r.dispositifs[id];
        if (!d.enabled) return null;
        return (
          <section key={id}>
            <h3>
              {DISPOSITIF_INFO[id].name} — {DISPOSITIF_INFO[id].kind.toLowerCase()} ({DISPOSITIF_INFO[id].provider})
            </h3>
            <p>
              Règles {VERIFICATION[d.verification.status].toLowerCase()} le {fmt(d.verification.verifiedAt)} ; applicables du {fmt(d.validFrom)} au{" "}
              {fmt(d.validUntil)}. Territoires couverts : {d.territories.map((t) => (t === "IDF" ? "Île-de-France" : t === "METRO" ? "autres territoires métropolitains" : "outre-mer")).join(", ")}.
            </p>
            {d.verification.status === "PARTIAL" && d.verification.notes && <p>Points non confirmés : {d.verification.notes}</p>}
            <ul>
              {d.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <h2>Plafonds de ressources {r.incomeCeilings.year}</h2>
      <p>
        Revenu fiscal de référence du ménage, plafonds inclus. {r.incomeCeilings.rfrNote} Source :{" "}
        {r.incomeCeilings.sources.map((s, i) => (
          <span key={s.url}>
            {i > 0 && ", "}
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.label}
            </a>
          </span>
        ))}
        .
      </p>
      {(["IDF", "HORS_IDF"] as const).map((zone) => (
        <table key={zone}>
          <caption className="mb-2 text-left font-semibold text-ink-900">{zone === "IDF" ? "Île-de-France" : "Autres régions"}</caption>
          <thead>
            <tr>
              <th>Personnes</th>
              <th>Très modestes</th>
              <th>Modestes</th>
              <th>Intermédiaires</th>
            </tr>
          </thead>
          <tbody>
            {r.incomeCeilings[zone].bySize.map((t, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>≤ {formatEuros(t[0])}</td>
                <td>≤ {formatEuros(t[1])}</td>
                <td>≤ {formatEuros(t[2])}</td>
              </tr>
            ))}
            <tr>
              <td>Par personne en plus</td>
              <td>+ {formatEuros(r.incomeCeilings[zone].extraPerson[0])}</td>
              <td>+ {formatEuros(r.incomeCeilings[zone].extraPerson[1])}</td>
              <td>+ {formatEuros(r.incomeCeilings[zone].extraPerson[2])}</td>
            </tr>
          </tbody>
        </table>
      ))}

      <h2>Limites connues</h2>
      <ul>
        <li>Outre-mer, collectivités d&apos;outre-mer et logements hors de France : hors périmètre.</li>
        <li>Aides des collectivités locales et MaPrimeRénov&apos; Copropriété : non évaluées.</li>
        <li>Les montants, plafonds de dépenses et règles de cumul ne sont pas calculés.</li>
        <li>
          La vérification documentaire des règles a été réalisée à partir d&apos;extraits des pages officielles ; une relecture directe des sources
          est prévue avant toute mise à jour du barème.
        </li>
      </ul>
      {r.notices.length > 0 && (
        <>
          <h2>À savoir</h2>
          <ul>
            {r.notices.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </>
      )}
    </LegalPage>
  );
}
