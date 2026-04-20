#!/bin/sh
set -eu

if [ -n "${POCKETBASE_ADMIN_EMAIL:-}" ] && [ -n "${POCKETBASE_ADMIN_PASSWORD:-}" ]; then
  /pb/pocketbase migrate up \
    --dir /pb/pb_data \
    --migrationsDir /pb/pb_migrations

  /pb/pocketbase superuser upsert \
    --dir /pb/pb_data \
    "${POCKETBASE_ADMIN_EMAIL}" \
    "${POCKETBASE_ADMIN_PASSWORD}"
else
  echo "POCKETBASE_ADMIN_EMAIL or POCKETBASE_ADMIN_PASSWORD is not set; skipping superuser upsert."
fi

exec /pb/pocketbase serve \
  --http=0.0.0.0:8090 \
  --dir /pb/pb_data \
  --migrationsDir /pb/pb_migrations \
  --hooksDir /pb/pb_hooks \
  --automigrate=false
