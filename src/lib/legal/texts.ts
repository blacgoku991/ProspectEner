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
 * pas une prospection ultérieure. Mise en relation : l'entreprise partenaire est nommée avant
 * l'envoi, sans lui prêter de rôle (la personne a parfois déjà choisi l'entreprise de ses travaux) ;
 * elle seule peut recevoir la demande sans autre accord (art. L223-1 et R223-4 du Code de la
 * consommation, destinataires identifiés dès la collecte).
 */
export function buildRequestSentence(companyName: string, channel: ChannelChoice, worksText: string, partnerName?: string | null): string {
  return requestSentence(companyName, CHANNEL_LABELS[channel], worksText, partnerName);
}

/** Phrase affichée tant que le canal n'est pas choisi (la case ne peut pas encore être cochée). */
export function requestSentencePreview(companyName: string, worksText: string, partnerName?: string | null): string {
  return requestSentence(companyName, "[choisissez un canal ci-dessus]", worksText, partnerName);
}

function requestSentence(companyName: string, channelLabel: string, worksText: string, partnerName?: string | null): string {
  const by = partnerName ? `${companyName} et par l'entreprise partenaire ${partnerName},` : `${companyName},`;
  return `Je demande à être contacté(e) par ${by} par ${channelLabel}, au sujet de mon projet de ${worksText}.`;
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
  return [
    `${s.company.name} utilise vos coordonnées et vos réponses uniquement pour répondre à votre demande et étudier votre projet de rénovation énergétique.`,
    referralEnabled(s)
      ? // Mise en relation : transmission à la seule entreprise nommée dans la demande, ou à une seule entreprise
        // avec l'accord de la personne, et rémunération annoncée (art. L111-7 du Code de la consommation).
        "Si votre demande nomme une entreprise partenaire, elle lui est transmise, à elle seule ; sinon, une entreprise ne la reçoit que si vous acceptez un rendez-vous avec elle, son nom vous étant indiqué avant. Ces mises en relation sont rémunérées par les entreprises partenaires. Vos coordonnées ne sont jamais transmises à d'autres entreprises, ni utilisées pour une newsletter ou d'autres sollicitations : vous pouvez annuler votre demande à tout moment."
      : "Elles ne sont jamais vendues, ni utilisées pour une newsletter ou d'autres sollicitations : vous pouvez annuler votre demande à tout moment.",
    `Durée de conservation (${months(s.retention.requestMonths)} au plus), base légale et exercice de vos droits (accès, effacement, opposition, réclamation auprès de la CNIL) : ${PRIVACY_LINK_TEXT}.`,
  ].join("\n\n");
}

export interface FaqEntry {
  q: string;
  a: string;
}

/**
 * Questions fréquentes de la page d'accueil, affichées et publiées telles quelles (données
 * structurées FAQPage) : un seul tableau pour les deux. La réponse sur le devenir des réponses
 * suit la notice d'information : avec la mise en relation, la transmission à une entreprise
 * partenaire et la rémunération sont annoncées.
 */
export function homeFaq(s: SiteSettings): FaqEntry[] {
  return [
    {
      q: "Le test est-il gratuit ?",
      a: "Oui. Le test est gratuit, sans inscription et sans engagement. Il prend environ 3 minutes.",
    },
    {
      q: "Est-ce un site officiel ?",
      a: "Non. C'est un service privé indépendant, non affilié à l'État, à l'Anah ou à France Rénov'. Le service public d'information est accessible gratuitement sur france-renov.gouv.fr.",
    },
    {
      q: "Le résultat vaut-il accord d'une aide ?",
      a: "Non. Il s'agit d'une pré-éligibilité indicative, fondée sur vos réponses et sur les règles en vigueur à la date de la simulation. Seule l'instruction du dossier par l'organisme concerné décide de l'attribution.",
    },
    {
      q: "Dois-je donner mes coordonnées pour voir le résultat ?",
      a: "Non. Le résultat s'affiche directement. Vous pouvez ensuite, si vous le souhaitez, demander à être recontacté(e) pour une étude de votre projet.",
    },
    {
      q: "Que deviennent mes réponses ?",
      a: referralEnabled(s)
        ? "Tant que vous n'envoyez pas de demande, vos réponses restent dans votre navigateur. Si vous envoyez une demande, elles sont jointes à celle-ci. Elles ne sont transmises qu'à l'entreprise partenaire nommée dans votre demande avant l'envoi ou, si vous acceptez un rendez-vous, à l'entreprise qui l'assure, dont le nom vous est indiqué avant. Ces mises en relation sont rémunérées par les entreprises partenaires."
        : "Tant que vous n'envoyez pas de demande, vos réponses restent dans votre navigateur. Si vous envoyez une demande, elles sont jointes à celle-ci et ne sont transmises à aucun partenaire.",
    },
    {
      q: "Me demanderez-vous des documents ?",
      a: "Jamais de numéro fiscal, d'avis d'imposition, de pièce d'identité, de coordonnées bancaires ou d'identifiants FranceConnect sur ce site.",
    },
    {
      q: "Puis-je annuler ma demande ?",
      a: referralEnabled(s)
        ? "Oui, à tout moment, grâce au lien d'annulation fourni après l'envoi, ou depuis la page « Annuler une demande ». Si votre demande a déjà été transmise à une entreprise partenaire, nous l'informons de votre annulation."
        : "Oui, à tout moment, grâce au lien d'annulation fourni après l'envoi, ou depuis la page « Annuler une demande ».",
    },
  ];
}

/** Fin de la notice, affichée comme lien vers la politique de confidentialité. */
export const PRIVACY_LINK_TEXT = "voir la politique de confidentialité";

/** Texte de la notice d'information découpé pour l'affichage. */
export function noticeParagraphs(notice: string): string[] {
  return notice.split("\n\n");
}
