#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_NAME="${DB_NAME:-itinerarius}"
DB_ADMIN_USER="${DB_ADMIN_USER:-gisuser}"
IMPORTER_USER="${IMPORTER_USER:-importer}"
APP_USER="${APP_USER:-calixtinus}"
DB_WAIT_TIMEOUT="${DB_WAIT_TIMEOUT:-30}"
DB_STATEMENT_TIMEOUT_MS="${DB_STATEMENT_TIMEOUT_MS:-120000}"
LUA_SCRIPT="$ROOT_DIR/osm2pgsql/itinerarius.lua"
ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/.env}"
FORCE_RESET=false
INCREMENTAL=false
PBF_FILE=""

usage() {
    cat <<'EOF'
Usage: ./bootstrap.sh /path/to/file.osm.pbf [--env-file path] [--force-reset] [--incremental]

First argument: local .osm.pbf path. Requires an env file.

Modes:
    --force-reset  Drop and recreate the database.
    --incremental  Enable osm2pgsql slim mode and append updates when tables exist.
                                NOTE: osm2pgsql requires --slim for --append; this stores extra data
                                in the DB to support updates and can significantly increase size.
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
        --incremental)
            INCREMENTAL=true; shift;;
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

# DB_PORT must be set via POSTGRES_PORT in the .env file; do not override via DB_PORT
if [ -z "${POSTGRES_PORT:-}" ]; then
    echo "Missing POSTGRES_PORT in $ENV_FILE. Please set POSTGRES_PORT and retry." >&2
    exit 1
fi
DB_PORT="$POSTGRES_PORT"

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
# Using shell interpolation for role creation to avoid psql variable issues in DO blocks
psql -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -d postgres <<EOF
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$IMPORTER_USER') THEN
        CREATE ROLE "$IMPORTER_USER" WITH LOGIN PASSWORD '$IMPORTER_PASSWORD' NOCREATEDB NOCREATEROLE NOINHERIT;
    ELSE
        ALTER ROLE "$IMPORTER_USER" WITH PASSWORD '$IMPORTER_PASSWORD' NOCREATEDB NOCREATEROLE NOINHERIT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$APP_USER') THEN
        CREATE ROLE "$APP_USER" WITH LOGIN PASSWORD '$APP_PASSWORD' NOINHERIT NOCREATEDB NOCREATEROLE;
    ELSE
        ALTER ROLE "$APP_USER" WITH PASSWORD '$APP_PASSWORD' NOINHERIT NOCREATEDB NOCREATEROLE;
    END IF;
END
\$\$;
EOF

echo "-- setting safety timeouts"
psql -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -d postgres \
    -c "ALTER ROLE \"$DB_ADMIN_USER\" SET statement_timeout = '2min';"


if $FORCE_RESET; then
    echo "-- dropping database $DB_NAME"
    # Terminate any active connections to the target DB so DROP DATABASE succeeds.
    # Retry a few times in case clients (eg. PostgREST) reconnect quickly.
    echo "-- terminating connections to $DB_NAME"
    ATTEMPTS=0
    while true; do
        psql -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -d postgres -c \
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" >/dev/null

        SESSIONS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -d postgres -tAc \
            "SELECT count(*) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();")

        if [ "$SESSIONS" = "0" ]; then
            break
        fi

        ATTEMPTS=$((ATTEMPTS + 1))
        if [ "$ATTEMPTS" -ge 5 ]; then
            echo "-- warning: $SESSIONS connections remain after $ATTEMPTS attempts; proceeding to DROP and hope for best"
            break
        fi

        echo "-- $SESSIONS connections still present; retrying in 1s"
        sleep 1
    done

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
    -v ON_ERROR_STOP=1 -v IMPORTER_USER="$IMPORTER_USER" -v APP_USER="$APP_USER" -f "$SCRIPT_DIR/sql/setup_itinerarius.sql"

echo "-- granting connect to app user"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -d postgres -c "GRANT CONNECT ON DATABASE $DB_NAME TO $APP_USER;"

echo "-- using local PBF $PBF_FILE"

echo "-- running osm2pgsql import"
export PGPASSWORD="$IMPORTER_PASSWORD"
export LUA_PATH="$ROOT_DIR/osm2pgsql/?.lua;;"

OSM2PGSQL_MODE_ARGS=(--create)
if $INCREMENTAL; then
    # osm2pgsql requires --slim for --append updates.
    # NOTE: Slim mode stores additional OSM data in DB to support updates.
    OSM2PGSQL_MODE_ARGS=(--slim)

    HAS_OUTPUT_TABLES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$IMPORTER_USER" -d "$DB_NAME" -tAc \
        "SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='itinerarius' AND c.relname IN ('routes','amenities') LIMIT 1;")

    HAS_SLIM_TABLES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$IMPORTER_USER" -d "$DB_NAME" -tAc \
        "SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('osm2pgsql_nodes','osm2pgsql_ways','osm2pgsql_rels') LIMIT 1;")

    if [ "$HAS_OUTPUT_TABLES" = "1" ] && [ "$HAS_SLIM_TABLES" != "1" ]; then
        cat >&2 <<'EOF'

ERROR: Incremental mode requested but database is not initialized in osm2pgsql --slim mode.

osm2pgsql requires --slim for --append updates. To initialize slim mode, run once with:
  ./bootstrap.sh <file.osm.pbf> --env-file ./.env --force-reset --incremental

EOF
        exit 1
    fi

    if [ "$HAS_OUTPUT_TABLES" = "1" ]; then
        OSM2PGSQL_MODE_ARGS+=(--append)
    else
        OSM2PGSQL_MODE_ARGS+=(--create)
    fi
else
    # Non-incremental: keep DB small by dropping middle tables after import.
    OSM2PGSQL_MODE_ARGS+=(--create --drop)
fi

osm2pgsql -H "$DB_HOST" -P "$DB_PORT" -d "$DB_NAME" -U "$IMPORTER_USER" \
    -O flex -S "$LUA_SCRIPT" "${OSM2PGSQL_MODE_ARGS[@]}" "$PBF_FILE"

# Reset PGPASSWORD for admin tasks
export PGPASSWORD="$DB_ADMIN_PASSWORD"

echo "-- post-import maintenance"
export PGPASSWORD="$IMPORTER_PASSWORD"
PGOPTIONS="-c statement_timeout=$DB_STATEMENT_TIMEOUT_MS" \
    psql -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" -U "$IMPORTER_USER" -d "$DB_NAME" -f "$SCRIPT_DIR/sql/post_import.sql"

# Reset PGPASSWORD for admin tasks
export PGPASSWORD="$DB_ADMIN_PASSWORD"

if command -v docker >/dev/null 2>&1; then
  if ! docker volume inspect trailfox_pg_data >/dev/null 2>&1; then
    docker volume create trailfox_pg_data >/dev/null 2>&1
  fi
fi

echo "-- applying api schema"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -d "$DB_NAME" \
    -v ON_ERROR_STOP=1 -v IMPORTER_USER="$IMPORTER_USER" -v APP_USER="$APP_USER" -f "$SCRIPT_DIR/sql/setup_api.sql"

echo "-- applying tiles schema"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -d "$DB_NAME" \
    -v ON_ERROR_STOP=1 -v IMPORTER_USER="$IMPORTER_USER" -v APP_USER="$APP_USER" -f "$SCRIPT_DIR/sql/setup_tiles.sql"


echo "-- results"
AMENITIES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM itinerarius.amenities")
ROUTES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM itinerarius.routes")
echo "amenities: $AMENITIES"
echo "routes: $ROUTES"
echo "done"
