\set import_user :IMPORTER_USER
\set app_user :APP_USER

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE SCHEMA IF NOT EXISTS itinerarius;
ALTER SCHEMA itinerarius OWNER TO :import_user;

GRANT USAGE ON SCHEMA itinerarius TO :app_user;
ALTER DEFAULT PRIVILEGES FOR ROLE :import_user IN SCHEMA itinerarius GRANT SELECT ON TABLES TO :app_user;
ALTER DEFAULT PRIVILEGES FOR ROLE :import_user IN SCHEMA itinerarius GRANT SELECT ON SEQUENCES TO :app_user;

-- PostgREST-style queries are latency-sensitive; Postgres JIT often adds seconds of
-- compilation overhead for complex geospatial views.
ALTER ROLE :"app_user" SET jit = off;

-- Safety valve: prevent runaway API queries from hanging forever.
ALTER ROLE :"app_user" SET statement_timeout = '2min';
