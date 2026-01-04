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
# yes, that might include ferries and piers.
osmium tags-filter "$INPUT_PBF" \
    r/type=route,superroute \
    r/route=hiking,foot,walking,ferry \
    nwr/route=ferry \
    nwr/man_made=pier nwr/ferry=yes \
    nwr/tourism nwr/amenity nwr/healthcare \
    nwr/shop \
    nwr/leisure=swimming_pool,swimming_area,bathing_place,beach,picnic_table \
    nwr/historic=monument,memorial,statue \
    nwr/natural=hot_spring \
    nwr/highway=bus_stop nwr/railway=station,halt \
    nwr/aeroway=aerodrome,airport nwr/emergency=phone,defibrillator \
    nwr/place=city,town,village,hamlet,isolated_dwelling,farm \
    -o "${OUTPUT_PREFIX}-filtered.osm.pbf" --overwrite

echo "Done. Created:"
ls -lh "${OUTPUT_PREFIX}-filtered.osm.pbf"
