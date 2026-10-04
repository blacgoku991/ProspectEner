import { partnerList, referralEnabled, type SiteSettings } from "../settings-schema";

/**
 * Textes présentés au visiteur. Fonctions pures partagées entre le navigateur et le serveur :
 * le serveur régénère le texte exact affiché et l'enregistre comme preuve de la demande.
 */

export const INDEPENDENCE_DISCLAIMER =
  "Service privé indépendant, non affilié à l'État, à l'Anah ou à France Rénov'.";

/** Message d'information exigé des professionnels proposant des travaux de rénovation énergétique (art. L122-26 du Code de la consommation, depuis le 1er octobre 2026). */
export const FRANCE_RENOV_NOTICE =
  "Avant de vous engager, le service public vous informe gratuitement pour préparer et sécuriser votre projet : www.france-renov.gouv.fr";
export const FRANCE_RENOV_REDIRECT_URL = "https://france-renov.gouv.fr/servicepublic";
export const FRANCE_RENOV_URL = "https://france-renov.gouv.fr/";

export const INDICATIVE_NOTICE =
  "Résultat indicatif établi à partir de vos réponses. Cette simulation ne dépose aucun dossier auprès d'un organisme public : l'attribution d'une aide dépend de l'instruction du dossier par l'organisme concerné et des conditions applicables à la date de la demande.";

export const NO_STATE_DATA_NOTICE =
  "Nous ne vous demandons jamais de numéro fiscal, d'avis d'imposition, de pièce d'identité, de coordonnées bancaires ni d'identifiants FranceConnect.";

export type ChannelChoice = "PHONE" | "EMAIL";

export const CHANNEL_LABELS: Record<ChannelChoice, string> = {
  PHONE: "téléphone",
  EMAIL: "e-mail",
};

/**
 * Demande explicite et ponctuelle : elle autorise une réponse à cette demande précise,
 * pas une prospection ultérieure.
 */
export function buildRequestSentence(companyName: string, channel: ChannelChoice, worksText: string): string {
  return `Je demande à être contacté(e) par ${companyName}, par ${CHANNEL_LABELS[channel]}, au sujet de mon projet de ${worksText}.`;
}

function months(n: number): string {
  if (n % 12 === 0) {
    const years = n / 12;
    return years === 1 ? "1 an" : `${years} ans`;
  }
  return `${n} mois`;
}

/**
 * Information préalable à l'envoi (art. 13 RGPD). Chaque paragraphe est séparé par une ligne vide.
 */
export function buildContactNotice(s: SiteSettings): string {
  const c = s.company;
  const controller = [c.name, c.legalForm].filter(Boolean).join(", ");
  const contactForRights = c.privacyContact || c.email || "l'adresse indiquée dans les mentions légales";
  const r = s.retention;
  // Mise en relation déclarée : un rendez-vous accepté peut être confié à une entreprise partenaire, avec l'accord de la personne.
  const referral = referralEnabled(s);
  const partnersListed = partnerList(s).length > 0;
  return [
    `Responsable du traitement : ${controller}${c.address ? `, ${c.address}` : ""}.`,
    referral
      ? "Finalité : répondre à votre demande de contact, étudier votre projet de rénovation énergétique et, si vous l'acceptez lors de cet échange, organiser un rendez-vous avec une entreprise partenaire qui réalise l'étude et les travaux. Vos réponses au questionnaire et le résultat indicatif sont joints à votre demande."
      : "Finalité : répondre à votre demande de contact et étudier votre projet de rénovation énergétique. Vos réponses au questionnaire et le résultat indicatif sont joints à votre demande.",
    "Base légale : mesures précontractuelles prises à votre demande (article 6.1.b du RGPD).",
    referral
      ? `Destinataires : les seules personnes habilitées de ${c.name} et ses prestataires techniques (hébergement, messagerie), tenus à la confidentialité. Uniquement si vous acceptez un rendez-vous, l'entreprise partenaire qui en est chargée reçoit vos coordonnées et votre projet : son nom vous est indiqué avant toute transmission${partnersListed ? " (liste des entreprises partenaires dans la politique de confidentialité)" : ""}. Vos données ne sont jamais vendues ni transmises à d'autres entreprises. Aucune démarche n'est effectuée en votre nom auprès d'un organisme public.`
      : `Destinataires : les seules personnes habilitées de ${c.name} et ses prestataires techniques (hébergement, messagerie), tenus à la confidentialité. Vos données ne sont ni vendues, ni transmises à des partenaires. Aucune démarche n'est effectuée en votre nom auprès d'un organisme public.`,
    `Durée de conservation : ${months(r.requestMonths)} à compter de votre demande ou de votre dernier contact. En cas d'annulation, vos coordonnées sont effacées sous ${r.cancelledRequestDays} jours ; la preuve de votre demande (date, texte accepté, empreinte non réversible de vos coordonnées) est conservée ${months(r.proofMonths)}.`,
    `Vos droits : accès, rectification, effacement, limitation et opposition, en écrivant à ${contactForRights}. Vous pouvez introduire une réclamation auprès de la CNIL (www.cnil.fr).`,
    "Cette demande ne vaut pas inscription à une lettre d'information ni accord pour d'autres sollicitations commerciales. Vous pourrez l'annuler à tout moment grâce au lien fourni après l'envoi.",
  ].join("\n\n");
}

/** Texte de la notice d'information découpé pour l'affichage. */
export function noticeParagraphs(notice: string): string[] {
  return notice.split("\n\n");
}
