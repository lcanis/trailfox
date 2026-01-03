-- Finalize post-import maintenance for Itinerarius (run after routebuilder)
\timing


---- quality work done, now create indexes and materialize derived columns
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

-- Fail-fast: ensure every route has a geometry.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM itinerarius.routes_info WHERE geom IS NULL) THEN
    RAISE EXCEPTION 'itinerarius.routes_info contains % routes with NULL geom; fix the import before proceeding', (SELECT count(*) FROM itinerarius.routes_info WHERE geom IS NULL);
  END IF;
END $$;
