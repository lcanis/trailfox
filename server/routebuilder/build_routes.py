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
    # We use the geometry from ri (which is already ST_LineMerged) as input to the builder
    
    cur.execute("""
        SELECT osm_id, ST_AsBinary(ST_Transform(geom, 3857))
        FROM itinerarius.ri
        WHERE geom IS NOT NULL
          AND geom_quality <> 'ok_singleline'
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
            
            # Map linear_state to client-expected quality values
            quality_map = {
                'yes': 'ok_wmt_yes',
                'sorted': 'ok_wmt_sorted',
                'trivial': 'ok_singleline'
            }
            geom_quality = quality_map.get(linear_state, linear_state)

            # Insert/Update itinerarius.ri
            # We use a CTE to avoid repeating the geometry construction
            cur.execute("""
                WITH input_geom AS (
                    SELECT ST_Transform(ST_SetSRID(ST_GeomFromWKB(%s), 3857), 4326) AS g
                )
                INSERT INTO itinerarius.ri (
                    osm_id, 
                    geom, 
                    length_m, 
                    merged_geom_type, 
                    geom_build_case, 
                    geom_quality, 
                    geom_parts
                ) 
                SELECT 
                    %s, 
                    g, 
                    ST_Length(g::geography), 
                    GeometryType(g), 
                    'wmt_builder', 
                    %s, 
                    ST_NumGeometries(g)
                FROM input_geom
                ON CONFLICT (osm_id) DO UPDATE SET
                    geom = EXCLUDED.geom,
                    length_m = EXCLUDED.length_m,
                    merged_geom_type = EXCLUDED.merged_geom_type,
                    geom_build_case = EXCLUDED.geom_build_case,
                    geom_quality = EXCLUDED.geom_quality,
                    geom_parts = EXCLUDED.geom_parts;
            """, (wkb.dumps(new_geom), osm_id, geom_quality))
            
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
