TRUNCATE itinerarius.ri;

INSERT INTO itinerarius.ri (
    osm_id,
    geom,
    length_m,
    merged_geom_type,
    geom_build_case,
    geom_quality,
    geom_parts
)
WITH base AS (
    SELECT osm_id, raw_geom
    FROM itinerarius.routes
    WHERE raw_geom IS NOT NULL
),
merged AS (
    SELECT 
        osm_id, 
        ST_LineMerge(raw_geom) as geom
    FROM base
)
SELECT
    osm_id,
    geom,
    ST_Length(geom::geography) as length_m,
    GeometryType(geom) as merged_geom_type,
    'simple_merge' as geom_build_case,
    CASE
        WHEN GeometryType(geom) = 'LINESTRING' THEN 'ok_singleline'
        ELSE concat(ST_NumGeometries(geom)::text, ' parts')
    END as geom_quality,
    ST_NumGeometries(geom) as geom_parts
FROM merged;
