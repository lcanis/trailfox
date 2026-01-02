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
DO $$ BEGIN RAISE NOTICE 'Creating itinerarius.ri and itinerarius.route_segments...'; END $$;

-- Route Info (ri) table: stores the final merged geometry for each route.
-- The Python route builder is the sole source of truth for this table.
DROP TABLE IF EXISTS itinerarius.ri CASCADE;
CREATE TABLE itinerarius.ri (
    osm_id bigint PRIMARY KEY,
    geom geometry(GeometryM, 3857),
    length_m numeric,
    merged_geom_type text,
    geom_build_case text,
    geom_quality text,
    geom_parts integer
);

-- Route Segments table: stores the exploded segments of a route.
-- Used for advanced styling and topological analysis.
DROP TABLE IF EXISTS itinerarius.route_segments CASCADE;
CREATE TABLE itinerarius.route_segments (
    osm_id bigint,
    sequence_id integer,
    role text,
    direction text,
    geom geometry(LineStringM, 3857),
    length_m numeric
);

TRUNCATE itinerarius.ri;
TRUNCATE itinerarius.route_segments;

CREATE INDEX IF NOT EXISTS idx_routes_osm_id ON itinerarius.routes (osm_id);
CREATE INDEX IF NOT EXISTS idx_ri_osm_id ON itinerarius.ri (osm_id);
CREATE INDEX IF NOT EXISTS idx_route_segments_osm_id ON itinerarius.route_segments (osm_id);
