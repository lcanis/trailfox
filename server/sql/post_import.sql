-- Post-import maintenance for Itinerarius (run after osm2pgsql)
\timing

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- (not heavily used) Create a helper to execute SQL and RAISE NOTICE the elapsed time.
CREATE OR REPLACE FUNCTION public.log_timing(sql_text text, extra text DEFAULT '')
RETURNS interval AS $$
DECLARE
    t0 timestamp;
    d interval;
BEGIN
    t0 := clock_timestamp();
    EXECUTE sql_text;
    d := clock_timestamp() - t0;

    IF extra IS NOT NULL AND extra <> '' THEN
        RAISE NOTICE 'Executed in %   -- %', d, extra;
    ELSE
        RAISE NOTICE 'Executed in %', d;
    END IF;

    RETURN d;
END;
$$ LANGUAGE plpgsql VOLATILE;

DO $$ BEGIN RAISE NOTICE 'Starting amenities optimization...'; END $$;
-- Create indexes on amenities for fast spatial lookups
-- Amenities are now stored in 3857, so we index geom directly
CREATE INDEX IF NOT EXISTS idx_amenities_geom ON itinerarius.amenities USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_amenities_class ON itinerarius.amenities (class);
CREATE INDEX IF NOT EXISTS idx_amenities_subclass ON itinerarius.amenities (subclass);
ANALYZE itinerarius.amenities;

-- Drop the old materialized view if it exists
DROP MATERIALIZED VIEW IF EXISTS itinerarius.amenities_geog CASCADE;

-- ---------------------------------------------------------------------------
-- Routes geometry post-processing
-- ---------------------------------------------------------------------------
DO $$ BEGIN RAISE NOTICE 'Creating and populating itinerarius.route_info...'; END $$;

CREATE TABLE IF NOT EXISTS itinerarius.ri (
    osm_id bigint PRIMARY KEY,
    geom geometry(Geometry, 4326),
    length_m numeric,
    merged_geom_type text,
    geom_build_case text,
    geom_quality text,
    geom_parts integer
);
CREATE INDEX IF NOT EXISTS idx_ri_osm_id ON itinerarius.ri (osm_id);

-- Re-populate ri from scratch using a simpler approach
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

---- quality work done, now create indexes and materialize derived columns
-- 
DO $$ BEGIN RAISE NOTICE 'Creating materialized view routes_info...'; END $$;
CREATE INDEX IF NOT EXISTS idx_routes_osm_id ON itinerarius.routes (osm_id);
CREATE INDEX IF NOT EXISTS idx_ri_osm_id ON itinerarius.ri (osm_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS itinerarius.routes_info AS
SELECT
    r.osm_id,
    r.name,
    r.tags->>'network' AS network,
    route_type,
    r.tags->>'type' AS type,
    r.tags->>'symbol' AS symbol,
    r.distance,
    r.ascent,
    r.descent,
    r.roundtrip,
    r.tags,
    (ST_Length(ri.geom::geography)) AS length_m,
    ri.geom,
    (ST_Transform(ri.geom, 3857)) AS geom_3857,
    ri.merged_geom_type,
    ri.geom_build_case,
    ri.geom_quality,
    ri.geom_parts
FROM itinerarius.routes r
LEFT JOIN itinerarius.ri ri ON r.osm_id = ri.osm_id;
REFRESH MATERIALIZED VIEW itinerarius.routes_info;

DO $$ BEGIN RAISE NOTICE 'Creating indexes...'; END $$;

CREATE INDEX IF NOT EXISTS idx_routes_network ON itinerarius.routes_info (network);
CREATE INDEX IF NOT EXISTS idx_routes_route_type ON itinerarius.routes_info (route_type);
CREATE INDEX IF NOT EXISTS idx_routes_name ON itinerarius.routes_info (name);
CREATE INDEX IF NOT EXISTS idx_routes_name_trgm ON itinerarius.routes_info USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_routes_network_trgm ON itinerarius.routes_info USING GIN (network gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_route_info_length_m ON itinerarius.routes_info (length_m);
CREATE INDEX IF NOT EXISTS idx_route_info_geom ON itinerarius.routes_info USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_route_info_geom_3857 ON itinerarius.routes_info USING GIST (geom_3857);
ANALYZE itinerarius.routes_info;

-- raw_geom is kept only as importer output/debugging. Avoid indexing it.
DROP INDEX IF EXISTS itinerarius.routes_raw_geom_idx;

-- Fail-fast: ensure every route has a geometry.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM itinerarius.routes_info WHERE geom IS NULL) THEN
    RAISE EXCEPTION 'itinerarius.routes_info contains % routes with NULL geom; fix the import before proceeding', (SELECT count(*) FROM itinerarius.routes_info WHERE geom IS NULL);
  END IF;
END $$;
