#!/usr/bin/env bash
# Helper: run post-import population and optional route_quality, then show verification
set -euo pipefail
DB=${1:-$PGDATABASE}
if [ -z "$DB" ]; then
  echo "Usage: $0 <database>\nYou can also set PGDATABASE env var." >&2
  exit 2
fi
psql -d "$DB" -f server/sql/post_import.sql
# route_quality.sql is optional for further analysis
psql -d "$DB" -f server/sql/route_quality.sql || true
echo "\ngeom_quality counts:" 
psql -d "$DB" -c "SELECT geom_quality, count(*) FROM itinerarius.route_info GROUP BY geom_quality ORDER BY count DESC;"
echo "\ngeom_parts distribution (sample):"
psql -d "$DB" -c "SELECT geom_parts, count(*) FROM itinerarius.route_info GROUP BY geom_parts ORDER BY geom_parts;"
