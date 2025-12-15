-- Route Quality Analysis (On-Demand)
-- This script analyzes and flags routes with potential issues.
-- Route Quality Analysis (On-Demand)
-- This script analyzes and flags routes with potential issues.
-- It is useful to run this separately for more nuanced analysis in addition to
-- the post-import population (e.g. advanced length checks or manual overrides).
-- Run with: `psql -d <your_db> -f server/sql/route_quality.sql`
-- It populates the geom_quality column in itinerarius.route_info.

-- Quality flags to identify broken/fragmented routes.
WITH lens AS (
    SELECT
        r.osm_id,
        r.geom,
        r.raw_geom,
        ST_NumGeometries(r.geom) AS geom_parts,
        GeometryType(r.geom) AS geom_type
    FROM itinerarius.routes r
    WHERE r.raw_geom IS NOT NULL AND r.geom IS NOT NULL
)
UPDATE itinerarius.route_info ri
SET geom_parts = lens.geom_parts,
    geom_quality = CASE
        WHEN lens.geom_type = 'LINESTRING' THEN 'ok_singleline'
        WHEN lens.geom_type = 'MULTILINESTRING' THEN concat(lens.geom_parts::text, ' parts')
        ELSE 'other'
    END
FROM lens
WHERE ri.route_id = lens.osm_id;

-- Joined view combining routes with their metadata/quality info
DROP VIEW IF EXISTS itinerarius.routes_with_info;
CREATE VIEW itinerarius.routes_with_info AS
SELECT
    r.osm_id,
    r.name,
    r.network,
    r.route_type,
    r.symbol,
    r.distance,
    r.ascent,
    r.descent,
    r.roundtrip,
    r.length_m,
    r.geom,
    r.raw_geom,
    ri.merged_geom_type,
    ri.geom_build_case,
    ri.geom_quality,
    ri.geom_parts,
    ri.tags
FROM itinerarius.routes r
LEFT JOIN itinerarius.route_info ri ON r.osm_id = ri.route_id;
