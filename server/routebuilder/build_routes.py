"""Build improved route geometries using Waymarked Trails routebuilder logic.

This is intentionally a thin wrapper around the existing WMT geometry builder
(`route_builder.py`, `route_types.py`, `member_loader.py`).
"""

# SPDX-License-Identifier: GPL-3.0-or-later

import os
import time
from dataclasses import dataclass
from datetime import timedelta
from typing import Iterable

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert
from dotenv import load_dotenv
from geoalchemy2.shape import from_shape
from shapely.geometry import LineString
from shapely.ops import linemerge

from member_loader import get_relation_objects
from route_builder import build_route
import route_types as rt


def _env_path() -> str:
    return os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")


def _db_url_from_env() -> str:
    db_host: str = os.getenv("POSTGRES_HOST", "127.0.0.1")
    db_port: str = os.getenv("POSTGRES_PORT", "5432")
    db_name: str = os.getenv("TRAILFOX_DB", "itinerarius")
    db_user: str = os.getenv("DB_ADMIN_USER", "postgres")
    db_password: str | None = os.getenv("DB_ADMIN_PASSWORD")

    # psycopg2 is fine, but we use SQLAlchemy here because member_loader expects it.
    if db_password is None:
        return f"postgresql+psycopg2://{db_user}@{db_host}:{db_port}/{db_name}"
    return f"postgresql+psycopg2://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"


@dataclass
class SegmentRow:
    osm_id: int
    sequence_id: int
    role: str
    direction: str
    geom: LineString
    length_m: int


def _iter_baseways(seg: rt.AnySegment) -> Iterable[rt.BaseWay]:
    if isinstance(seg, rt.WaySegment):
        yield from seg.ways
        return
    if isinstance(seg, rt.SplitSegment):
        for child in seg.forward:
            yield from _iter_baseways(child)
        for child in seg.backward:
            yield from _iter_baseways(child)
        return
    if isinstance(seg, rt.RouteSegment):
        for child in seg.main:
            yield from _iter_baseways(child)
        for appendix in seg.appendices:
            for child in appendix.main:
                yield from _iter_baseways(child)
        return


def _flatten_route_to_segments(route: rt.RouteSegment, route_id: int) -> list[SegmentRow]:
    rows: list[SegmentRow] = []
    seq = 0

    def add_way(w: rt.BaseWay, direction: str) -> None:
        nonlocal seq
        # Keep “role” on the segment (empty string for main).
        role = w.role or ""
        rows.append(
            SegmentRow(
                osm_id=route_id,
                sequence_id=seq,
                role=role,
                direction=direction,
                geom=w.geom,
                length_m=int(w.length),
            )
        )
        seq += 1

    def walk(seg: rt.AnySegment, direction: str) -> None:
        if isinstance(seg, rt.WaySegment):
            for w in seg.ways:
                add_way(w, direction)
            return
        if isinstance(seg, rt.RouteSegment):
            for child in seg.main:
                walk(child, direction)
            for appendix in seg.appendices:
                for child in appendix.main:
                    walk(child, direction)
            return
        if isinstance(seg, rt.SplitSegment):
            for child in seg.forward:
                walk(child, "forward")
            for child in seg.backward:
                walk(child, "backward")
            return

    for s in route.main:
        walk(s, "")
    for appendix in route.appendices:
        for s in appendix.main:
            walk(s, "")

    return rows


def _make_single_linestring_from_main(route: rt.RouteSegment) -> LineString | None:
    """Best-effort continuous LineString for linear routes.

    We intentionally keep this conservative: only build when the main
    path is composed of BaseWays in a single direction and can be merged
    into a LineString.
    """
    parts: list[LineString] = []
    for seg in route.main:
        if not isinstance(seg, rt.WaySegment):
            return None
        for w in seg.ways:
            parts.append(w.geom)

    if not parts:
        return None

    merged = linemerge(parts)
    if isinstance(merged, LineString):
        return merged
    return None


def _normalize_osm2pgsql_members(members: object) -> list[dict]:
    """Convert osm2pgsql flex member JSON into WMT member_loader format."""
    if not isinstance(members, list):
        return []

    out: list[dict] = []
    for m in members:
        if not isinstance(m, dict):
            continue

        t = m.get("type")
        ref = m.get("ref")
        if ref is None:
            continue

        # osm2pgsql emits lower-case type tags.
        if t == "w":
            out.append({"type": "W", "id": int(ref), "role": (m.get("role") or "")})
        elif t == "r":
            out.append({"type": "R", "id": int(ref), "role": (m.get("role") or "")})
        else:
            # Skip node members (markers, guideposts, etc) for geometry building.
            continue

    return out


