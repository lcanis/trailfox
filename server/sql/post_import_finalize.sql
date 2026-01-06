-- Finalize post-import maintenance for Itinerarius (run after routebuilder)
\timing

-- Route hierarchy table and populate_route_hierarchy() function were already created
-- in route_hierarchy.sql before routebuilder ran. This file now handles:
-- 1. Fallback geometry assembly for routes routebuilder couldn't handle
-- 2. Materialized view creation
-- 3. Final indexing and validation

-- Function to assemble parent route geometry from child routes
-- NOTE: This is now a fallback only - routebuilder handles parent routes properly
-- Only assembles if routebuilder didn't create geometry
CREATE OR REPLACE FUNCTION itinerarius.assemble_parent_route_geometries()
RETURNS void AS $$
DECLARE
    parent_rec RECORD;
    child_geoms geometry[];
    assembled_geom geometry;
    geom_length numeric;
BEGIN
    FOR parent_rec IN
        SELECT DISTINCT h.parent_id, ri.geom_m as existing_geom, ri.geom_build_case
        FROM itinerarius.route_hierarchy h
        LEFT JOIN itinerarius.ri ri ON h.parent_id = ri.osm_id
        WHERE ri.geom_m IS NULL  -- Only assemble if routebuilder didn't create geometry
           OR (ri.geom_build_case NOT LIKE 'wmt_%' AND ri.geom_build_case != 'hierarchy_assembly')
        ORDER BY h.parent_id
    LOOP
        -- Skip if routebuilder already handled this
        IF parent_rec.geom_build_case LIKE 'wmt_%' THEN
            CONTINUE;
        END IF;
        
        -- Collect child geometries in sequence order (main role only for now)
        SELECT array_agg(ri.geom_m ORDER BY h.sequence)
        INTO child_geoms
        FROM itinerarius.route_hierarchy h
        JOIN itinerarius.ri ri ON h.child_id = ri.osm_id
        WHERE h.parent_id = parent_rec.parent_id
          AND ri.geom_m IS NOT NULL
          AND (h.role IS NULL OR h.role = '' OR h.role = 'main');
        
        IF child_geoms IS NULL OR array_length(child_geoms, 1) = 0 THEN
            RAISE WARNING 'Parent route % has no main-role child geometries', parent_rec.parent_id;
            CONTINUE;
        END IF;
        
        -- Merge child geometries: ST_Collect preserves child structure, ST_LineMerge connects endpoints
        assembled_geom := ST_Multi(ST_LineMerge(ST_Collect(child_geoms)));
        geom_length := ST_Length(ST_Transform(assembled_geom, 4326)::geography);
        
        -- Insert or update in ri table
        INSERT INTO itinerarius.ri (
            osm_id,
            geom_m,
            length_m,
            merged_geom_type,
            geom_build_case,
            geom_quality,
            geom_parts
        ) VALUES (
            parent_rec.parent_id,
            ST_AddMeasure(assembled_geom, 0, geom_length),
            geom_length,
            GeometryType(assembled_geom),
            'hierarchy_assembly_fallback',
            CASE
                WHEN GeometryType(assembled_geom) = 'LINESTRING' THEN 'ok_singleline'
                ELSE concat(ST_NumGeometries(assembled_geom)::text, ' parts')
            END,
            ST_NumGeometries(assembled_geom)
        )
        ON CONFLICT (osm_id) DO UPDATE SET
            geom_m = EXCLUDED.geom_m,
            length_m = EXCLUDED.length_m,
            merged_geom_type = EXCLUDED.merged_geom_type,
            geom_build_case = EXCLUDED.geom_build_case,
            geom_quality = EXCLUDED.geom_quality,
            geom_parts = EXCLUDED.geom_parts;
        
    END LOOP;
    
    RAISE NOTICE 'Assembled geometry for % parent routes (fallback)', (SELECT count(DISTINCT parent_id) FROM itinerarius.route_hierarchy WHERE parent_id NOT IN (SELECT osm_id FROM itinerarius.ri WHERE geom_build_case LIKE 'wmt_%'));
END;
$$ LANGUAGE plpgsql;

