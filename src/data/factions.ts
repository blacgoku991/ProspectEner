/**
 * Factions d'Elyra (groupes illégaux).
 * Contenu d'exemple : remplace les noms, textes et statuts par ceux de ton serveur.
 */
export type FactionStatus = 'recrute' | 'invitation' | 'vacant';

export interface Faction {
  id: string;
  name: string;
  /** Monogramme affiché sur l'emblème (2 lettres). */
  mono: string;
  motto: string;
  desc: string;
  territory: string;
  specialties: string[];
  status: FactionStatus;
  color: string;
  icon: string;
  discord?: string;
}

export interface FactionType {
  id: string;
  title: string;
  singular: string;
  desc: string;
  /** Effectif maximum, repris du règlement illégal. */
  max: number;
  factions: Faction[];
}

export const factionStatusLabel: Record<FactionStatus, string> = {
  recrute: 'Recrute',
  invitation: 'Sur invitation',
  vacant: 'À reprendre',
};

export const factions: FactionType[] = [
  {
    id: 'cartels',
    title: 'Cartels',
    singular: 'Cartel',
    desc: "Production, routes, influence : les cartels pensent à l'échelle de l'État.",
    max: 20,
    factions: [
      {
        id: 'cartel-del-alba',
        name: 'Cartel del Alba',
        mono: 'CA',
        motto: 'El alba no perdona.',
        desc: 'Né dans le désert, le cartel tient les routes du nord et ne traite qu’avec ceux qui tiennent parole.',
        territory: 'Nord du comté',
        specialties: ['Production', 'Convois', 'Diplomatie'],
        status: 'invitation',
        color: '#ffb547',
        icon: 'sun-moon',
      },
      {
        id: 'cartel-sombra',
        name: 'Cartel Sombra',
        mono: 'SB',
        motto: 'Sans bruit, sans trace.',
        desc: 'Discret, patient, méthodique : le Sombra préfère une négociation à dix fusillades.',
        territory: 'Côte ouest',
        specialties: ['Import', 'Blanchiment', 'Réseau'],
        status: 'recrute',
        color: '#9b7bff',
        icon: 'moon',
      },
    ],
  },
  {
    id: 'mafias',
    title: 'Mafias & organisations',
    singular: 'Organisation',
    desc: 'Costumes, façades légales et parole donnée : le crime en col blanc.',
    max: 20,
    factions: [
      {
        id: 'famiglia-corvino',
        name: 'Famiglia Corvino',
        mono: 'FC',
        motto: 'La famiglia prima di tutto.',
        desc: 'Restaurateurs le jour, banquiers de l’ombre la nuit. Chez les Corvino, les comptes se règlent à table.',
        territory: 'Quartier des affaires',
        specialties: ['Racket', 'Blanchiment', 'Influence'],
        status: 'invitation',
        color: '#ff5468',
        icon: 'crown',
      },
      {
        id: 'bratva-zarya',
        name: 'Bratva Zarya',
        mono: 'BZ',
        motto: 'Le froid forge.',
        desc: "Une organisation venue de l'Est : hiérarchie stricte et sens des affaires redoutable.",
        territory: 'Port de Los Santos',
        specialties: ['Armes', 'Contrebande', 'Protection'],
        status: 'recrute',
        color: '#56e4ff',
        icon: 'anchor',
      },
      {
        id: 'syndicat-kurogane',
        name: 'Syndicat Kurogane',
        mono: 'SK',
        motto: "L'honneur avant le profit.",
        desc: 'Codes anciens, tatouages et salles de jeu : le Syndicat avance sans jamais hausser le ton.',
        territory: 'Quartier asiatique',
        specialties: ['Jeux', 'Prêts', 'Renseignement'],
        status: 'invitation',
        color: '#ff4fa3',
        icon: 'dice-5',
      },
    ],
  },
  {
    id: 'familles',
    title: 'Familles',
    singular: 'Famille',
    desc: 'Des liens de sang ou de rue, un nom à défendre et un quartier à tenir.',
    max: 15,
    factions: [
      {
        id: 'les-delacroix',
        name: 'Les Delacroix',
        mono: 'LD',
        motto: 'On ne lâche rien, on ne lâche personne.',
        desc: 'Une famille soudée des quartiers sud, connue pour son garage, ses barbecues et sa mémoire longue.',
        territory: 'Quartiers sud',
        specialties: ['Vols', 'Recel', 'Entraide'],
        status: 'recrute',
        color: '#4dffb0',
        icon: 'house',
      },
      {
        id: 'clan-santoro',
        name: 'Clan Santoro',
        mono: 'SA',
        motto: 'Trois frères, une parole.',
        desc: 'Partis de rien, les Santoro montent une affaire après l’autre, entre marchés et arrière-boutiques.',
        territory: "Marché de l'est",
        specialties: ['Commerce', 'Paris', 'Transport'],
        status: 'recrute',
        color: '#ffc56e',
        icon: 'handshake',
      },
    ],
  },
  {
    id: 'mc',
    title: 'Clubs de motards',
    singular: 'MC',
    desc: 'Le cuir, la route et les frères. Un club ne se rejoint pas : il se mérite.',
    max: 15,
    factions: [
      {
        id: 'iron-vultures',
        name: 'Iron Vultures MC',
        mono: 'IV',
        motto: 'La route ou rien.',
        desc: 'Le chapitre fondateur du comté : un bar, un atelier et de longues virées dans le désert.',
        territory: 'Désert du nord',
        specialties: ['Mécanique', 'Convoyage', 'Protection'],
        status: 'recrute',
        color: '#ff7a4a',
        icon: 'motorbike',
      },
      {
        id: 'ash-brothers',
        name: 'Ash Brothers MC',
        mono: 'AB',
        motto: 'Du feu, il ne reste que nous.',
        desc: "Un club plus jeune, plus nerveux, qui s'est fait un nom dans les courses sauvages.",
        territory: 'Route côtière',
        specialties: ['Courses', 'Pièces', 'Escorte'],
        status: 'recrute',
        color: '#c9c4dd',
        icon: 'flame',
      },
    ],
  },
  {
    id: 'gangs',
    title: 'Gangs',
    singular: 'Gang',
    desc: 'La rue, ses couleurs et ses codes. Chaque bloc a son histoire.',
    max: 15,
    factions: [
      {
        id: 'southside-kings',
        name: 'Southside Kings',
        mono: 'KS',
        motto: 'Le sud ne plie pas.',
        desc: 'Le plus ancien gang du sud : fresques, basket et règles de quartier strictes.',
        territory: 'Sud de la ville',
        specialties: ['Territoire', 'Revente', 'Street'],
        status: 'recrute',
        color: '#8f6bff',
        icon: 'spray-can',
      },
      {
        id: 'eastline',
        name: 'Eastline',
        mono: 'EL',
        motto: 'Une ligne, un bloc.',
        desc: 'Le long de la voie ferrée, Eastline tient ses rues comme une frontière.',
        territory: 'Est de la ville',
        specialties: ['Revente', 'Vols', 'Guet'],
        status: 'recrute',
        color: '#56e4ff',
        icon: 'map-pin',
      },
      {
        id: 'los-cuervos',
        name: 'Los Cuervos',
        mono: 'LC',
        motto: 'Les corbeaux voient tout.',
        desc: 'Un gang discret et organisé, réputé pour toujours savoir avant les autres.',
        territory: "Collines de l'est",
        specialties: ['Renseignement', 'Revente', 'Cambriolage'],
        status: 'invitation',
        color: '#ff5468',
        icon: 'eye',
      },
      {
        id: 'kobra-crew',
        name: 'Kobra Crew',
        mono: 'KC',
        motto: 'Rapide, ou rattrapé.',
        desc: 'Pilotes avant tout : go-fast, virées de nuit et mécanique sans compromis.',
        territory: 'Zone industrielle',
        specialties: ['Go-fast', 'Véhicules', 'Mécanique'],
        status: 'recrute',
        color: '#4dffb0',
        icon: 'zap',
      },
      {
        id: 'enfants-de-minuit',
        name: 'Les Enfants de Minuit',
        mono: 'EM',
        motto: 'La nuit nous appartient.',
        desc: 'Un collectif né dans les soirées du centre, entre platines et combines.',
        territory: 'Centre-ville',
        specialties: ['Nuit', 'Faux papiers', 'Réseau'],
        status: 'recrute',
        color: '#ff4fa3',
        icon: 'cloud-moon',
      },
    ],
  },
  {
    id: 'a-reprendre',
    title: 'À reprendre',
    singular: 'Groupe vacant',
    desc: "Des noms qui ont compté, des territoires libres et personne aux commandes. Dépose un dossier et relève les couleurs.",
    max: 15,
    factions: [
      {
        id: 'vieux-port',
        name: 'Le Vieux Port',
        mono: 'VP',
        motto: 'Les docks cherchent un patron.',
        desc: 'Un territoire stratégique, un réseau de dockers et plus personne pour donner les ordres.',
        territory: 'Docks',
        specialties: ['Organisation', 'Contrebande'],
        status: 'vacant',
        color: '#8a86a6',
        icon: 'ship',
      },
      {
        id: 'les-hauteurs',
        name: 'Les Hauteurs',
        mono: 'LH',
        motto: 'Là-haut, tout se sait.',
        desc: 'Villas, piscines et secrets bien gardés : la colline attend sa prochaine famille.',
        territory: 'Collines du nord',
        specialties: ['Famille', 'Influence'],
        status: 'vacant',
        color: '#8a86a6',
        icon: 'mountain',
      },
      {
        id: 'dust-riders',
        name: 'Dust Riders MC',
        mono: 'DR',
        motto: 'Le moteur tourne encore.',
        desc: "Un club historique en sommeil. Ses couleurs n'attendent qu'un bureau pour reprendre la route.",
        territory: 'Sud du désert',
        specialties: ['MC', 'Route'],
        status: 'vacant',
        color: '#8a86a6',
        icon: 'motorbike',
      },
    ],
  },
];

export const factionsCount = factions.reduce((n, t) => n + t.factions.length, 0);
