-- Post-import maintenance for Itinerarius (run after osm2pgsql)
\timing

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
    geom_m geometry(GeometryM, 4326),
    length_m numeric,
    merged_geom_type text,
    geom_build_case text,
    geom_quality text,
    geom_parts integer
);

TRUNCATE itinerarius.ri;
CREATE INDEX IF NOT EXISTS idx_routes_osm_id ON itinerarius.routes (osm_id);
CREATE INDEX IF NOT EXISTS idx_ri_osm_id ON itinerarius.ri (osm_id);

INSERT INTO itinerarius.ri (
    osm_id,
    geom,
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
        ST_Length(geom::geography) as length_m,
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
    geom,
    ST_AddMeasure(geom, 0, length_m) as geom_m,
    length_m,
    merged_geom_type,
    geom_build_case,
    geom_quality,
    geom_parts
FROM with_stats;
