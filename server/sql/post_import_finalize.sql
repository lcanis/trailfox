-- Finalize post-import maintenance for Itinerarius (run after routebuilder)
\timing

-- ---------------------------------------------------------------------------
-- Route hierarchy processing (after routebuilder has populated ri table)
-- ---------------------------------------------------------------------------
DO $$ BEGIN RAISE NOTICE 'Creating route hierarchy schema...'; END $$;

-- Route hierarchy table: materializes parent-child relationships from relation members
DROP TABLE IF EXISTS itinerarius.route_hierarchy CASCADE;
CREATE TABLE itinerarius.route_hierarchy (
    parent_id bigint NOT NULL,
    child_id bigint NOT NULL,
    sequence integer,
    role text,
    network_compatible boolean,
    PRIMARY KEY (parent_id, child_id)
);

-- Indexes for both parent->children and child->parents lookups
CREATE INDEX IF NOT EXISTS idx_route_hierarchy_parent ON itinerarius.route_hierarchy (parent_id);
CREATE INDEX IF NOT EXISTS idx_route_hierarchy_child ON itinerarius.route_hierarchy (child_id);

-- Function to parse members jsonb and populate route_hierarchy
-- Validates network tag hierarchy: iwn > nwn > rwn > lwn
-- Applies to ALL routes with relation members (not just superroutes)
CREATE OR REPLACE FUNCTION itinerarius.populate_route_hierarchy()
RETURNS void AS $$
DECLARE
    network_levels text[] := ARRAY['iwn', 'nwn', 'rwn', 'lwn'];
    parent_rec RECORD;
    parent_network_level integer;
BEGIN
    TRUNCATE itinerarius.route_hierarchy;
    
    FOR parent_rec IN 
        SELECT osm_id, tags->>'network' AS network, members
        FROM itinerarius.routes
        WHERE members IS NOT NULL
          AND EXISTS (
              SELECT 1 FROM jsonb_array_elements(members) m 
              WHERE m->>'type' = 'r'
          )
    LOOP
        -- Get parent network level (1=iwn, 2=nwn, 3=rwn, 4=lwn, null=unspecified)
        parent_network_level := array_position(network_levels, parent_rec.network);
        
        -- Extract relation members and insert into hierarchy
        INSERT INTO itinerarius.route_hierarchy (parent_id, child_id, sequence, role, network_compatible)
        SELECT 
            parent_rec.osm_id,
            (member->>'ref')::bigint,
            (row_number() OVER ())::integer,
            member->>'role',
            CASE
                -- If parent has no network tag, accept any child
                WHEN parent_network_level IS NULL THEN true
                -- If child doesn't exist or has no network, flag as incompatible
                WHEN child_info.network IS NULL THEN false
                -- Check if child network is same or more specific than parent
                ELSE child_level.child_network_level >= parent_network_level
            END
        FROM jsonb_array_elements(parent_rec.members) AS member
        CROSS JOIN LATERAL (
            SELECT tags->>'network' AS network
            FROM itinerarius.routes
            WHERE osm_id = (member->>'ref')::bigint
        ) AS child_info
        CROSS JOIN LATERAL (
            SELECT array_position(network_levels, child_info.network) AS child_network_level
        ) AS child_level
        WHERE member->>'type' = 'r'
        ON CONFLICT (parent_id, child_id) DO NOTHING;
        
    END LOOP;
    
    RAISE NOTICE 'Populated % parent-child relationships', (SELECT count(*) FROM itinerarius.route_hierarchy);
    
    -- Log warnings for network mismatches
    FOR parent_rec IN
        SELECT 
            h.parent_id,
            pr.name AS parent_name,
            pr.tags->>'network' AS parent_network,
            h.child_id,
            cr.name AS child_name,
            cr.tags->>'network' AS child_network
        FROM itinerarius.route_hierarchy h
        JOIN itinerarius.routes pr ON h.parent_id = pr.osm_id
        LEFT JOIN itinerarius.routes cr ON h.child_id = cr.osm_id
        WHERE NOT h.network_compatible
    LOOP
        RAISE WARNING 'Network mismatch: % (%) -> % (%)',
            parent_rec.parent_name, parent_rec.parent_network,
            parent_rec.child_name, parent_rec.child_network;
    END LOOP;
    
END;
$$ LANGUAGE plpgsql;

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

-- Execute hierarchy processing
DO $$ BEGIN RAISE NOTICE 'Populating route hierarchy...'; END $$;
SELECT itinerarius.populate_route_hierarchy();

DO $$ BEGIN RAISE NOTICE 'Assembling parent route geometries...'; END $$;
SELECT itinerarius.assemble_parent_route_geometries();

ANALYZE itinerarius.route_hierarchy;

DO $$ BEGIN RAISE NOTICE 'Creating materialized view routes_info...'; END $$;

DROP MATERIALIZED VIEW IF EXISTS itinerarius.routes_info CASCADE;
CREATE MATERIALIZED VIEW itinerarius.routes_info AS
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
CREATE INDEX IF NOT EXISTS idx_route_info_geom ON itinerarius.routes_info USING GIST (geom);
ANALYZE itinerarius.routes_info;

-- raw_geom is kept only as importer output/debugging. Avoid indexing it.
DROP INDEX IF EXISTS itinerarius.routes_raw_geom_idx;

--