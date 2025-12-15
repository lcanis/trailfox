#!/usr/bin/env bash
set -euo pipefail

# Run a .sql file against the DB using credentials from ../.env via trailfox-psql
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

ENV_FILE_CANDIDATE="$(dirname "$0")/.env"
ENV_FILE_PARENT="$(dirname "$0")/../.env"
if [ -f "$ENV_FILE_CANDIDATE" ]; then
  ENV_FILE="$ENV_FILE_CANDIDATE"
elif [ -f "$ENV_FILE_PARENT" ]; then
  ENV_FILE="$ENV_FILE_PARENT"
else
  echo "Missing env file: looked for $ENV_FILE_CANDIDATE and $ENV_FILE_PARENT. Please create it and set required DB variables." >&2
  exit 1
fi

set -o allexport
# shellcheck disable=SC1090
source "$ENV_FILE"
set +o allexport

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
"$(dirname "$0")/trailfox-psql" -d "$POSTGRES_DB" -f "$SQLFILE"
