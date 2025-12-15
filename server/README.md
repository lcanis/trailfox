docker compose exec postgis pg_dump -U gisuser itinerarius > itinerarius.sql

# Server

Compose-first PostGIS + Martin + PostgREST.

Prereqs: Docker (Desktop/Engine), `osm2pgsql` with Lua support, and `psql`.

Quick start:

```bash
cd server && cp .env.example .env
docker compose up -d
```

Import (all steps):

```bash
cd server && ./bootstrap /path/to/region.osm.pbf
```

Or run steps individually:

```bash
./init-db        # create DB and roles
./import <pbf>   # import OSM data and run post-import maintenance
./apply-schemas  # apply API and tiles schemas
```

Roles:

- `gisuser` — DB admin (read-write), used for imports. Set `DB_ADMIN_USER`/`DB_ADMIN_PASSWORD` in `.env`.
- `calixtinus` — app read-only user, used by PostgREST. Set `APP_USER`/`APP_PASSWORD` in `.env`.
