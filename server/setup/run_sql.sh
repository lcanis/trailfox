#!/usr/bin/env bash
set -euo pipefail

# Run a .sql file against the DB using credentials from ../.env
# Usage: ./run_sql.sh path/to/file.sql

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 path/to/file.sql" >&2
  exit 2
fi

SQLFILE="$1"
if [ ! -f "$SQLFILE" ]; then
  echo "SQL file not found: $SQLFILE" >&2
  exit 2
fi

# load .env and fail if missing (script requires configuration in this file)
ENV_FILE="$(dirname "$0")/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE. Please create it and set required DB variables." >&2
  exit 1
fi
set -o allexport
# shellcheck disable=SC1090
source "$ENV_FILE"
set +o allexport

# Require essential vars in .env — no implicit defaults
MISSING=()
for v in POSTGRES_HOST POSTGRES_PORT POSTGRES_DB POSTGRES_USER DB_ADMIN_PASSWORD; do
  if [ -z "${!v:-}" ]; then
    MISSING+=("$v")
  fi
done
if [ ${#MISSING[@]} -ne 0 ]; then
  echo "Missing required variables in $ENV_FILE: ${MISSING[*]}" >&2
  echo "Please set them in $ENV_FILE and retry." >&2
  exit 3
fi

export PGPASSWORD="$DB_ADMIN_PASSWORD"
# Set ON_ERROR_STOP so psql stops on the first error
psql -v ON_ERROR_STOP=1 -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$SQLFILE"
