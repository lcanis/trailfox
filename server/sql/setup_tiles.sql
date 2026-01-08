-- Function to serve vector tiles with zoom-based filtering for Martin tile server
-- This function generates Mapbox Vector Tiles (MVT) for routes with visibility based on zoom

-- Martin expects functions in the 'api' schema
CREATE OR REPLACE FUNCTION api.mvt_routes(z integer, x integer, y integer)
RETURNS bytea AS $$
DECLARE
    mvt bytea;
BEGIN
    -- ST_TileEnvelope returns WebMercator (3857) bounds
    -- Use precomputed routes_info.geom to avoid per-request ST_Transform.

    SELECT INTO mvt ST_AsMVT(tile, 'routes', 4096, 'geom') FROM (
        SELECT
            osm_id,
            network,
            is_node_network,
            ST_AsMVTGeom(
                -- Simplify geometry based on zoom level to stay well under the 65k vertex limit per tile
                ST_Simplify(geom, 40075016.68 / (pow(2, z) * 4096)),
                ST_TileEnvelope(z, x, y),
                4096,
                256,
                true
            ) AS geom
        FROM itinerarius.routes_info r
        WHERE
            -- Spatial Index Filter: Check if route intersects the tile
            geom && ST_TileEnvelope(z, x, y)
            AND (
                -- Zoom Level Filtering Logic (Server-Side)
                -- Matches client/src/components/Map.web.tsx logic
                (network IN ('iwn', 'nwn'))      -- International/National: Always visible
                OR (z >= 8 AND network = 'rwn')  -- Regional: Visible from z8
                OR (z >= 10 AND network = 'lwn') -- Local: Visible from z10
                OR (z >= 11)                     -- Others: Visible from z11
            )
            -- Exclude node networks from low zoom tiles (they're very dense)
            AND (NOT r.is_node_network OR z >= 11)
    ) AS tile;

    RETURN mvt;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE;

GRANT EXECUTE ON FUNCTION api.mvt_routes(integer, integer, integer) TO calixtinus;
