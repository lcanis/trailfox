\set import_user :IMPORTER_USER
\set app_user :APP_USER

CREATE SCHEMA IF NOT EXISTS api;
ALTER SCHEMA api OWNER TO :import_user;

GRANT USAGE ON SCHEMA api TO :app_user;

CREATE OR REPLACE VIEW api.routes AS
SELECT
    osm_id,
    name,
    network,
    route_type,
    symbol,
    distance,
    ascent,
    descent,
    roundtrip,
    length_m,
    tags,
    geom
FROM itinerarius.routes;

GRANT SELECT ON api.routes TO :app_user;
ALTER DEFAULT PRIVILEGES FOR ROLE :import_user IN SCHEMA api GRANT SELECT ON TABLES TO :app_user;
