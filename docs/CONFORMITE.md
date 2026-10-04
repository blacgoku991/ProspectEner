# Conformité : mesures mises en œuvre et points à valider

> Ce document **ne déclare pas** le site « conforme RGPD » ni conforme au Code de la consommation. Il liste les mesures **techniques** implémentées et les éléments **organisationnels ou juridiques** qui restent à valider par l'entreprise et son conseil.

Les références réglementaires ci-dessous ont été vérifiées le 4 octobre 2026 à partir d'extraits de pages officielles (Légifrance, economie.gouv.fr / DGCCRF, cnil.fr). Les notes détaillées sont dans [`verification-2026-10/research_legal.md`](verification-2026-10/research_legal.md). Le texte exact des articles doit être relu sur Légifrance.

## 1. Positionnement et transparence

- **Indépendance affichée.** « Service privé indépendant, non affilié à l'État, à l'Anah ou à France Rénov'. » apparaît dans le bandeau de toutes les pages publiques, dans le héros de l'accueil, près du résultat, dans les mentions légales et dans le pied de page.
- **Aucun code visuel de l'État.** Pas de Marianne, de logo gouvernemental ni de tampon ; la palette « pin et ambre » est volontairement éloignée du bleu-blanc-rouge. L'article L121-4 du Code de la consommation réprime le fait d'affirmer un agrément public inexistant.
- **Mention France Rénov' obligatoire depuis le 1er octobre 2026** (art. L122-26, arrêté du 7 juillet 2026) :
  - texte affiché : « Avant de vous engager, le service public vous informe gratuitement pour préparer et sécuriser votre projet : www.france-renov.gouv.fr » ;
  - lien vers `https://france-renov.gouv.fr/servicepublic` ;
  - présente sur l'accueil, le résultat, la confirmation, la page contact et le pied de page.
  - **À valider** : les spécifications de présentation (taille, emplacement) de l'annexe de l'arrêté n'ont pas pu être lues.
- **Formulations interdites absentes.** Aucun « aide accordée », « droit automatique à X € », « travaux gratuits » ni fausse urgence. Aucun montant n'est calculé.
- **Résultat avant coordonnées.** Le verdict s'affiche en premier ; le formulaire de rappel vient juste en dessous et n'est jamais obligatoire pour voir le résultat. La simulation ne dépose aucun dossier, ce qui est rappelé près du résultat et sur la confirmation.
- **Activité réelle configurable.** Accompagnement, travaux et/ou mise en relation ; les qualifications ne sont publiées que si elles sont saisies. Aucune mention n'est inventée : un champ vide est signalé « information à compléter par l'éditeur ».

## 2. Demande de contact et démarchage

### Cadre vérifié

- **L223-1 du Code de la consommation.** La prospection téléphonique est interdite pour les travaux et équipements d'économies d'énergie ou d'énergies renouvelables, **même avec consentement**. Seule exception : un contrat en cours.
- **L223-8** (loi n° 2025-594 du 30 juin 2025). La même interdiction couvre les SMS et messageries, l'e-mail et les réseaux sociaux.
- **Opt-in généralisé au 11 août 2026** pour la prospection téléphonique (loi n° 2025-594, décret n° 2026-662). Un consentement générique **ne lève pas** l'interdiction sectorielle.
- **R223-4** (décret n° 2026-662). Un appel n'est pas de la prospection s'il répond à une **demande explicite et prouvée**, intervient **dans les cinq jours ouvrables suivant la demande** et porte **uniquement sur l'objet demandé**. Les justificatifs sont conservés 3 ans.

### Mesures implémentées

- **Demande explicite et ponctuelle.**
  - Le visiteur valide la phrase « Je demande à être contacté(e) par [entreprise], par [canal], au sujet de mon projet de [travaux] » via une case jamais pré-cochée, décochée si le canal change.
  - Le texte exact, la notice exacte (versionnée, avec empreinte), l'horodatage et des empreintes HMAC de l'IP et des coordonnées sont conservés comme preuve.
  - La notice précise que la demande ne vaut ni inscription à une newsletter, ni accord pour d'autres sollicitations.
  - Avec la variante « test d'éligibilité seul », l'objet de la demande devient « mon projet de rénovation énergétique ». Le projet précis est découvert lors de l'échange demandé, qui reste limité à cet objet.
