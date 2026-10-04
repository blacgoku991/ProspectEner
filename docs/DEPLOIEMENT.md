# Déploiement

## Prérequis

- Node.js ≥ 20.9 (22 LTS recommandé)
- PostgreSQL 16 managé ou auto-hébergé, avec sauvegardes
- Un nom de domaine en **HTTPS** (obligatoire : cookies `__Host-` sécurisés, HSTS)
- Facultatif : un fournisseur SMTP et/ou une URL de webhook pour les notifications internes

## Variables d'environnement

Voir [`.env.example`](../.env.example). Variables **obligatoires** en production :

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion PostgreSQL |
| `APP_URL` | URL publique HTTPS (sert aux liens des notifications et d'activation) |
| `APP_SECRET` | Secret HMAC, 32 caractères aléatoires minimum |
| `APP_ENCRYPTION_KEY` | Clé AES-256 en base64 (32 octets). **À sauvegarder** : la perdre impose de réinitialiser les doubles authentifications |
| `CRON_SECRET` | Protège `/api/cron` |
| `TRUSTED_PROXY_HOPS` | `1` derrière Vercel ou un reverse proxy unique |

Ne jamais activer `ALLOW_DEMO_DATA` en production : l'application refuse de démarrer.

## Option A — Vercel + PostgreSQL managé

1. Importer le dépôt dans Vercel et renseigner `APP_SECRET`, `APP_ENCRYPTION_KEY`, `CRON_SECRET` et `TRUSTED_PROXY_HOPS=1`. `APP_URL` est facultative sur Vercel : à défaut, l'adresse de production du projet est utilisée (à définir dès qu'un nom de domaine est relié).
2. Ajouter une base PostgreSQL au projet : **Storage → Create Database → Neon**, région Europe (Frankfurt), reliée aux environnements Production et Preview. Les variables `DATABASE_URL` (connexion avec regroupement, utilisée par l'application) et `DATABASE_URL_UNPOOLED` (connexion directe, utilisée pour les migrations) sont créées automatiquement. Une autre base PostgreSQL convient, à condition de renseigner ces variables.
3. La commande de build est fixée par `vercel.json` : `scripts/vercel-build.sh`. Pour un déploiement de **production**, le script applique les migrations, puis l'initialisation (barème embarqué, paramètres vides, sans effet si elle a déjà eu lieu), puis compile. Les déploiements de prévisualisation ne modifient pas la base.
4. Premier compte administrateur : définir `BOOTSTRAP_ADMIN_EMAIL` (et `BOOTSTRAP_ADMIN_NAME`) avant le premier déploiement de production. Le compte n'est créé que si l'équipe n'a encore aucun compte. Le lien d'activation (72 h, usage unique) apparaît dans le journal de build, visible des seuls membres du projet Vercel. Pour connaître le lien sans lire ce journal, générer soi-même le jeton (`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`) et le placer dans `BOOTSTRAP_ADMIN_TOKEN`, de type *Sensitive* (illisible une fois enregistré) : le lien est alors `https://<domaine>/admin/activation#token=<jeton>`. Supprimer ensuite ces variables. À défaut, utiliser `npm run admin:create` depuis un poste de confiance :

   ```bash
   DATABASE_URL=… APP_URL=https://… npm run admin:create -- --email … --name "…"
   ```

5. Les fonctions s'exécutent à Francfort (`regions` dans `vercel.json`), au plus près de la base.
6. Tâche planifiée : `vercel.json` déclare `/api/cron`, une fois par jour (limite des offres gratuites). Vercel envoie automatiquement `Authorization: Bearer $CRON_SECRET`. Sur une offre payante, passer à `*/15 * * * *` pour relancer plus vite les notifications en échec. Elles sont de toute façon tentées immédiatement après chaque demande.
7. Tant que la check-list de mise en ligne n'est pas complète, les pages publiques portent `noindex` et `sitemap.xml` est vide : le site n'est pas proposé aux moteurs de recherche.
8. **Référencement, une fois la check-list complète** :
   - relier un nom de domaine (Settings → Domains), puis renseigner `APP_URL` avec cette adresse : elle sert aux adresses canoniques, au plan du site et aux images de partage ;
   - vérifier que le site est public. La protection Vercel (« Vercel Authentication ») ne s'applique pas aux domaines personnalisés avec le réglage *Standard Protection*, mais bloque l'adresse `*.vercel.app` ;
   - déclarer le domaine dans Google Search Console et Bing Webmaster Tools et y soumettre `https://<domaine>/sitemap.xml` ;
   - contrôler une page avec l'outil d'inspection d'URL et le test des résultats enrichis.

## Option B — Serveur (VPS) avec reverse proxy

```bash
npm ci
npx prisma migrate deploy
npm run build
npm run db:seed
NODE_ENV=production PORT=3000 npm start      # derrière nginx/Caddy en HTTPS, TRUSTED_PROXY_HOPS=1
```

- Lancer le service avec systemd ou un gestionnaire de processus. Le reverse proxy doit transmettre `X-Forwarded-For` et `Host`.
- Ajouter la tâche planifiée :

  ```cron
  */15 * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://votre-domaine.fr/api/cron > /dev/null
  ```

- Surveiller `GET /api/health` (vérifie la base).

## Sauvegardes

- Activer les sauvegardes automatiques (PITR) de la base managée, **chiffrées**, avec une durée de rétention cohérente avec la politique de conservation.
- En auto-hébergement :

  ```bash
  DATABASE_URL=… BACKUP_PASSPHRASE_FILE=/etc/prospectener/backup.pass ./scripts/backup.sh /var/backups/prospectener 30
  ```

  `pg_dump` chiffré en AES-256 avec GPG, fichiers en 600 et rotation au-delà de 30 jours. Stocker une copie hors site.
- **Les sauvegardes contiennent des données personnelles** : accès restreint. Une donnée anonymisée en base peut subsister dans les sauvegardes jusqu'à leur expiration ; le prévoir dans la politique de conservation.
- Tester régulièrement la restauration :

  ```bash
  gpg --decrypt fichier.dump.gpg > f.dump
  pg_restore --clean --if-exists -d "$DATABASE_URL" f.dump
  ```

## Avant l'ouverture au public

1. Paramètres → check-list de mise en ligne : tous les points au vert.
2. Relire le barème `2026.10-1` sur les sources officielles ([REGLES.md](REGLES.md)), puis cocher la relecture dans les paramètres.
3. Faire valider juridiquement les mentions, la politique de confidentialité et la pratique de rappel ([CONFORMITE.md](CONFORMITE.md)).
4. Envoyer une notification de test depuis les paramètres.
5. Vérifier qu'aucune donnée de démonstration n'existe. Le filtre « Démo » de la liste des demandes doit être vide ; supprimer au besoin les demandes `isDemo`.
6. Créer les comptes nominatifs, sans compte partagé, et vérifier que la double authentification est active pour chacun.

## Mise à jour du barème annuel (1er janvier)

Les plafonds de ressources changent chaque 1er janvier et toutes les règles du barème `2026.10-1` expirent le 31 décembre 2026. Passé cette date, le simulateur affiche « vérification nécessaire » pour chaque dispositif. Préparer un brouillon dès la publication des nouveaux barèmes officiels (Administration → Barèmes & règles).
