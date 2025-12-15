-- Route Quality Analysis (On-Demand)
-- This script analyzes and flags routes with potential issues.
-- Run this separately when needed for route quality analysis.
-- It populates the geom_quality column in itinerarius.route_info.

-- Quality flags to identify broken/fragmented routes.
WITH lens AS (
    SELECT
        r.osm_id,
        r.geom,
        r.raw_geom,
        ST_NumGeometries(r.geom) AS geom_parts,
        GeometryType(r.geom) AS geom_type,
        -- Only compute lengths for small geometries to avoid heavy work
        CASE WHEN ST_NumGeometries(r.geom) = 1 AND ST_NumGeometries(r.raw_geom) <= 25 THEN ST_Length(r.raw_geom::geography) ELSE NULL END AS raw_len_m,
        CASE WHEN ST_NumGeometries(r.geom) = 1 AND ST_NumGeometries(r.raw_geom) <= 25 THEN ST_Length(r.geom::geography) ELSE NULL END AS geom_len_m
    FROM itinerarius.routes r
    WHERE r.raw_geom IS NOT NULL AND r.geom IS NOT NULL
)
UPDATE itinerarius.route_info ri
SET geom_quality = CASE
    WHEN lens.raw_len_m IS NOT NULL AND lens.raw_len_m > 0 AND (lens.geom_len_m / lens.raw_len_m) < 0.80 THEN 'broken_short'
    WHEN lens.raw_len_m IS NOT NULL AND lens.raw_len_m > 0 AND (lens.geom_len_m / lens.raw_len_m) > 1.20 THEN 'broken_long'
    WHEN lens.geom_type = 'LINESTRING' THEN 'ok_linestring'
    WHEN lens.geom_type = 'MULTILINESTRING' AND lens.geom_parts >= 25 THEN 'fragmented_multiline'
    WHEN lens.geom_type = 'MULTILINESTRING' THEN 'ok_multiline'
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
    ri.tags
FROM itinerarius.routes r
LEFT JOIN itinerarius.route_info ri ON r.osm_id = ri.route_id;