- **Demande proposée seulement aux résultats retenus.** Par défaut, la demande de rappel n'est proposée qu'aux résultats « potentiellement éligible » ou « à vérifier ». Le serveur refuse aussi les autres (`OUTCOME_NOT_ACCEPTED`) : aucune fiche n'est créée pour une personne à qui l'on ne proposera rien. Le paramètre est réglable dans Paramètres.
- **Rappel rapide sans test désactivé par défaut** (`QUICK_CALLBACK_CLOSED` côté serveur). Il produit des demandes non qualifiées, et la page `/rappel` renvoie alors vers le test.
- **Rendez-vous.**
  - Il est fixé pendant l'échange demandé, après confirmation des critères d'au moins une aide. Le serveur le contrôle.
  - Il ne crée **aucune autorisation de sollicitation ultérieure** : en dehors du rendez-vous convenu, les règles ci-dessus continuent de s'appliquer.
  - Le champ « Projet et précisions » est facultatif et limité à 1 000 caractères. Il est effacé à l'anonymisation.
- **Coordonnée minimale.** Seule la coordonnée du canal choisi est conservée (téléphone **ou** e-mail).
- **Échéance de rappel.**
  - Calcul : 5 jours ouvrables suivant la demande, jour de la demande exclu, samedis comptés, dimanches et jours fériés légaux exclus, Alsace-Moselle en option, fin de journée heure de Paris. Le délai est paramétrable, avec 5 au maximum.
  - Dans l'administration : compte à rebours, alerte « délai dépassé » et **blocage de l'enregistrement d'un appel** après l'échéance sans premier contact.
  - Le lien `tel:` est masqué hors délai.
- **Prudence sur les appels.**
  - Créneaux recommandés lun.-ven. 10h-13h / 14h-20h hors jours fériés (D223-9), même si un appel répondant à une demande n'est pas de la prospection.
  - Compteur de tentatives avec repère de 4 sur 30 jours.
  - Rappel de l'**objet strict de l'appel** sur la fiche.
- **Aucun démarchage intégré.**
  - Aucune liste d'appels, aucune campagne d'e-mails ou de SMS sortants, aucune newsletter.
  - Les paramètres de campagne (utm) servent seulement à qualifier l'origine des visites. Les campagnes autorisées sont déclarées dans l'administration ; une campagne inconnue est marquée « à contrôler ».
- **Opposition** :
  - par le visiteur lors de l'annulation, ou saisie par l'équipe ;
  - liste d'empreintes non réversibles conservée au moins 3 ans ;
  - une nouvelle demande d'un contact listé est signalée et passe « à vérifier ».

### ⚠ Point juridique à trancher avant d'activer le rappel téléphonique

La fiche DGCCRF « Conseils pour réussir la rénovation énergétique de son logement » indique : « *le fait de rappeler un consommateur qui aurait laissé ses coordonnées sur un site ou simulateur en ligne n'est pas considéré comme conforme à cette loi, même si celui-ci y aurait consenti* ».

Son articulation avec l'article R223-4 (en vigueur depuis le 11 août 2026) n'a pas pu être clarifiée sur source officielle.

C'est pourquoi le canal téléphonique est **désactivé par défaut**. Son activation exige :

- qu'un administrateur coche une confirmation après lecture de l'avertissement ;
- la date et l'auteur sont enregistrés.

