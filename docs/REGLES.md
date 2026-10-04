# Règles de pré-éligibilité, sources et vérification

Barème embarqué : **`2026.10-2`**, « Règles en vigueur au 4 octobre 2026 (réforme du 1er septembre 2026, bonifications CEE temporaires) ». Moteur : **1.2.0**.

`2026.10-2` complète `2026.10-1` (fichier `src/engine/rulesets/2026-10-2.ts`, écrit comme un différentiel) :

- bonification temporaire des primes CEE pour les chauffe-eau thermodynamiques et solaires, pour un devis signé du 1er septembre au 31 décembre 2026 (arrêté du 25 août 2026, connu par la consultation publique officielle et la presse spécialisée) : affichée sans montant ni coefficient, seulement pendant sa période ;
- dépose d'une cuve à fioul : question complémentaire posée quand le chauffage actuel au fioul est remplacé, couverte par MaPrimeRénov' par geste, y compris avec la dérogation d'ancienneté ;
- rappel que les primes CEE n'ont pas de condition de revenus.

**Déploiement d'une nouvelle version embarquée** (`syncEmbeddedRuleSet`, exécuté par `npm run db:seed` et à chaque build de production Vercel) :

- aucune version publiée : la version embarquée est publiée ;
- la version publiée est une version embarquée plus ancienne, publiée automatiquement, et **aucune relecture humaine des règles n'est enregistrée** (Paramètres → check-list) : elle est remplacée, avec une note de publication qui rappelle la relecture à faire ;
- sinon, la nouvelle version arrive comme **brouillon** à prévisualiser puis publier ; le tableau de bord le signale.

## Variante « test d'éligibilité seul » (moteur 1.2.0)

Par défaut, le questionnaire porte sur le logement **et le projet** : équipement actuel, travaux souhaités. Une variante sans question sur le projet peut être choisie dans Paramètres → « Qualification des demandes » → type de test. Ses réponses portent `scope: "PROFILE"`.

- **Questions posées** : localisation, type de logement, statut d'occupation, résidence, ancienneté, devis signé (et depuis quand si le délai de grâce CEE s'applique), travaux commencés, puis taille du foyer et tranche de revenus lorsqu'ils peuvent changer le résultat.
- **Évaluation** : chaque dispositif est évalué pour **l'ensemble des travaux qu'il couvre**. La question posée devient « ce foyer peut-il être aidé par ce dispositif ? ». Les conditions personnelles restent appliquées telles quelles : statut, résidence, revenus, ancienneté, devis et travaux commencés.
- **Ce qui reste à vérifier avec la personne** : les travaux envisagés, et les critères qui dépendent du projet. Exemple : un logement de 2 à 15 ans n'est possible pour MaPrimeRénov' par geste que par la dérogation « remplacement d'une chaudière fioul ». En mode test seul, le critère est donc « à vérifier », et non « rempli » ou « non rempli ».
- **Messages** : « Vous êtes potentiellement éligible aux aides à la rénovation », « Votre éligibilité doit être vérifiée », critères non remplis ou hors périmètre. Aucun nom d'aide ni montant n'est affiché au visiteur.
- **Qualification** : dans l'administration, les critères de chaque aide servent de liste à confirmer avant tout rendez-vous. Les critères « territoire » et « entreprise RGE » sont exclus de cette liste, car ils ne dépendent pas de la personne.

## Méthode de vérification (et ses limites)

La vérification a eu lieu le **4 octobre 2026**.

- **Accès direct impossible.** La politique réseau de l'environnement de développement bloquait france-renov.gouv.fr, anah.gouv.fr, service-public.fr, economie.gouv.fr, ecologie.gouv.fr et legifrance.gouv.fr.
- **Méthode retenue.** Les règles ont été établies à partir d'**extraits des pages officielles** obtenus par un moteur de recherche restreint à ces domaines. Chaque valeur a été recoupée sur au moins deux extraits ou pages.
- **Contrôle de structure.** Le code public du simulateur de l'Anah a aussi été consulté pour vérifier la structure des règles (comparaisons, liste des travaux en janvier 2026).
- **Notes brutes.** Elles figurent dans [`docs/verification-2026-10/`](verification-2026-10/), avec l'URL, la date, l'extrait et le niveau de confiance de chaque point.

Conséquences dans le moteur :

- **les points non confirmés ne sont jamais présentés comme acquis**. Ils donnent « à vérifier », ou sont listés comme « point non confirmé » ;
- tous les dispositifs ont une validité qui **expire le 31 décembre 2026** (les plafonds de ressources sont révisés au 1er janvier). Passé cette date, les conclusions sont automatiquement désactivées jusqu'à la publication d'un barème revérifié ;
- la check-list de mise en ligne demande une **relecture humaine directe des sources** (Paramètres → « Relecture humaine des règles »).

