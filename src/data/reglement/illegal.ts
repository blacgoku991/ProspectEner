import type { RuleBook } from './types';

const book: RuleBook = {
  slug: 'illegal',
  title: 'Règlement illégal',
  lead: "Gangs, organisations, braquages et trafics : l'illégal nourrit une grande part des histoires de la ville, à condition d'être joué avec exigence. Ce règlement complète le règlement global, qui s'applique à chaque scène.",
  chapters: [
    {
      title: "L'esprit de l'illégal",
      intro: "Cinq principes qui passent avant tout le reste : en cas de doute sur une règle, ce sont eux qui tranchent.",
      sections: [
        {
          title: "Principes",
          rules: [
            {
              title: "Un privilège qui se mérite",
              text: "Incarner un criminel n'est pas un droit acquis. C'est une confiance que le staff accorde à un joueur ou à un groupe, et qu'il peut retirer si la qualité de jeu ne suit pas.",
            },
            {
              title: "Le roleplay avant le gain",
              text: "Une action illégale vaut par l'histoire qu'elle crée, pas par ce qu'elle rapporte. Enchaîner les coups pour remplir un coffre n'a pas sa place sur Elyra.",
            },
            {
              text: "Chaque action part d'un motif propre à ton personnage et entraîne des conséquences que tu acceptes de jouer : enquête, prison, dettes ou représailles.",
            },
            {
              title: "Le joueur avant le personnage",
              text: "Derrière chaque victime, chaque policier et chaque rival, quelqu'un est venu passer un bon moment. Ton personnage peut être impitoyable ; toi, tu restes attentif au plaisir de jeu des autres.",
              level: 'importante',
            },
            {
              title: "Savoir perdre",
              text: "Être arrêté, dépouillé ou battu fait partie du jeu et relance souvent une histoire mieux qu'une victoire. Une scène perdue se joue jusqu'au bout, sans mauvaise foi ni règlement de comptes hors RP.",
            },
          ],
        },
      ],
    },
    {
      title: "Accès & groupes",
      intro: "Elyra est gratuit et ouvert à tous, mais l'illégal organisé fonctionne en semi-whitelist : un groupe criminel ne se monte pas sans l'accord du staff.",
      sections: [
        {
          title: "Entrer dans l'illégal",
          rules: [
            {
              title: "Dossier sur Discord",
              text: "Tout groupe illégal organisé commence par un dossier déposé sur Discord : histoire, objectifs, hiérarchie et membres fondateurs. Tant qu'il n'est pas accepté, le groupe n'existe pas en jeu : ni couleurs, ni territoire, ni activités réservées.",
              level: 'importante',
            },
            {
              text: "Le staff accepte, fait retravailler ou refuse un dossier selon sa qualité et l'équilibre de la ville. Un refus est toujours expliqué et n'empêche pas de revenir avec un projet plus abouti.",
            },
            {
              title: "Période d'observation",
              text: "Un groupe fraîchement validé passe par une période d'observation, dont la durée lui est annoncée à la validation. Le staff suit ses scènes de près et peut prolonger cette période ou retirer la validation si le projet ne tient pas ses promesses.",
            },
          ],
        },
        {
          title: "Types & effectifs",
          rules: [
            {
              title: "Effectifs maximum",
              text: "Chaque type de groupe a un plafond de membres. Une fois ce plafond atteint, tout nouveau recrutement attend qu'une place se libère.",
              points: [
                "Gang : 15 membres",
                "MC (club de motards) : 15 membres",
                "Famille : 15 membres",
                "Mafia ou organisation : 20 membres",
                "Cartel : 20 membres",
              ],
            },
            {
              title: "Limites par scène",
              text: "Un même groupe n'engage jamais plus de 8 de ses membres dans une même scène. Dans une fusillade, le camp illégal ne dépasse jamais 12 personnes, alliances comprises ; les renforts arrivés en cours de route comptent dans ces limites.",
              level: 'importante',
            },
          ],
        },
        {
          title: "Leads",
          rules: [
            {
              title: "Responsables de leurs membres",
              text: "Les leads répondent du comportement de leur groupe : ils transmettent le règlement, recadrent les écarts et sont les interlocuteurs du staff. Ignorer ce que font ses membres n'est pas une excuse.",
            },
            {
              text: "Un groupe a besoin de leads présents. Une absence prolongée se signale au staff et s'accompagne de la désignation d'un remplaçant ; un groupe laissé sans direction peut être gelé.",
            },
            {
              title: "Recrutement en RP",
              text: "On entre dans un groupe par une rencontre, une mise à l'épreuve et une histoire jouées en ville. Le recrutement hors RP est interdit : pas d'annonce sur Discord, pas de place promise à un ami avant que son personnage ait fait ses preuves.",
            },
          ],
        },
        {
          title: "Indépendants",
          intro: "Un personnage sans groupe validé peut vivre de l'illégal, à petite échelle.",
          rules: [
            {
              text: "La petite délinquance est libre : vols, cambriolages, petits trafics et braquages de supérette se jouent sans dossier, dans le respect de ce règlement.",
            },
            {
              title: "Quatre au maximum",
              text: "Des indépendants n'agissent jamais à plus de 4 ensemble. Au-delà, il s'agit d'un groupe de fait, qui doit déposer un dossier ou se séparer.",
            },
            {
              text: "Un indépendant s'en tient aux armes blanches et aux armes de poing : ni pistolet-mitrailleur, ni fusil à pompe, ni arme lourde, même prêtés ou ramassés au sol.",
            },
          ],
        },
      ],
    },
    {
      title: "Motif & escalade",
      intro: "La violence est une conséquence, jamais un point de départ.",
      sections: [
        {
          title: "Du motif à la riposte",
          rules: [
            {
              title: "Motif RP construit",
              text: "Aucune action hostile sans motif né en jeu et vécu par ton personnage. Un regard de travers, une rumeur ou l'envie d'action n'en sont pas : tu dois pouvoir expliquer ton motif au staff en une phrase.",
              level: 'critique',
            },
            {
              title: "Escalade progressive",
              text: "Un conflit monte par paliers, et chaque palier laisse à l'autre camp une chance de réagir.",
              level: 'importante',
              points: [
                "Provocation : un tort ou un affront clairement identifié",
                "Avertissement : une mise en garde explicite, qui laisse une porte de sortie",
                "Représailles : l'action hostile, si l'avertissement est resté sans effet",
              ],
            },
            {
              title: "Riposte proportionnée",
              text: "La réponse reste à la mesure du tort subi : une insulte ne vaut pas une exécution, un scooter volé ne vaut pas une fusillade. En cas de doute, choisis le palier du dessous.",
            },
            {
              text: "Sans nouvel élément, un motif s'éteint au bout de 48 heures. Passé ce délai, il faut une nouvelle scène pour relancer le conflit.",
            },
            {
              title: "Vengeance après un coma",
              text: "La NLR vaut aussi entre criminels. Après une réapparition à l'hôpital, ton personnage ne se venge pas d'une scène qu'il a oubliée et n'envoie personne le faire à sa place.",
              level: 'critique',
            },
          ],
        },
      ],
    },
    {
      title: "Armes & violence",
      intro: "Une arme sert d'abord à faire monter la tension : elle se montre plus souvent qu'elle ne tire.",
      sections: [
        {
          title: "Armement",
          rules: [
            {
              title: "Catégories d'armes",
              text: "L'armement autorisé dépend du statut du personnage.",
              level: 'importante',
              points: [
                "Indépendants : armes blanches et armes de poing",
                "Groupes validés : pistolets-mitrailleurs et fusils à pompe en plus",
                "Fusils d'assaut : uniquement pendant une scène validée par le staff (guerre, Banque centrale)",
              ],
            },
            {
              title: "Armes lourdes",
              text: "Les armes lourdes, fusils d'assaut en tête, ne sortent que pour une scène validée par le staff. Partout ailleurs, et dans toute zone sûre sans exception, elles ne sont ni portées, ni brandies, ni utilisées.",
              level: 'critique',
            },
            {
              title: "Tireur embusqué",
              text: "Poster un tireur en hauteur ou à distance, hors de vue de ses cibles, est réservé aux scènes validées par le staff. Il compte dans l'effectif et n'ouvre jamais les hostilités : il n'intervient qu'une fois la scène engagée.",
            },
          ],
        },
        {
          title: "Ouvrir le feu",
          rules: [
            {
              title: "Sommation obligatoire",
              text: "Avant d'ouvrir le feu, une sommation vocale claire est obligatoire : la cible doit comprendre qui la menace et ce qu'on attend d'elle. Seule exception : tu es déjà visé ou sous le feu.",
              level: 'importante',
            },
            {
              text: "Depuis un véhicule, seules les armes de poing sont autorisées, pour le conducteur comme pour les passagers. Rouler ne dispense ni du motif ni de la sommation.",
            },
            {
              title: "Tirs dans le tas",
              text: "Chaque tir vise une personne précise, impliquée dans la scène et couverte par ton motif. Arroser un groupe, un véhicule ou une façade parce qu'un adversaire s'y trouve est sanctionné comme une agression gratuite.",
              level: 'critique',
            },
            {
              title: "Mort RP",
              text: "Abattre un adversaire le plonge dans le coma, rien de plus. Une mort RP, définitive, n'est possible qu'avec un dossier validé par le staff ou l'accord du joueur concerné.",
              level: 'critique',
            },
          ],
        },
      ],
    },
    {
      title: "Braquages",
      intro: "Un braquage réussi est une scène dont tout le monde se souvient, policiers et otages compris.",
      sections: [
        {
          title: "Règles communes",
          rules: [
            {
              title: "Effectif policier minimum",
              text: "Aucun braquage ne démarre si le nombre de policiers en service est inférieur au minimum du barème. Si l'effectif n'est pas réuni, on reporte : on ne lance pas la scène en espérant que personne ne viendra.",
              level: 'importante',
            },
            {
              title: "Négociation obligatoire",
              text: "Dès qu'un otage est présent, les braqueurs ouvrent une négociation avec les forces de l'ordre et la mènent de bonne foi. Ni fuite ni coup de feu de leur part avant qu'elle ait réellement eu lieu.",
              level: 'importante',
            },
            {
              text: "Les exigences restent à l'échelle de la scène : un véhicule de fuite, un délai d'avance, un passage dégagé. Réclamer l'impunité totale, un hélicoptère ou le désarmement de toute la police rompt la négociation à tes torts.",
            },
            {
              text: "Un même joueur attend au moins 45 minutes entre deux braquages, quels que soient la cible et le personnage joué. Comme toute action hostile, un braquage ne se lance pas dans les 15 minutes qui précèdent ou suivent un redémarrage du serveur.",
            },
          ],
        },
        {
          title: "Barème",
          rules: [
            {
              title: "Effectifs par cible",
              text: "Chaque cible impose un nombre de braqueurs, guetteurs et chauffeurs compris, et un minimum de policiers en service. La limite de 8 membres d'un même groupe par scène s'applique aussi : au-delà, la Banque centrale se joue en alliance.",
              points: [
                "Supérette : 2 à 4 braqueurs, 3 policiers en service",
                "Bijouterie : 4 à 6 braqueurs, 5 policiers en service",
                "Banque : 4 à 6 braqueurs, 6 policiers en service",
                "Banque centrale : 6 à 10 braqueurs, 10 policiers en service et validation du staff",
              ],
            },
          ],
        },
        {
          title: "Otages",
          rules: [
            {
              title: "Un vrai otage",
              text: "Un otage est un joueur extérieur au braquage, qui n'en tire aucun bénéfice. Faire passer un complice ou un ami de mèche pour un otage est interdit.",
              level: 'critique',
            },
            {
              text: "Une équipe prend au plus un otage par tranche de 3 braqueurs ; à deux, elle peut tout de même en prendre un.",
              points: [
                "2 à 5 braqueurs : 1 otage",
                "6 à 8 braqueurs : 2 otages",
                "9 ou 10 braqueurs : 3 otages",
              ],
            },
            {
              title: "Otage qui coopère",
              text: "On ne blesse pas et on ne tue pas un otage qui obéit et joue sa peur. Sa libération fait partie de la négociation, et il repart libre à la fin de la scène.",
              level: 'critique',
            },
          ],
        },
      ],
    },
    {
      title: "Enlèvements & séquestrations",
      intro: "Priver un joueur de sa liberté, c'est lui devoir une scène à la hauteur.",
      sections: [
        {
          title: "Cadre d'un enlèvement",
          rules: [
            {
              text: "Un enlèvement répond à un motif solide, directement lié à la victime : dette, trahison, information à obtenir, moyen de pression. On n'enlève personne au hasard ni pour s'occuper.",
            },
            {
              title: "Trente minutes au maximum",
              text: "Une séquestration dure 30 minutes au plus, du moment où la victime est maîtrisée à celui où elle retrouve sa liberté. Passé ce délai, elle est relâchée, même si la scène n'a pas donné ce que tu espérais.",
              level: 'importante',
            },
            {
              text: "La victime n'est pas un colis : on lui parle, on lui laisse le temps de répondre, on ne l'abandonne pas dans un coffre ou une cave. Elle est relâchée dans un état cohérent avec la scène, à un endroit d'où elle peut reprendre son jeu.",
            },
            {
              title: "Cibles protégées",
              text: "Il est interdit d'enlever un EMS en service ou un joueur sorti de l'hôpital depuis moins de 15 minutes. Les secours doivent pouvoir travailler, et un personnage tout juste soigné doit pouvoir repartir.",
              level: 'critique',
            },
            {
              text: "L'enlèvement d'un policier ou de tout autre agent public exige un motif fort, construit sur plusieurs scènes et visant cette personne précise. L'uniforme seul n'est jamais une raison.",
            },
          ],
        },
      ],
    },
    {
      title: "Face aux forces de l'ordre",
      intro: "Policiers et criminels écrivent la même histoire : sans les uns, les autres n'ont plus de scène.",
      sections: [
        {
          title: "Conduite à tenir",
          rules: [
            {
              title: "Cop baiting",
              text: "Il est interdit de provoquer les forces de l'ordre dans le seul but de déclencher une poursuite ou une fusillade : dérapages devant un commissariat, insultes gratuites, délit commis sous leurs yeux pour attirer une patrouille.",
              level: 'critique',
            },
            {
              title: "Savoir se rendre",
              text: "Acculé, encerclé ou tenu en joue par plusieurs agents, ton personnage tient à sa vie et se rend : c'est le Fear RP appliqué au criminel. Sortir une arme à ce moment-là n'est pas du courage, c'est une faute.",
              level: 'importante',
            },
            {
              title: "Jouer sa peine",
              text: "Une arrestation se joue jusqu'au bout : fouille, interrogatoire, avocat, amende ou prison. Se déconnecter pour y échapper est sanctionné, et le temps passé en cellule se joue lui aussi.",
            },
            {
              title: "Commissariat et prison",
              text: "Aucune attaque de commissariat et aucune évasion de prison sans scénario validé par le staff. La demande se fait par ticket, avant la scène, avec le motif et le déroulé envisagés.",
              level: 'critique',
            },
            {
              text: "Il est interdit de voler un véhicule de police, de secours ou de tout autre service public, même laissé portes ouvertes au milieu d'une scène.",
            },
          ],
        },
      ],
    },
    {
      title: "Business illégaux",
      intro: "Un trafic est une activité de roleplay avant d'être une source de revenus.",
      sections: [
        {
          title: "Drogue",
          rules: [
            {
              text: "Récolte, transformation et revente se jouent en RP : on s'organise, on fait le guet, on parle à ses clients et à ses associés. Enchaîner les allers-retours en silence n'est pas du trafic, c'est du farm.",
            },
            {
              title: "Macro et farm AFK",
              text: "Toute automatisation est interdite : macro, touche bloquée, logiciel tiers ou présence AFK sur un point de production. Les gains obtenus de cette façon sont retirés, en plus de la sanction.",
              level: 'critique',
            },
            {
              title: "Pas de camping",
              text: "Il est interdit de stationner sur un point de récolte, de transformation ou de revente pour y guetter les autres joueurs et les dépouiller, ou d'en bloquer l'accès.",
            },
          ],
        },
        {
          title: "Armes, blanchiment & faux papiers",
          rules: [
            {
              text: "Le trafic d'armes, le blanchiment et les faux papiers sont des circuits réservés aux groupes validés, dans la limite de ce que prévoit leur dossier. Un indépendant peut en être client, jamais opérateur.",
            },
            {
              title: "Revente aux indépendants",
              text: "Aucune arme au-dessus de l'arme de poing ne se vend, ne se prête ni ne se donne à un indépendant. Le vendeur est tenu pour responsable au même titre que l'acheteur.",
              level: 'importante',
            },
          ],
        },
        {
          title: "Zones de revente",
          rules: [
            {
              text: "Vendre dans le quartier d'un groupe sans son accord est une provocation, avec les suites RP que cela suppose. Hors territoire revendiqué, la revente est ouverte à tous et personne ne peut s'en réserver l'exclusivité.",
            },
          ],
        },
      ],
    },
    {
      title: "Territoires & guerres",
      intro: "Un quartier se tient par la présence et la réputation ; une guerre se prépare, s'encadre et se termine.",
      sections: [
        {
          title: "Territoires",
          rules: [
            {
              text: "Un territoire se revendique et se défend en RP : présence régulière, commerces fréquentés, habitants connus. Sans cette vie de quartier, la revendication ne vaut rien, même annoncée partout sur Discord.",
            },
            {
              title: "Un quartier au départ",
              text: "Un groupe validé commence avec un seul quartier. Toute extension se gagne en RP, puis se fait acter par le staff.",
            },
          ],
        },
        {
          title: "Guerres",
          rules: [
            {
              title: "Déclaration et validation",
              text: "Une guerre se déclare par ticket, avec un motif construit en RP, et ne commence qu'après la validation du staff. Sans cette validation, chaque attaque est traitée comme une action hostile sans motif.",
              level: 'critique',
            },
            {
              text: "Deux groupes en guerre s'affrontent au maximum 3 fois par jour. Entre deux affrontements, chacun retourne à son roleplay : la guerre ne suspend ni les limites d'effectif ni la NLR.",
            },
            {
              title: "Conditions de fin",
              text: "La durée, l'enjeu et les conditions de victoire sont fixés avant le premier affrontement et connus des deux camps. Une guerre sans fin prévue n'est pas validée.",
            },
            {
              text: "Le perdant respecte l'issue et en joue les conséquences : territoire cédé, tribut, trêve. Relancer le même conflit sous un autre prétexte dans la foulée est interdit.",
            },
          ],
        },
      ],
    },
    {
      title: "Racket, vols & dépouille",
      intro: "Prendre aux autres fait partie du jeu ; leur gâcher la soirée, non.",
      sections: [
        {
          title: "Racket",
          rules: [
            {
              title: "Racket d'entreprise",
              text: "Racketter une entreprise, c'est installer une relation de roleplay dans la durée, pas prélever une taxe.",
              points: [
                "Une fois par semaine au plus pour une même entreprise",
                "Un montant raisonnable, que l'entreprise peut payer sans mettre la clé sous la porte",
                "Jamais le jour de son ouverture",
              ],
            },
          ],
        },
        {
          title: "Vols",
          rules: [
            {
              title: "Jouer un cambriolage",
              text: "Un cambriolage se prépare et se joue : repérage, entrée discrète, fuite. Enchaîner les logements sans autre scène relève du farm, et les traces laissées peuvent mener une enquête jusqu'à toi.",
            },
            {
              title: "Vols de véhicules",
              text: "Le vol d'un véhicule sert une scène : une fuite, une revente, un besoin précis du personnage. Voler pour détruire, jeter à l'eau ou simplement priver un joueur de son véhicule est interdit, tout comme le vol en zone sûre.",
            },
          ],
        },
        {
          title: "Dépouille",
          rules: [
            {
              text: "Sur un personnage maîtrisé, la dépouille se limite à l'argent liquide, aux armes et aux objets illégaux qu'il porte sur lui. L'argent en banque n'en fait pas partie : on ne conduit pas sa victime au distributeur.",
            },
            {
              title: "Objets intouchables",
              text: "Vêtements, clés et objets personnels de RP (alliance, photo, carnet, souvenir) restent à leur propriétaire, quelles que soient les circonstances.",
              level: 'importante',
            },
          ],
        },
      ],
    },
    {
      title: "Scènes sensibles",
      intro: "L'illégal permet des scènes dures ; il n'autorise pas tout, et jamais contre la volonté de l'autre joueur.",
      sections: [
        {
          title: "Limites",
          rules: [
            {
              title: "Accord préalable",
              text: "Toute scène dure (violence appuyée, humiliation, pression psychologique) demande l'accord hors RP du joueur concerné, obtenu avant la scène et discrètement, par message privé. Un refus ne se discute pas et ne se fait pas payer en jeu.",
              level: 'critique',
            },
            {
              title: "Fondu au noir",
              text: "Chaque participant peut demander un fondu au noir à tout moment : la scène est alors résumée en quelques mots, sans description, puis le jeu reprend. La demande est acceptée aussitôt, sans justification.",
              level: 'importante',
            },
            {
              title: "Torture suggérée",
              text: "La torture ne se décrit pas dans le détail : elle se suggère, par une menace, un geste, un hors-champ. Elle sert à faire avancer l'histoire, pas à mettre l'autre joueur mal à l'aise.",
              level: 'importante',
            },
            {
              title: "Aucune scène sexuelle",
              text: "Toute scène à caractère sexuel est interdite, même suggérée, même entre joueurs consentants. Les violences sexuelles ne sont ni jouées, ni brandies comme menace.",
              level: 'critique',
            },
            {
              title: "Protection des mineurs",
              text: "Aucune scène violente, dégradante ou ambiguë ne met en jeu un personnage mineur, et aucun propos de ce genre ne vise un joueur mineur. Le staff sanctionne sans avertissement préalable.",
              level: 'critique',
            },
            {
              title: "Discriminations réelles",
              text: "Racisme, sexisme, homophobie, transphobie et toute attaque visant l'origine, la religion ou le handicap d'une personne sont interdits, même « pour le rôle ». Un criminel crédible n'en a pas besoin.",
              level: 'critique',
            },
          ],
        },
      ],
    },
    {
      title: "Sanctions de l'illégal",
      intro: "Ces mesures visent le groupe et s'ajoutent aux sanctions individuelles prévues par le règlement global.",
      sections: [
        {
          title: "Mesures & responsabilité",
          rules: [
            {
              title: "Échelle des sanctions",
              text: "Selon la gravité des faits et la récidive, le staff choisit parmi les mesures suivantes, sans être tenu de les appliquer dans l'ordre.",
              points: [
                "Avertissement de groupe",
                "Gel d'activité : braquages, trafics ou recrutement suspendus pour une durée donnée",
                "Retrait du lead",
                "Wipe du personnage",
                "Wipe du groupe",
                "Bannissement, temporaire (1, 3 ou 7 jours) ou définitif",
              ],
            },
            {
              text: "Un groupe répond des fautes répétées de ses membres : quand les mêmes écarts reviennent, la sanction touche le groupe entier, et plus seulement le joueur fautif.",
            },
            {
              title: "Litiges et preuves",
              text: "Un désaccord se règle après la scène, par un ticket Discord accompagné d'une preuve vidéo, jamais en pleine action. Sans vidéo, le staff peut rarement trancher : pense à enregistrer tes scènes.",
            },
          ],
        },
      ],
    },
  ],
};

export default book;
