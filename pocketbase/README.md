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

On first run, open the Dashboard and follow the installer link. You can also
create a superuser manually:

```bash
docker compose exec pocketbase /pb/pocketbase superuser create EMAIL PASSWORD
```
