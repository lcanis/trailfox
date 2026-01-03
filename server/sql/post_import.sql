-- Post-import maintenance for Itinerarius (run after osm2pgsql)
\timing

DO $$ BEGIN RAISE NOTICE 'Starting amenities optimization...'; END $$;
CREATE INDEX IF NOT EXISTS idx_amenities_geom ON itinerarius.amenities USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_amenities_osm_id_type ON itinerarius.amenities (osm_id, osm_type);
CREATE INDEX IF NOT EXISTS idx_amenities_class ON itinerarius.amenities (class);
CREATE INDEX IF NOT EXISTS idx_amenities_subclass ON itinerarius.amenities (subclass);
ANALYZE itinerarius.amenities;

-- ---------------------------------------------------------------------------
-- Routes geometry post-processing
-- ---------------------------------------------------------------------------
DO $$ BEGIN RAISE NOTICE 'Creating itinerarius.ri and itinerarius.route_segments...'; END $$;

-- Route Info (ri) table: stores the merged geometry for each route.
DROP TABLE IF EXISTS itinerarius.ri CASCADE;
CREATE TABLE itinerarius.ri (
    osm_id bigint PRIMARY KEY,
    geom_m geometry(MultiLineStringM, 3857),
    length_m numeric,
    merged_geom_type text,
    geom_build_case text,
    geom_quality text,
    geom_parts integer
);

CREATE INDEX IF NOT EXISTS idx_routes_osm_id ON itinerarius.routes (osm_id);
CREATE INDEX IF NOT EXISTS idx_ri_osm_id ON itinerarius.ri (osm_id);

INSERT INTO itinerarius.ri (
    osm_id,
    geom_m,
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
),
with_stats AS (
    SELECT
        osm_id,
        geom,
        ST_Length(ST_Transform(geom, 4326)::geography) as length_m,
        GeometryType(geom) as merged_geom_type,
        'simple_merge' as geom_build_case,
        CASE
            WHEN GeometryType(geom) = 'LINESTRING' THEN 'ok_singleline'
            ELSE concat(ST_NumGeometries(geom)::text, ' parts')
        END as geom_quality,
        ST_NumGeometries(geom) as geom_parts
    FROM merged
)
SELECT
    osm_id,
    ST_Multi(ST_AddMeasure(geom, 0, length_m)) as geom_m,
    length_m,
    merged_geom_type,
    geom_build_case,
    geom_quality,
    geom_parts
FROM with_stats;

-- Used for advanced styling and topological analysis.
-- The Python route builder is the sole source of truth for these tables.
DROP TABLE IF EXISTS itinerarius.wmt_route_segments CASCADE;
CREATE TABLE itinerarius.wmt_route_segments (
    osm_id bigint,
    sequence_id integer,
    role text,
    direction text,
    geom geometry(LineString, 3857),
    length_m numeric
);
CREATE INDEX IF NOT EXISTS idx_route_segments_osm_id ON itinerarius.route_segments (osm_id);
