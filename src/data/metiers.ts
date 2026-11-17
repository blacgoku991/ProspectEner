/**
 * Métiers et entreprises d'Elyra.
 * Contenu d'exemple : remplace les noms, textes et statuts par ceux de ton serveur.
 * `discord` (facultatif) : lien du Discord de recrutement propre à l'entreprise.
 */
export type JobStatus = 'ouvert' | 'dossier' | 'complet';

export interface Job {
  id: string;
  name: string;
  /** Sous-titre court, ex. « Police de Los Santos ». */
  label: string;
  tagline: string;
  desc: string;
  roles: string[];
  status: JobStatus;
  /** Nom d'icône Lucide (https://lucide.dev/icons). */
  icon: string;
  discord?: string;
}

export interface JobCategory {
  id: string;
  title: string;
  kicker: string;
  desc: string;
  icon: string;
  color: string;
  jobs: Job[];
}

export const statusLabel: Record<JobStatus, string> = {
  ouvert: 'Recrutement ouvert',
  dossier: 'Sur candidature',
  complet: 'Effectif complet',
};

export const metiers: JobCategory[] = [
  {
    id: 'service-public',
    title: 'Service public',
    kicker: 'Institutions',
    desc: "Porter l'uniforme, soigner, juger, gouverner. Ceux qui tiennent la ville debout quand tout le monde dort.",
    icon: 'landmark',
    color: '#56e4ff',
    jobs: [
      {
        id: 'lspd',
        name: 'LSPD',
        label: 'Police de Los Santos',
        tagline: 'La loi en ville, de jour comme de nuit.',
        desc: "Patrouilles, enquêtes, interventions sur braquage : le LSPD tient les rues et forme ses recrues à l'académie.",
        roles: ['Patrouille', 'Enquête', 'Intervention'],
        status: 'dossier',
        icon: 'shield',
      },
      {
        id: 'bcso',
        name: 'BCSO',
        label: 'Bureau du shérif',
        tagline: 'Le comté, ses routes et ses secrets.',
        desc: 'Du désert aux forêts du nord, les adjoints du shérif couvrent tout ce que la ville ne voit pas.',
        roles: ['Patrouille rurale', 'Brigade routière', 'Recherche'],
        status: 'dossier',
        icon: 'siren',
      },
      {
        id: 'ems',
        name: 'EMS',
        label: 'Services médicaux',
        tagline: 'Chaque appel est une vie.',
        desc: "Urgentistes, médecins, pilotes d'hélicoptère : tu soignes tout le monde, sans jamais choisir de camp.",
        roles: ['Urgences', 'Bloc opératoire', 'Secours héliporté'],
        status: 'ouvert',
        icon: 'heart-pulse',
      },
      {
        id: 'doj',
        name: 'DOJ',
        label: 'Département de la Justice',
        tagline: "Le dernier mot, c'est le droit.",
        desc: 'Avocats, procureurs et juges donnent une suite à chaque arrestation, avec de vrais procès.',
        roles: ['Avocat', 'Procureur', 'Juge'],
        status: 'dossier',
        icon: 'scale',
      },
      {
        id: 'gouvernement',
        name: 'Gouvernement',
        label: 'Cabinet du gouverneur',
        tagline: "Diriger, c'est servir.",
        desc: "Budget, lois, cérémonies officielles : le gouvernement fait vivre la politique de l'État.",
        roles: ['Cabinet', 'Administration', 'Protocole'],
        status: 'dossier',
        icon: 'landmark',
      },
    ],
  },
  {
    id: 'automobile',
    title: 'Automobile',
    kicker: 'Garages & concessions',
    desc: 'Réparer, préparer, vendre. Ici, une voiture raconte toujours quelque chose de son propriétaire.',
    icon: 'wrench',
    color: '#ffc56e',
    jobs: [
      {
        id: 'atelier-vega',
        name: 'Atelier Vega',
        label: 'Garage',
        tagline: 'Mécanique de quartier, travail propre.',
        desc: 'Réparations, entretien, dépannage : le garage où toute la ville finit par passer.',
        roles: ['Mécano', 'Dépanneur', "Chef d'atelier"],
        status: 'ouvert',
        icon: 'wrench',
      },
      {
        id: 'polaris-customs',
        name: 'Polaris Customs',
        label: 'Préparation',
        tagline: 'Ta voiture, mais en mieux.',
        desc: "Préparation moteur, peinture, réglages : l'atelier de ceux qui veulent une pièce unique.",
        roles: ['Préparateur', 'Peintre', 'Conseiller'],
        status: 'ouvert',
        icon: 'gauge',
      },
      {
        id: 'orion-motors',
        name: 'Orion Motors',
        label: 'Concessionnaire',
        tagline: 'La clé de ta prochaine voiture.',
        desc: 'Concession multimarque : essais sur route, financement et livraison en main propre.',
        roles: ['Vendeur', 'Essais', 'Gérant'],
        status: 'dossier',
        icon: 'car',
      },
      {
        id: 'altair-moto',
        name: 'Altaïr Moto',
        label: 'Concession moto',
        tagline: 'Deux roues, zéro compromis.',
        desc: 'Sportives, customs et trails, avec un atelier réservé aux motards.',
        roles: ['Vendeur', 'Mécano moto'],
        status: 'ouvert',
        icon: 'motorbike',
      },
    ],
  },
  {
    id: 'nuit',
    title: 'Nuit & événementiel',
    kicker: 'Clubs, bars & scènes',
    desc: "Quand le soleil tombe sur Los Santos, c'est une autre ville qui s'allume. Quelqu'un doit tenir le bar.",
    icon: 'disc-3',
    color: '#ff4fa3',
    jobs: [
      {
        id: 'le-zenith',
        name: 'Le Zénith',
        label: 'Club',
        tagline: 'La nuit commence ici.',
        desc: 'Le grand club du centre : DJ résidents, carré VIP et soirées à thème chaque week-end.',
        roles: ['Barman', 'DJ', 'Sécurité'],
        status: 'ouvert',
        icon: 'disc-3',
      },
      {
        id: 'nebula',
        name: 'Nébula',
        label: 'Club électro',
        tagline: "Néons et basses jusqu'à l'aube.",
        desc: 'Une salle plus intime, une programmation pointue et un bar à cocktails signature.',
        roles: ['Barman', 'Physionomiste', 'Programmation'],
        status: 'ouvert',
        icon: 'sparkles',
      },
      {
        id: 'eclipse-bar',
        name: 'Éclipse Bar',
        label: 'Bar',
        tagline: 'Un comptoir, mille histoires.',
        desc: "Le bar où l'on se retrouve après le service, pour un verre ou pour une affaire.",
        roles: ['Barman', 'Serveur', 'Gérant'],
        status: 'ouvert',
        icon: 'martini',
      },
      {
        id: 'le-solstice',
        name: 'Le Solstice',
        label: 'Rooftop',
        tagline: 'La ville à tes pieds.',
        desc: 'Lounge en terrasse avec vue sur le centre : afterworks, privatisations et soirées feutrées.',
        roles: ['Hôte', 'Barman', 'Événementiel'],
        status: 'dossier',
        icon: 'wine',
      },
      {
        id: 'aurore-events',
        name: 'Aurore Events',
        label: 'Agence événementielle',
        tagline: 'On organise, tu profites.',
        desc: "Concerts, courses, mariages, galas : l'agence qui monte les grands événements de la ville.",
        roles: ['Chef de projet', 'Régisseur', 'Animateur'],
        status: 'ouvert',
        icon: 'party-popper',
      },
    ],
  },
  {
    id: 'public-prive',
    title: 'Public & privé',
    kicker: 'Services à la ville',
    desc: "Informer, conduire, défendre, loger, livrer, protéger. Les métiers qu'on remarque surtout quand ils manquent.",
    icon: 'briefcase',
    color: '#8f6bff',
    jobs: [
      {
        id: 'elyra-news',
        name: 'Elyra News',
        label: 'Média',
        tagline: 'Si ça se passe, on y est.',
        desc: 'La rédaction de la ville : reportages, directs, interviews et scoops.',
        roles: ['Journaliste', 'Caméraman', 'Présentateur'],
        status: 'ouvert',
        icon: 'newspaper',
      },
      {
        id: 'taxi-comete',
        name: 'Taxi Comète',
        label: 'Taxi & VTC',
        tagline: 'Où tu veux, quand tu veux.',
        desc: 'Courses en ville, transferts vers l’aéroport et chauffeurs privés pour les grandes occasions.',
        roles: ['Chauffeur', 'Régulateur'],
        status: 'ouvert',
        icon: 'car-taxi-front',
      },
      {
        id: 'cabinet-cassiopee',
        name: 'Cabinet Cassiopée',
        label: 'Avocats',
        tagline: "Bien défendu, c'est déjà à moitié gagné.",
        desc: "Cabinet privé : défense pénale, contrats d'entreprise et conseil juridique.",
        roles: ['Avocat', 'Juriste', 'Associé'],
        status: 'dossier',
        icon: 'briefcase',
      },
      {
        id: 'sirius-immobilier',
        name: 'Sirius Immobilier',
        label: 'Agence immobilière',
        tagline: 'Trouve ton chez-toi.',
        desc: 'Appartements, villas, locaux commerciaux : les agents te font visiter et signent avec toi.',
        roles: ['Agent', 'Négociateur', 'Gérant'],
        status: 'ouvert',
        icon: 'key-round',
      },
      {
        id: 'pegase-logistique',
        name: 'Pégase Logistique',
        label: 'Transport',
        tagline: 'La ville tourne grâce à nous.',
        desc: 'Livraisons, transport de marchandises et approvisionnement des commerces.',
        roles: ['Livreur', 'Routier', 'Dispatch'],
        status: 'ouvert',
        icon: 'truck',
      },
      {
        id: 'titan-securite',
        name: 'Titan Sécurité',
        label: 'Sécurité privée',
        tagline: 'Présents avant que ça tourne mal.',
        desc: 'Protection de sites, convoyage de fonds et escortes sur demande.',
        roles: ['Agent', 'Convoyeur', "Chef d'équipe"],
        status: 'dossier',
        icon: 'shield-check',
      },
    ],
  },
  {
    id: 'alimentaire',
    title: 'Alimentaire',
    kicker: 'Restaurants & cafés',
    desc: 'Un bon repas règle plus de conflits qu’un tribunal. Ouvre ta salle, soigne ta carte, fidélise le quartier.',
    icon: 'utensils',
    color: '#ff9360',
    jobs: [
      {
        id: 'trattoria-stella',
        name: 'Trattoria Stella',
        label: 'Cuisine italienne',
        tagline: 'Comme à la maison, en mieux.',
        desc: 'Grandes tablées, pâtes fraîches et arrière-salle pour les rendez-vous discrets.',
        roles: ['Cuisinier', 'Serveur', 'Gérant'],
        status: 'ouvert',
        icon: 'pizza',
      },
      {
        id: 'nova-burger',
        name: 'Nova Burger',
        label: 'Restauration rapide',
        tagline: 'Vite fait, bien fait.',
        desc: 'Le fast-food de la ville : service au comptoir, drive et livraisons.',
        roles: ['Équipier', 'Livreur', 'Manager'],
        status: 'ouvert',
        icon: 'sandwich',
      },
      {
        id: 'cafe-selene',
        name: 'Café Séléné',
        label: 'Coffee shop',
        tagline: 'Le meilleur café avant le service.',
        desc: 'Café de quartier, pâtisseries maison et terrasse au calme.',
        roles: ['Barista', 'Pâtissier'],
        status: 'ouvert',
        icon: 'coffee',
      },
      {
        id: 'bistrot-saturne',
        name: 'Bistrot Saturne',
        label: 'Cuisine française',
        tagline: 'Plat du jour et nappes à carreaux.',
        desc: 'Carte courte, produits frais et addition honnête.',
        roles: ['Chef', 'Serveur', 'Sommelier'],
        status: 'ouvert',
        icon: 'utensils',
      },
      {
        id: 'kaze-ramen',
        name: 'Kazé Ramen',
        label: 'Comptoir japonais',
        tagline: 'Un bol, et ça repart.',
        desc: 'Ouvert tard : ramen, gyozas et saké au comptoir.',
        roles: ['Cuisinier', 'Serveur'],
        status: 'complet',
        icon: 'soup',
      },
    ],
  },
];

export const metiersCount = metiers.reduce((n, c) => n + c.jobs.length, 0);
