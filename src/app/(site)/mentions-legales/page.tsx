import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Field, LegalPage } from "@/components/site/LegalPage";
import { INDEPENDENCE_DISCLAIMER } from "@/lib/legal/texts";
import { publicPartnerNames, siteSettings } from "@/lib/site-data";
import { ACTIVITY_LABELS, referralEnabled } from "@/lib/settings-schema";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({ title: "Mentions légales", description: "Éditeur du site, hébergeur, médiateur de la consommation et informations légales.", path: "/mentions-legales" });
}

export default async function MentionsLegalesPage() {
  const [s, partners] = await Promise.all([siteSettings(), publicPartnerNames()]);
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
      {referralEnabled(s) && (
        <>
          <p>
            Mise en relation : une demande n&apos;est transmise qu&apos;à l&apos;entreprise partenaire nommée dans la demande, avant l&apos;envoi, ou, si la
            demande n&apos;en nomme aucune et que la personne accepte un rendez-vous, à l&apos;entreprise partenaire qui l&apos;assure, dont le nom lui est
            indiqué avant toute transmission de ses coordonnées. L&apos;éditeur est rémunéré par les entreprises partenaires pour ces mises en relation
            (article L111-7 du Code de la consommation).
          </p>
          {partners.length > 0 ? (
            <ul>
              {partners.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          ) : (
            <p>
              Entreprises partenaires : <Field value="" />
            </p>
          )}
        </>
      )}
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
