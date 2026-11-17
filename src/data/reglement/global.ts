import type { RuleBook, Term } from './types';

const book: RuleBook = {
  slug: 'global',
  title: 'Règlement global',
  lead: "Le socle commun à tous les joueurs, quel que soit leur personnage. Il s'applique en jeu comme sur Discord ; les règlements légal et illégal le complètent sans jamais le remplacer.",
  chapters: [
    {
      title: "L'esprit d'Elyra",
      intro:
        "Quand une situation n'est prévue par aucune règle, ce sont ces cinq principes qui tranchent.",
      sections: [
        {
          title: 'Les cinq principes',
          rules: [
            {
              title: "L'histoire avant la victoire",
              text: "Une scène réussie est une scène dont on se souvient, pas une scène que l'on a gagnée. Perdre, se tromper ou finir en cellule fait partie du jeu et ouvre souvent les meilleures histoires.",
            },
            {
              title: 'Un personnage cohérent',
              text: "Ton personnage a un passé, un caractère, des peurs et des limites, et il s'y tient d'une scène à l'autre. Il ne change pas de personnalité selon ce qui t'arrange sur le moment.",
            },
            {
              title: 'Le fair-play',
              text: "Laisse toujours à l'autre la possibilité de répondre, de négocier ou de fuir. L'esprit du règlement compte plus que sa lettre : chercher la faille pour justifier un abus est déjà une faute.",
            },
            {
              title: 'Des actes, des conséquences',
              text: "Tout ce que fait ton personnage peut avoir des suites : enquête, dette, rancune, réputation. Tu les assumes en jeu, même lorsqu'elles le rattrapent plusieurs jours plus tard.",
            },
            {
              title: 'Le joueur avant le personnage',
              text: "Derrière chaque personnage, il y a une personne venue passer un bon moment. Aucune scène ne justifie de blesser réellement quelqu'un : si un joueur est mal à l'aise, on adapte la scène ou on y met fin.",
            },
          ],
        },
      ],
    },
    {
      title: 'Communauté & comportement',
      intro:
        "Ces règles s'appliquent partout : en jeu, sur Discord et dans tout espace lié au serveur.",
      sections: [
        {
          title: 'Respect',
          rules: [
            {
              title: 'Propos haineux',
              text: "Le racisme, le sexisme, l'homophobie, la transphobie et toute autre forme de discrimination sont interdits. Le roleplay n'est pas une excuse : un personnage peut être détestable sans que son joueur tienne de propos haineux.",
              level: 'critique',
            },
            {
              title: 'Harcèlement et acharnement',
              text: "Il est interdit de harceler un joueur, que ce soit en jeu, en message privé ou sur les réseaux sociaux. Insister après un refus ou s'acharner sur la même personne d'une scène à l'autre en fait partie.",
              level: 'critique',
            },
            {
              title: 'Doxxing et vie privée',
              text: "Divulguer, ou menacer de divulguer, des informations personnelles sur un joueur (identité, adresse, photos, comptes en ligne) entraîne un bannissement définitif, sans avertissement préalable.",
              level: 'critique',
            },
            {
              title: 'Contenus à caractère sexuel',
              text: "Les scènes à caractère sexuel et toute mise en scène d'agression sexuelle sont interdites, même entre joueurs consentants : le serveur accueille des mineurs.",
              level: 'critique',
            },
            {
              text: "Les insultes, moqueries et provocations qui visent le joueur plutôt que le personnage n'ont pas leur place ici. Une scène tendue se termine en jeu : elle ne se prolonge pas en règlement de comptes sur Discord.",
              level: 'importante',
            },
            {
              text: "Une décision du staff s'applique immédiatement, même si tu la trouves injuste. Mentir à un membre du staff, l'insulter ou ignorer ses consignes aggrave la sanction.",
              level: 'importante',
            },
          ],
        },
        {
          title: 'Compte & identité',
          rules: [
            {
              title: 'Âge minimum',
              text: "Le serveur est ouvert à partir de 16 ans. Un joueur plus jeune est écarté jusqu'à son seizième anniversaire, quelle que soit la qualité de son roleplay.",
              level: 'importante',
            },
            {
              text: "Ton personnage porte un prénom et un nom crédibles, tels qu'on pourrait les lire sur une pièce d'identité. Les noms de célébrités ou de personnages de fiction, les jeux de mots et les pseudos sont refusés.",
            },
            {
              text: "Chaque joueur dispose d'un seul compte, strictement personnel : il ne se prête pas, ne se partage pas et ne se vend pas. Tu es responsable de tout ce qui est fait avec le tien.",
            },
            {
              title: 'Contournement de sanction',
              text: "Contourner un bannissement, avec un second compte ou par tout autre moyen, le rend définitif. Les comptes qui ont servi au contournement sont bannis eux aussi.",
              level: 'critique',
            },
          ],
        },
        {
          title: 'Logiciels & triche',
          rules: [
            {
              title: 'Logiciels de triche',
              text: "Tout logiciel de triche est interdit : menu de triche, aide à la visée, vision à travers les murs, injecteur de scripts. La sanction est un bannissement définitif dès la première utilisation.",
              level: 'critique',
            },
            {
              text: "Les macros qui automatisent une action et les modifications du jeu qui procurent un avantage sont interdites. Les améliorations purement graphiques restent tolérées tant qu'elles ne t'aident pas à mieux voir ou à mieux entendre les autres joueurs.",
              points: [
                "Suppression de la végétation, de la nuit ou de la fumée",
                "Réticule ajouté à l'écran ou viseur modifié",
                "Bruits de pas ou de tirs amplifiés",
              ],
            },
            {
              title: 'Bugs et failles',
              text: "Il est interdit de tirer profit d'un bug ou d'une faille : duplication d'objets ou d'argent, passage à travers un mur, gains anormaux. Tout bug découvert se signale au staff par ticket, sans être partagé avec d'autres joueurs, et ce qu'il t'a rapporté est restitué.",
              level: 'critique',
            },
          ],
        },
      ],
    },
    {
      title: 'Fondamentaux du roleplay',
      intro:
        "Les règles qui permettent à une scène de rester crédible pour tous ceux qui la vivent.",
      sections: [
        {
          title: 'Immersion',
          rules: [
            {
              title: 'Rester en personnage',
              text: "Dès ta connexion, tout ce que tu dis et fais est dit et fait par ton personnage. Le hors-RP n'a pas sa place en scène : ni commentaire de joueur, ni allusion aux touches, au règlement ou au staff.",
            },
            {
              title: '/me et /do',
              text: "La commande /me décrit une action de ton personnage que le jeu ne montre pas ; /do décrit un fait observable, et ce qui y est écrit est toujours vrai. Ni l'une ni l'autre ne sert à imposer une issue ou à glisser un message hors RP.",
              points: [
                "/me sort son portefeuille et tend sa carte d'identité",
                "/do Une forte odeur d'essence flotte dans le garage",
              ],
            },
            {
              title: 'Quitter une scène',
              text: "Il est interdit de se déconnecter pour échapper à une scène, à une arrestation ou à leurs suites. Si tu dois partir, trouve une sortie crédible et préviens les joueurs présents ; après un plantage, reconnecte-toi et reprends la scène là où elle s'est arrêtée.",
              level: 'importante',
            },
          ],
        },
        {
          title: 'Fear RP',
          intro: "Ton personnage tient à sa vie, et cela doit se voir.",
          rules: [
            {
              text: "Ton personnage craint la mort, la douleur et la prison, comme n'importe qui. Menacé par une arme, en nette infériorité numérique ou retenu en otage, il obéit, négocie ou cherche à fuir : il ne joue pas les héros.",
              level: 'importante',
            },
            {
              text: "La peur ne s'efface pas parce que des renforts approchent ou parce que tu estimes n'avoir rien à perdre. Tenter quelque chose reste possible lorsqu'une vraie ouverture se présente (arme baissée, attention détournée), à condition d'en accepter le risque.",
            },
          ],
        },
        {
          title: 'Pain RP',
          intro: "Une blessure ne disparaît pas quand la scène s'arrête.",
          rules: [
            {
              text: "Après une chute, un accident, une bagarre ou une fusillade, ton personnage souffre, ralentit et a besoin de soins. Même soigné, il garde des séquelles pendant un temps crédible et ne repart pas aussitôt au combat.",
            },
          ],
        },
        {
          title: 'Metagaming',
          intro: "Ce que sait le joueur n'est pas ce que sait le personnage.",
          rules: [
            {
              text: "Ton personnage ne connaît que ce qu'il a vu, entendu ou appris en jeu. Il est interdit d'utiliser une information obtenue hors RP, qu'elle vienne de Discord, des réseaux sociaux, d'une conversation entre joueurs ou d'un précédent personnage.",
              level: 'importante',
            },
            {
              text: "Tu ne connais le nom d'un personnage que s'il te l'a donné ou si tu l'as lu sur un document en jeu. Le nom affiché, l'identifiant et les autres éléments d'interface n'existent pas aux yeux de ton personnage.",
            },
          ],
        },
        {
          title: 'Powergaming',
          rules: [
            {
              text: "Il est interdit de faire ce qui serait impossible ou invraisemblable dans la réalité, ou de détourner une mécanique du jeu pour prendre l'avantage sur une scène.",
              level: 'importante',
              points: [
                "Se relever et courir juste après une chute de plusieurs mètres",
                "Menotter, attacher ou fouiller quelqu'un en une seconde, sans jouer l'action",
                "Bloquer un accès avec des véhicules pour rendre un lieu imprenable",
              ],
            },
            {
              title: 'Force RP',
              text: "Imposer une action à un joueur sans lui laisser la possibilité de réagir est interdit. Décris ce que ton personnage tente, puis laisse l'autre répondre : c'est lui qui joue ce que subit le sien.",
            },
          ],
        },
        {
          title: 'Win RP & Mass RP',
          rules: [
            {
              title: 'Win RP',
              text: "Il est interdit de chercher à gagner à tout prix : nier une blessure, contester chaque arrestation, trouver une parade à tout. Un personnage qui échoue de temps en temps est plus crédible, et bien plus agréable à côtoyer.",
            },
            {
              title: 'Mass RP',
              text: "La ville est habitée, même quand les rues te semblent vides. Ton personnage agit comme si des passants, des témoins et des caméras pouvaient le voir à tout moment, surtout en plein jour et dans les lieux fréquentés.",
            },
          ],
        },
      ],
    },
    {
      title: 'Vie, coma & mémoire',
      intro:
        "Ce qui se passe quand ton personnage tombe, et ce dont il se souvient ensuite.",
      sections: [
        {
          title: 'Coma & soins',
          rules: [
            {
              title: 'Attendre les secours',
              text: "Tant que des EMS (secours médicaux) sont en service, un personnage dans le coma attend leur prise en charge. Si aucun EMS n'est disponible, la réapparition à l'hôpital devient possible au bout de 10 minutes.",
            },
            {
              text: "Un personnage dans le coma est inconscient : il ne parle pas, ne voit ni n'entend ce qui l'entoure et ne prévient personne, en jeu comme ailleurs. Quelques râles sont tolérés, pas une conversation.",
            },
            {
              text: "Relevé par les EMS, ton personnage garde ses souvenirs jusqu'au moment où il a perdu connaissance. Sa prise en charge est une scène à part entière : réponds aux questions, joue tes blessures et suis les consignes des soignants.",
            },
          ],
        },
        {
          title: 'NLR',
          intro:
            "La New Life Rule s'applique après chaque réapparition à l'hôpital.",
          rules: [
            {
              title: 'Perte de mémoire',
              text: "Après une réapparition à l'hôpital, ton personnage a oublié les 15 dernières minutes : les visages, les noms, les lieux et les raisons de ce qui lui est arrivé. Il ne peut donc ni désigner un coupable, ni témoigner, ni reprendre la scène.",
              level: 'importante',
            },
            {
              title: 'Retour sur les lieux',
              text: "Pendant les 15 minutes qui suivent ta réapparition, tu ne retournes pas sur la zone de la scène, quelle qu'en soit la raison : récupérer un véhicule, aider tes proches ou voir comment elle se termine.",
            },
          ],
        },
        {
          title: 'Mort RP',
          intro:
            "La mort définitive d'un personnage est un événement rare, qui se prépare.",
          rules: [
            {
              text: "La mort RP met fin pour de bon à l'histoire d'un personnage. Elle n'est possible qu'avec un dossier validé par le staff ou avec l'accord du joueur concerné : personne ne la décrète seul en pleine scène.",
              level: 'importante',
            },
            {
              text: "Un personnage mort RP ne revient sous aucune forme. Celui qui lui succède est quelqu'un d'autre : il n'hérite ni de ses souvenirs, ni de ses relations, ni de ses rancunes.",
            },
          ],
        },
      ],
    },
    {
      title: 'Scènes & interactions',
      intro:
        "Les bases de toute confrontation, valables pour tous ; les braquages, les otages, les armes et les conflits entre groupes sont traités dans le règlement illégal.",
      sections: [
        {
          title: 'Sommations & ouverture du feu',
          rules: [
            {
              title: 'Sommation obligatoire',
              text: "Avant d'ouvrir le feu, une sommation vocale claire est obligatoire : la personne visée doit pouvoir l'entendre, comprendre ce que l'on attend d'elle et disposer de quelques secondes pour obéir. Seule exception : tu es déjà visé par une arme ou sous le feu.",
              level: 'importante',
            },
            {
              title: 'Redémarrage du serveur',
              text: "Aucune action hostile n'est engagée dans les 15 minutes qui précèdent un redémarrage du serveur, ni dans les 15 minutes qui le suivent.",
            },
          ],
        },
        {
          title: 'Violence gratuite',
          intro:
            "Toute violence a une raison née en jeu, que tu dois pouvoir expliquer.",
          rules: [
            {
              title: 'Freekill et freepunch',
              text: "Tuer, blesser ou frapper un joueur sans raison RP valable ni scène préalable est interdit. Un regard de travers, un mot de trop ou l'ennui ne sont pas des raisons.",
              level: 'critique',
            },
            {
              title: 'VDM et carkill',
              text: "Un véhicule n'est pas une arme : il est interdit de foncer volontairement sur un joueur ou de l'écraser. Percuter à répétition un autre véhicule sans raison RP est sanctionné de la même façon.",
              level: 'critique',
            },
            {
              title: 'Revenge kill',
              text: "On ne se venge pas de ce que l'on a oublié : après un coma suivi d'une réapparition à l'hôpital, il est interdit de retourner s'en prendre à ceux qui ont mis ton personnage à terre.",
              level: 'critique',
            },
          ],
        },
        {
          title: 'Vol & dépouille',
          rules: [
            {
              text: "Le vol et la dépouille passent par une scène : la fouille est annoncée et jouée, on ne vide pas un inventaire en silence. Ce qui peut être pris est limité par le règlement illégal.",
            },
            {
              text: "Dépouiller un personnage dans le coma n'est permis qu'à ceux qui ont pris part à la scène qui l'a mis à terre. Tomber dessus par hasard ne donne aucun droit sur ses affaires.",
            },
          ],
        },
        {
          title: 'Zones sûres',
          rules: [
            {
              text: "Aucune action hostile n'est engagée dans une zone sûre : ni vol, ni agression, ni enlèvement, ni tir.",
              level: 'importante',
              points: [
                "Hôpitaux",
                "Parvis des commissariats",
                "Concessionnaires",
                "Garages publics et fourrière",
                "Zone d'arrivée des nouveaux joueurs",
                "Mairie",
              ],
            },
            {
              text: "Une zone sûre n'est pas un refuge : s'y précipiter pour échapper à une scène en cours ne te protège pas, et la scène peut s'y poursuivre. À l'inverse, il est interdit de guetter à la sortie ceux qui la quittent pour s'en prendre à eux.",
            },
          ],
        },
        {
          title: 'Conduite & véhicules',
          rules: [
            {
              text: "Conduis comme quelqu'un qui tient à sa vie et à son véhicule. Une sportive ne grimpe pas une montagne, et l'on ne traverse pas la ville à contresens et à pleine vitesse sans une raison sérieuse.",
            },
            {
              text: "Un accident violent laisse des traces : ses occupants jouent le choc, et un véhicule retourné, en feu ou aux pneus crevés ne reprend pas la route sans réparation.",
            },
          ],
        },
        {
          title: 'Tenues & masques',
          rules: [
            {
              text: "La tenue de ton personnage correspond à ce qu'il est et à ce qu'il fait. Les uniformes et les équipements des services publics sont réservés à leurs membres en service.",
            },
            {
              title: 'Port du masque',
              text: "Un masque se porte pour une raison précise et se retire une fois l'action terminée : on ne vit pas masqué en permanence. Un personnage masqué ne se reconnaît pas à sa seule voix ; il faut des indices concrets relevés en jeu.",
            },
          ],
        },
      ],
    },
    {
      title: 'Communication',
      intro:
        "La voix de ton personnage passe par le jeu, et seulement par le jeu.",
      sections: [
        {
          title: 'Vocal',
          rules: [
            {
              title: 'Micro obligatoire',
              text: "Un micro en état de marche et de qualité correcte est obligatoire pour jouer : pas de saturation, pas d'écho, pas de bruit de fond permanent. Le roleplay se joue à la voix : les commandes /me et /do le complètent sans le remplacer.",
            },
            {
              text: "Les soundboards et la musique diffusée par le micro sont interdits. Les modificateurs de voix le sont également, sauf autorisation du staff donnée pour un personnage précis.",
            },
          ],
        },
        {
          title: 'Hors jeu',
          rules: [
            {
              text: "Pendant une scène, il est interdit d'être en vocal sur Discord, ou sur tout autre canal extérieur, avec des joueurs connectés au serveur. Ce que ton personnage a à dire passe par le jeu.",
              level: 'importante',
            },
            {
              title: 'Stream sniping',
              text: "Il est interdit de regarder la diffusion en direct d'un joueur pour savoir où il se trouve, ce qu'il prépare ou ce qu'il dit, puis de s'en servir en jeu. La règle vaut aussi pour les rediffusions et les extraits vidéo.",
              level: 'critique',
            },
            {
              title: 'Téléphone et radio',
              text: "Le téléphone et la radio appartiennent à ton personnage : ils s'utilisent en jeu, s'entendent à proximité et peuvent être confisqués ou perdus. Sans eux, ou les mains liées, ton personnage ne peut prévenir personne.",
            },
          ],
        },
      ],
    },
    {
      title: 'Sanctions & recours',
      intro:
        "Le staff sanctionne pour protéger le jeu de tous, pas pour le plaisir de punir.",
      sections: [
        {
          title: 'Échelle des sanctions',
          rules: [
            {
              text: "Le staff applique l'une des quatre sanctions ci-dessous, selon la gravité de la faute et les antécédents du joueur. Peuvent s'y ajouter le wipe du personnage et, lorsque la faute est collective, le wipe du groupe.",
              points: [
                "Avertissement",
                "Exclusion du serveur (kick)",
                "Bannissement temporaire de 1, 3 ou 7 jours",
                "Bannissement définitif",
              ],
            },
            {
              text: "L'échelle ne se gravit pas forcément marche par marche : une faute critique peut valoir un bannissement définitif dès la première fois, et la récidive aggrave toujours la sanction.",
            },
          ],
        },
        {
          title: 'Preuves & tickets',
          rules: [
            {
              title: 'Preuve vidéo',
              text: "Tout signalement s'appuie sur un clip vidéo qui montre la scène avec le son, depuis son début et sans montage. Une capture d'écran ou un témoignage ne suffisent pas : enregistrer ses sessions est vivement conseillé.",
            },
            {
              text: "Les litiges se règlent par ticket sur Discord, jamais en pleine scène ni dans les salons publics. Joue la scène jusqu'au bout, même si tu estimes qu'une règle a été enfreinte, puis ouvre ton ticket à tête reposée.",
            },
            {
              title: 'Contester une sanction',
              text: "Une sanction se conteste par ticket, calmement et preuves à l'appui. Relancer un membre du staff en message privé ou mobiliser d'autres joueurs ne fait pas avancer la demande.",
            },
          ],
        },
      ],
    },
  ],
};

