import type { Metadata } from "next";
import { Field, LegalPage } from "@/components/site/LegalPage";
import { INDEPENDENCE_DISCLAIMER } from "@/lib/legal/texts";
import { getSettings } from "@/lib/settings";
import { ACTIVITY_LABELS } from "@/lib/settings-schema";

export const metadata: Metadata = { title: "Mentions légales" };

export default async function MentionsLegalesPage() {
  const s = await getSettings();
  const c = s.company;
  const missing = [
    !c.name && "dénomination",
    !c.legalForm && "forme juridique",
    !c.address && "siège social",
    !c.registration && "immatriculation",
    !c.phone && "téléphone",
    !c.email && "e-mail",
    !c.publicationDirector && "directeur de la publication",
    !(c.hostName && c.hostAddress && c.hostPhone) && "hébergeur",
    !c.mediatorName && "médiateur de la consommation",
  ].filter(Boolean) as string[];

  return (
    <LegalPage title="Mentions légales" missing={missing}>
      <p>
        <strong>{INDEPENDENCE_DISCLAIMER}</strong> Ce site présente une activité privée ; il ne constitue pas une démarche administrative et ne
        dépose aucun dossier auprès d&apos;un organisme public.
      </p>
      <h2>Éditeur du site</h2>
      <ul>
        <li>Dénomination : <Field value={c.name} /></li>
        <li>Forme juridique : <Field value={c.legalForm} /></li>
        <li>Capital social : <Field value={c.shareCapital} /></li>
        <li>Siège social : <Field value={c.address} /></li>
        <li>Immatriculation (RCS / RNE, SIREN) : <Field value={c.registration} /></li>
        <li>N° de TVA intracommunautaire : <Field value={c.vatNumber} /></li>
        <li>Téléphone : <Field value={c.phone} /></li>
        <li>E-mail : <Field value={c.email} /></li>
        <li>Directeur de la publication : <Field value={c.publicationDirector} /></li>
      </ul>
      <h2>Activité</h2>
      {s.activity.kinds.length > 0 ? (
        <ul>
          {s.activity.kinds.map((k) => (
            <li key={k}>{ACTIVITY_LABELS[k]}</li>
          ))}
        </ul>
      ) : (
        <p><Field value="" /></p>
      )}
      {s.activity.description && <p className="whitespace-pre-line">{s.activity.description}</p>}
      {s.activity.qualifications && <p>Qualifications déclarées par l&apos;éditeur : {s.activity.qualifications}</p>}
      <h2>Hébergement</h2>
      <ul>
        <li>Hébergeur : <Field value={c.hostName} /></li>
        <li>Adresse : <Field value={c.hostAddress} /></li>
        <li>Téléphone : <Field value={c.hostPhone} /></li>
      </ul>
      <h2>Médiation de la consommation</h2>
      <p>
        Conformément à l&apos;article L612-1 du Code de la consommation, le consommateur peut recourir gratuitement au médiateur de la consommation
        dont relève l&apos;éditeur : <Field value={[c.mediatorName, c.mediatorWebsite, c.mediatorAddress].filter(Boolean).join(" — ")} />.
      </p>
      <h2>Simulateur</h2>
      <p>
        Les résultats du simulateur sont indicatifs. Ils reposent sur les réponses fournies et sur un jeu de règles versionné, établi à partir de
        sources officielles citées sur la page « Méthode et sources ». L&apos;attribution d&apos;une aide relève exclusivement de l&apos;organisme
        compétent.
      </p>
      <h2>Propriété intellectuelle</h2>
      <p>Les contenus de ce site sont protégés. Toute reproduction non autorisée est interdite, sous réserve des exceptions légales.</p>
    </LegalPage>
  );
}
