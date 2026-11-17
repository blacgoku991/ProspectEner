/**
 * Vitrine de la boutique.
 * Contenu d'exemple : adapte les noms, avantages et montants à ta boutique réelle.
 * `price` est facultatif : laissé vide, la carte affiche « Tarif sur la boutique ».
 */
export interface Tier {
  id: string;
  name: string;
  tagline: string;
  perks: string[];
  color: string;
  featured?: boolean;
  /** Ex. « 9,99 € / mois ». */
  price?: string;
}

export const currency = 'Éclats';

export const tiers: Tier[] = [
  {
    id: 'vega',
    name: 'Vega',
    tagline: 'Le premier éclat.',
    color: '#56e4ff',
    perks: [
      "File d'attente prioritaire",
      '300 Éclats chaque mois',
      'Rôle et couleur sur Discord',
      "Une plaque d'immatriculation personnalisée",
    ],
  },
  {
    id: 'sirius',
    name: 'Sirius',
    tagline: "L'équilibre parfait.",
    color: '#ff4fa3',
    featured: true,
    perks: [
      'Tout le palier Vega',
      '700 Éclats chaque mois',
      'Un deuxième personnage',
      'Garage étendu : 5 places de plus',
      'Tenues et accessoires exclusifs',
    ],
  },
  {
    id: 'polaris',
    name: 'Polaris',
    tagline: 'Pour celles et ceux qui vivent ici.',
    color: '#ffc56e',
    perks: [
      'Tout le palier Sirius',
      '1 500 Éclats chaque mois',
      'Un troisième personnage',
      'Numéro de téléphone personnalisé',
      'Accès anticipé aux nouveautés',
    ],
  },
];

export interface Pack {
  name: string;
  amount: number;
  /** Bonus en pourcentage. */
  bonus: number;
  featured?: boolean;
  price?: string;
}

export const packs: Pack[] = [
  { name: 'Étincelle', amount: 500, bonus: 0 },
  { name: 'Lueur', amount: 1200, bonus: 5 },
  { name: 'Comète', amount: 2800, bonus: 10 },
  { name: 'Nova', amount: 6000, bonus: 15, featured: true },
  { name: 'Supernova', amount: 13000, bonus: 20 },
];

export const passes = [
  {
    icon: 'ticket',
    name: 'Pass Saison',
    text: 'Des récompenses cosmétiques à chaque palier, au fil de ta progression en jeu.',
  },
  {
    icon: 'car',
    name: 'Pass Garage',
    text: 'La sélection de véhicules du mois dans ton garage, tant que le pass est actif.',
  },
  {
    icon: 'users',
    name: 'Double vie',
    text: 'Un emplacement de personnage en plus, pour jouer une tout autre histoire.',
  },
];

export const principles = [
  {
    icon: 'shield-check',
    title: 'Zéro avantage en scène',
    text: 'Rien de ce qui se vend ne fait gagner une scène : ni arme, ni argent facile, ni passe-droit.',
  },
  {
    icon: 'zap',
    title: 'Livraison immédiate',
    text: 'Tes achats arrivent sur ton personnage dès que le paiement est validé.',
  },
  {
    icon: 'credit-card',
    title: 'Paiement sécurisé',
    text: 'Tout passe par la boutique officielle, jamais par un membre du staff.',
  },
  {
    icon: 'heart',
    title: 'Tu soutiens le serveur',
    text: "Chaque achat finance l'hébergement et le développement de la ville.",
  },
];

export const boutiqueFaq = [
  {
    q: 'Payer donne-t-il un avantage en jeu ?',
    a: 'Non. La boutique vend du confort et du cosmétique : tenues, véhicules, emplacements, file prioritaire. Rien qui permette de gagner une scène ou de contourner une règle.',
  },
  {
    q: 'Quand est-ce que je reçois mon achat ?',
    a: "Dès que le paiement est validé, même si tu es déjà connecté. Si rien n'apparaît au bout de dix minutes, ouvre un ticket sur Discord avec ton numéro de commande.",
  },
  {
    q: 'Puis-je arrêter un abonnement ?',
    a: "Oui, à tout moment. Tes avantages restent actifs jusqu'à la fin de la période déjà payée.",
  },
  {
    q: 'Où trouver les conditions de vente ?',
    a: 'Sur la boutique officielle, avant de valider ton paiement. Les modalités de remboursement y sont détaillées.',
  },
];