-- Execute fallback geometry assembly (skip if routebuilder handled it)
DO $$ BEGIN RAISE NOTICE 'Assembling parent route geometries (fallback)...'; END $$;
SELECT itinerarius.assemble_parent_route_geometries();

-- ---------------------------------------------------------------------------
-- Roundtrip (loop) precomputation
-- ---------------------------------------------------------------------------
-- Rule:
-- - If tags specify roundtrip=yes/no, respect it.
-- - Otherwise, infer loop when start/end are within 150m.
--
-- We normalize to NOT NULL boolean to make API filtering predictable.
DO $$ BEGIN RAISE NOTICE 'Computing roundtrip flags (tag OR endpoints within 150m)...'; END $$;

ALTER TABLE itinerarius.routes
    ALTER COLUMN roundtrip SET DEFAULT false;

WITH ends AS (
    SELECT
        osm_id,
        CASE
            WHEN geom_m IS NULL THEN false
            ELSE (
                WITH lm AS (
                    SELECT ST_LineMerge(geom_m) AS g
                )
                SELECT
                    CASE
                        WHEN GeometryType(g) <> 'LINESTRING' THEN false
                        ELSE ST_DWithin(
                            ST_Transform(ST_StartPoint(g), 4326)::geography,
                            ST_Transform(ST_EndPoint(g), 4326)::geography,
                            150
                        )
                    END
                FROM lm
            )
        END AS inferred_loop
    FROM itinerarius.ri
)
UPDATE itinerarius.routes r
SET roundtrip = CASE
    WHEN r.roundtrip IS TRUE THEN true
    WHEN r.roundtrip IS FALSE THEN false
    ELSE COALESCE(e.inferred_loop, false)
END
FROM ends e
WHERE e.osm_id = r.osm_id;

-- Any routes without merged geometry (no row in ri) default to false.
UPDATE itinerarius.routes
SET roundtrip = false
WHERE roundtrip IS NULL;

ALTER TABLE itinerarius.routes
    ALTER COLUMN roundtrip SET NOT NULL;

DO $$ BEGIN RAISE NOTICE 'Creating materialized view routes_info...'; END $$;

DROP MATERIALIZED VIEW IF EXISTS itinerarius.routes_info CASCADE;
CREATE MATERIALIZED VIEW itinerarius.routes_info AS
SELECT
    r.osm_id,
    r.name,
    r.tags->>'network' AS network,
    COALESCE((r.tags->>'network:type' = 'node_network'), false) AS is_node_network,
    route_type,
    r.tags->>'type' AS type,
    r.tags->>'symbol' AS symbol,
    r.distance,
    r.ascent,
    r.descent,
    r.roundtrip,
    r.tags,
    ri.length_m,
    ri.geom_m AS geom,
    ST_Transform(ri.geom_m, 4326) AS geom_4326, -- precompute for api routes, geojson, no indexing
    ri.merged_geom_type,
    ri.geom_build_case,
    ri.geom_quality,
    ri.geom_parts
FROM itinerarius.routes r
LEFT JOIN itinerarius.ri ri ON r.osm_id = ri.osm_id;
REFRESH MATERIALIZED VIEW itinerarius.routes_info;

DO $$ BEGIN RAISE NOTICE 'Creating indexes...'; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_routes_info_osm_id ON itinerarius.routes_info (osm_id);
CREATE INDEX IF NOT EXISTS idx_routes_network ON itinerarius.routes_info (network);
CREATE INDEX IF NOT EXISTS idx_routes_route_type ON itinerarius.routes_info (route_type);
CREATE INDEX IF NOT EXISTS idx_routes_name ON itinerarius.routes_info (name);
CREATE INDEX IF NOT EXISTS idx_routes_name_trgm ON itinerarius.routes_info USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_routes_network_trgm ON itinerarius.routes_info USING GIN (network gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_route_info_length_m ON itinerarius.routes_info (length_m);
CREATE INDEX IF NOT EXISTS idx_route_info_roundtrip ON itinerarius.routes_info (roundtrip);
CREATE INDEX IF NOT EXISTS idx_route_info_geom ON itinerarius.routes_info USING GIST (geom);
ANALYZE itinerarius.routes_info;

-- raw_geom is kept only as importer output/debugging. Avoid indexing it.
DROP INDEX IF EXISTS itinerarius.routes_raw_geom_idx;

--