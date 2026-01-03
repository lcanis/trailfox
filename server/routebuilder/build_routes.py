# SPDX-License-Identifier: GPL-3.0-or-later
import os
import json
import time
import sys
from datetime import timedelta
import sqlalchemy as sa
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import insert
from geoalchemy2 import Geometry, Geography
from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import LineString, MultiLineString
from dotenv import load_dotenv

if __package__ is None and __name__ == "__main__":
    import sys
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if root not in sys.path:
        sys.path.insert(0, root)
    __package__ = "routebuilder"

from . import route_types as rt
from . import route_builder
from . import member_loader

def get_geometry_parts_m(segment) -> list[LineString]:
    """
    Recursively collect coordinates and interpolate M (distance) values.
    Returns a list of LineStrings (one for each continuous part).
    """
    parts = []
    current_coords = []
    last_pt = None
    
    def collect(seg, dist_offset):
        nonlocal last_pt
        if isinstance(seg, rt.BaseWay):
            coords = list(seg.geom.coords)
            # Check for gap (using a small tolerance for floating point)
            if last_pt and (abs(last_pt[0] - coords[0][0]) > 0.01 or abs(last_pt[1] - coords[0][1]) > 0.01):
                if current_coords:
                    parts.append(LineString(current_coords))
                    current_coords.clear()
            
            total_len = seg.length
            for i, c in enumerate(coords):
                m = dist_offset + (i / (len(coords) - 1)) * total_len if len(coords) > 1 else dist_offset
                current_coords.append((c[0], c[1], m))
            last_pt = coords[-1]
            return dist_offset + total_len
        elif isinstance(seg, rt.WaySegment):
            d = dist_offset
            for w in seg.ways:
                d = collect(w, d)
            return d
        elif isinstance(seg, rt.RouteSegment):
            d = dist_offset
            for s in seg.main:
                d = collect(s, d)
            return d
        elif isinstance(seg, rt.SplitSegment):
            # Use forward path for main geometry
            d = dist_offset
            for s in seg.forward:
                d = collect(s, d)
            return d
        return dist_offset

    collect(segment, 0)
    if current_coords:
        parts.append(LineString(current_coords))
            
    return parts

def build_routes() -> None:
    """
    Build route geometries using WMT logic and save to itinerarius.ri and itinerarius.route_segments.
    """
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
    load_dotenv(env_path)

    db_host = os.getenv("POSTGRES_HOST", "127.0.0.1")
    db_port = os.getenv("POSTGRES_PORT", "5432")
    db_name = os.getenv("TRAILFOX_DB", "itinerarius")
    db_user = os.getenv("DB_ADMIN_USER", "postgres")
    db_password = os.getenv("DB_ADMIN_PASSWORD")

    engine = sa.create_engine(f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}")
    Session = sessionmaker(bind=engine)
    session = Session()
    metadata = sa.MetaData()
    metadata.reflect(bind=engine, schema='itinerarius')

    routes_table = metadata.tables['itinerarius.routes']
    ways_table = metadata.tables['itinerarius.ways']
    ri_table = metadata.tables['itinerarius.ri']
    segments_table = metadata.tables['itinerarius.route_segments']

    print("Connected to database.")

    # Fetch all routes
    routes = session.execute(sa.select(routes_table)).fetchall()
    total_routes = len(routes)
    print(f"Found {total_routes} routes to process.")

    start_time = time.time()

    try:
        for idx, route_row in enumerate(routes, 1):
            osm_id = route_row.osm_id
            members = route_row.members # This is a list of dicts from osm2pgsql
            
            if not members:
                continue

            # Progress reporting
            elapsed = time.time() - start_time
            avg_per_route = elapsed / idx
            remaining_seconds = avg_per_route * (total_routes - idx)
            remaining_str = str(timedelta(seconds=int(remaining_seconds)))
            
            name_display = (route_row.name or "unnamed")[:30]
            sys.stdout.write(f"\rProcessing {idx}/{total_routes} ({idx/total_routes:>4.1%}) - {name_display:<30} | Rem: {remaining_str} ")
            sys.stdout.flush()

            try:
                # Load objects
                objects = member_loader.get_relation_objects(session, members, ways_table, routes_table)
                if not objects:
                    continue
                
                # Build route
                built_route = route_builder.build_route(objects)
                
                if not built_route:
                    continue

                # Extract geometry
                geom_parts = get_geometry_parts_m(built_route)
                if not geom_parts:
                    continue

                # Save to ri
                linear_state = built_route.get_linear_state()
                quality_map = {
                    'yes': 'ok_wmt_yes',
                    'sorted': 'ok_wmt_sorted',
                    'no': 'no_wmt_complex'
                }
                
                # Insert into ri
                if len(geom_parts) > 1:
                    geom = MultiLineString(geom_parts)
                    geom_type = 'MULTILINESTRING'
                else:
                    geom = geom_parts[0]
                    geom_type = 'LINESTRING'

                # Shapely outputs LINESTRING Z for 3D coords, but we want LINESTRING M for PostGIS
                wkt_m = geom.wkt.replace('LINESTRING Z', 'LINESTRING M').replace('MULTILINESTRING Z', 'MULTILINESTRING M')

                stmt = insert(ri_table).values(
                    osm_id=osm_id,
                    geom=sa.func.ST_GeomFromText(wkt_m, 3857),
                    length_m=built_route.length,
                    merged_geom_type=geom_type,
                    geom_build_case='wmt_builder',
                    geom_quality=quality_map.get(linear_state, linear_state),
                    geom_parts=len(geom_parts)
                )
                
                on_conflict_stmt = stmt.on_conflict_do_update(
                    index_elements=['osm_id'],
                    set_={
                        'geom': stmt.excluded.geom,
                        'length_m': stmt.excluded.length_m,
                        'merged_geom_type': stmt.excluded.merged_geom_type,
                        'geom_build_case': stmt.excluded.geom_build_case,
                        'geom_quality': stmt.excluded.geom_quality,
                        'geom_parts': stmt.excluded.geom_parts
                    }
                )
                
                session.execute(on_conflict_stmt)

                # Save segments
                # First clear old segments for this route
                session.execute(sa.delete(segments_table).where(segments_table.c.osm_id == osm_id))
                
                for i, seg in enumerate(built_route.main):
                    seg_parts = get_geometry_parts_m(seg)
                    if seg_parts:
                        seg_geom = seg_parts[0]
                        seg_wkt_m = seg_geom.wkt.replace('LINESTRING Z', 'LINESTRING M')
                        session.execute(
                            sa.insert(segments_table).values(
                                osm_id=osm_id,
                                sequence_id=i,
                                role=getattr(seg, 'role', '') or '',
                                direction='both',
                                geom=sa.func.ST_GeomFromText(seg_wkt_m, 3857),
                                length_m=seg.length
                            )
                        )
                
                if idx % 100 == 0:
                    session.commit()

            except Exception as e:
                session.rollback()
                print(f"\nError processing route {osm_id}: {e}")

    except KeyboardInterrupt:
        print("\nInterrupted by user. Committing progress...")
        session.commit()
        session.close()
        sys.exit(1)

    session.commit()
    print(f"\nFinished processing {total_routes} routes.")
    session.close()

if __name__ == "__main__":
    build_routes()
