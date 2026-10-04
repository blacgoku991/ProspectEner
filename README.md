# ProspectEner — pré-éligibilité aux aides à la rénovation énergétique

Site de conversion **transparent** pour une entreprise privée de rénovation énergétique, relié à un **panel d'administration sécurisé** :

**Accueil → Questionnaire → Résultat (avant toute coordonnée) → Demande de contact → Confirmation → Fiche dans l'administration.**

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

- **Page d'accueil** avec maison 3D procédurale (React Three Fiber, aucun fichier externe), positionnement transparent, mention obligatoire France Rénov' (art. L122-26 du Code de la consommation) et explorateur « travaux → dispositifs » généré à partir du barème publié.
- **Questionnaire progressif** (une question par écran, étapes Logement / Projet / Énergie / Avancement / Foyer). Les questions sont conditionnelles : on ne demande que ce qui sert aux dispositifs évalués. Par exemple, le revenu n'est pas demandé à un locataire ni pour un projet d'isolation seule.
  - La progression est réelle et recalculée.
  - Retour en arrière sans perte, y compris avec le bouton « précédent » du navigateur et après rechargement (stockage de session).
  - Validation au fil de la saisie, aides contextuelles, réponse « Je ne sais pas » partout.
  - Tranches de revenu calculées selon la taille du ménage et la zone (Île-de-France / autres régions).
  - Communes issues du jeu de données officiel Etalab, embarqué : aucun appel externe.
- **Résultat avant coordonnées**, sous forme de verdict simple :
  - « Votre projet est potentiellement éligible », vérification complémentaire nécessaire, critères non remplis ou hors périmètre — toujours le vrai résultat du moteur ;
  - nombre d'aides qui peuvent correspondre, sans les nommer (le détail est présenté lors de l'étude) ;
  - bonification temporaire en cours le cas échéant, points bloquants en cas de résultat défavorable ;
  - mentions d'indépendance, de résultat indicatif et France Rénov' ;
  - réponses ayant conduit au résultat, repliées, chacune modifiable ;
  - bouton « Être recontacté(e) ».
- **Synthèse d'éligibilité dans l'administration**, pour chaque demande :
  - aides potentiellement éligibles, à vérifier, non éligibles ou hors périmètre, avec travaux couverts et raison principale ;
  - détail complet par dispositif (critères, conditions, sources, dates de validité), date de référence et versions du barème et du moteur ;
  - aides repérées dans la liste des demandes et dans l'export CSV.
- **Demande de contact explicite**.
  - Phrase générée « Je demande à être contacté(e) par [entreprise], par [canal], au sujet de mon projet de [travaux] », avec une case jamais pré-cochée, décochée si le canal change.
  - Notice d'information RGPD affichée avant l'envoi.
  - Pas de newsletter ni de partenaires.
- **Parcours « rappel rapide »** sans questionnaire, pour qui ne veut pas remplir le test.
- **Confirmation honnête** : aucun dossier déposé. Elle fournit une référence et un lien d'annulation personnel.
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
  - verrouillage après échecs et limitation de débit ;
  - comptes activés par lien à usage unique : aucun mot de passe transmis.
- **Rôles** : administrateur, ou collaborateur qui ne voit que les demandes qui lui sont assignées et, selon le paramétrage, les demandes non assignées. Contrôles **côté serveur** sur chaque page, action et route.
- **Tableau de bord** :
  - nouvelles demandes et demandes à traiter ;
  - rappels proches de l'échéance et délais dépassés ;
  - répartition par travaux, territoire, résultat et statut ;
  - parcours agrégé ;
  - alertes : check-list de mise en ligne, notifications en échec, barème proche de l'expiration.
- **Liste des demandes** : recherche, filtres (statut, résultat, travaux, canal, assignation, échéance, dates), tri et pagination.
- **Fiche** :
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
  - paramètres (identité, mentions, activité, canaux, notifications, conservation, sécurité) ;
  - journal d'audit ;
  - compte personnel.
- **Notifications internes** par e-mail ou webhook signé, via une file d'envoi. Elles contiennent une référence et un lien, **sans données personnelles**. Leur échec n'empêche jamais l'enregistrement et elles sont relancées automatiquement.

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
  engine/            Moteur de pré-éligibilité (pur, testé), questionnaire, barème 2026.10-1
  app/(site)/        Pages publiques
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
2. Décrire l'activité réelle : accompagnement, travaux et/ou mise en relation.
3. Choisir les canaux de réponse. Le rappel téléphonique ne s'active qu'après confirmation de l'avertissement juridique.
4. Configurer les notifications (SMTP ou webhook) et tester l'envoi.
5. Traiter la check-list de mise en ligne.

## Tests

```bash
npm test                    # tests unitaires (moteur, seuils, calendrier, CSV)
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
