-- Function to serve vector tiles with zoom-based filtering
-- This moves the heavy lifting from the browser to the database

-- Martin expects functions in the 'api' schema
CREATE OR REPLACE FUNCTION api.mvt_routes(z integer, x integer, y integer)
RETURNS bytea AS $$
DECLARE
    mvt bytea;
BEGIN
    -- ST_TileEnvelope returns WebMercator (3857) bounds
    -- We transform our geometry to 3857 for the MVT
    -- We transform the envelope to 4326 for the spatial index check on the table (which is 4326)

    SELECT INTO mvt ST_AsMVT(tile, 'routes', 4096, 'geom') FROM (
        SELECT
            osm_id,
            -- We only select necessary columns to keep tile size down
            network,
            -- ST_AsMVTGeom expects 3857 geometry
            ST_AsMVTGeom(
                ST_Transform(geom, 3857),
                ST_TileEnvelope(z, x, y),
                4096,
                256,
                true
            ) AS geom
        FROM itinerarius.routes
        WHERE
            -- Spatial Index Filter: Check if route intersects the tile
            geom && ST_Transform(ST_TileEnvelope(z, x, y), 4326)
            AND (
                -- Zoom Level Filtering Logic (Server-Side)
                -- Matches client/src/components/Map.web.tsx logic
                (network IN ('iwn', 'nwn'))      -- International/National: Always visible
                OR (z >= 8 AND network = 'rwn')  -- Regional: Visible from z8
                OR (z >= 10 AND network = 'lwn') -- Local: Visible from z10
                OR (z >= 11)                     -- Others: Visible from z11
            )
    ) AS tile;

    RETURN mvt;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE;

-- Grant permission to the tile server user (calixtinus)
-- Note: 'calixtinus' is the user defined in .env for the tile server
GRANT EXECUTE ON FUNCTION api.mvt_routes TO calixtinus;

-- Also grant to web_anon if needed, but Martin connects as calixtinus usually.
