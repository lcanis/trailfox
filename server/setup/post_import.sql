-- Post-import maintenance for Itinerarius (run after osm2pgsql)

-- Index the geometry column itself (geometry/GIST) — used for planar spatial ops (&&, ST_Intersects, ST_Envelope filters).
CREATE INDEX idx_amenities_geom ON itinerarius.amenities USING GIST (geom);
-- Index the geometry cast to geography (expression index) — used for geodesic queries (ST_DWithin/ST_Distance in meters).
-- required for fast distance-based searches in the API.
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
    geom_quality text
);

INSERT INTO itinerarius.route_info (route_id, merged_geom_type, geom_build_case)
SELECT
    osm_id,
    GeometryType(geom),
    'simple_merge'
FROM itinerarius.routes
WHERE geom IS NOT NULL;

-- Length in meters (geodesic). Keeping this materialized avoids repeated ST_Length calls.
ALTER TABLE itinerarius.routes ADD COLUMN length_m numeric;
UPDATE itinerarius.routes SET length_m = ST_Length(geom::geography)
WHERE geom IS NOT NULL AND ST_NumGeometries(geom) <= 25;

-- Routes indexes
CREATE INDEX dx_routes_osm_id ON itinerarius.routes (osm_id);
CREATE INDEX dx_routes_network ON itinerarius.routes (network);
CREATE INDEX dx_routes_route_type ON itinerarius.routes (route_type);
CREATE INDEX dx_routes_name ON itinerarius.routes (name);
CREATE INDEX dx_routes_length_m ON itinerarius.routes (length_m);
CREATE INDEX dx_routes_geom ON itinerarius.routes USING GIST (geom);

-- WebMercator geometry for fast vector tile generation.

ALTER TABLE itinerarius.routes
    ADD COLUMN geom_3857 geometry(Geometry, 3857)
    GENERATED ALWAYS AS (ST_Transform(geom, 3857)) STORED;
CREATE INDEX dx_routes_geom_3857 ON itinerarius.routes USING GIST (geom_3857);

-- raw_geom is kept only as importer output/debugging. Avoid indexing it.
DROP INDEX IF EXISTS itinerarius.routes_raw_geom_idx;

ANALYZE itinerarius.amenities;
ANALYZE itinerarius.routes;

-- NOTE: This file has been moved to `sql/post_import.sql`. The copy in the root remains as a placeholder; run the SQL in `sql/` instead.
RAISE NOTICE 'post_import moved to sql/post_import.sql';
