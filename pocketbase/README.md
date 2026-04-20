# PocketBase

PocketBase is the local backend and source of truth for app state. Schema
changes should be made with committed files in `pb_migrations`; the Dashboard is
only for inspection during development.

## Run

```bash
docker compose up --build pocketbase
```

- App/API: `http://localhost:8090/api/`
- Dashboard: `http://localhost:8090/_/`

PocketBase runtime data is stored in the `pocketbase_data` Docker volume.

## Superuser

On startup, the container runs migrations and upserts the superuser from the
repo root `.env` values:

```bash
POCKETBASE_ADMIN_EMAIL=admin@example.com
POCKETBASE_ADMIN_PASSWORD=change-me-please
```

Changing those values and recreating the container updates the same superuser:

```bash
docker compose up -d --build --force-recreate pocketbase
```
