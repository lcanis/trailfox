#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-itinerarius}"
DB_ADMIN_USER="${DB_ADMIN_USER:-gisuser}"
IMPORTER_USER="${IMPORTER_USER:-importer}"
APP_USER="${APP_USER:-calixtinus}"
DB_WAIT_TIMEOUT="${DB_WAIT_TIMEOUT:-30}"
LUA_SCRIPT="$ROOT_DIR/osm2pgsql/itinerarius.lua"
ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/.env}"
FORCE_RESET=false
PBF_FILE=""

usage() {
    cat <<'EOF'
Usage: ./bootstrap.sh /path/to/file.osm.pbf [--env-file path] [--force-reset]

First argument: local .osm.pbf path. Requires an env file. Idempotent by default; use --force-reset to drop and recreate the database.
EOF
}

if [ "$#" -lt 1 ]; then
    usage
    exit 2
fi

PBF_FILE="$1"
shift

while [ "$#" -gt 0 ]; do
    case "$1" in
        --env-file)
            ENV_FILE="$2"; shift 2;;
        --force-reset)
            FORCE_RESET=true; shift;;
        -h|--help)
            usage; exit 0;;
        *)
            echo "Unknown option: $1" >&2; usage; exit 2;;
    esac
done

if [ ! -f "$ENV_FILE" ]; then
    echo "Missing env file: $ENV_FILE" >&2
    exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

if [ -z "${DB_ADMIN_PASSWORD:-}" ]; then
    echo "Missing DB_ADMIN_PASSWORD (set in $ENV_FILE or environment)" >&2
    exit 1
fi

if [ -z "${CALIXTINUS_PASSWORD:-}" ]; then
    echo "Missing CALIXTINUS_PASSWORD (set in $ENV_FILE or environment)" >&2
    exit 1
fi

if [ -z "${IMPORTER_PASSWORD:-}" ]; then
    echo "Missing IMPORTER_PASSWORD (set in $ENV_FILE or environment)" >&2
    exit 1
fi

APP_PASSWORD="$CALIXTINUS_PASSWORD"
IMPORTER_PASSWORD="$IMPORTER_PASSWORD"

command -v psql >/dev/null 2>&1 || { echo "psql is required" >&2; exit 1; }
command -v osm2pgsql >/dev/null 2>&1 || { echo "osm2pgsql is required" >&2; exit 1; }

if [ ! -f "$PBF_FILE" ]; then
    echo "Missing PBF file: $PBF_FILE" >&2
    exit 1
fi

echo "Waiting for Postgres at $DB_HOST:$DB_PORT..."
READY=false
for ((i=1; i<=DB_WAIT_TIMEOUT; i++)); do
    if PGPASSWORD="$DB_ADMIN_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -d postgres -c "SELECT 1" >/dev/null 2>&1; then
        READY=true
        break
    fi
    sleep 1
done

if [ "$READY" = false ]; then
    echo "Postgres not reachable after ${DB_WAIT_TIMEOUT}s" >&2
    cat >&2 <<EOF

Troubleshooting steps:
  - Check if the Docker containers are running: docker compose ps
  - Verify your .env file configuration: $ENV_FILE
  - Examine the Postgres container logs: docker compose logs postgis

If Postgres is running on a different host or port, check your DB_HOST and DB_PORT settings.
EOF
    exit 1
fi

export PGPASSWORD="$DB_ADMIN_PASSWORD"