export default book;

export const lexique: Term[] = [
  {
    term: 'RP',
    full: 'Roleplay',
    def: "Le fait d'incarner un personnage et de faire vivre son histoire. Par extension, tout ce qui se passe en jeu, du point de vue du personnage.",
    kind: 'notion',
  },
  {
    term: 'HRP',
    full: 'Hors roleplay',
    def: "Tout ce qui relève du joueur et non du personnage : la vie réelle, Discord, le règlement, les soucis techniques.",
    kind: 'notion',
  },
  {
    term: 'Scène',
    def: "Situation de jeu qui réunit plusieurs personnages autour d'un même événement, de son déclenchement à sa conclusion.",
    kind: 'notion',
  },
  {
    term: '/me',
    def: "Commande qui décrit une action de ton personnage que le jeu ne montre pas, par exemple « /me fouille la boîte à gants ».",
    kind: 'notion',
  },
  {
    term: '/do',
    def: "Commande qui décrit un fait observable ou un élément du décor. Ce qui est écrit en /do est toujours vrai.",
    kind: 'notion',
  },
  {
    term: 'Fear RP',
    full: 'Jouer la peur',
    def: "Obligation de faire réagir son personnage comme quelqu'un qui tient à sa vie : face à une arme ou en nette infériorité, il obéit, négocie ou fuit.",
    kind: 'obligatoire',
  },
  {
    term: 'Pain RP',
    full: 'Jouer la douleur',
    def: "Obligation de jouer les blessures de son personnage et leurs séquelles, aussi longtemps qu'il le faut pour rester crédible.",
    kind: 'obligatoire',
  },
  {
    term: 'Mass RP',
    def: "Obligation d'agir comme si la ville était réellement peuplée de passants, de témoins et de caméras, même quand la rue paraît vide.",
    kind: 'obligatoire',
  },
  {
    term: 'Coma',
    def: "État d'un personnage mis à terre : inconscient, il attend les secours et ne perçoit rien de ce qui l'entoure.",
    kind: 'notion',
  },
  {
    term: 'NLR',
    full: 'New Life Rule',
    def: "Après une réapparition à l'hôpital, le personnage oublie les 15 dernières minutes et ne retourne pas sur la zone de la scène pendant 15 minutes.",
    kind: 'obligatoire',
  },
  {
    term: 'Mort RP',
    def: "Mort définitive d'un personnage. Elle exige un dossier validé par le staff ou l'accord du joueur concerné.",
    kind: 'notion',
  },
  {
    term: 'Sommation',
    def: "Avertissement vocal clair adressé à une personne avant d'ouvrir le feu, qui lui laisse le temps d'obéir. Elle est obligatoire, sauf si l'on est déjà visé ou sous le feu.",
    kind: 'obligatoire',
  },
  {
    term: 'Safe zone',
    full: 'Zone sûre',
    def: "Lieu où aucune action hostile ne peut être engagée : hôpitaux, parvis des commissariats, concessionnaires, garages publics et fourrière, zone d'arrivée, mairie.",
    kind: 'obligatoire',
  },
  {
    term: 'Metagaming',
    def: "Utiliser en jeu une information que le personnage n'a pas apprise lui-même en RP : Discord, stream, interface, discussion entre joueurs.",
    kind: 'interdit',
  },
  {
    term: 'Powergaming',
    def: "Réaliser une action impossible dans la réalité ou détourner une mécanique du jeu pour prendre l'avantage.",
    kind: 'interdit',
  },
  {
    term: 'Force RP',
    def: "Imposer une action ou son résultat à un autre joueur sans lui laisser la possibilité de réagir.",
    kind: 'interdit',
  },
  {
    term: 'Win RP',
    def: "Chercher à gagner à tout prix, en refusant toute défaite, toute blessure ou toute conséquence pour son personnage.",
    kind: 'interdit',
  },
  {
    term: 'Freekill',
    full: 'Meurtre gratuit',
    def: "Tuer ou mettre à terre un joueur sans raison RP valable ni scène préalable.",
    kind: 'interdit',
  },
  {
    term: 'Freepunch',
    full: 'Coup gratuit',
    def: "Frapper un joueur sans raison RP valable.",
    kind: 'interdit',
  },
  {
    term: 'VDM',
    full: 'Vehicle Deathmatch',
    def: "Se servir de son véhicule comme d'une arme, en fonçant volontairement sur un joueur ou en percutant d'autres véhicules sans raison RP.",
    kind: 'interdit',
  },
  {
    term: 'CDM / Carkill',
    full: 'Car Deathmatch',
    def: "Tuer ou mettre à terre un joueur en l'écrasant avec un véhicule : la forme la plus grave de VDM.",
    kind: 'interdit',
  },
  {
    term: 'Revenge kill',
    def: "Revenir s'en prendre à ceux qui ont mis son personnage à terre, alors que la NLR lui a fait oublier la scène.",
    kind: 'interdit',
  },
  {
    term: 'Cop baiting',
    def: "Provoquer les forces de l'ordre sans raison RP, dans le seul but de déclencher une poursuite ou un affrontement.",
    kind: 'interdit',
  },
  {
    term: 'Stream sniping',
    def: "Regarder la diffusion en direct d'un joueur pour obtenir des informations et s'en servir en jeu.",
    kind: 'interdit',
  },
  {
    term: 'Loot',
    full: 'Dépouille',
    def: "Le fait de fouiller un personnage et de lui prendre ce qu'il porte, ou le butin ainsi obtenu. La dépouille se joue toujours dans le cadre d'une scène.",
    kind: 'notion',
  },
  {
    term: 'Wipe',
    def: "Remise à zéro décidée par le staff : le personnage ou le groupe visé perd ses biens et repart de rien.",
    kind: 'notion',
  },
  {
    term: 'Dossier',
    def: "Demande écrite soumise au staff pour faire valider un projet, comme la création d'un groupe illégal ou la mort RP d'un personnage.",
    kind: 'notion',
  },
  {
    term: 'Lead',
    def: "Joueur responsable d'un groupe. Il répond de ses membres et sert d'interlocuteur au staff.",
    kind: 'notion',
  },
];
