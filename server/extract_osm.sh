#!/usr/bin/env bash
set -euo pipefail

# Extract POIs and Routes from a large OSM PBF file using osmium.
# This reduces the data size significantly before importing with osm2pgsql.

INPUT_PBF="$1"
OUTPUT_PREFIX="${2:-extracted}"

if [ -z "$INPUT_PBF" ]; then
    echo "Usage: $0 <input.osm.pbf> [output_prefix]"
    exit 1
fi

echo "--- Extracting Hiking Routes and POIs ---"
# Combined filter for routes and amenities
osmium tags-filter "$INPUT_PBF" \
    r/type=route,superroute/route=hiking,foot,walking \
    nwr/tourism nwr/amenity nwr/healthcare \
    nwr/shop=supermarket,convenience,general,department_store,greengrocer,bakery,butcher,bicycle,sports \
    nwr/leisure=swimming_pool,picnic_table \
    nwr/historic=monument,memorial \
    nwr/natural=hot_spring \
    nwr/highway=bus_stop nwr/railway=station,halt \
    nwr/aeroway=aerodrome,airport nwr/emergency=phone,defibrillator \
    nwr/place=city,town,village,hamlet,isolated_dwelling,farm \
    -o "${OUTPUT_PREFIX}-filtered.osm.pbf" --overwrite

echo "Done. Created:"
ls -lh "${OUTPUT_PREFIX}-filtered.osm.pbf"
