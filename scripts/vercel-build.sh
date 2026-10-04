#!/bin/sh
# Compilation sur Vercel (voir docs/DEPLOIEMENT.md).
# Déploiement de production : migrations, initialisation idempotente (barème, paramètres vides)
# et, si BOOTSTRAP_ADMIN_EMAIL est défini, premier compte administrateur tant qu'aucun compte n'existe.
# Les migrations passent par la connexion directe à la base quand elle est fournie (sans regroupement).
set -eu

DB_URL="${DATABASE_URL_UNPOOLED:-${POSTGRES_URL_NON_POOLING:-${DATABASE_URL:-${POSTGRES_URL:-}}}}"
if [ -z "$DB_URL" ]; then
  echo "Aucune base PostgreSQL n'est reliée au projet : ajoutez-en une (Vercel > Storage), puis redéployez." >&2
  exit 1
fi

npx prisma generate

if [ "${VERCEL_ENV:-}" = "production" ]; then
  DATABASE_URL="$DB_URL" npx prisma migrate deploy
  DATABASE_URL="$DB_URL" npm run db:seed
  if [ -n "${BOOTSTRAP_ADMIN_EMAIL:-}" ]; then
    DATABASE_URL="$DB_URL" npm run admin:create -- --email "$BOOTSTRAP_ADMIN_EMAIL" --name "${BOOTSTRAP_ADMIN_NAME:-Administrateur}" --if-no-staff
  fi
fi

npx next build
