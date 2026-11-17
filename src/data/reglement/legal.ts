import type { RuleBook } from './types';

const book: RuleBook = {
  slug: 'legal',
  title: "Règlement légal",
  lead: "Policiers, secouristes, magistrats, élus et chefs d'entreprise font tourner la ville. Ce règlement précise ce que l'on attend d'eux, en complément du règlement global.",
  chapters: [
    {
      title: "Règles communes au légal",
      intro: "Ces règles valent pour tous les métiers légaux, du service public au petit commerce.",
      sections: [
        {
          title: "L'esprit du service",
          rules: [
            {
              title: "Le RP avant l'avantage",
              text: "Un métier légal sert à créer des scènes pour les autres, pas à accumuler salaire, matériel ou pouvoir. Si une décision ne profite qu'à toi et n'apporte rien à la scène, ce n'est pas la bonne. Prendre son service pour encaisser une paie en restant inactif est interdit.",
            },
            {
              title: "Le règlement global prime",
              text: "Ce règlement complète le règlement global sans jamais le remplacer : Fear RP, Pain RP, metagaming, NLR et zones sûres valent pour tous, uniforme ou non. En cas de doute entre les deux textes, c'est le règlement global qui l'emporte.",
            },
            {
              text: "Ton personnage reste le même en service et hors service. Un agent, un médecin ou un magistrat dont le comportement en dehors du travail est incompatible avec sa fonction doit s'attendre à des conséquences en RP : enquête interne, sanction, renvoi.",
            },
          ],
        },
        {
          title: "Menus & outils métier",
          intro: "Ces outils existent pour appuyer une scène, jamais pour la remplacer.",
          rules: [
            {
              title: "Aucun usage hors scène",
              text: "Les menus de ton métier (fouille, facture, amende, soin, menottes, coffre) ne s'utilisent que dans une scène qui le justifie. S'en servir pour toi-même, pour un proche, par curiosité ou pour régler un compte est un abus, même sans conséquence visible.",
              level: 'critique',
            },
            {
              text: "Toute action passe d'abord par le RP : on annonce une fouille, on décrit un soin, on explique une amende, et seulement ensuite on ouvre le menu. Laisse à l'autre joueur le temps de réagir ; une erreur de manipulation se corrige aussitôt et se signale à ta hiérarchie.",
            },
          ],
        },
        {
          title: "Prise et fin de service",
          rules: [
            {
              title: "Tenue et identification",
              text: "En service, tu portes la tenue de ton métier et tu restes identifiable : nom, grade ou matricule se donnent à qui les demande. Les missions en civil ou en véhicule banalisé sont réservées aux unités autorisées par la direction du service.",
            },
            {
              title: "Fin de service réelle",
              text: "Une fois ton service terminé, tu redeviens un civil : plus de pouvoirs, plus de véhicule ni d'équipement de service, plus de radio. Il est interdit de prendre ou de quitter son service en pleine scène pour en tirer un avantage ou échapper à ses conséquences.",
              level: 'importante',
            },
          ],
        },
        {
          title: "Hiérarchie",
          rules: [
            {
              text: "Un supérieur est soumis aux mêmes règles que ses agents, et c'est à lui de montrer l'exemple. Un ordre contraire au règlement ne s'exécute pas : il ne protège ni celui qui le donne, ni celui qui l'applique.",
            },
            {
              text: "Recrutements, promotions et sanctions se décident sur ce qui s'est passé en jeu. Les amitiés hors RP, l'appartenance à un même groupe de joueurs ou l'ancienneté sur le Discord ne donnent droit à aucun traitement de faveur.",
            },
          ],
        },
      ],
    },
    {
      title: "Corruption & incompatibilités",
      intro: "Un service public n'est crédible que si ses membres ne jouent pas sur deux tableaux.",
      sections: [
        {
          title: "Corruption",
          rules: [
            {
              title: "Uniquement sur dossier validé",
              text: "Un agent d'un service public ne peut être corrompu que si son joueur a déposé un dossier et que le staff l'a validé. Sans cette validation, il est interdit d'accepter un pot-de-vin, de fermer les yeux contre rémunération ou de rendre service à un groupe illégal. Si l'on te propose de l'argent, refuse en RP : c'est une scène à jouer, pas une faute de l'autre joueur.",
              level: 'critique',
            },
            {
              text: "Un dossier validé n'est pas une immunité. La corruption reste discrète, se limite au cadre fixé par le staff et laisse des traces qu'une enquête pourra exploiter ; si ton personnage est démasqué, tu en joues les conséquences jusqu'au bout.",
            },
          ],
        },
        {
          title: "Double vie, informations & matériel",
          rules: [
            {
              title: "Pas de double vie",
              text: "Un personnage qui exerce une fonction sensible (forces de l'ordre, justice, gouvernement, services médicaux) ne peut ni appartenir à un groupe illégal, ni mener d'activité criminelle en parallèle. Pour jouer l'illégal, quitte d'abord ta fonction en RP ou crée un autre personnage ; la seule exception est le dossier de corruption validé.",
              level: 'critique',
            },
            {
              title: "Fuite d'informations",
              text: "Ce que tu apprends en service reste dans le service : échanges radio, fichiers, enquêtes en cours, identités, positions des unités. Le transmettre à un civil ou à un groupe illégal est interdit hors dossier de corruption validé ; s'en servir avec un autre de tes personnages l'est toujours.",
              level: 'critique',
            },
            {
              title: "Matériel de service",
              text: "Armes, gilets, équipements et véhicules de service appartiennent au service. Ils ne sont ni prêtés, ni donnés, ni vendus, ni rangés dans un coffre personnel ; toute perte ou tout vol se signale immédiatement à la hiérarchie.",
              level: 'critique',
            },
          ],
        },
      ],
    },
    {
      title: "Forces de l'ordre",
      intro: "Le LSPD intervient en ville, le BCSO dans le comté ; les deux services appliquent les mêmes règles et se prêtent renfort.",
      sections: [
        {
          title: "Usage de la force",
          rules: [
            {
              title: "Gradation de la force",
              text: "La réponse est toujours proportionnée à la menace : dialogue, injonction, contrainte physique, moyens non létaux, puis arme à feu en dernier lieu. Aucune étape ne se saute tant que la situation ne l'impose pas.",
              level: 'importante',
            },
            {
              title: "Sommation obligatoire",
              text: "Avant d'ouvrir le feu, tout agent doit lancer une sommation vocale claire et laisser au suspect le temps d'y répondre. Seule exception : les agents sont déjà visés par une arme ou sous le feu.",
              level: 'critique',
            },
            {
              title: "Tir en dernier recours",
              text: "L'arme à feu ne répond qu'à une menace grave et immédiate pour une vie. Il est interdit de tirer sur un suspect désarmé, sur quelqu'un qui fuit sans menacer personne ou pour abréger une intervention. Dès que la menace cesse, le tir cesse et les secours sont appelés.",
              level: 'critique',
            },
          ],
        },
        {
          title: "Contrôles, fouilles & saisies",
          rules: [
            {
              title: "Un motif, toujours",
              text: "Un contrôle d'identité ou un contrôle routier repose sur un motif que l'agent peut énoncer : infraction constatée, signalement, comportement suspect. Contrôler le même joueur à répétition sans raison nouvelle relève du harcèlement.",
              level: 'importante',
            },
            {
              title: "Fouilles et saisies",
              text: "Une palpation de sécurité est possible lors de toute interpellation ; la fouille complète d'une personne ou d'un véhicule exige un motif sérieux (flagrant délit, arme ou produit visible, mandat) ou l'accord de l'intéressé. Seuls les objets illégaux ou liés à l'infraction sont saisis, puis placés sous scellés. Un agent qui se sert dans les saisies commet une faute grave.",
            },
          ],
        },
        {
          title: "Poursuites",
          rules: [
            {
              title: "Unités engagées",
              text: "Une poursuite mobilise au maximum quatre véhicules de police, appui aérien non compris. Les autres unités restent en retrait, préparent un barrage plus loin ou répondent aux autres appels.",
            },
            {
              title: "Manœuvres d'arrêt",
              text: "Les manœuvres d'arrêt (PIT, encadrement, herse) sont réservées aux agents formés, avec l'accord du responsable de la poursuite. Elles sont interdites en zone piétonne, à proximité d'une foule et contre les deux-roues.",
              level: 'importante',
            },
            {
              text: "La poursuite s'adapte à l'infraction : on ne met pas la ville en danger pour un feu rouge grillé. Il est interdit de percuter volontairement un véhicule en dehors d'une manœuvre autorisée, comme de tirer sur un véhicule en fuite dont les occupants n'ont menacé personne avec une arme.",
            },
          ],
        },
        {
          title: "Garde à vue & procédure",
          intro: "Une procédure courte et bien jouée vaut mieux qu'un joueur immobilisé pendant une heure.",
          rules: [
            {
              title: "Lecture des droits",
              text: "Toute personne interpellée est informée du motif de son arrestation et de ses droits avant d'être interrogée : garder le silence, recevoir des soins, être assistée d'un avocat.",
            },
            {
              title: "Vingt minutes maximum",
              text: "Une garde à vue dure 20 minutes au maximum, de l'arrivée au poste à la décision finale. Seule une enquête validée par un officier supérieur ou un magistrat permet d'aller au-delà, et la personne retenue n'est alors jamais laissée seule sans RP.",
              level: 'importante',
            },
            {
              text: "Si un avocat est en service, la personne gardée à vue qui en réclame un doit pouvoir le contacter, l'attendre quelques minutes et s'entretenir seule avec lui. Si aucun n'est disponible, la procédure se poursuit et cette absence est notée au dossier.",
            },
          ],
        },
        {
          title: "Amendes & peines",
          rules: [
            {
              text: "Amendes et peines suivent le barème en vigueur et restent proportionnées aux faits. Il est interdit d'empiler les chefs d'accusation pour alourdir la note ; à l'inverse, la coopération du suspect et la qualité de son RP peuvent justifier la clémence.",
            },
            {
              title: "Prison : 60 minutes maximum",
              text: "Une peine de prison ne dépasse jamais 60 minutes, quels que soient le nombre et la gravité des infractions retenues. Ce plafond vaut aussi pour les peines prononcées par un juge.",
              level: 'importante',
            },
          ],
        },
        {
          title: "Interventions",
          intro: "Sur un braquage, l'objectif est de protéger les otages et de construire une belle scène, pas de gagner une fusillade.",
          rules: [
            {
              title: "Effectifs minimums",
              text: "Un braquage n'a lieu que si assez de policiers sont en service pour y répondre. Il est interdit de prendre ou de quitter son service dans le seul but de faire basculer ce seuil.",
              points: [
                "Supérette : 3 policiers",
                "Bijouterie : 5 policiers",
                "Banque : 6 policiers",
                "Banque centrale : 10 policiers",
              ],
            },
            {
              title: "Périmètre, puis négociation",
              text: "À leur arrivée, les agents établissent un périmètre, désignent un négociateur et prennent contact avec les braqueurs. Dès qu'il y a des otages, la négociation est obligatoire, et ce que le négociateur accorde est respecté par toutes les unités.",
            },
            {
              title: "Pas d'assaut pendant la négociation",
              text: "Tant que la négociation est en cours et que les otages sont en sécurité, aucun assaut, aucune entrée en force, aucun tir n'est permis. L'intervention armée ne se justifie que si un otage est directement menacé ou si les braqueurs ouvrent le feu.",
              level: 'critique',
            },
          ],
        },
      ],
    },
    {
      title: "Services médicaux (EMS)",
      intro: "Les secours sont le filet de sécurité de toutes les scènes : leur rôle exige rigueur et retenue.",
      sections: [
        {
          title: "Neutralité & déontologie",
          rules: [
            {
              title: "Neutralité absolue",
              text: "Les EMS ne prennent parti dans aucun conflit : ils ne renseignent ni la police, ni les groupes illégaux, et ne deviennent le médecin attitré de personne. Leur seule mission est de soigner.",
              level: 'critique',
            },
            {
              title: "Des soins pour tous",
              text: "Tout blessé est pris en charge, quels que soient son camp, son casier ou tes rapports avec lui. L'ordre de passage dépend de la gravité des blessures, jamais de l'identité du patient.",
            },
            {
              title: "Aucune arme",
              text: "Un EMS en service ne porte et n'utilise aucune arme, et ne participe à aucune action hostile. S'il est menacé, il se replie et prévient les forces de l'ordre.",
              level: 'critique',
            },
            {
              title: "Secret médical",
              text: "Ce que tu apprends en soignant quelqu'un (blessures, identité, confidences) ne se répète pas. Seule une réquisition de la justice permet de transmettre un dossier médical.",
              level: 'importante',
            },
          ],
        },
        {
          title: "Interventions & soins",
          rules: [
            {
              title: "Zone sécurisée d'abord",
              text: "Aucune intervention sous les tirs : tant que la zone n'est pas sécurisée, l'équipe reste à distance, même si un blessé attend. Un EMS qui s'avance au milieu d'une fusillade se met lui-même en faute.",
              level: 'importante',
            },
            {
              title: "Réanimation et coma",
              text: "Une réanimation se joue sérieusement : bilan, gestes de secours, puis transport à l'hôpital si l'état du patient l'exige. Relever quelqu'un en un clic pour le renvoyer au combat est interdit. Tant que des EMS sont en service, les joueurs dans le coma doivent les attendre : chaque appel mérite donc une réponse, même pour annoncer un délai.",
            },
            {
              text: "Les soins sont facturés au tarif du service, sans supplément inventé ni facture pour un soin qui n'a pas eu lieu. On soigne d'abord, on facture ensuite : un patient sans argent est soigné quand même.",
            },
            {
              text: "L'ambulance n'est ni un taxi, ni un véhicule de poursuite : elle sert aux interventions et au transport des patients. Sirène et gyrophares sont réservés aux urgences réelles.",
            },
          ],
        },
      ],
    },
    {
      title: "Justice (DOJ)",
      intro: "Avocats, procureurs et juges donnent une suite aux scènes de la rue ; leur travail doit rester juste, lisible et jouable.",
      sections: [
        {
          title: "Avocats, procureurs & juges",
          rules: [
            {
              title: "Impartialité des magistrats",
              text: "Juges et procureurs se prononcent sur les faits et les preuves du dossier, jamais sur leurs amitiés, leurs rancunes ou une pression extérieure au jeu. Il est interdit de favoriser ou d'accabler un joueur pour une raison étrangère à l'affaire.",
              level: 'critique',
            },
            {
              title: "Conflit d'intérêts",
              text: "Un magistrat ou un avocat ne traite jamais une affaire qui implique un proche de son personnage, son employeur ou un autre personnage du même joueur : il se retire et confie le dossier à un collègue.",
            },
            {
              text: "L'avocat défend son client par des moyens légaux : il conseille, négocie et plaide. Il ne fait passer ni objets, ni messages illégaux, ne fabrique pas de preuves et annonce ses honoraires avant d'accepter un dossier.",
            },
          ],
        },
        {
          title: "Mandats & procès",
          rules: [
            {
              title: "Mandats motivés",
              text: "Un mandat de perquisition ou d'arrêt n'est délivré que sur une demande motivée, appuyée sur des éléments obtenus en RP. Il précise la personne ou le lieu visé et sa durée de validité : pas de mandat en blanc, ni de mandat permanent.",
              level: 'importante',
            },
            {
              text: "Le procès est réservé aux affaires qui le méritent et il se prépare : dossier communiqué aux deux parties, date fixée avec elles. L'audience ne dépasse pas une heure, et un accusé en attente de son procès n'est pas maintenu en cellule au-delà de sa garde à vue.",
            },
          ],
        },
      ],
    },
    {
      title: "Gouvernement",
      intro: "Le gouvernement donne un cap à la ville ; il ne remplace ni la police, ni la justice.",
      sections: [
        {
          title: "Rôle & limites",
          rules: [
            {
              text: "Le gouvernement a un rôle politique et administratif : il agit par les lois, les décrets, les nominations et le budget. Ses membres n'ont aucun pouvoir de police, et un texte ne s'applique qu'une fois publié, sans jamais pouvoir contredire le règlement du serveur.",
            },
            {
              title: "Budget public",
              text: "L'argent public sert la ville : services, équipements, subventions, événements. Il est interdit de le détourner vers un compte personnel, des proches ou une entreprise amie, comme de s'accorder primes et salaires sans justification.",
              level: 'critique',
            },
            {
              title: "Pas d'ingérence",
              text: "Aucun membre du gouvernement ne donne d'ordre sur une intervention en cours, ni ne fait libérer un suspect ou annuler une amende sur un simple appel. Un désaccord se règle après coup, auprès de la direction du service concerné ou devant la justice.",
              level: 'importante',
            },
            {
              text: "Les annonces officielles informent la population : elles restent sobres, utiles et rédigées en RP. Pas de rafale d'annonces, de règlement de comptes ni de plaisanteries sur le canal du gouvernement.",
            },
          ],
        },
      ],
    },
    {
      title: "Entreprises",
      intro: "Une entreprise est un lieu de rencontre avant d'être une source de revenus.",
      sections: [
        {
          title: "Faire vivre son commerce",
          rules: [
            {
              title: "Une activité réelle",
              text: "Une entreprise ouvre régulièrement, annonce ses horaires et accueille ses clients avec du personnel présent. Un établissement toujours fermé, ou ouvert seulement pour les amis du patron, ne remplit pas son rôle.",
            },
            {
              title: "Pas d'entreprise-coffre",
              text: "Il est interdit de tenir une entreprise pour son seul coffre, ses véhicules ou ses salaires. Elle ne peut pas non plus servir de façade ou de dépôt à un groupe illégal sans dossier validé par le staff.",
              level: 'critique',
            },
            {
              text: "Une vente ou une prestation se joue : accueil, échange, geste du métier, puis encaissement. Distribuer des produits à la chaîne sans un mot, ou facturer un client que tu n'as jamais rencontré, n'est pas du commerce.",
            },
          ],
        },
        {
          title: "Prix, factures & stocks",
          rules: [
            {
              text: "Les prix restent dans la fourchette du marché fixée pour chaque activité et sont annoncés avant la prestation. Ni prix cassés pour étouffer un concurrent, ni tarifs à la tête du client.",
            },
            {
              title: "Factures réelles",
              text: "Chaque facture correspond à un produit ou à un service réellement fourni, au client qui l'a reçu et pour son juste montant. Les fausses factures, les factures gonflées et les factures entre proches destinées à faire circuler de l'argent sont interdites.",
              level: 'critique',
            },
            {
              title: "Coffre de l'entreprise",
              text: "Le coffre, le compte et les stocks de l'entreprise servent à son activité et à rien d'autre. On n'y entrepose ni biens personnels, ni armes, ni marchandises illégales, et chaque retrait doit pouvoir s'expliquer.",
              level: 'importante',
            },
          ],
        },
        {
          title: "Patrons & co-patrons",
          intro: "Diriger une entreprise est une responsabilité envers ses employés, ses clients et le serveur.",
          rules: [
            {
              text: "L'embauche se fait en jeu : annonce, entretien, période d'essai. Les emplois fictifs, créés pour offrir un salaire ou un accès au coffre à quelqu'un qui ne travaille pas, sont interdits.",
            },
            {
              text: "Patron et co-patrons sont présents régulièrement, forment leurs employés et répondent de ce qui se passe dans leur entreprise. Fermer les yeux sur des abus répétés engage leur responsabilité autant que celle de l'employé fautif.",
            },
            {
              title: "Inactivité de 14 jours",
              text: "Une entreprise restée 14 jours sans activité réelle et sans absence signalée au staff est remise en jeu, puis confiée à un autre projet. Une entreprise ne se cède pas entre joueurs sans l'accord du staff, et jamais contre de l'argent réel.",
            },
          ],
        },
      ],
    },
    {
      title: "Discipline & sanctions",
      intro: "Une faute professionnelle se règle d'abord en jeu ; le staff intervient quand c'est le règlement lui-même qui est enfreint.",
      sections: [
        {
          title: "Sanctions internes",
          rules: [
            {
              title: "Une échelle progressive",
              text: "La hiérarchie d'un service ou d'une entreprise dispose de trois sanctions, à appliquer dans l'ordre sauf faute lourde.",
              points: [
                "Blâme : rappel à l'ordre inscrit au dossier de l'employé.",
                "Mise à pied : suspension temporaire, sans salaire ni accès au matériel.",
                "Licenciement RP : renvoi du service ou de l'entreprise et restitution de tout le matériel.",
              ],
            },
            {
              text: "Toute sanction interne se joue en RP : convocation, entretien où l'employé peut s'expliquer, décision annoncée de vive voix. Pas de licenciement par message Discord, ni de sanction pour un motif extérieur au jeu.",
            },
          ],
        },
        {
          title: "Intervention du staff",
          rules: [
            {
              title: "Fautes graves : ticket",
              text: "Abus de menus, corruption sans dossier, fuite d'informations, fausses factures et détournement de fonds dépassent le cadre du RP. Ils se signalent au staff par ticket Discord, preuve vidéo à l'appui ; une hiérarchie qui les couvre s'expose aux mêmes sanctions.",
              level: 'importante',
            },
            {
              title: "Sanctions du staff",
              text: "Au-delà des sanctions du règlement global (avertissement, exclusion, bannissement temporaire de 1, 3 ou 7 jours, bannissement définitif, wipe du personnage), le staff peut prononcer deux mesures propres au légal. Toute contestation passe par un ticket Discord avec preuve vidéo.",
              points: [
                "Retrait de direction : le patron ou le chef de service perd son poste, qui est remis en jeu.",
                "Wipe d'entreprise : compte, coffre et stocks sont remis à zéro et l'entreprise peut être réattribuée.",
              ],
            },
          ],
        },
      ],
    },
  ],
};

export default book;
