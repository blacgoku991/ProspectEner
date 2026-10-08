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
  - Mise à jour du 8 octobre 2026 (résumés de recherche, Légifrance non consultable directement) : l'article s'ouvrirait par « pour l'application du cinquième alinéa de l'article L. 223-1 », c'est-à-dire l'interdiction propre à la rénovation énergétique. Il viserait donc précisément le rappel d'une personne qui l'a demandé, dans ce secteur.
  - Le décret fait l'objet d'un recours devant le Conseil d'État (23 septembre 2026), sans suspension connue à cette date.
- **Sanctions** (L242-16 et L242-16-1) : jusqu'à 75 000 € pour une personne physique et 375 000 € pour une personne morale, par manquement et cumulables ; contrat conclu à la suite d'un démarchage illicite nul. Exemples récents dans le secteur : 801 020 €, 440 600 €, 376 080 €, 366 930 €.
- **Entreprise qui profite d'un démarchage illicite** : présumée responsable, même si les appels sont sous-traités ; la preuve de la demande incombe à celui qui appelle.

### Revente de demandes à des entreprises partenaires (mise en relation rémunérée)

Analyse (sans position officielle publiée à ce jour sur la génération de demandes) :

- **Une entreprise que la personne n'a pas nommée ne peut pas l'appeler** : son appel ne répond à aucune demande qui lui était adressée, c'est de la prospection interdite (L223-1). Un consentement générique « nos partenaires » ne suffit pas, ni pour le démarchage ni pour la CNIL (identité des destinataires due dès la collecte).
- **Ce que fait le site** :
  - quand la mise en relation est déclarée et qu'une entreprise partenaire active correspond aux réponses, la phrase de la demande la **nomme avant l'envoi** : « Je demande à être contacté(e) par [éditeur] et par l'entreprise partenaire [entreprise], par [canal], au sujet de mon projet de [travaux]. » Le choix de l'entreprise est fait dans le navigateur et refait par le serveur, qui refuse l'envoi si l'entreprise ou son nom affichés ne sont plus les bons (`PARTNER_CHANGED`) ;
  - la demande peut alors être **transmise à cette seule entreprise**, par un administrateur, après confirmation (« Je transmets ces N demandes à … ») ; seules les demandes ouvertes, sans opposition (liste d'opposition comprise) et encore dans le délai de rappel de cinq jours ouvrables sont transmissibles ; la date de transmission est enregistrée et tracée dans l'historique ; le fichier porte une colonne « Conditions d'usage » ;
  - une demande qui nomme une entreprise ne peut être confiée en rendez-vous qu'à elle, ou assurée par l'éditeur ; le nom d'une entreprise qui a déjà reçu des demandes ne peut plus être modifié (créer une nouvelle fiche pour une autre entreprise) ;
  - annulation, opposition ou effacement d'une demande déjà transmise : alerte « entreprise à informer » sur la fiche et notification interne, jusqu'à confirmation par l'équipe (art. 19 RGPD) ; la politique de confidentialité l'annonce ;
  - les entreprises reprises de l'ancienne liste libre sont désactivées tant que leurs critères n'ont pas été revus ; des critères illisibles excluent l'entreprise (« critères à revoir ») ;
  - les critères des entreprises actives sont lisibles dans la page du questionnaire (le choix se fait dans le navigateur, pour que les réponses n'en sortent pas avant l'envoi) : à signaler aux entreprises dans le contrat ;
  - sans entreprise nommée, une entreprise ne reçoit la demande qu'avec l'accord explicite de la personne lors de l'échange, pour un rendez-vous convenu (accord coché et tracé). **Cette voie est moins sûre** que la demande nommant l'entreprise ;
  - la notice, la politique de confidentialité et les mentions légales annoncent la transmission à une seule entreprise et la **rémunération** de ces mises en relation (pratique commerciale trompeuse par omission sinon, art. L121-3) ;
  - les critères des entreprises servent uniquement au tri : ils ne modifient jamais le résultat affiché au visiteur.
- **Règles d'usage à respecter par l'éditeur et ses partenaires** (non vérifiables par le site) :
  - l'entreprise rappelle **dans les cinq jours ouvrables suivant la demande** (pas suivant sa transmission) : transmettre les demandes sans attendre ; l'export indique la date limite ;
  - l'appel porte **uniquement sur l'objet demandé** (pas de proposition d'isolation à une demande de pompe à chaleur) ;
  - jamais de revente ou de réattribution à une autre entreprise ; une nouvelle entreprise suppose une nouvelle demande de la personne ;
  - aucun SMS, e-mail ou message de relance commerciale (L223-8) : seulement les messages qui répondent à la demande (confirmation, rendez-vous) ;
  - créneaux d'appel lun.-ven. 10h-13h / 14h-20h, 4 tentatives au plus sur 30 jours (D223-9), arrêt immédiat en cas d'opposition ;
  - **contrat avec chaque entreprise** : usage des données limité à la demande, pas de cession, rappel dans le délai ou pas du tout, information de la personne au premier contact (art. 14 RGPD, en citant l'éditeur comme source), conservation, sécurité, synchronisation des oppositions ; engagement sur la qualification RGE et l'information sur la sous-traitance (loi n° 2025-594) ;
  - une entreprise ajoutée plus tard ne reçoit pas les demandes collectées avant son ajout.
- **Publicité** : aucune offre « à 1 € », « gratuite » ou « reste à charge 0 € » (pratique trompeuse, art. L121-4 19°). Les aides par geste sont plafonnées (90 % / 75 % / 60 % du coût TTC selon les revenus), donc un reste à charge demeure en général. Le site n'affiche aucun montant.
- **Avis d'impôt** : le site ne demande ni l'avis, ni le numéro fiscal, ni les identifiants FranceConnect ou impots.gouv (risque de fraude signalé par France Rénov'). Il demande la taille du foyer et la tranche de revenu fiscal de référence, déclaratives ; l'entreprise vérifie l'avis au moment du dossier.

### Mesures implémentées

- **Demande explicite et ponctuelle.**
  - Le visiteur valide la phrase « Je demande à être contacté(e) par [entreprise], par [canal], au sujet de mon projet de [travaux] » via une case jamais pré-cochée, décochée si le canal change.
  - Le texte exact, la notice exacte (versionnée, avec empreinte), l'horodatage et des empreintes HMAC de l'IP et des coordonnées sont conservés comme preuve.
  - La notice précise que les coordonnées ne sont ni vendues, ni utilisées pour une newsletter ou d'autres sollicitations.
  - Avec la variante « test d'éligibilité seul », l'objet de la demande devient « mon projet de rénovation énergétique ». Le projet précis est découvert lors de l'échange demandé, qui reste limité à cet objet.
- **Demande proposée seulement aux résultats retenus.** Par défaut, la demande de rappel n'est proposée qu'aux résultats « potentiellement éligible » ou « à vérifier ». Le serveur refuse aussi les autres (`OUTCOME_NOT_ACCEPTED`) : aucune fiche n'est créée pour une personne à qui l'on ne proposera rien. Le paramètre est réglable dans Paramètres.
- **Rappel rapide sans test désactivé par défaut** (`QUICK_CALLBACK_CLOSED` côté serveur). Il produit des demandes non qualifiées, et la page `/rappel` renvoie alors vers le test.
- **Rendez-vous.**
  - Il est fixé pendant l'échange demandé, après confirmation des critères d'au moins une aide. Le serveur le contrôle.
  - Il ne crée **aucune autorisation de sollicitation ultérieure** : en dehors du rendez-vous convenu, les règles ci-dessus continuent de s'appliquer.
  - Le champ « Projet et précisions » est facultatif et limité à 1 000 caractères. Il est effacé à l'anonymisation.
- **Coordonnées.** Seule la coordonnée du canal choisi est obligatoire. Avec un rappel téléphonique, une adresse e-mail peut être ajoutée ; l'adresse du logement est facultative (visite technique). Aucun numéro n'est conservé pour une réponse par e-mail.
- **Catégories de revenus.** Le rendez-vous n'est proposé qu'aux catégories retenues dans les paramètres (bleu et jaune par défaut ; « je ne sais pas » toujours accepté). Le serveur refuse les autres (`INCOME_NOT_ACCEPTED`). Le résultat affiché reste celui du moteur, avec un renvoi vers France Rénov'.
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
  - Les paramètres de campagne (utm) servent seulement à qualifier l'origine des visites, et ne sont conservés qu'avec l'accord du visiteur (bandeau cookies). Les campagnes autorisées sont déclarées dans l'administration ; une campagne inconnue est marquée « à contrôler ».
- **Opposition** :
  - par le visiteur lors de l'annulation, ou saisie par l'équipe ;
  - liste d'empreintes non réversibles conservée au moins 3 ans ;
  - une nouvelle demande d'un contact listé est signalée et passe « à vérifier ».

### ⚠ Point juridique à trancher avant d'activer le rappel téléphonique

La fiche DGCCRF « Conseils pour réussir la rénovation énergétique de son logement » indique : « *le fait de rappeler un consommateur qui aurait laissé ses coordonnées sur un site ou simulateur en ligne n'est pas considéré comme conforme à cette loi, même si celui-ci y aurait consenti* ».

Cette fiche est antérieure à l'article R223-4 (en vigueur depuis le 11 août 2026), qui semble viser précisément le rappel demandé dans ce secteur et devrait prévaloir. Aucune position officielle ne l'a encore confirmé, et le décret est contesté devant le Conseil d'État.

C'est pourquoi le canal téléphonique est **désactivé par défaut**. Son activation exige :

- qu'un administrateur coche une confirmation après lecture de l'avertissement ;
- la date et l'auteur sont enregistrés.

**Recommandation : obtenir l'avis d'un conseil juridique, ou une position de la DGCCRF ou DDPP, avant activation.** En attendant, le canal e-mail et l'affichage du numéro de l'entreprise (appel entrant à l'initiative du visiteur) restent disponibles.

## 3. Données personnelles (RGPD)

| Traitement | Données | Base légale (proposée) | Conservation (par défaut, paramétrable) |
|---|---|---|---|
| Simulation | Réponses gardées **dans le navigateur** ; code postal envoyé pour la recherche de commune (non enregistré) | — (pas de fiche avant l'envoi) | Session du navigateur |
| Demande de contact | Identité, coordonnée du canal choisi, e-mail complémentaire et adresse du logement facultatifs, commune, réponses utiles (dont taille du foyer, tranche de revenu et installation de chauffage), résultat, entreprise partenaire nommée dans la demande, commentaire et disponibilités facultatifs, origine de campagne | Mesures précontractuelles (6.1.b) | 3 ans depuis la demande ou le dernier échange avec la personne ; 30 jours après une annulation |
| Preuve de la demande | Horodatage, texte validé, version de la notice, empreintes HMAC (IP, téléphone, e-mail) | Obligation de preuve (R223-4) / intérêt légitime | 3 ans |
| Liste d'opposition | Empreinte non réversible + valeur masquée | Respect des droits / intérêt légitime | 3 ans minimum |
| Journal de sécurité | Connexions, consultations de fiches, exports, modifications, avec empreinte d'IP | Intérêt légitime (sécurité) | 12 mois |
| Statistiques de parcours | Nombre de passages par étape et par jour | Pas de donnée personnelle | 25 mois |

Mesures implémentées :

- **Information avant l'envoi, en deux niveaux** (présentation recommandée par la CNIL).
  - Sous le formulaire, un texte court : l'entreprise qui utilise les données, la finalité, l'entreprise des travaux en cas de mise en relation, l'absence de vente et d'autres sollicitations, la durée maximale de conservation, les droits et la réclamation auprès de la CNIL, avec un lien vers la politique de confidentialité.
  - La politique de confidentialité, générée à partir des paramètres, donne le détail : responsable et coordonnées, base légale, destinataires, durées, droits.
  - Le texte exact affiché est conservé avec chaque demande (version et empreinte).
  - L'adresse et l'identité légale de l'entreprise figurent dans les mentions légales et le pied de page, pas dans le formulaire.
- **Minimisation.**
  - Questions conditionnelles et réponses devenues inutiles **supprimées** avant l'enregistrement. La taille du foyer et la tranche de revenu sont demandées à tous : elles orientent la demande vers l'entreprise concernée.
  - Aucune donnée fiscale, pièce d'identité, coordonnée bancaire ni identifiant FranceConnect.
  - Tranches de revenus plutôt que des montants.
  - Adresse du logement seulement si la personne la donne ; effacée à l'anonymisation.
- **Conservation automatisée** (`/api/cron` et bouton dans Paramètres).
  - Anonymisation : suppression des coordonnées (adresse comprise), du commentaire, des notes et de la localisation fine ; surface chauffée, nombre de radiateurs, emplacement de la chaudière et taille du foyer effacés, année de construction ramenée à la décennie.
  - Puis purge des preuves.
  - Puis purge des journaux, oppositions expirées, statistiques, sessions et compteurs.
- **Droits des personnes.**
  - Annulation et effacement immédiat par le lien personnel.
  - Anonymisation et suppression manuelles par un administrateur.
  - Gestion des oppositions.
- **Aucun traceur tiers par défaut.**
  - **Bandeau de choix au premier passage** : « Refuser » et « Accepter » au même niveau, sans bloquer la navigation, avec un lien « Personnaliser » vers la page Cookies et préférences, où le choix se modifie à tout moment.
    - Le bandeau est placé en haut de page, dans le flux : il ne recouvre jamais la mention France Rénov' ni le contenu. Le serveur sait si un choix existe : la page arrive directement avec ou sans bandeau.
    - Le choix est conservé 6 mois dans un cookie propre au site, sans identifiant (`pe-consent`, exempté d'accord puisqu'il ne sert qu'à mémoriser ce choix), puis redemandé.
    - Seul traceur soumis à accord : l'origine de la visite (`pe-acq`, stockage de session : paramètres utm, page d'arrivée, site d'origine). Elle n'est lue et conservée qu'après accord ; un refus l'efface.
    - Les éléments nécessaires au service (réponses en cours, session d'administration) ne demandent pas d'accord et sont décrits sur la page Cookies et préférences.
  - Statistiques internes agrégées sans cookie ni identifiant.
  - Polices auto-hébergées.
  - Aucune réponse au questionnaire transmise à une plateforme publicitaire.
  - Cloudflare Turnstile est optionnel et désactivé par défaut. **S'il est activé**, le mentionner dans la politique de confidentialité.
- **Transmission à une entreprise partenaire : uniquement en mise en relation déclarée, et avec l'accord de la personne.**
  - Par défaut, la notice indique qu'aucune donnée n'est vendue ni transmise à des partenaires. En mise en relation, elle annonce au contraire la transmission à une seule entreprise et la rémunération : la mention « jamais vendues » disparaît.
  - Si l'administrateur coche « Mise en relation avec des professionnels » (Paramètres → Activité), plusieurs textes l'annoncent : la notice, la politique de confidentialité et les mentions légales. Un rendez-vous accepté peut alors être assuré par une entreprise partenaire, dont le nom est donné avant toute transmission. Les entreprises déclarées y sont listées.
  - Pour confier un rendez-vous à une entreprise, il faut cocher l'accord de la personne. Le serveur refuse sinon, et refuse toute entreprise tant que la mise en relation n'est pas déclarée. L'accord, sa date et la première transmission du récapitulatif sont tracés.
  - Le récapitulatif et les exports pour l'entreprise reprennent la fiche de la demande : identité, coordonnées, installation, logement, catégorie de revenus déclarative (annoncée dans la politique de confidentialité), sans commentaire libre ni note interne. Ils rappellent que les coordonnées ne servent qu'à cette demande.
  - Une demande n'est transmise qu'à une seule entreprise : celle que la personne a nommée dans sa demande, ou celle du rendez-vous qu'elle a accepté.
  - **À valider juridiquement** :
    - l'application de l'article L111-7 (places de marché et comparateurs depuis la loi SREN) : probablement pas pour un site qui transmet une demande à une seule entreprise sans comparaison, mais la rémunération est annoncée dans tous les cas ; si le site compare ou classe un jour plusieurs entreprises, les articles D111-6 à D111-8 s'appliquent ;
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
