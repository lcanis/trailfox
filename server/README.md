# Server

Compose-first PostGIS + Martin + PostgREST.

Prereqs: Docker (Desktop/Engine) and `psql`.

Quick start:

```bash
cd server && cp .env.example .env
````

Edit settings/passwords in `.env`

Roles:

- `postgres` - the Postgres super-user (init-only; used by Docker entrypoint to initialize a fresh volume)
- `DB_ADMIN_USER` (example: `gisuser`) — DB admin / importer user for the `itinerarius` database; must have `CREATEDB` and is used for imports and administrative operations.
- `calixtinus` — app read-only user, used by PostgREST.

Start docker containers:

```bash
docker compose up --build 
```

Import (all steps):

```bash
bootstrap /path/to/region.osm.pbf
```

Incremental imports:

- `bootstrap ... --incremental` uses `osm2pgsql --slim` + `--append` (slower, more disk) and requires the DB to have been initialized in `--slim` mode.
- This is not the "replication diff" workflow; for true incremental updates from minutely/hourly diffs you would use `osm2pgsql-replication` (bundled in the `iboates/osm2pgsql` image).

Or run steps individually:

```bash
alter-db       # create DB (does not touch roles); use --force-reset to reinit and run init-user-db
import <pbf>   # import OSM data and run post-import maintenance
apply-schemas  # apply API and tiles schemas
```

If you need to recreate the db, drop the associated docker volume with

```bash
docker compose down
docker volume rm trailfox_pg_data
```