def build_routes() -> None:
    load_dotenv(_env_path())

    engine = sa.create_engine(_db_url_from_env(), future=True)
    meta = sa.MetaData()

    routes_raw = sa.Table("routes", meta, schema="itinerarius", autoload_with=engine)
    ways_raw = sa.Table("ways", meta, schema="itinerarius", autoload_with=engine)

    ri = sa.Table("ri", meta, schema="itinerarius", autoload_with=engine)

    wmt_segments = sa.Table("wmt_route_segments", meta, schema="itinerarius", autoload_with=engine)

    # A tiny helper table to cache built route JSON for relation members.
    # This mirrors how WMT stores route.to_json() in the routes table.
    wmt_routes = sa.Table(
        "wmt_routes",
        meta,
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=False),
        sa.Column("route", sa.Text, nullable=False),
        schema="itinerarius",
    )

    with engine.begin() as conn:
        conn.execute(sa.text('CREATE TABLE IF NOT EXISTS itinerarius.wmt_routes (id bigint PRIMARY KEY, route text NOT NULL)'))

    print("Connected to database.")

    with engine.connect().execution_options(stream_results=True) as conn:
        todo = conn.execute(
            sa.text(
                """
                SELECT ri.osm_id, r.name, r.members
                FROM itinerarius.ri ri
                JOIN itinerarius.routes r ON r.osm_id = ri.osm_id
                WHERE ri.geom_quality <> 'ok_singleline'
                ORDER BY ri.osm_id
                """
            )
        ).fetchall()

    total = len(todo)
    print(f"Found {total} routes to process.")
    if total == 0:
        return

    started = time.monotonic()
    processed = 0

    # Reuse the ways subquery across routes.
    ways = sa.select(
        ways_raw.c.osm_id.label("id"),
        ways_raw.c.geom.label("geom"),
        ways_raw.c.tags.label("tags"),
    ).subquery("ways")

    def fmt_td(seconds: float) -> str:
        return str(timedelta(seconds=int(max(0, seconds))))

    def fmt_name(name: str | None, max_len: int = 48) -> str:
        if not name:
            return ""
        n = " ".join(str(name).split())
        if len(n) <= max_len:
            return n
        return n[: max_len - 1] + "…"

    try:
        for idx, (route_id, route_name, members_json) in enumerate(todo, start=1):
            t0 = time.monotonic()
            with engine.begin() as conn:
                if not members_json:
                    conn.execute(
                        ri.update()
                        .where(ri.c.osm_id == route_id)
                        .values(
                            geom_build_case="wmt_routebuilder",
                            geom_quality="wmt_missing_members",
                        )
                    )
                    continue

                members = _normalize_osm2pgsql_members(members_json)
                if not members:
                    conn.execute(
                        ri.update()
                        .where(ri.c.osm_id == route_id)
                        .values(
                            geom_build_case="wmt_routebuilder",
                            geom_quality="wmt_no_way_members",
                        )
                    )
                    continue

                route_members = get_relation_objects(conn, members, ways, wmt_routes)
                if not route_members:
                    conn.execute(
                        ri.update()
                        .where(ri.c.osm_id == route_id)
                        .values(
                            geom_build_case="wmt_routebuilder",
                            geom_quality="wmt_no_objects",
                        )
                    )
                    continue

                route = build_route(route_members)
                if route is None:
                    conn.execute(
                        ri.update()
                        .where(ri.c.osm_id == route_id)
                        .values(
                            geom_build_case="wmt_routebuilder",
                            geom_quality="wmt_build_failed",
                        )
                    )
                    continue

                route.id = int(route_id)

                # Cache JSON route for potential parent relations.
                route_json = route.to_json()
                conn.execute(
                    insert(wmt_routes)
                    .values(id=route_id, route=route_json)
                    .on_conflict_do_update(
                        index_elements=[wmt_routes.c.id],
                        set_={"route": route_json},
                    )
                )

                # Replace segments for this route.
                conn.execute(wmt_segments.delete().where(wmt_segments.c.osm_id == route_id))
                seg_rows = _flatten_route_to_segments(route, int(route_id))
                if seg_rows:
                    conn.execute(
                        wmt_segments.insert(),
                        [
                            {
                                "osm_id": r.osm_id,
                                "sequence_id": r.sequence_id,
                                "role": r.role,
                                "direction": r.direction,
                                "geom": from_shape(r.geom, srid=3857),
                                "length_m": r.length_m,
                            }
                            for r in seg_rows
                        ],
                    )

                linear = route.get_linear_state()
                quality = (
                    "ok_wmt_singleline" if linear == "yes" else "ok_wmt_sorted" if linear == "sorted" else "wmt_non_linear"
                )

                # If WMT yields a clean single LineString, replace ri.geom with measured line.
                new_line = _make_single_linestring_from_main(route) if linear == "yes" else None
                if new_line is not None:
                    conn.execute(
                        sa.text(
                            """
                            UPDATE itinerarius.ri
                            SET
                              geom_build_case = :case,
                              geom_quality = :quality,
                              geom_m = ST_Multi(
                                ST_AddMeasure(
                                  ST_GeomFromWKB(:wkb, 3857),
                                  0,
                                  ST_Length(ST_Transform(ST_GeomFromWKB(:wkb, 3857), 4326)::geography)
                                )
                              )
                            WHERE osm_id = :osm_id
                            """
                        ),
                        {"case": "wmt_routebuilder", "quality": quality, "wkb": new_line.wkb, "osm_id": route_id},
                    )
                else:
                    conn.execute(
                        ri.update()
                        .where(ri.c.osm_id == route_id)
                        .values(geom_build_case="wmt_routebuilder", geom_quality=quality)
                    )

            processed += 1
            elapsed_s = time.monotonic() - started
            s_per_route = elapsed_s / max(processed, 1)
            eta_s = s_per_route * (total - processed)

            msg = (
                f"[{idx:>3}/{total:<3}] id={route_id} {fmt_name(route_name):<48} "
                f"elapsed={fmt_td(elapsed_s)} s/route={s_per_route:0.3f} ETA={fmt_td(eta_s)}"
            )
            # Single-line progress (keeps terminal readable).
            print("\r" + msg.ljust(120), end="", flush=True)

    except KeyboardInterrupt:
        print("\nInterrupted. Progress committed up to last completed route.")

    elapsed_s = time.monotonic() - started
    print(f"\nFinished. Processed {processed} routes.")
    if processed:
        print(f"Elapsed: {fmt_td(elapsed_s)}")
        print(f"Rate: {elapsed_s / processed:0.3f} s/route")


if __name__ == "__main__":
    build_routes()
