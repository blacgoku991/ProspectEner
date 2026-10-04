import type { RuleSet } from "../ruleset-schema";

/**
 * Jeu de règles initial — vérification documentaire du 4 octobre 2026.
 *
 * Méthode et limites : voir docs/REGLES.md et docs/verification-2026-10/.
 * L'accès direct aux sites *.gouv.fr était bloqué depuis l'environnement de développement :
 * les règles ont été établies à partir d'extraits des pages officielles (moteur de recherche
 * restreint aux domaines officiels), recoupés entre eux. Elles doivent être relues sur les
 * sources avant la mise en production (voir la check-list de mise en ligne).
 */

const VERIFIED_AT = "2026-10-04";
const METHOD =
  "Recherche documentaire du 4 octobre 2026 limitée aux domaines officiels (france-renov.gouv.fr, anah.gouv.fr, economie.gouv.fr, ecologie.gouv.fr, info.gouv.fr, service-public.fr, legifrance.gouv.fr), par extraits recoupés ; lecture directe des pages impossible depuis l'environnement de développement. À confirmer par lecture directe avant mise en production.";

const MPR_REFORM_2026_09 = "depuis le 1er septembre 2026 (décret n° 2026-822 et arrêté du 25 août 2026)";

export const RULESET_2026_10: RuleSet = {
  version: "2026.10-1",
  data: {
    meta: {
      label: "Règles en vigueur au 4 octobre 2026 (après la réforme MaPrimeRénov' du 1er septembre 2026)",
      changelog: "Version initiale.",
    },

    incomeCeilings: {
      year: 2026,
      validFrom: "2026-01-01",
      validUntil: "2026-12-31",
      // [très modestes, modestes, intermédiaires] — plafonds inclusifs (RFR ≤ plafond).
      IDF: {
        bySize: [
          [24031, 29253, 40851],
          [35270, 42933, 60051],
          [42357, 51564, 71846],
          [49455, 60208, 84562],
          [56580, 68877, 96817],
        ],
        extraPerson: [7116, 8663, 12257],
      },
      HORS_IDF: {
        bySize: [
          [17363, 22259, 31185],
          [25393, 32553, 45842],
          [30540, 39148, 55196],
          [35676, 45735, 64550],
          [40835, 52348, 73907],
        ],
        extraPerson: [5151, 6598, 9357],
      },
      rfrNote:
        "Le revenu fiscal de référence (RFR) figure sur l'avis d'impôt sur le revenu ; le dernier avis disponible est retenu lors de la demande.",
      verification: {
        status: "VERIFIED",
        verifiedAt: VERIFIED_AT,
        method: METHOD,
        notes:
          "36 valeurs recoupées (barème France Rénov', guides des aides de l'Anah de février et septembre 2026). Année exacte de revenus retenue à confirmer.",
      },
      sources: [
        { label: "France Rénov' — Barème des plafonds de ressources", url: "https://france-renov.gouv.fr/bareme" },
        {
          label: "Anah — Les aides financières en 2026 (édition septembre 2026)",
          url: "https://www.anah.gouv.fr/sites/default/files/2026-08/202609_guide-aides-financieres_WEB.pdf",
        },
      ],
    },

    dispositifs: {
      MPR_GESTE: {
        enabled: true,
        availability: "OPEN",
        availabilityNote:
          "Guichet rouvert le 23 février 2026 ; aucune suspension ultérieure n'a été identifiée lors de la dernière vérification.",
        verification: {
          status: "PARTIAL",
          verifiedAt: VERIFIED_AT,
          method: METHOD,
          notes: "l'éligibilité des pompes à chaleur hybrides depuis le 1er septembre 2026.",
        },
        sources: [
          { label: "France Rénov' — MaPrimeRénov' par geste", url: "https://france-renov.gouv.fr/aides/mpr" },
          {
            label: "Ministère de l'Économie — MaPrimeRénov' parcours par geste",
            url: "https://www.economie.gouv.fr/particuliers/faire-des-economies-denergie/maprimerenov-parcours-par-geste-la-prime-pour-la-renovation-energetique",
          },
          { label: "Ministère de l'Économie — Ce qui change en septembre 2026", url: "https://www.economie.gouv.fr/actualites/ce-qui-change-en-septembre-2026" },
          { label: "Légifrance — Décret n° 2026-822 du 25 août 2026", url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000054750363" },
          { label: "Légifrance — Arrêté du 25 août 2026", url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054750381" },
          {
            label: "Anah — MaPrimeRénov', le mode d'emploi (septembre 2026)",
            url: "https://www.anah.gouv.fr/sites/default/files/2026-08/202609-MPR-modeEmploi_WEB.pdf",
          },
        ],
        validFrom: "2026-09-01",
        validUntil: "2026-12-31",
        territories: ["IDF", "METRO"],
        minAgeYears: 15,
        eligibleOccupancies: ["PROPRIETAIRE_OCCUPANT", "PROPRIETAIRE_BAILLEUR"],
        reviewOccupancies: ["AUTRE"],
        requiresPrincipalResidence: true,
        eligibleWorks: ["PAC_AIR_EAU", "PAC_GEOTHERMIQUE", "RACCORDEMENT_RESEAU_CHALEUR"],
        excludedWorks: [
          { item: "ISOLATION_COMBLES_TOITURE", reason: `l'isolation n'est plus finançable par MaPrimeRénov' par geste ${MPR_REFORM_2026_09}.` },
          { item: "ISOLATION_MURS", reason: "l'isolation des murs n'est plus finançable par MaPrimeRénov' par geste depuis le 1er janvier 2026." },
          { item: "ISOLATION_PLANCHER_BAS", reason: `l'isolation n'est plus finançable par MaPrimeRénov' par geste ${MPR_REFORM_2026_09}.` },
          { item: "MENUISERIES", reason: `le remplacement des fenêtres n'est plus finançable par MaPrimeRénov' par geste ${MPR_REFORM_2026_09}.` },
          { item: "ISOLATION_INCONNU", reason: `l'isolation n'est plus finançable par MaPrimeRénov' par geste ${MPR_REFORM_2026_09}.` },
          { item: "PAC_AIR_AIR", reason: "les pompes à chaleur air/air ne sont pas finançables par MaPrimeRénov'." },
          { item: "CHAUDIERE_BIOMASSE", reason: "les chaudières bois et biomasse ne sont plus finançables par MaPrimeRénov' par geste depuis le 1er janvier 2026." },
          { item: "POELE_INSERT_BOIS", reason: `les poêles et inserts à bois ne sont plus finançables par MaPrimeRénov' par geste ${MPR_REFORM_2026_09}.` },
          { item: "SYSTEME_SOLAIRE_COMBINE", reason: `le solaire thermique n'est plus finançable par MaPrimeRénov' par geste en métropole ${MPR_REFORM_2026_09}.` },
          { item: "CHAUDIERE_GAZ", reason: "les chaudières au gaz ne font pas partie des travaux finançables par MaPrimeRénov' par geste." },
          { item: "CHAUFFE_EAU_THERMODYNAMIQUE", reason: `les chauffe-eau thermodynamiques ne sont plus finançables par MaPrimeRénov' par geste ${MPR_REFORM_2026_09}.` },
          { item: "CHAUFFE_EAU_SOLAIRE", reason: `le solaire thermique n'est plus finançable par MaPrimeRénov' par geste en métropole ${MPR_REFORM_2026_09}.` },
          { item: "EAU_CHAUDE_INCONNU", reason: `les équipements d'eau chaude sanitaire ne sont plus finançables par MaPrimeRénov' par geste ${MPR_REFORM_2026_09}.` },
          { item: "VMC_DOUBLE_FLUX", reason: `la ventilation n'est plus finançable par MaPrimeRénov' par geste ${MPR_REFORM_2026_09}.` },
          { item: "VMC_SIMPLE_FLUX", reason: "la ventilation simple flux ne fait pas partie des travaux finançables par MaPrimeRénov' par geste." },
          { item: "VENTILATION_INCONNU", reason: `la ventilation n'est plus finançable par MaPrimeRénov' par geste ${MPR_REFORM_2026_09}.` },
        ],
        reviewWorks: [
          { item: "PAC_HYBRIDE", reason: "l'éligibilité des pompes à chaleur hybrides depuis le 1er septembre 2026 n'a pas pu être confirmée." },
        ],
        requiresRge: true,
        worksMustNotHaveStarted: true,
        worksStartedExceptionNote:
          "Une exception existe en cas de panne de chauffage (entre le 1er octobre et le 30 avril) ou d'eau chaude : la demande doit alors être déposée dans les 2 mois suivant l'installation, avec une attestation. Ses modalités actuelles sont à vérifier.",
        quoteMustNotBeSigned: false,
        quoteSignedGraceDays: null,
        conditionsToVerify: [
          "La demande doit être déposée sur le service officiel France Rénov' avant le début des travaux.",
          "Le logement doit être occupé au moins 8 mois par an comme résidence principale.",
          "Le niveau de revenus est contrôlé à partir des avis d'impôt de toutes les personnes du ménage.",
        ],
        occupancyNotes: {
          PROPRIETAIRE_BAILLEUR:
            "Pour un bailleur : engagement de louer le logement comme résidence principale pendant 6 ans, la location devant débuter dans l'année suivant le versement de l'aide.",
          AUTRE:
            "Les usufruitiers et titulaires d'un droit réel d'usage peuvent être éligibles ; les autres situations (nue-propriété, société…) doivent être vérifiées.",
        },
        notes: [
          "Subvention de l'Anah (État). Son montant dépend des revenus du ménage et des travaux : il n'est pas calculé par ce simulateur.",
          "Cumulable avec une prime CEE, dans la limite d'un pourcentage maximal de la dépense éligible qui dépend des revenus.",
        ],
        workNotes: {},
        eligibleIncomeCategories: ["TRES_MODESTE", "MODESTE", "INTERMEDIAIRE"],
        ageExceptions: [
          {
            minAgeYears: 2,
            currentHeating: ["CHAUDIERE_FIOUL"],
            works: ["PAC_AIR_EAU", "PAC_GEOTHERMIQUE", "RACCORDEMENT_RESEAU_CHALEUR"],
            label: "remplacement d'une chaudière au fioul, la prime pour la dépose de la cuve devant alors être demandée en même temps",
          },
        ],
        dpeRestrictions: [],
      },

      MPR_AMPLEUR: {
        enabled: true,
        availability: "OPEN",
        availabilityNote:
          "Guichet rouvert le 23 février 2026 ; aucune suspension ultérieure n'a été identifiée lors de la dernière vérification.",
        verification: {
          status: "PARTIAL",
          verifiedAt: VERIFIED_AT,
          method: METHOD,
          notes:
            "l'accès des propriétaires bailleurs, le caractère obligatoire de l'audit énergétique, les taux et plafonds 2026 et le traitement des appartements au regard de la règle sur le chauffage au gaz ou au fioul.",
        },
        sources: [
          { label: "France Rénov' — MaPrimeRénov' rénovation d'ampleur", url: "https://france-renov.gouv.fr/aides/maprimerenov-renovation-ampleur" },
          {
            label: "Ministère de l'Économie — MaPrimeRénov' rénovation d'ampleur",
            url: "https://www.economie.gouv.fr/particuliers/faire-des-economies-denergie/maprimerenov-renovation-dampleur-tout-savoir-sur-cette-aide",
          },
          { label: "Gouvernement — Réouverture de MaPrimeRénov' pour les rénovations d'ampleur", url: "https://www.info.gouv.fr/actualite/reouverture-de-maprimerenov-pour-les-renovations-d-ampleur" },
          { label: "Ministère de l'Économie — Ce qui change en septembre 2026", url: "https://www.economie.gouv.fr/actualites/ce-qui-change-en-septembre-2026" },
          { label: "Légifrance — Arrêté du 20 février 2026", url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053569113" },
        ],
        validFrom: "2026-09-01",
        validUntil: "2026-12-31",
        territories: ["IDF", "METRO"],
        minAgeYears: 15,
        eligibleOccupancies: ["PROPRIETAIRE_OCCUPANT"],
        reviewOccupancies: ["PROPRIETAIRE_BAILLEUR", "AUTRE"],
        requiresPrincipalResidence: true,
        eligibleWorks: ["RENOVATION_GLOBALE"],
        excludedWorks: [],
        reviewWorks: [],
        requiresRge: true,
        worksMustNotHaveStarted: true,
        worksStartedExceptionNote: null,
        quoteMustNotBeSigned: false,
        quoteSignedGraceDays: null,
        conditionsToVerify: [
          "Accompagnement obligatoire par un Accompagnateur Rénov' agréé et rendez-vous préalable avec un conseiller France Rénov' (attestation).",
          "Le projet doit permettre un gain d'au moins deux classes énergétiques et comprendre au moins deux travaux d'isolation.",
          "Pour une maison, aucun chauffage ni production d'eau chaude au gaz ou au fioul ne peut être conservé ou installé (demandes déposées depuis le 1er septembre 2026).",
          "La demande doit être déposée avant le début des travaux.",
        ],
        occupancyNotes: {
          PROPRIETAIRE_BAILLEUR: "L'accès des propriétaires bailleurs au parcours de rénovation d'ampleur et ses conditions doivent être vérifiés.",
          AUTRE: "Les situations particulières (usufruit, indivision, société…) doivent être vérifiées.",
        },
        notes: [
          "Subvention de l'Anah (État), ouverte à toutes les catégories de revenus depuis le 23 février 2026 avec des taux qui dépendent des revenus : le montant n'est pas calculé par ce simulateur.",
          "Les travaux sur les parties communes d'une copropriété relèvent d'un dispositif distinct (MaPrimeRénov' Copropriété), non évalué ici.",
        ],
        workNotes: {},
        eligibleIncomeCategories: ["TRES_MODESTE", "MODESTE", "INTERMEDIAIRE", "SUPERIEUR"],
        eligibleDpe: ["E", "F", "G"],
        housingTypes: ["MAISON", "APPARTEMENT"],
      },

      CEE: {
        enabled: true,
        availability: "OPEN",
        verification: {
          status: "PARTIAL",
          verifiedAt: VERIFIED_AT,
          method: METHOD,
          notes: "le statut 2026 des fiches relatives aux fenêtres, aux appareils de chauffage au bois, à la ventilation et aux pompes à chaleur hybrides.",
        },
        sources: [
          { label: "France Rénov' — Les aides des fournisseurs d'énergie (CEE)", url: "https://france-renov.gouv.fr/aides/cee" },
          { label: "Ministère de la Transition écologique — Questions-réponses sur le dispositif CEE", url: "https://www.ecologie.gouv.fr/politiques-publiques/questions-reponses-dispositif-cee" },
          { label: "Ministère de la Transition écologique — Coup de pouce Chauffage", url: "https://www.ecologie.gouv.fr/politiques-publiques/coup-pouce-chauffage" },
          {
            label: "Ministère de l'Économie — Bénéficier de la prime Coup de pouce Chauffage",
            url: "https://www.economie.gouv.fr/particuliers/faire-des-economies-denergie/comment-beneficier-de-la-prime-coup-de-pouce-chauffage",
          },
        ],
        validFrom: "2026-01-01",
        validUntil: "2026-12-31",
        territories: ["IDF", "METRO"],
        minAgeYears: 2,
        eligibleOccupancies: ["PROPRIETAIRE_OCCUPANT", "PROPRIETAIRE_BAILLEUR", "LOCATAIRE"],
        reviewOccupancies: ["AUTRE"],
        requiresPrincipalResidence: false,
        secondaryResidence: "ELIGIBLE",
        eligibleWorks: [
          "ISOLATION_COMBLES_TOITURE",
          "ISOLATION_MURS",
          "ISOLATION_PLANCHER_BAS",
          "PAC_AIR_EAU",
          "PAC_GEOTHERMIQUE",
          "PAC_AIR_AIR",
          "CHAUDIERE_BIOMASSE",
          "RACCORDEMENT_RESEAU_CHALEUR",
          "SYSTEME_SOLAIRE_COMBINE",
          "CHAUFFE_EAU_THERMODYNAMIQUE",
          "CHAUFFE_EAU_SOLAIRE",
        ],
        excludedWorks: [
          { item: "CHAUDIERE_GAZ", reason: "les chaudières au gaz ne sont plus éligibles aux primes CEE (fiche abrogée au 1er janvier 2024)." },
        ],
        reviewWorks: [
          { item: "MENUISERIES", reason: "le statut 2026 de l'opération relative aux fenêtres n'a pas pu être confirmé." },
          { item: "POELE_INSERT_BOIS", reason: "le statut 2026 de l'opération relative aux appareils de chauffage au bois n'a pas pu être confirmé." },
          { item: "VMC_DOUBLE_FLUX", reason: "le statut 2026 de l'opération relative à la ventilation double flux n'a pas pu être confirmé." },
          { item: "VMC_SIMPLE_FLUX", reason: "le statut 2026 de l'opération relative à la ventilation simple flux n'a pas pu être confirmé." },
          { item: "VENTILATION_INCONNU", reason: "le statut 2026 des opérations de ventilation n'a pas pu être confirmé." },
          { item: "PAC_HYBRIDE", reason: "le statut 2026 des pompes à chaleur hybrides n'a pas pu être confirmé." },
          {
            item: "RENOVATION_GLOBALE",
            reason:
              "les opérations de rénovation d'ampleur obéissent à des conditions spécifiques (classe E, F ou G avant travaux, et depuis le 1er septembre 2026 chauffage et eau chaude décarbonés après travaux).",
          },
        ],
        requiresRge: true,
        worksMustNotHaveStarted: true,
        worksStartedExceptionNote: null,
        quoteMustNotBeSigned: true,
        quoteSignedGraceDays: 14,
        conditionsToVerify: [
          "L'offre de prime doit être acceptée avant la signature du devis, ou pour un particulier au plus tard 14 jours après la signature et avant le début des travaux.",
          "Les équipements et matériaux doivent respecter les exigences techniques de l'opération concernée (fiche d'opération standardisée).",
        ],
        occupancyNotes: {
          LOCATAIRE: "Un locataire peut bénéficier d'une prime CEE pour des travaux qu'il finance.",
          AUTRE: "Les situations particulières doivent être vérifiées.",
        },
        notes: [
          "Prime versée par un fournisseur d'énergie (ou son partenaire) dans le cadre du dispositif des certificats d'économies d'énergie encadré par l'État : ce n'est pas une subvention budgétaire de l'État et son montant dépend de l'offre de chaque acteur.",
        ],
        workNotes: {},
        coupDePouceChauffage: {
          enabled: true,
          validUntil: "2030-12-31",
          requiresPrincipalResidence: true,
          replacedHeating: ["CHAUDIERE_FIOUL", "CHAUDIERE_GAZ", "CHAUDIERE_CHARBON"],
          gasBoilerMustBeNonCondensing: false,
          eligibleTargets: ["PAC_AIR_EAU", "PAC_GEOTHERMIQUE", "CHAUDIERE_BIOMASSE", "SYSTEME_SOLAIRE_COMBINE", "RACCORDEMENT_RESEAU_CHALEUR"],
          note: "Depuis le 1er septembre 2026, une pompe à chaleur doit figurer sur la liste des modèles approuvés pour la bonification. Le cas des chaudières gaz à condensation n'a pas pu être confirmé.",
          sources: [
            { label: "Ministère de la Transition écologique — Coup de pouce Chauffage", url: "https://www.ecologie.gouv.fr/politiques-publiques/coup-pouce-chauffage" },
            { label: "Légifrance — Arrêté du 29 mai 2026", url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054152008" },
          ],
        },
        temporaryBonuses: [],
      },

      ECO_PTZ: {
        enabled: true,
        availability: "OPEN",
        verification: {
          status: "PARTIAL",
          verifiedAt: VERIFIED_AT,
          method: METHOD,
          notes: "la date de fin du dispositif, la liste complète des travaux, le calendrier de la demande et la disponibilité en outre-mer.",
        },
        sources: [
          { label: "France Rénov' — Éco-prêt à taux zéro", url: "https://france-renov.gouv.fr/aides/eco-pret-taux-zero" },
          { label: "Ministère de la Transition écologique — Éco-PTZ", url: "https://www.ecologie.gouv.fr/politiques-publiques/eco-pret-taux-zero-eco-ptz" },
          {
            label: "Ministère de l'Économie — L'éco-prêt à taux zéro : pouvez-vous en bénéficier ?",
            url: "https://www.economie.gouv.fr/particuliers/emprunter-et-sassurer/leco-pret-taux-zero-eco-ptz-pouvez-vous-en-beneficier",
          },
        ],
        validFrom: "2026-01-01",
        validUntil: "2026-12-31",
        territories: ["IDF", "METRO"],
        minAgeYears: 2,
        eligibleOccupancies: ["PROPRIETAIRE_OCCUPANT", "PROPRIETAIRE_BAILLEUR"],
        reviewOccupancies: ["AUTRE"],
        requiresPrincipalResidence: true,
        eligibleWorks: [
          "ISOLATION_COMBLES_TOITURE",
          "ISOLATION_MURS",
          "MENUISERIES",
          "PAC_AIR_EAU",
          "PAC_GEOTHERMIQUE",
          "CHAUDIERE_BIOMASSE",
          "POELE_INSERT_BOIS",
          "SYSTEME_SOLAIRE_COMBINE",
          "CHAUFFE_EAU_THERMODYNAMIQUE",
          "CHAUFFE_EAU_SOLAIRE",
          "RENOVATION_GLOBALE",
        ],
        excludedWorks: [],
        reviewWorks: [
          { item: "ISOLATION_PLANCHER_BAS", reason: "la prise en charge de ce type de travaux par l'éco-PTZ n'a pas pu être confirmée." },
          { item: "PAC_AIR_AIR", reason: "la prise en charge de ce type de travaux par l'éco-PTZ n'a pas pu être confirmée." },
          { item: "PAC_HYBRIDE", reason: "la prise en charge de ce type de travaux par l'éco-PTZ n'a pas pu être confirmée." },
          { item: "CHAUDIERE_GAZ", reason: "la prise en charge de ce type de travaux par l'éco-PTZ n'a pas pu être confirmée." },
          { item: "RACCORDEMENT_RESEAU_CHALEUR", reason: "la prise en charge de ce type de travaux par l'éco-PTZ n'a pas pu être confirmée." },
        ],
        requiresRge: true,
        worksMustNotHaveStarted: false,
        worksStartedExceptionNote: null,
        quoteMustNotBeSigned: false,
        quoteSignedGraceDays: null,
        conditionsToVerify: [
          "Prêt accordé par une banque ayant signé une convention avec l'État, sous réserve de l'étude du dossier (capacité de remboursement).",
          "Le calendrier de la demande (devis, offre de prêt, délai de réalisation) est à vérifier auprès de la banque.",
          "Les équipements et matériaux doivent respecter les critères de performance exigés.",
          "Pour une rénovation « performance énergétique globale » d'une maison, le projet doit comprendre la décarbonation du chauffage et de l'eau chaude (offres émises depuis le 1er septembre 2026).",
        ],
        occupancyNotes: {
          PROPRIETAIRE_BAILLEUR: "Pour un bailleur : le logement doit être loué, ou mis à disposition gratuitement, comme résidence principale.",
          AUTRE: "Certaines sociétés civiles peuvent emprunter ; les autres situations doivent être vérifiées.",
        },
        notes: [
          "Prêt sans intérêts (les intérêts sont pris en charge par l'État), sans condition de ressources. Ce n'est pas une subvention : il doit être remboursé.",
        ],
        workNotes: {},
      },
    },

    notices: [
      "Les aides des collectivités locales (région, département, commune…) ne sont pas évaluées par ce simulateur.",
      "MaPrimeRénov' Copropriété (travaux sur les parties communes) n'est pas évalué par ce simulateur.",
      "Les règles des aides évoluent régulièrement : ce résultat repose sur les règles enregistrées à la date indiquée.",
    ],
  },
};