## Dispositifs évalués

| Dispositif | Nature | Vérification | Territoires |
|---|---|---|---|
| MaPrimeRénov' par geste | Subvention (Anah, État) | Partielle | Île-de-France, métropole |
| MaPrimeRénov' rénovation d'ampleur | Subvention (Anah, État) | Partielle | Île-de-France, métropole |
| Primes CEE (avec Coup de pouce Chauffage) | Prime (fournisseurs d'énergie, dispositif encadré par l'État) | Partielle | Île-de-France, métropole |
| Éco-prêt à taux zéro | Prêt (banques conventionnées) | Partielle | Île-de-France, métropole |

Hors périmètre, indiqué comme tel et jamais comme « inéligible » :

- outre-mer (DROM) et collectivités d'outre-mer ;
- logements hors de France ;
- aides locales ;
- MaPrimeRénov' Copropriété ;
- projets « autres ».

### MaPrimeRénov' par geste (depuis le 1er septembre 2026)

- **Bases** : décret n° 2026-822 et arrêté du 25 août 2026 (JORF du 27 août 2026). Sources : France Rénov', economie.gouv.fr « Ce qui change en septembre 2026 », guide et mode d'emploi de l'Anah (septembre 2026).
- **Travaux couverts** : pompe à chaleur air/eau ; pompe à chaleur géothermique ; raccordement à un réseau de chaleur ; dépose d'une cuve à fioul (depuis `2026.10-2`, demandée en même temps que le nouvel équipement de chauffage). L'audit énergétique (avec un autre geste) n'est pas proposé séparément dans le questionnaire.
- **Travaux exclus** (raison affichée) :
  - toute l'isolation (les murs depuis le 1er janvier 2026, le reste depuis le 1er septembre 2026) ;
  - la ventilation ;
  - le bois et la biomasse ;
  - le chauffe-eau thermodynamique ;
  - le solaire thermique en métropole ;
  - la pompe à chaleur air/air et la chaudière gaz.
- **À vérifier** : pompe à chaleur hybride.
- **Conditions** :
  - propriétaire occupant ou bailleur ; les autres situations (usufruit…) sont à vérifier, les locataires sont exclus ;
  - résidence principale (8 mois par an), ou logement loué comme résidence principale ;
  - revenus très modestes, modestes ou intermédiaires (les revenus supérieurs sont exclus) ;
  - logement **achevé depuis au moins 15 ans**, ou **2 ans** en cas de remplacement d'une chaudière fioul ;
  - entreprise RGE ;
  - demande **avant le début des travaux**. Une exception « panne » est signalée et donne « à vérifier » si les travaux ont commencé. La signature préalable du devis n'est pas bloquante.
- **Guichet** : rouvert le 23 février 2026 ; aucune suspension ultérieure n'a été trouvée (confiance moyenne).

### MaPrimeRénov' rénovation d'ampleur

- **Conditions vérifiées** :
  - toutes catégories de revenus depuis le 23 février 2026 ; la question des revenus n'est donc pas posée ;
  - DPE **E, F ou G** ;
  - logement de 15 ans ou plus ;
  - résidence principale ;
  - propriétaire occupant.
- **À vérifier** : propriétaires bailleurs et autres situations.
- **Conditions rappelées au visiteur** :
  - Accompagnateur Rénov' et rendez-vous France Rénov' obligatoires ;
  - gain de 2 classes et 2 travaux d'isolation ;
  - pour une maison : ni gaz ni fioul conservés ou installés (depuis le 1er septembre 2026).

### Primes CEE

- **Conditions générales** :
  - logement de plus de 2 ans ;
  - propriétaire, bailleur ou locataire ;
  - résidence principale ou secondaire ;
  - entreprise RGE ;
  - travaux non commencés.
- **Rôle incitatif** : l'offre doit être acceptée **avant la signature du devis**. Pour un particulier, elle peut l'être au plus tard **14 jours après la signature**, et avant le début des travaux.
- **Questions et résultats sur le devis** :
  - le simulateur demande si le devis a été signé, puis depuis combien de temps ;
  - devis signé depuis 14 jours ou moins → « à vérifier » (démarche urgente) ;
  - devis signé depuis plus de 14 jours → critère non rempli.
- **Travaux couverts** :
  - isolation des combles et toitures, des murs et des planchers bas ;
  - pompes à chaleur air/eau, géothermique et air/air ;
  - chaudière biomasse ;
  - réseau de chaleur ;
  - système solaire combiné ;
  - chauffe-eau thermodynamique et solaire.
- **Travaux exclus** : chaudière gaz (fiche abrogée au 1er janvier 2024).
- **À vérifier** (statut 2026 de la fiche non confirmé) :
  - fenêtres ;
  - poêles et inserts ;
  - VMC ;
  - pompe à chaleur hybride ;
  - rénovation d'ampleur (BAR-TH-174 et 175).
