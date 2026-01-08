#!/usr/bin/env bash
set -euo pipefail

# Extract POIs and Routes from a large OSM PBF file using osmium.
# This reduces the data size significantly before importing with osm2pgsql.
# This is just a prefilter and further filtering NEEDS to be done during import.

INPUT_PBF="$1"
OUTPUT_PREFIX="${2:-extracted}"

if [ -z "$INPUT_PBF" ]; then
    echo "Usage: $0 <input.osm.pbf> [output_prefix]"
    exit 1
fi

echo "--- Extracting Hiking Routes and POIs ---"
# yes, that might include ferries and piers.
start_ts=$(date +%s)
if osmium tags-filter "$INPUT_PBF" \
    r/type=route,superroute \
    r/route=hiking,foot,walking,ferry \
    nwr/route=ferry nwr/man_made=pier nwr/ferry=yes \
    nwr/tourism nwr/amenity nwr/healthcare \
    nwr/amenity=place_of_worship \
    nwr/building=church,monastery,chapel \
    nwr/shop nwr/historic \
    nwr/leisure=swimming_pool,swimming_area,bathing_place,beach,picnic_table \
    nwr/natural=hot_spring,spring,beach \
    nwr/man_made=water_tap,water_well \
    nwr/waterway=stream \
    nwr/highway=bus_stop,rest_area nwr/railway=station,halt \
    nwr/aeroway=aerodrome,airport nwr/emergency=phone,defibrillator \
    nwr/place=city,town,village,hamlet,isolated_dwelling,farm \
    -o "${OUTPUT_PREFIX}-filtered.osm.pbf" --overwrite; then
  status=0
else
  status=$?
fi
end_ts=$(date +%s)
elapsed=$((end_ts - start_ts))
printf 'Elapsed time: %d:%02d:%02d\n' $((elapsed/3600)) $((elapsed%3600/60)) $((elapsed%60))

if [ "$status" -ne 0 ]; then
  echo "Extraction command failed with exit status $status"
  exit "$status"
fi

echo "Done. Created:"
ls -lh "${OUTPUT_PREFIX}-filtered.osm.pbf"
