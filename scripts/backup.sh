#!/usr/bin/env bash
# Sauvegarde chiffrée de la base PostgreSQL.
# Usage : DATABASE_URL=... BACKUP_PASSPHRASE_FILE=/chemin/secret ./scripts/backup.sh [dossier] [jours_de_conservation]
# Restauration : gpg --decrypt fichier.dump.gpg > fichier.dump && pg_restore --clean --if-exists -d "$DATABASE_URL" fichier.dump
set -euo pipefail
DEST="${1:-./backups}"
KEEP_DAYS="${2:-30}"
: "${DATABASE_URL:?DATABASE_URL requis}"
: "${BACKUP_PASSPHRASE_FILE:?BACKUP_PASSPHRASE_FILE requis (fichier contenant la phrase de chiffrement)}"
mkdir -p "$DEST"
chmod 700 "$DEST"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$DEST/prospectener-$STAMP.dump.gpg"
# pg_dump ne supporte pas le paramètre ?schema= de Prisma : on le retire.
PG_URL="${DATABASE_URL%%\?*}"
pg_dump --format=custom --no-owner --dbname="$PG_URL" \
  | gpg --batch --yes --symmetric --cipher-algo AES256 --passphrase-file "$BACKUP_PASSPHRASE_FILE" -o "$FILE"
chmod 600 "$FILE"
find "$DEST" -name 'prospectener-*.dump.gpg' -mtime +"$KEEP_DAYS" -delete
echo "Sauvegarde chiffrée : $FILE"