echo "-- ensuring roles"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -d postgres \
    -v IMPORTER_USER="$IMPORTER_USER" -v IMPORTER_PASSWORD="$IMPORTER_PASSWORD" \
    -v APP_USER="$APP_USER" -v APP_PASSWORD="$APP_PASSWORD" <<'SQL'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'IMPORTER_USER') THEN
        EXECUTE format('CREATE ROLE %I WITH LOGIN PASSWORD %L NOCREATEDB NOCREATEROLE NOINHERIT', :'IMPORTER_USER', :'IMPORTER_PASSWORD');
    ELSE
        EXECUTE format('ALTER ROLE %I WITH PASSWORD %L NOCREATEDB NOCREATEROLE NOINHERIT', :'IMPORTER_USER', :'IMPORTER_PASSWORD');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'APP_USER') THEN
        EXECUTE format('CREATE ROLE %I WITH LOGIN PASSWORD %L NOINHERIT NOCREATEDB NOCREATEROLE', :'APP_USER', :'APP_PASSWORD');
    ELSE
        EXECUTE format('ALTER ROLE %I WITH PASSWORD %L NOINHERIT NOCREATEDB NOCREATEROLE', :'APP_USER', :'APP_PASSWORD');
    END IF;
END
$$;
SQL

if $FORCE_RESET; then
    echo "-- dropping database $DB_NAME"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
fi

EXISTS_DB=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';")
if [ "$EXISTS_DB" != "1" ]; then
    echo "-- creating database $DB_NAME owned by $IMPORTER_USER"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -d postgres -c "CREATE DATABASE $DB_NAME OWNER $IMPORTER_USER;"
else
    echo "-- database $DB_NAME exists (leave as-is)"
fi

echo "-- ensuring database owner is $IMPORTER_USER"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -d postgres -c "ALTER DATABASE $DB_NAME OWNER TO $IMPORTER_USER;"

echo "-- applying base schema setup"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -d "$DB_NAME" \
    -v IMPORTER_USER="$IMPORTER_USER" -v APP_USER="$APP_USER" -f "$SCRIPT_DIR/setup_itinerarius.sql"

echo "-- applying api schema"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -d "$DB_NAME" \
    -v IMPORTER_USER="$IMPORTER_USER" -v APP_USER="$APP_USER" -f "$SCRIPT_DIR/setup_api.sql"

echo "-- granting connect to app user"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -d postgres -c "GRANT CONNECT ON DATABASE $DB_NAME TO $APP_USER;"

echo "-- using local PBF $PBF_FILE"

echo "-- running osm2pgsql import"
export PGPASSWORD="$IMPORTER_PASSWORD"
export LUA_PATH="$ROOT_DIR/osm2pgsql/?.lua;;"
osm2pgsql -H "$DB_HOST" -P "$DB_PORT" -d "$DB_NAME" -U "$IMPORTER_USER" \
    -O flex -S "$LUA_SCRIPT" --create --drop "$PBF_FILE"

echo "-- post-import maintenance"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$IMPORTER_USER" -d "$DB_NAME" <<'SQL'
CREATE INDEX IF NOT EXISTS idx_amenities_geom ON itinerarius.amenities USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_amenities_class ON itinerarius.amenities (class);
CREATE INDEX IF NOT EXISTS idx_amenities_subclass ON itinerarius.amenities (subclass);

CREATE INDEX IF NOT EXISTS idx_routes_geom ON itinerarius.routes USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_routes_network ON itinerarius.routes (network);
CREATE INDEX IF NOT EXISTS idx_routes_route_type ON itinerarius.routes (route_type);
CREATE INDEX IF NOT EXISTS idx_routes_name ON itinerarius.routes (name);

ALTER TABLE itinerarius.routes ADD COLUMN IF NOT EXISTS length_m numeric;
UPDATE itinerarius.routes SET length_m = ST_Length(geom::geography) WHERE length_m IS NULL;
CREATE INDEX IF NOT EXISTS idx_routes_length_m ON itinerarius.routes (length_m);

ANALYZE itinerarius.amenities;
ANALYZE itinerarius.routes;
SQL

echo "-- results"
AMENITIES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$IMPORTER_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM itinerarius.amenities")
ROUTES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$IMPORTER_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM itinerarius.routes")
echo "amenities: $AMENITIES"
echo "routes: $ROUTES"
echo "done"
