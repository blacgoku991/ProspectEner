/**
 * Réglages du site Elyra.
 * Tout ce qui dépend de ton serveur se règle ici : liens, code FiveM, mentions légales.
 * Un lien laissé vide ('') masque simplement le bouton ou le renvoie vers la page « Rejoindre ».
 */
export const site = {
  name: 'Elyra',
  baseline: 'Serveur GTA RP francophone',
  description:
    'Elyra est un serveur GTA RP francophone et gratuit sur FiveM. Métiers, factions, règlement clair et communauté soudée : choisis ta place à Los Santos.',

  links: {
    /** Invitation Discord, ex. https://discord.gg/xxxxxxx */
    discord: '',
    /** Lien de connexion directe, ex. https://cfx.re/join/xxxxxx */
    fivem: '',
    /** Boutique externe (Tebex), ex. https://boutique.elyra.fr */
    store: '',
    /** Wiki externe, ex. https://wiki.elyra.fr */
    wiki: '',
    tiktok: '',
    youtube: '',
    twitch: '',
    instagram: '',
  },

  /**
   * Code cfx.re du serveur (les caractères après cfx.re/join/).
   * Renseigné, il active le compteur de joueurs en direct dans l'en-tête et sur l'accueil.
   */
  cfxCode: '',

  /** Mentions légales : à compléter avant la mise en ligne. */
  legal: {
    editeur: '',
    statut: '',
    adresse: '',
    contact: '',
    directeur: '',
    hebergeur: '',
    hebergeurAdresse: '',
  },
} as const;

/** Lien « Rejoindre » : le Discord s'il est renseigné, sinon la page du parcours d'arrivée. */
export const joinUrl: string = site.links.discord || '/rejoindre';
/** Lien « Se connecter » : la connexion directe FiveM si elle est renseignée. */
export const playUrl: string = site.links.fivem || '/rejoindre';

export const isExternal = (url: string) => /^https?:\/\//.test(url);

/** Attributs à poser sur un lien selon qu'il sort du site ou non. */
export const linkAttrs = (url: string) =>
  isExternal(url) ? { href: url, target: '_blank', rel: 'noopener noreferrer' } : { href: url };

export const nav = [
  { label: 'Métiers', href: '/metiers' },
  { label: 'Factions', href: '/factions' },
  {
    label: 'Règlement',
    href: '/reglement',
    children: [
      { label: 'Global', href: '/reglement/global', hint: 'Le socle commun' },
      { label: 'Légal', href: '/reglement/legal', hint: 'Services & entreprises' },
      { label: 'Illégal', href: '/reglement/illegal', hint: 'Groupes & scènes' },
    ],
  },
  { label: 'Boutique', href: '/boutique' },
  { label: 'Aide', href: '/aide' },
] as const;

/**
 * Typographie française : apostrophes courbes et espaces insécables
 * devant « : ; ! ? » et à l'intérieur des guillemets.
 */
export function fr(text: string): string {
  return text
    .replace(/(\p{L})'(\p{L})/gu, '$1’$2')
    .replace(/ ([:;!?»])/g, ' $1')
    .replace(/« /g, '« ');
}
