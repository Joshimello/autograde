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
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
NETLIFY_API_BASE=https://api.netlify.com/api/v1
NETLIFY_API_TOKEN=
NETLIFY_SITE_ID=
```

Changing those values and recreating the container updates the same superuser:

```bash
docker compose up -d --build --force-recreate pocketbase
```

If both GitHub OAuth env vars are present, a PocketBase bootstrap hook updates
the `users` collection OAuth provider settings automatically on startup. For
local development, the GitHub OAuth app callback URL should be
`http://127.0.0.1:8090/api/oauth2-redirect`.

When a submission record is created through the API, a PocketBase hook also
creates the initial preview deployment record and queues a deployment job for
the dedicated deployment worker.
