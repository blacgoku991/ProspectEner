import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { Field, LegalPage } from "@/components/site/LegalPage";
import { referralEnabled } from "@/lib/settings-schema";
import { publicPartnerNames, siteSettings } from "@/lib/site-data";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Politique de confidentialité",
    description: "Données collectées, finalités, durées de conservation et droits des personnes : comment vos informations sont traitées.",
    path: "/confidentialite",
  });
}

const duration = (months: number) => (months % 12 === 0 ? `${months / 12} an${months / 12 > 1 ? "s" : ""}` : `${months} mois`);

export default async function ConfidentialitePage() {
  const [s, partners] = await Promise.all([siteSettings(), publicPartnerNames()]);
  const c = s.company;
  const r = s.retention;
  const rights = c.privacyContact || c.email;
  const referral = referralEnabled(s);
  // Rendez-vous réservés à certaines catégories de revenus (paramètres) : usage annoncé dans la finalité.
  const incomeGating = s.contact.acceptedIncomeCategories.length < 4;
  return (
    <LegalPage title="Politique de confidentialité" missing={[!c.name && "responsable du traitement", !rights && "contact pour exercer vos droits"].filter(Boolean) as string[]}>
      <h2>Responsable du traitement</h2>
      <p>
        <Field value={[c.name, c.legalForm, c.address].filter(Boolean).join(", ")} />. Contact pour vos données personnelles :{" "}
        <Field value={rights} />.
      </p>

      <h2>1. Simulation (questionnaire)</h2>
      <p>
        Les réponses au questionnaire sont traitées dans votre navigateur et y restent (stockage de session, effacé à la fermeture de l&apos;onglet)
        tant que vous n&apos;envoyez pas de demande : aucune fiche n&apos;est créée avant l&apos;envoi volontaire du formulaire de contact. Le code postal
        saisi est transmis à notre serveur uniquement pour afficher la liste des communes correspondantes ; il n&apos;est pas enregistré. Des
        statistiques de parcours strictement agrégées (nombre de passages par étape et par jour) sont tenues sans cookie, sans identifiant et sans
        aucune réponse au questionnaire.{referral
          ? " Le choix de l'entreprise partenaire éventuellement nommée dans votre demande est lui aussi fait dans votre navigateur, à partir de vos réponses."
          : ""}
      </p>

      <h2>2. Demandes de contact</h2>
      <table>
        <tbody>
          <tr><th>Données</th><td>Prénom, nom, téléphone ou e-mail (selon le canal choisi), adresse e-mail complémentaire et adresse du logement si vous les indiquez, commune et code postal, disponibilités et commentaire facultatifs, réponses au questionnaire (dont la taille du foyer, la tranche de revenu fiscal de référence et les caractéristiques du chauffage) et résultat indicatif, paramètres de campagne publicitaire éventuels (sans donnée personnelle). Aucun avis d&apos;imposition, numéro fiscal ni justificatif n&apos;est demandé.</td></tr>
          <tr>
            <th>Finalité</th>
            <td>
              Répondre à votre demande et étudier votre projet de rénovation énergétique
              {incomeGating ? " ; vérifier, d'après la catégorie de revenus que vous déclarez, si un rendez-vous peut vous être proposé" : ""}
              {referral
                ? " ; choisir, d'après vos réponses (dont votre catégorie de revenus), l'entreprise partenaire éventuellement nommée dans votre demande et lui transmettre celle-ci ; si vous l'acceptez, organiser votre rendez-vous avec une entreprise partenaire."
                : "."}
            </td>
          </tr>
          <tr><th>Base légale</th><td>Mesures précontractuelles prises à votre demande (article 6.1.b du RGPD).</td></tr>
          <tr>
            <th>Destinataires</th>
            <td>
              Personnes habilitées de l&apos;éditeur et ses prestataires techniques (hébergement, messagerie).{" "}
              {referral ? (
                <>
                  Si votre demande nomme une entreprise partenaire (son nom figure dans la phrase que vous validez avant l&apos;envoi) : cette entreprise,
                  et elle seule. Sinon, si vous acceptez un rendez-vous : une seule entreprise partenaire, dont le nom vous est indiqué
                  avant{partners.length > 0 ? <> (entreprises concernées : {partners.join(" ; ")})</> : null}. Elle reçoit vos coordonnées (y compris
                  l&apos;e-mail et l&apos;adresse si vous les avez indiqués), votre projet, les caractéristiques utiles du logement et du chauffage, la taille
                  de votre foyer et votre catégorie de revenus. Elle les traite ensuite en tant que responsable de traitement distinct, uniquement pour
                  répondre à votre demande ; vous pouvez exercer vos droits auprès d&apos;elle ou auprès de nous, et nous l&apos;informons de toute
                  annulation, opposition ou demande d&apos;effacement. L&apos;éditeur est rémunéré par ses entreprises partenaires pour ces mises en
                  relation. Aucune transmission à d&apos;autres entreprises.
                </>
              ) : (
                "Aucune vente ni transmission à des partenaires."
              )}
            </td>
          </tr>
          <tr><th>Durée</th><td>{duration(r.requestMonths)} à compter de la demande ou de votre dernier contact ; coordonnées effacées sous {r.cancelledRequestDays} jours en cas d&apos;annulation.</td></tr>
        </tbody>
      </table>
      <p>
        Votre demande est ponctuelle : elle permet de vous répondre au sujet du projet indiqué, et ne vaut pas accord pour d&apos;autres sollicitations
        commerciales. Aucune inscription à une lettre d&apos;information n&apos;est réalisée.
      </p>

      <h2>3. Preuve de la demande</h2>
      <p>
        Pour pouvoir justifier qu&apos;un échange répond à votre demande, nous conservons {duration(r.proofMonths)} : la date et l&apos;heure de la demande,
        le texte exact que vous avez validé, la version de la notice d&apos;information affichée et des empreintes non réversibles de vos coordonnées
        et de votre adresse IP (base légale : obligation légale de preuve et intérêt légitime).
      </p>

      <h2>4. Liste d&apos;opposition</h2>
      <p>
        Si vous vous opposez à être recontacté(e), une empreinte non réversible de votre numéro ou de votre adresse est conservée{" "}
        {duration(r.oppositionMonths)} afin de respecter votre choix (intérêt légitime / respect de vos droits).
      </p>

      <h2>5. Sécurité et journalisation</h2>
      <p>
        L&apos;espace d&apos;administration est protégé par authentification forte. Les accès aux fiches, exports et opérations sensibles sont
        journalisés et conservés {duration(r.auditLogMonths)} (intérêt légitime : sécurité du traitement).
      </p>

      <h2>6. Hébergement et transferts</h2>
      <p>
        Hébergeur : <Field value={[c.hostName, c.hostAddress].filter(Boolean).join(", ")} />. Transferts hors de l&apos;Union européenne :{" "}
        <Field value={c.dataTransfersInfo} />
      </p>

      <h2>7. Vos droits</h2>
      <p>
        Vous disposez des droits d&apos;accès, de rectification, d&apos;effacement, de limitation et d&apos;opposition. Écrivez à <Field value={rights} />.
        Vous pouvez aussi annuler votre demande et faire effacer vos coordonnées depuis la page <Link href="/annulation">Annuler une demande</Link>.
        {referral
          ? " Si votre demande a déjà été transmise à une entreprise partenaire, nous l'informons de votre annulation, de votre opposition ou de votre demande d'effacement."
          : ""}{" "}
        En cas de difficulté, vous pouvez introduire une réclamation auprès de la CNIL (<a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>).
      </p>

      <h2>8. Cookies et stockage local</h2>
      <p>
        Voir la page <Link href="/cookies">Cookies et préférences</Link> : aucun cookie publicitaire ni traceur tiers n&apos;est utilisé par défaut.
      </p>
    </LegalPage>
  );
}
