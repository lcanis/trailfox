# SPDX-License-Identifier: GPL-3.0-or-later
import os
import psycopg2
from shapely import wkb
from dotenv import load_dotenv
if __package__ is None and __name__ == "__main__":
    import sys
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if root not in sys.path:
        sys.path.insert(0, root)
    __package__ = "routebuilder"
from .adapter import process_geometry

def build_routes() -> None:
    """
    Migrate routes from 'itinerarius.routes' table to 'itinerarius.routes_wmt' table,
    applying routebuilder logic to merge MultiLineStrings.
    """
    env_path: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'setup', '.env')
    load_dotenv(env_path)

    db_host: str = os.getenv("POSTGRES_HOST", "127.0.0.1")
    db_port: str = os.getenv("POSTGRES_PORT", "5432")
    db_name: str = os.getenv("POSTGRES_DB", "itinerarius")
    db_user: str = os.getenv("POSTGRES_USER", "postgres")
    db_password: str | None = os.getenv("DB_ADMIN_PASSWORD") # Use DB_ADMIN_PASSWORD (DB admin/importer role) for imports.

    conn_string: str = f"host={db_host} port={db_port} dbname={db_name} user={db_user} password={db_password}"

    try:
        conn: psycopg2.extensions.connection = psycopg2.connect(conn_string)
    except psycopg2.OperationalError as e:
        print(f"Unable to connect to database: {e}")
        return

    cur: psycopg2.extensions.cursor = conn.cursor()
    
    print("Connected to database.")

    cur.execute("""
        CREATE TABLE IF NOT EXISTS itinerarius.routes_wmt (
            id SERIAL PRIMARY KEY,
            osm_id bigint,
            linear_state text,
            geom geometry(Geometry, 3857)
        )
    """)
    conn.commit()

    cur.execute("TRUNCATE TABLE itinerarius.routes_wmt RESTART IDENTITY")
    conn.commit()
    
    cur.execute("""
        SELECT osm_id, ST_AsBinary(geom_3857)
        FROM itinerarius.routes
        WHERE geom_3857 IS NOT NULL
    """)

    rows: list[tuple[int, bytes]] = cur.fetchall()
    count: int = 0
    processed_count: int = 0
    total = len(rows)
    print(f"Found {total} routes to process.")

    for row in rows:
        osm_id, geom_wkb = row
        if not geom_wkb:
            continue

        try:
            geom = wkb.loads(bytes(geom_wkb))
            new_geom, linear_state = process_geometry(geom)
            
            # Insert into new table including linear_state
            cur.execute("""
                INSERT INTO itinerarius.routes_wmt (osm_id, geom, linear_state) 
                VALUES (%s, ST_SetSRID(ST_GeomFromWKB(%s), 3857), %s)
            """, (osm_id, wkb.dumps(new_geom), linear_state))
            
            processed_count += 1
        except Exception as e:
            print(f"Error processing route {osm_id}: {e}")
            try:
                conn.rollback()
            except Exception:
                pass
        
        count += 1
        if count % 100 == 0:
            print(f"Processed {count}/{total}...")
            conn.commit() # Commit periodically
        
    conn.commit()

    print(f"Finished. Processed {processed_count} routes.")
    conn.close()

if __name__ == "__main__":
    build_routes()
