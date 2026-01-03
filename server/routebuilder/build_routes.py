# SPDX-License-Identifier: GPL-3.0-or-later
import os
import psycopg2
from shapely import wkb
from dotenv import load_dotenv

def build_routes() -> None:
    """
    Migrate routes from 'itinerarius.routes' table to 'itinerarius.wmt_route_segments' table,
    applying routebuilder logic .
    """
    env_path: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
    load_dotenv(env_path)

    db_host: str = os.getenv("POSTGRES_HOST", "127.0.0.1")
    db_port: str = os.getenv("POSTGRES_PORT", "5432")
    db_name: str = os.getenv("TRAILFOX_DB", "itinerarius")
    db_user: str = os.getenv("DB_ADMIN_USER", "postgres")
    db_password: str | None = os.getenv("DB_ADMIN_PASSWORD")

    conn_string: str = f"host={db_host} port={db_port} dbname={db_name} user={db_user} password={db_password}"

    try:
        conn: psycopg2.extensions.connection = psycopg2.connect(conn_string)
    except psycopg2.OperationalError as e:
        print(f"Unable to connect to database: {e}")
        return

    cur: psycopg2.extensions.cursor = conn.cursor()
    
    print("Connected to database.")

    # We assume itinerarius.ri already exists (created by post_import.sql)
    # Only process routes that simple_merge failed to make a single line (geom_quality != 'ok_singleline')
    # We use the ways and route table (see osm2pgsql/routes_module.lua) as raw input
    
    cur.execute("""
        SELECT osm_id, name FROM itinerarius.ri WHERE geom_quality <> 'ok_singleline'
    """)

    rows: list[tuple[int, str]] = cur.fetchall()
    count: int = 0
    processed_count: int = 0
    total = len(rows)
    print(f"Found {total} routes to process.")

    for row in rows:
        # TODO: Implement route building logic here 
        # - basis is route_builder.py and route_types.py which are 1:1 copies from workspace waymarkedtrails-backend
        # if at all possible, keep these files as 1:1 - there are also the tests/ available
        # find additional background information in waymarkedtrails-backend for usage etc. -- ASK if schema or logic should be changed or do as necessary but do not workaround. 
        # no backwards compatibility needed, this is a new feature.
        # make sure this code is interruptible for long runs
        # output progress in a nice way
        # figure out a quality metric (for the geom_quality field in itinerarius.ri later)
        # ideal is 'ok_wmt_singleline', 'ok_wmt_sorted' 
        # but there are valid cases where we can't achieve that:
        # closed topologies with whole networks,
        # https://wiki.openstreetmap.org/wiki/Roles_for_recreational_route_relations: 
        # alternative, excursion, approach, connection parts which should be saved as separate segments
        # in table itinerarius.wmt_route_segments
        # but pretty often it's just bad data that needs manual fixing (or heuristic fixes which should be separate))
        # anyway, updatte itinerarius.ri accordingly
        print(f"Processed route {count + 1} of {total} ID: {row[0]}, {row[1]} Remaining time: xxx")

    print(f"Finished. Processed {processed_count} routes.")
    conn.close()

if __name__ == "__main__":
    build_routes()