**Recommandation : obtenir l'avis d'un conseil juridique, ou une position de la DGCCRF ou DDPP, avant activation.** En attendant, le canal e-mail et l'affichage du numéro de l'entreprise (appel entrant à l'initiative du visiteur) restent disponibles.

## 3. Données personnelles (RGPD)

| Traitement | Données | Base légale (proposée) | Conservation (par défaut, paramétrable) |
|---|---|---|---|
| Simulation | Réponses gardées **dans le navigateur** ; code postal envoyé pour la recherche de commune (non enregistré) | — (pas de fiche avant l'envoi) | Session du navigateur |
| Demande de contact | Identité, coordonnée du canal choisi, commune, réponses utiles, résultat, commentaire et disponibilités facultatifs, origine de campagne | Mesures précontractuelles (6.1.b) | 3 ans depuis la demande ou le dernier échange avec la personne ; 30 jours après une annulation |
| Preuve de la demande | Horodatage, texte validé, version de la notice, empreintes HMAC (IP, téléphone, e-mail) | Obligation de preuve (R223-4) / intérêt légitime | 3 ans |
| Liste d'opposition | Empreinte non réversible + valeur masquée | Respect des droits / intérêt légitime | 3 ans minimum |
| Journal de sécurité | Connexions, consultations de fiches, exports, modifications, avec empreinte d'IP | Intérêt légitime (sécurité) | 12 mois |
| Statistiques de parcours | Nombre de passages par étape et par jour | Pas de donnée personnelle | 25 mois |

Mesures implémentées :

- **Information avant l'envoi.** Notice complète affichée dans le formulaire (responsable, finalité, base légale, destinataires, durées, droits, CNIL) et politique de confidentialité générée à partir des paramètres.
- **Minimisation.**
  - Questions conditionnelles et réponses devenues inutiles **supprimées** avant l'enregistrement.
  - Aucune donnée fiscale, pièce d'identité, coordonnée bancaire ni identifiant FranceConnect.
  - Tranches de revenus plutôt que des montants.
  - Adresse complète non demandée.
- **Conservation automatisée** (`/api/cron` et bouton dans Paramètres).
  - Anonymisation : suppression des coordonnées, du commentaire, des notes et de la localisation fine.
  - Puis purge des preuves.
  - Puis purge des journaux, oppositions expirées, statistiques, sessions et compteurs.
- **Droits des personnes.**
  - Annulation et effacement immédiat par le lien personnel.
  - Anonymisation et suppression manuelles par un administrateur.
  - Gestion des oppositions.
- **Aucun traceur tiers par défaut.**
  - Statistiques internes agrégées sans cookie ni identifiant.
  - Polices auto-hébergées.
  - Aucune réponse au questionnaire transmise à une plateforme publicitaire.
  - Cloudflare Turnstile est optionnel et désactivé par défaut. **S'il est activé**, le mentionner dans la politique de confidentialité.
- **Transmission à une entreprise partenaire : uniquement en mise en relation déclarée, et avec l'accord de la personne.**
  - Par défaut, la notice indique qu'aucune donnée n'est vendue ni transmise à des partenaires.
  - Si l'administrateur coche « Mise en relation avec des professionnels » (Paramètres → Activité), plusieurs textes l'annoncent : la notice, la politique de confidentialité et les mentions légales. Un rendez-vous accepté peut alors être assuré par une entreprise partenaire, dont le nom est donné avant toute transmission. Les entreprises déclarées y sont listées.
  - Pour confier un rendez-vous à une entreprise, il faut cocher l'accord de la personne. Le serveur refuse sinon, et refuse toute entreprise tant que la mise en relation n'est pas déclarée. L'accord, sa date et la première transmission du récapitulatif sont tracés.
  - Le récapitulatif se limite au rendez-vous : identité, coordonnées, commune, projet et aides confirmées. Il exclut les revenus et la composition du foyer, et rappelle que les coordonnées ne servent qu'à ce rendez-vous.
  - Aucune vente de contacts : seul un rendez-vous accepté par la personne est transmis, à une seule entreprise.
  - **À valider juridiquement** :
    - le cas échéant, les obligations d'information des opérateurs de plateforme en ligne (art. L111-7 du Code de la consommation), notamment sur la relation contractuelle et l'éventuelle rémunération ;
    - le contrat avec chaque partenaire : usage des données limité au rendez-vous, sécurité, durée de conservation ;
    - les contacts du partenaire avec la personne en dehors du rendez-vous convenu, qui restent soumis à l'interdiction de prospection (L223-1, L223-8).

### À compléter ou valider par l'entreprise

- Registre des traitements (art. 30 RGPD) ; analyse de la nécessité d'une AIPD.
- Contrats de sous-traitance (art. 28) avec l'hébergeur, le fournisseur SMTP et, le cas échéant, Cloudflare. Localisation des données et transferts hors UE à renseigner dans les paramètres.
- Procédure interne de réponse aux demandes d'exercice de droits (délai d'un mois).
- Durées de conservation à confirmer au regard de l'activité réelle (par exemple, la bascule d'un prospect en client relève d'un autre traitement).
- Politique de mots de passe et d'habilitations, revue périodique des comptes et des journaux.
- Médiateur de la consommation (L616-1) à renseigner.
- Mesures de la loi n° 2025-594 propres au processus commercial, non traitées par le site : information sur le label RGE sur support durable, information préalable sur la sous-traitance.

## 4. Sécurité

- **Authentification** :
  - scrypt (N=2^17) ;
  - TOTP RFC 6238 obligatoire pour les administrateurs (et par défaut pour les collaborateurs), avec anti-rejeu ;
  - secret TOTP chiffré AES-256-GCM ;
  - codes de récupération hachés à usage unique, affichés une seule fois ;
  - activation de compte par lien à usage unique (72 h) ;
  - mots de passe : 12 caractères minimum, refus des mots de passe courants (même déguisés : chiffres, symboles, « leet ») et de ceux qui figurent dans des fuites publiques. La vérification passe par Have I Been Pwned en k-anonymat : seuls 5 caractères de l'empreinte SHA-1 quittent le serveur. Elle se désactive avec `PASSWORD_BREACH_CHECK=off` et, si le service ne répond pas, la saisie n'est pas bloquée.
- **Sessions** :
  - jeton aléatoire de 256 bits stocké haché ;
  - cookie `__Host-` HttpOnly, Secure, SameSite=Strict ;
  - inactivité de 30 min, durée absolue de 12 h ;
  - rotation après le second facteur ;
  - révocation des autres sessions au changement de mot de passe (et de toutes les sessions à l'activation d'un compte) ;
  - déconnexion automatique côté navigateur après 30 min sans activité, tous onglets confondus : un écran laissé ouvert n'affiche pas indéfiniment des données personnelles. Une activité réelle prolonge la session.
- **Autorisations côté serveur** sur chaque page, action et route. Le proxy n'est qu'un premier filtre. Le périmètre des collaborateurs est appliqué dans les requêtes ; une fiche hors périmètre renvoie 404 et l'accès refusé est journalisé.
- **Protection des formulaires et des API** :
  - validation Zod stricte (champs inconnus refusés, longueurs bornées) sur toutes les entrées ;
  - requêtes SQL paramétrées (Prisma ou gabarits étiquetés) ;
  - vérification d'origine sur les API publiques ; protection CSRF native des Server Actions.
- **Anti-abus** :
  - limitation de débit en base (demandes, annulations, connexions, double authentification, exports, statistiques) ;
  - verrouillage du compte après 10 échecs, mot de passe et second facteur confondus. Le compteur n'est remis à zéro qu'après une authentification complète. Au-delà, 8 codes par 10 minutes et 30 par jour au maximum. Un verrouillage dû au second facteur ferme toutes les sessions du compte ;
  - champ piège et durée minimale de remplissage ;
  - Turnstile en option.
- **Idempotence.** Une clé générée par le navigateur et une contrainte d'unicité font qu'un double clic ou un renvoi réseau restitue la même demande. Ce comportement est testé avec deux envois simultanés.
- **En-têtes** :
  - CSP avec nonce par requête (`strict-dynamic`, `frame-ancestors 'none'`, `object-src 'none'`) ;
  - HSTS, X-Frame-Options et nosniff ;
  - Referrer-Policy et Permissions-Policy ;
  - `noindex`, `no-store` et `Cross-Origin-Resource-Policy: same-origin` sur l'administration et les API ;
  - `X-Permitted-Cross-Domain-Policies: none`.
- **Journalisation** :
  - journal applicatif sans donnée personnelle (liste blanche de champs techniques) ;
  - journal d'audit des accès sensibles et des exports ;
  - encart « Sécurité » du tableau de bord (administrateurs), sur 7 jours : échecs de connexion et de second facteur, verrouillages, accès refusés, sessions ouvertes, comptes sans double authentification.
- **Export CSV** :
  - réservé aux administrateurs et aux collaborateurs explicitement autorisés ;
  - neutralisation des formules (`=`, `+`, `-`, `@`, tabulation) ;
  - journalisé avec le nombre de lignes et les filtres.
- **Secrets** : uniquement dans des variables d'environnement serveur (`server-only`) ; aucun secret dans le navigateur.
- **Sauvegardes** : script `scripts/backup.sh` (pg_dump chiffré GPG AES-256, rotation). Voir [DEPLOIEMENT.md](DEPLOIEMENT.md).
- **Dépendances.** `npm audit` signale des vulnérabilités dans des outils de développement uniquement : le CLI Prisma (`deepmerge-ts`, `mysql2`, non utilisé avec PostgreSQL) et la configuration ESLint (`braces`, `micromatch`). Aucune n'est embarquée dans l'application. À surveiller lors des mises à jour.
