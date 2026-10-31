#!/usr/bin/env bash
# Run from the repository root with private, encrypted/off-host backup storage configured.
set -euo pipefail
umask 077
backup_dir="${1:?Usage: scripts/backup.sh /private/backup/directory}"
mkdir -p "$backup_dir"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
docker compose -f docker-compose.prod.yml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup_dir/database-$stamp.dump"
test -s "$backup_dir/database-$stamp.dump"
docker compose -f docker-compose.prod.yml exec -T backend tar -czf - -C /app media > "$backup_dir/media-$stamp.tar.gz"
test -s "$backup_dir/media-$stamp.tar.gz"
echo "Backup files created. Encrypt and copy off-host; verify a restore before relying on them."
