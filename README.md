# ProspectEner — pré-éligibilité aux aides à la rénovation énergétique

Site de conversion **transparent** pour une entreprise privée de rénovation énergétique, relié à un **panel d'administration sécurisé** :

**Accueil → Questionnaire → Résultat, puis formulaire de rappel juste en dessous (personnes potentiellement éligibles) → « Vous allez être recontacté(e) » → Fiche dans l'administration → Qualification par un conseiller → Rendez-vous.**

> Service privé indépendant, non affilié à l'État, à l'Anah ou à France Rénov'. Le simulateur donne une **pré-éligibilité indicative**, ne calcule aucun montant et ne dépose aucun dossier auprès d'un organisme public.

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Architecture](#architecture)
- [Installation locale](#installation-locale)
- [Premier administrateur](#premier-administrateur)
- [Tests](#tests)
- [Mise en ligne](#mise-en-ligne)
- Documentation détaillée : [règles et sources](docs/REGLES.md) · [conformité](docs/CONFORMITE.md) · [déploiement](docs/DEPLOIEMENT.md)

## Fonctionnalités

### Site public

- **Design sombre et épuré** sur tout le site public (l'administration reste en clair) : peu de texte par écran, un seul appel à l'action, les informations légales regroupées dans le pied de page et les pages dédiées.
- **Bandeau cookies au premier passage**, conforme aux recommandations de la CNIL :
  - en haut de page, dans le flux : il ne recouvre jamais le contenu ni la mention France Rénov' ;
  - « Refuser » et « Accepter » au même niveau, sans bloquer la navigation, avec un lien « Personnaliser » vers la page Cookies et préférences, où le choix se modifie à tout moment ;
  - seul traceur facultatif : l'origine de la visite (paramètres de campagne, page d'arrivée, site d'origine), lue et conservée pour la session **uniquement après accord** ;
  - choix conservé 6 mois dans un cookie propre au site, sans identifiant, puis redemandé ; le serveur le lit, donc la page arrive directement avec ou sans bandeau. Aucun pixel publicitaire, aucun cookie tiers.
- **Page d'accueil épurée** : maison 3D procédurale (React Three Fiber, aucun fichier externe), un seul appel à l'action, positionnement transparent, mention obligatoire France Rénov' (art. L122-26 du Code de la consommation), trois étapes, types de travaux, aides évaluées et questions fréquentes.
- **Guide des aides** (`/aides`), une page par aide (`/aides/…`) et par type de travaux (`/travaux/…`), avec l'explorateur 3D « travaux → dispositifs ». Tout leur contenu est **généré à partir du barème publié** : bénéficiaires, travaux couverts ou non (avec la raison), démarches, bonifications datées, sources officielles. Rien n'est écrit en dur ; si le barème change, les pages suivent.
- **Référencement** :
  - titre, description et adresse canonique propres à chaque page ;
  - image de partage générée (Open Graph) et icône Apple ;
  - `sitemap.xml` et `robots.txt` dynamiques ;
  - données structurées schema.org : `WebSite`, `FAQPage`, `BreadcrumbList`, et `Organization` seulement avec l'identité réellement renseignée ;
  - une seule balise `h1` par page ;
  - scène 3D chargée à l'approche de l'écran quand elle est en bas de page.
  - Tant que la check-list de mise en ligne n'est pas complète, les pages restent en `noindex` et le plan du site est vide.
- **Questionnaire progressif** (une question par écran), dans l'ordre d'un conseiller :
  1. **Logement** : code postal, maison ou appartement ;
  2. **Foyer** : nombre de personnes et tranche de revenu fiscal de référence, avec des aides « Qui compter dans le foyer ? » et « Où trouver le revenu fiscal de référence ? » (schéma simplifié de l'avis, sans valeur officielle). Chaque tranche affiche sa catégorie (profil bleu, jaune, violet ou rose). Aucun avis d'impôt ni numéro fiscal n'est demandé ;
  3. **Projet** : ce que la personne veut changer ;
  4. **Installation actuelle** (projets de chauffage) : chauffage actuel, diffusion de la chaleur (radiateurs à eau en fonte ou en acier, plancher chauffant, radiateurs électriques…), nombre de radiateurs à eau, surface chauffée, emplacement de la chaudière ;
  5. **Situation** : propriétaire ou locataire, usage, date de construction ;
  6. **Avancement** : devis, travaux commencés, aides déjà obtenues, entreprise.
  - Les questions restent conditionnelles : le nombre de radiateurs n'est demandé que pour des radiateurs à eau, l'emplacement de la chaudière seulement s'il y en a une.
  - Les questions d'installation servent à orienter la demande vers la bonne entreprise : elles ne changent jamais le résultat des aides.
  - Variante « test d'éligibilité seul », sans question sur le projet, au choix dans Paramètres : chaque aide est alors évaluée pour l'ensemble des travaux qu'elle couvre, et le projet est précisé avec un conseiller.
  - La progression est réelle et recalculée.
  - Retour en arrière sans perte, y compris avec le bouton « précédent » du navigateur et après rechargement (stockage de session).
  - Validation au fil de la saisie, aides contextuelles, réponse « Je ne sais pas » partout.
  - Tranches de revenu calculées selon la taille du foyer et la zone (Île-de-France / autres régions), plafonds 2026.
  - Catégories de revenus qui ouvrent une demande de rendez-vous réglables (bleu et jaune par défaut ; « je ne sais pas » toujours accepté). Pour les autres, le test continue et donne le vrai résultat, sans formulaire de rappel, avec un renvoi vers France Rénov'.
  - Communes issues du jeu de données officiel Etalab, embarqué : aucun appel externe.
- **Résultat avant coordonnées**, sous forme de verdict simple :
  - « Votre projet est potentiellement éligible », vérification complémentaire nécessaire, critères non remplis ou hors périmètre — toujours le vrai résultat du moteur ;
  - nombre d'aides qui peuvent correspondre, sans les nommer (le détail est présenté lors de l'étude) ;
  - bonification temporaire en cours le cas échéant, points bloquants en cas de résultat défavorable ;
  - mentions d'indépendance, de résultat indicatif et France Rénov' ;
  - réponses ayant conduit au résultat, repliées, chacune modifiable ;
  - **formulaire de rappel affiché directement sous le verdict** (prénom, nom, canal, téléphone ou e-mail), sans obligation de le remplir pour voir le résultat, **seulement pour les résultats retenus** (par défaut : potentiellement éligible ou à vérifier). Sinon, le visiteur lit « Nous ne pouvons pas vous proposer de rendez-vous », avec les points bloquants : aucune fiche n'est créée, et le serveur refuse aussi la demande (`OUTCOME_NOT_ACCEPTED`).
- **Synthèse d'éligibilité dans l'administration**, pour chaque demande :
  - aides potentiellement éligibles, à vérifier, non éligibles ou hors périmètre, avec travaux couverts et raison principale ;
  - détail complet par dispositif (critères, conditions, sources, dates de validité), date de référence et versions du barème et du moteur ;
  - aides repérées dans la liste des demandes et dans l'export CSV.
- **Demande de contact explicite**.
  - Phrase générée « Je demande à être contacté(e) par [entreprise], par [canal], au sujet de mon projet de [travaux] », avec une case jamais pré-cochée, décochée si la phrase change.
  - En mise en relation, si une entreprise partenaire active correspond aux réponses, la phrase la nomme avant l'envoi : « Je demande à être contacté(e) par [éditeur] et par l'entreprise partenaire [entreprise], par [canal], au sujet de mon projet de [travaux]. » Le choix est fait dans le navigateur et refait par le serveur (`PARTNER_CHANGED` si l'entreprise ou son nom affichés ne sont plus les bons). La demande peut alors être transmise à cette seule entreprise, depuis sa fiche (« Je transmets ces N demandes à … », réservé aux administrateurs) : seulement les demandes ouvertes, sans opposition et encore dans le délai de rappel. Date de transmission enregistrée ; fichier CSV avec une colonne « Conditions d'usage ».
  - Si la personne annule, s'oppose ou demande l'effacement d'une demande déjà transmise, la fiche affiche une alerte « entreprise à informer » jusqu'à ce que l'équipe confirme l'avoir fait, et une notification interne est envoyée.
  - Information RGPD courte sous le formulaire (qui utilise les données, pourquoi, durée maximale, droits), avec un lien vers la politique de confidentialité. L'identité complète de l'entreprise figure dans les mentions légales et le pied de page, pas dans le formulaire.
  - Champs facultatifs : adresse du logement (visite technique) et, avec le rappel téléphonique, une adresse e-mail.
  - Pas de newsletter. En mise en relation, la notice annonce la transmission à une seule entreprise partenaire, nommée avant, et la rémunération de ces mises en relation.
- **Parcours « rappel rapide »** sans questionnaire : **désactivé par défaut**, puisqu'il produit des demandes non qualifiées. `/rappel` renvoie alors vers le test, et le serveur refuse ce type de demande (`QUICK_CALLBACK_CLOSED`).
- **Confirmation** « Merci, vous allez être recontacté(e) », avec le délai de rappel. Elle précise qu'aucun dossier n'est déposé et fournit une référence et un lien d'annulation personnel.
- **Annulation** par le visiteur, avec effacement immédiat des coordonnées et opposition en option.
- Pages mentions légales, confidentialité, cookies et préférences, contact, méthode et sources. Les informations manquantes sont signalées, jamais inventées.

### Moteur de pré-éligibilité (`src/engine`)

- TypeScript pur, **déterministe**, séparé de l'interface et de la base. Il évalue séparément :
  - MaPrimeRénov' par geste ;
  - MaPrimeRénov' rénovation d'ampleur ;
  - les primes CEE (avec la bonification Coup de pouce Chauffage) ;
  - l'éco-PTZ.
- Trois conclusions par dispositif, plus « hors périmètre » et « non concerné » :
  - potentiellement éligible ;
  - critères non remplis selon les réponses ;
  - vérification nécessaire.
- **Barèmes versionnés en base** : brouillon, prévisualisation sur 9 scénarios de référence, publication validée. Les versions publiées sont immuables et chaque demande conserve la version du barème et du moteur utilisée.
- **Désactivation des conclusions** :
  - règle non vérifiable (`UNVERIFIED`) ;
  - barème expiré ;
  - guichet suspendu ou non confirmé.
- Seuils datés traités au jour près. L'année charnière d'ancienneté donne « à vérifier ». Les plafonds de revenus sont inclusifs et testés exactement aux bornes.

### Administration (`/admin`)

- **Authentification** :
  - mot de passe haché avec scrypt (paramètres OWASP) ;
  - **double authentification TOTP obligatoire pour les administrateurs** (et par défaut pour les collaborateurs), avec codes de récupération ;
  - sessions en base avec jeton haché, expiration d'inactivité (30 min) et absolue (12 h), rotation après le second facteur ;
  - verrouillage du compte après 10 échecs, mot de passe et second facteur confondus : se reconnecter ne remet pas le compteur à zéro. Plafond de 8 codes par 10 minutes et de 30 par jour. Si c'est le second facteur qui échoue, toutes les sessions du compte sont fermées ;
  - mots de passe d'au moins 12 caractères, sans mot de passe courant même déguisé (« P@ssw0rd2026! »). Les mots de passe présents dans des fuites publiques sont refusés (Have I Been Pwned par k-anonymat : seuls 5 caractères de l'empreinte SHA-1 sont transmis) ;
  - déconnexion automatique après 30 minutes sans activité, tous onglets confondus, avec un avertissement une minute avant ;
  - comptes activés par lien à usage unique : aucun mot de passe transmis.
- **Rôles** : administrateur, ou collaborateur qui ne voit que les demandes qui lui sont assignées et, selon le paramétrage, les demandes non assignées. Contrôles **côté serveur** sur chaque page, action et route.
- **Nouvelles demandes signalées sur chaque page** : leur nombre s'affiche à côté de « Demandes » dans le menu (dans le périmètre de chaque collaborateur). Les notifications par e-mail ou webhook complètent ce signal.
- **Tableau de bord** :
  - nouvelles demandes et demandes à traiter ;
  - rappels proches de l'échéance et délais dépassés ;
  - répartition par travaux, territoire, résultat et statut ;
  - parcours agrégé ;
  - alertes : check-list de mise en ligne, notifications en échec, barème proche de l'expiration ;
  - **encart sécurité** (administrateurs) : échecs de connexion et de second facteur, verrouillages, accès refusés sur 7 jours, sessions ouvertes, comptes sans double authentification.
- **Liste des demandes** : recherche, filtres (statut, résultat, travaux, **catégorie de revenus**, **entreprise partenaire**, canal, assignation, échéance, dates), tri et pagination. Chaque ligne affiche la pastille de revenus (bleu, jaune, violet, rose) et l'essentiel de l'installation ; filtrée par partenaire, elle indique « Correspond » ou « À vérifier ».
- **Entreprises partenaires** (`/admin/partenaires`) :
  - une fiche par entreprise, avec les demandes qui l'intéressent : travaux, catégories de revenus, maison ou appartement, statut, chauffage actuel, diffusion de la chaleur, surface chauffée minimale, ancienneté du logement, départements ;
  - modèle prêt à l'emploi « pompe à chaleur air/eau » : maison, chauffage gaz, fioul ou bois, radiateurs à eau en fonte ou en acier, au moins 80 m² chauffés, plus de 2 ans, profils bleu et jaune ;
  - nombre de demandes correspondantes (dont nouvelles) et lien vers la liste filtrée ;
  - export CSV des seuls rendez-vous **transmis avec l'accord de la personne**, au format de la fiche demandée par l'entreprise ;
  - les critères servent uniquement au tri : ils ne changent jamais le résultat affiché au visiteur.
- **Qualification et rendez-vous** (sur chaque fiche) :
  - liste des critères de chaque aide, tirée du résultat du moteur : le conseiller les confirme un à un avec la personne (les points « à vérifier » sont signalés) ;
  - **un rendez-vous ne peut être fixé que si tous les critères d'au moins une aide sont confirmés**, contrôle refait côté serveur ;
  - date et heure (heure de Paris), mode (à domicile, en visio, par téléphone) et précisions sur le projet ;
  - statut « Rendez-vous fixé » posé uniquement par cette action, avec les aides qualifiées, l'auteur et la date ; annulation possible ;
  - bouton « Non éligible après vérification » qui clôture la demande sans rendez-vous ;
  - **mise en relation** (si elle est déclarée dans Paramètres → Activité) :
    - le rendez-vous peut être confié à une entreprise partenaire, avec l'accord de la personne, coché obligatoirement et contrôlé côté serveur ;
    - un récapitulatif à copier pour l'entreprise : la fiche de la demande (coordonnées, installation, logement, catégorie de revenus déclarative) et le rendez-vous, sans commentaire ni note interne ;
    - l'entreprise est choisie parmi les partenaires actifs, et celles qui correspondent à la demande sont signalées ;
    - la première transmission est tracée dans l'historique ;
  - tableau de bord : rendez-vous fixés sur 7 jours et prochains rendez-vous ; colonnes rendez-vous, mode et aides qualifiées dans l'export CSV.
- **Fiche** :
  - « Fiche de la demande » dans l'ordre attendu par les entreprises : nom, prénom, adresse, téléphone, e-mail, mode de chauffage, diffusion de la chaleur, nombre de radiateurs, surface chauffée, emplacement de la chaudière, date de construction, propriétaire ou locataire, catégorie de revenus ;
  - correspondance avec chaque entreprise partenaire, avec les critères non remplis ou à vérifier ;
  - coordonnées et canal demandé ;
  - réponses utiles ;
  - résultat exact présenté, avec versions ;
  - preuve de la demande : horodatage, phrase exacte, notice exacte, empreintes ;
  - source d'acquisition ;
  - notes internes et historique ;
  - statut, assignation, journal des contacts ;
  - opposition, anonymisation, suppression.
- **Rappel téléphonique encadré** :
  - échéance de **5 jours ouvrables** (art. R223-4 : samedis comptés, jours fériés exclus) ;
  - créneaux recommandés ;
  - compteur de tentatives ;
  - **appel bloqué une fois le délai dépassé** ;
  - objet de l'appel rappelé.
- **Export CSV** réservé aux personnes autorisées, protégé contre l'injection de formules et journalisé.
- **Gestion** :
  - oppositions (empreintes non réversibles) ;
  - canaux d'acquisition autorisés ;
  - équipe ;
  - paramètres (identité, mentions, activité, canaux, type de test, résultats et catégories de revenus qui ouvrent un rendez-vous, rappel rapide, notifications, conservation, sécurité) ;
  - journal d'audit ;
  - compte personnel.
- **Notifications internes** par e-mail ou webhook signé, via une file d'envoi. Elles contiennent une référence, l'échéance de rappel et un lien, **sans données personnelles**. Leur échec n'empêche jamais l'enregistrement et elles sont relancées automatiquement.
  - Une adresse de webhook Discord, Slack ou Telegram reçoit directement un message lisible (« Nouvelle demande PE-… (téléphone), à traiter avant le … : lien ») ; tout autre service reçoit le JSON signé (en-têtes `x-prospectener-timestamp` et `x-prospectener-signature`).
  - Le webhook nécessite la variable d'environnement `NOTIFY_WEBHOOK_SECRET`.

## Architecture

| Élément | Choix |
|---|---|
| Application | Next.js 16 (App Router), React 19, TypeScript strict |
| Base de données | PostgreSQL 16 + Prisma 7 (migrations versionnées dans `prisma/migrations`) |
| Interface | Tailwind CSS 4, polices auto-hébergées, Three.js / React Three Fiber, Motion |
| Validation | Zod (côté navigateur **et** serveur) |
| Tests | Vitest (unitaires + intégration sur vraie base) et Playwright (bout en bout, bureau + mobile) |

```
src/
  engine/            Moteur de pré-éligibilité (pur, testé), questionnaire, barèmes 2026.10-1 et 2026.10-2
  app/(site)/        Pages publiques, dont le guide des aides (aides/, travaux/)
  app/               sitemap.ts, robots.ts, image de partage et icône générées
  app/admin/         Authentification (auth) et panel (panel)
  app/api/           Demandes, annulation, communes, statistiques agrégées, cron, santé
  lib/               Sécurité, sessions, demandes, notifications, conservation, CSV, calendrier…
  components/        Interface (site, simulateur, administration, 3D)
prisma/              Schéma, migrations, initialisation
scripts/             Création d'administrateur, données de démonstration, communes, sauvegarde
tests/               Intégration (Vitest) et bout en bout (Playwright)
docs/                Règles et sources, conformité, déploiement, notes de vérification
```

## Installation locale

Prérequis : Node.js ≥ 20.9 (22 recommandé), PostgreSQL 16 (ou Docker).

```bash
npm install                          # génère aussi le client Prisma
docker compose up -d                 # PostgreSQL + Mailpit (facultatif)
cp .env.example .env                 # puis renseigner les secrets (voir commentaires)
npm run db:migrate                   # applique les migrations
npm run db:seed                      # publie le barème embarqué, crée des paramètres vides
npm run dev                          # http://localhost:3000
```

Données de démonstration (jamais en production, toutes marquées « Démo ») :

```bash
ALLOW_DEMO_DATA=true npm run db:demo
```

## Premier administrateur

```bash
npm run admin:create -- --email prenom.nom@entreprise.fr --name "Prénom Nom"
```

Le script affiche un **lien d'activation à usage unique (72 h)**. La personne y choisit son mot de passe puis active la double authentification. Les comptes suivants s'invitent depuis **Administration → Équipe**.

Ensuite, dans **Administration → Paramètres** :

1. Renseigner l'identité et les mentions légales. Le formulaire public reste fermé tant que la dénomination, le siège et le contact « données personnelles » manquent.
2. Décrire l'activité réelle : accompagnement, travaux et/ou mise en relation. Pour confier les rendez-vous à une entreprise de travaux, cocher « Mise en relation avec des professionnels » et lister les entreprises partenaires : la notice d'information l'annonce alors aux visiteurs.
3. Choisir les canaux de réponse. Le rappel téléphonique ne s'active qu'après confirmation de l'avertissement juridique. Dans le même encadré, « Qualification des demandes » règle le type de test, les résultats qui ouvrent une demande de rendez-vous et le rappel rapide.
4. Configurer les notifications et tester l'envoi. Le plus simple : créer un webhook Discord (Paramètres du salon → Intégrations → Webhooks → Copier l'URL), le coller dans Paramètres → Notifications internes (« URL du webhook »), enregistrer, puis « Envoyer un test ».
5. Traiter la check-list de mise en ligne.

## Tests

```bash
npm test                    # tests unitaires (moteur, test d'éligibilité seul, seuils, calendrier, CSV, qualification, pages guides, mots de passe)
npm run test:integration    # intégration sur une base PostgreSQL de test (TEST_DATABASE_URL)
npm run test:e2e            # bout en bout : build de production + navigateur (bureau et mobile)
npm run typecheck && npm run lint
```

Les tests d'intégration utilisent par défaut `postgresql://prospectener:prospectener_dev@127.0.0.1:5432/prospectener_test`. Les tests de bout en bout utilisent `prospectener_e2e` (variable `E2E_DATABASE_URL`). Ces bases sont **vidées** par les tests. Pour utiliser un Chromium déjà installé : `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/chemin/chromium`.

## Mise en ligne

Voir [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md) (Vercel + PostgreSQL managé, ou serveur avec reverse proxy) et la check-list de [docs/CONFORMITE.md](docs/CONFORMITE.md).

**Avant toute mise en production**, il reste à :

1. Relire directement sur les sources officielles les règles du barème `2026.10-1`. Elles ont été établies par recherche documentaire indirecte, car l'accès aux sites `*.gouv.fr` était bloqué depuis l'environnement de développement (voir [docs/REGLES.md](docs/REGLES.md)).
2. Faire valider juridiquement :
   - les mentions légales et la notice RGPD ;
   - la **pratique de rappel téléphonique**, car une fiche de la DGCCRF considère comme non conforme le rappel d'une personne ayant laissé ses coordonnées sur un simulateur ([docs/CONFORMITE.md](docs/CONFORMITE.md)).
