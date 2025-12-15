-- Post-import maintenance for Itinerarius (run after osm2pgsql)

CREATE INDEX idx_amenities_geom ON itinerarius.amenities USING GIST (geom);
CREATE INDEX idx_amenities_geom_geog ON itinerarius.amenities USING GIST ((geom::geography));
CREATE INDEX idx_amenities_class ON itinerarius.amenities (class);
CREATE INDEX idx_amenities_subclass ON itinerarius.amenities (subclass);
CREATE INDEX idx_amenities_osm_type_id ON itinerarius.amenities (osm_type, osm_id);

-- ---------------------------------------------------------------------------
-- Routes geometry post-processing
-- ---------------------------------------------------------------------------
--  - raw_geom: importer output (MultiLineString, 4326)
--  - geom: simple line-merged output (LineString or MultiLineString, 4326)
--  - route_info table: stores metadata like merged_geom_type, geom_build_case, geom_quality

ALTER TABLE itinerarius.routes ADD COLUMN geom geometry(Geometry, 4326);
UPDATE itinerarius.routes SET geom = ST_LineMerge(raw_geom);

-- Create separate table for route metadata (quality is computed on-demand in route_quality.sql)
CREATE TABLE IF NOT EXISTS itinerarius.route_info (
    route_id bigint PRIMARY KEY,
    merged_geom_type text,
    geom_build_case text,
    geom_quality text,
    geom_parts integer
);

INSERT INTO itinerarius.route_info (route_id, merged_geom_type, geom_build_case, geom_parts)
SELECT
    osm_id,
    GeometryType(geom),
    'simple_merge',
    ST_NumGeometries(geom)
FROM itinerarius.routes
WHERE geom IS NOT NULL;

-- Populate initial geom_quality values based on geometry type
-- LINESTRING => 'ok_singleline'
-- MULTILINESTRING => '<N> parts'
UPDATE itinerarius.route_info ri
SET geom_parts = r.geom_parts,
    geom_quality = CASE
        WHEN r.geom_type = 'LINESTRING' THEN 'ok_singleline'
        WHEN r.geom_type = 'MULTILINESTRING' THEN concat(r.geom_parts::text, ' parts')
        ELSE 'other'
    END
FROM (
    SELECT osm_id, GeometryType(geom) AS geom_type, ST_NumGeometries(geom) AS geom_parts
    FROM itinerarius.routes
    WHERE geom IS NOT NULL
) r
WHERE ri.route_id = r.osm_id;

-- Length in meters (geodesic). Keeping this materialized avoids repeated ST_Length calls.
ALTER TABLE itinerarius.routes ADD COLUMN length_m numeric;
UPDATE itinerarius.routes SET length_m = ST_Length(geom::geography)
WHERE geom IS NOT NULL AND ST_NumGeometries(geom) <= 25;

-- Routes indexes
CREATE INDEX idx_routes_osm_id ON itinerarius.routes (osm_id);
CREATE INDEX idx_routes_network ON itinerarius.routes (network);
CREATE INDEX idx_routes_route_type ON itinerarius.routes (route_type);
CREATE INDEX idx_routes_name ON itinerarius.routes (name);
CREATE INDEX idx_routes_length_m ON itinerarius.routes (length_m);
CREATE INDEX idx_routes_geom ON itinerarius.routes USING GIST (geom);

-- WebMercator geometry for fast vector tile generation.

ALTER TABLE itinerarius.routes
    ADD COLUMN geom_3857 geometry(Geometry, 3857)
    GENERATED ALWAYS AS (ST_Transform(geom, 3857)) STORED;
CREATE INDEX idx_routes_geom_3857 ON itinerarius.routes USING GIST (geom_3857);

-- raw_geom is kept only as importer output/debugging. Avoid indexing it.
DROP INDEX IF EXISTS itinerarius.routes_raw_geom_idx;

ANALYZE itinerarius.amenities;
ANALYZE itinerarius.routes;
