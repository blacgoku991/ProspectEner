import { referralEnabled, type SiteSettings } from "../settings-schema";

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
 * Information préalable à l'envoi (art. 13 RGPD), en deux niveaux : l'essentiel sous le formulaire,
 * le détail (identité complète, base légale, durées, droits) dans la politique de confidentialité.
 * Chaque paragraphe est séparé par une ligne vide ; le texte exact est conservé comme preuve.
 */
export function buildContactNotice(s: SiteSettings): string {
  const referral = referralEnabled(s);
  return [
    `${s.company.name} utilise vos coordonnées et vos réponses uniquement pour répondre à votre demande et étudier votre projet de rénovation énergétique${
      referral ? " ; si vous acceptez un rendez-vous, l'entreprise qui réalise les travaux les reçoit, son nom vous étant indiqué avant" : ""
    }.`,
    "Elles ne sont jamais vendues, ni utilisées pour une newsletter ou d'autres sollicitations : vous pouvez annuler votre demande à tout moment.",
    `Durée de conservation (${months(s.retention.requestMonths)} au plus), base légale et exercice de vos droits (accès, effacement, opposition, réclamation auprès de la CNIL) : ${PRIVACY_LINK_TEXT}.`,
  ].join("\n\n");
}

/** Fin de la notice, affichée comme lien vers la politique de confidentialité. */
export const PRIVACY_LINK_TEXT = "voir la politique de confidentialité";

/** Texte de la notice d'information découpé pour l'affichage. */
export function noticeParagraphs(notice: string): string[] {
  return notice.split("\n\n");
}
