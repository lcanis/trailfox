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
    rows_affected integer;
BEGIN
    -- Bottom-up assembly: iterate until no more parents can be assembled.
    -- A parent is eligible once *all* of its main-role children have geom_m.
    LOOP
        WITH child_counts AS (
            SELECT
                h.parent_id,
                count(*)::int AS expected_children
            FROM itinerarius.route_hierarchy h
            WHERE (h.role IS NULL OR h.role = '' OR h.role = 'main')
            GROUP BY h.parent_id
        ),
        candidates AS (
            SELECT
                h.parent_id,
                ST_Multi(ST_LineMerge(ST_Collect(ri_child.geom_m))) AS assembled_geom,
                ST_Length(ST_Transform(ST_Multi(ST_LineMerge(ST_Collect(ri_child.geom_m))), 4326)::geography) AS geom_length,
                GeometryType(ST_Multi(ST_LineMerge(ST_Collect(ri_child.geom_m)))) AS merged_geom_type,
                ST_NumGeometries(ST_Multi(ST_LineMerge(ST_Collect(ri_child.geom_m)))) AS geom_parts
            FROM itinerarius.route_hierarchy h
            JOIN child_counts cc ON cc.parent_id = h.parent_id
            JOIN itinerarius.ri ri_child ON ri_child.osm_id = h.child_id
            LEFT JOIN itinerarius.ri ri_parent ON ri_parent.osm_id = h.parent_id
            WHERE
                (h.role IS NULL OR h.role = '' OR h.role = 'main')
                AND ri_child.geom_m IS NOT NULL
                AND (
                    ri_parent.geom_m IS NULL
                    OR (
                        ri_parent.geom_build_case NOT LIKE 'wmt_%'
                        AND ri_parent.geom_build_case NOT LIKE 'hierarchy_assembly_%'
                    )
                )
            GROUP BY h.parent_id, cc.expected_children
            HAVING count(*)::int = cc.expected_children
        )
        INSERT INTO itinerarius.ri (
            osm_id,
            geom_m,
            length_m,
            merged_geom_type,
            geom_build_case,
            geom_quality,
            geom_parts
        )
        SELECT
            c.parent_id,
            ST_AddMeasure(c.assembled_geom, 0, c.geom_length),
            c.geom_length,
            c.merged_geom_type,
            'hierarchy_assembly_fallback',
            CASE
                WHEN c.merged_geom_type = 'LINESTRING' THEN 'ok_singleline'
                ELSE concat(c.geom_parts::text, ' parts')
            END,
            c.geom_parts
        FROM candidates c
        ON CONFLICT (osm_id) DO UPDATE SET
            geom_m = EXCLUDED.geom_m,
            length_m = EXCLUDED.length_m,
            merged_geom_type = EXCLUDED.merged_geom_type,
            geom_build_case = EXCLUDED.geom_build_case,
            geom_quality = EXCLUDED.geom_quality,
            geom_parts = EXCLUDED.geom_parts;

        GET DIAGNOSTICS rows_affected = ROW_COUNT;
        EXIT WHEN rows_affected = 0;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute fallback geometry assembly (skip if routebuilder handled it)
DO $$ BEGIN RAISE NOTICE 'Assembling parent route geometries (fallback)...'; END $$;
SELECT itinerarius.assemble_parent_route_geometries();

-- ---------------------------------------------------------------------------
-- Naming backfill for missing route names
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION itinerarius.route_display_name(tags jsonb, name text)
RETURNS text AS $$
DECLARE
    final_name text;
    v_ref text;
    v_from text;
    v_to text;
BEGIN
    final_name := NULLIF(btrim(name), '');
    v_ref := NULLIF(btrim(tags->>'ref'), '');
    v_from := NULLIF(btrim(tags->>'from'), '');
    v_to := NULLIF(btrim(tags->>'to'), '');

    -- If name is missing, build it from 'from' and 'to'
    IF final_name IS NULL THEN
        IF v_from IS NOT NULL AND v_to IS NOT NULL THEN
            final_name := v_from || ' -> ' || v_to;
        ELSIF v_from IS NOT NULL THEN
            final_name := v_from;
        ELSIF v_to IS NOT NULL THEN
            final_name := v_to;
        END IF;
    END IF;

    -- If we still have no name, use ref
    IF final_name IS NULL THEN
        final_name := v_ref;
    ELSIF v_ref IS NOT NULL AND NOT (final_name LIKE v_ref || '%') THEN
        -- Prepend ref if not already there
        final_name := v_ref || ': ' || final_name;
    END IF;

    RETURN final_name;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

UPDATE itinerarius.routes r
SET name = itinerarius.route_display_name(r.tags, r.name)
WHERE name IS DISTINCT FROM itinerarius.route_display_name(r.tags, r.name);

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
    itinerarius.route_display_name(r.tags, r.name) AS name,
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