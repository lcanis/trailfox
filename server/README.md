# Server stack

Compose-first PostGIS + Martin + PostgREST. One bootstrap does DB prep and import.

## Prereqs

- Linux: Docker Engine (Ubuntu 24.04 tested)
- Windows: Docker Desktop with WSL 2 backend
- macOS: Docker Desktop
- `osm2pgsql` with Lua support and `psql`

## Quick start

```bash
cd server/setup && cp .env.example .env
```

Edit `.env` to set `DB_ADMIN_PASSWORD` (and override `CALIXTINUS_PASSWORD` if desired). Docker Compose reads this file automatically.

```bash
cd server/setup && docker compose up -d
```

Import

```bash
cd server/setup && ./bootstrap.sh /path/to/region.osm.pbf
```

Options:

- `./bootstrap.sh /path/to/file.osm.pbf --force-reset` drops and recreates the database before import.

## Roles

- `calixtinus`: app/read-only user used by PostgREST/Martin
- `importer`: write/import user used by the bootstrap/osm2pgsql pipeline
- `gisuser`: Postgres superuser inside the PostGIS container

## Backup (logical)

```bash
cd server/setup
docker compose exec postgis pg_dump -U gisuser itinerarius > itinerarius.sql
```

## Optional pgAdmin

If needed: `docker compose -f pgadmin-docker/docker-compose.yml up -d` (requires Docker Desktop/Engine running).