- **Bonification temporaire** (`2026.10-2`) : chauffe-eau thermodynamique et chauffe-eau solaire, pour un devis signé du 1er septembre au 31 décembre 2026, si le chauffage et l'eau chaude ne reposent plus sur une énergie fossile après travaux. Elle est mise en avant dans le résultat et sur l'accueil pendant sa période, sans montant (celui-ci dépend de chaque fournisseur). Points à relire sur Légifrance : liste exacte des fiches (BAR-TH-101, BAR-TH-148, BAR-TH-162, BAR-TH-168, modification de BAR-TH-143) et conditions de décarbonation.
- **Coup de pouce Chauffage**, jusqu'au 31 décembre 2030 :
  - remplacement d'une chaudière fioul, gaz ou charbon par une pompe à chaleur air/eau ou géothermique, une chaudière biomasse, un système solaire combiné ou un réseau de chaleur ;
  - en résidence principale ;
  - depuis le 1er septembre 2026, la pompe à chaleur doit figurer sur la liste des modèles approuvés ;
  - le montant n'est **pas** réglementé : il dépend de chaque signataire et n'est donc jamais affiché.

### Éco-PTZ

- **Conditions vérifiées (confiance moyenne)** :
  - sans condition de ressources ;
  - logement de 2 ans ou plus ;
  - résidence principale ;
  - propriétaire occupant, ou bailleur louant le logement comme résidence principale ;
  - entreprise RGE.
- **Non confirmé** (« point non confirmé ») :
  - date de fin du dispositif ;
  - liste complète des travaux ;
  - calendrier de la demande ;
  - outre-mer.
- **À vérifier** : plancher bas, pompe à chaleur air/air, pompe à chaleur hybride, chaudière gaz, réseau de chaleur.

### Plafonds de ressources 2026

Le plafond est inclus : un revenu fiscal de référence égal au plafond relève de la catégorie.

| Personnes | IdF très modestes | IdF modestes | IdF intermédiaires | Hors IdF très modestes | Hors IdF modestes | Hors IdF intermédiaires |
|---|---|---|---|---|---|---|
| 1 | 24 031 | 29 253 | 40 851 | 17 363 | 22 259 | 31 185 |
| 2 | 35 270 | 42 933 | 60 051 | 25 393 | 32 553 | 45 842 |
| 3 | 42 357 | 51 564 | 71 846 | 30 540 | 39 148 | 55 196 |
| 4 | 49 455 | 60 208 | 84 562 | 35 676 | 45 735 | 64 550 |
| 5 | 56 580 | 68 877 | 96 817 | 40 835 | 52 348 | 73 907 |
| + par personne | 7 116 | 8 663 | 12 257 | 5 151 | 6 598 | 9 357 |

Au-delà du plafond « intermédiaires », la catégorie est « supérieurs ».

**Point ouvert** : l'année exacte de revenus retenue. Le simulateur indique « le dernier avis d'impôt disponible ».

## Faire évoluer les règles

1. **Administration → Barèmes & règles → Créer un brouillon.** Le brouillon copie la version publiée.
2. Modifier :
   - les plafonds (formulaire) ;
   - l'état des dispositifs (ouverture, vérification, dates) ;
   - ou le JSON complet (travaux couverts, exclus ou à vérifier, conditions, sources).

   Le contenu est validé par schéma à chaque enregistrement.
3. Contrôler la **prévisualisation** : les 9 scénarios de référence sont comparés à la version publiée, chaque différence est surlignée.
4. **Publier.** Il faut confirmer avoir vérifié les sources et rédiger une note de publication. L'ancienne version est archivée, jamais modifiée.
5. Si une règle ne peut plus être confirmée : passer la vérification du dispositif à « Non vérifiée ». Ses conclusions sont alors **désactivées** et le visiteur voit « vérification nécessaire » avec la raison.

Toute évolution de la **logique** (et non des seuils) passe par le code (`src/engine`), avec une nouvelle `ENGINE_VERSION` et des tests.

## Tests du moteur

`npm test` exécute :

- les cas éligible, non éligible, incomplet et hors périmètre ;
- les **valeurs exactement aux seuils** : plafonds de revenus aux bornes pour 1 à 10 personnes et les deux zones, année charnière d'ancienneté, 31 décembre ;
- la dérogation fioul et le délai de grâce CEE ;
- l'expiration du barème, la règle non vérifiée et le guichet suspendu ;
- le déterminisme ;
- la minimisation du questionnaire (questions masquées et réponses élaguées) ;
- le test d'éligibilité seul : questions posées, élagage, évaluation par aide, conditions réelles maintenues, outre-mer.
