-- Rebuild `itinerarius.route_info` table from `itinerarius.routes` (idempotent)
CREATE TABLE IF NOT EXISTS itinerarius.route_info (
    route_id bigint PRIMARY KEY,
    merged_geom_type text,
    geom_build_case text,
    geom_quality text,
    geom_parts integer
);

TRUNCATE TABLE itinerarius.route_info;
INSERT INTO itinerarius.route_info (route_id, merged_geom_type, geom_build_case, geom_quality, geom_parts)
SELECT
    osm_id,
    GeometryType(geom),
    'simple_merge',
    CASE
        WHEN GeometryType(geom) = 'LINESTRING' THEN 'ok_singleline'
        WHEN GeometryType(geom) = 'MULTILINESTRING' THEN concat(ST_NumGeometries(geom)::text, ' parts')
        ELSE 'other'
    END AS geom_quality,
    ST_NumGeometries(geom) AS geom_parts
FROM itinerarius.routes
WHERE geom IS NOT NULL;

-- Quick verification
SELECT route_id, geom_quality, geom_parts FROM itinerarius.route_info ORDER BY route_id LIMIT 10;