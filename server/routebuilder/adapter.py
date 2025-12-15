# SPDX-License-Identifier: GPL-3.0-or-later
import shapely
from shapely.geometry import MultiLineString, LineString
from . import build_route
from . import route_types as rt
from typing import Tuple


def flatten_route(segment: rt.AnySegment) -> list[LineString]:
    geoms = []
    if isinstance(segment, rt.BaseWay):
        geoms.append(segment.geom)
    elif isinstance(segment, rt.WaySegment):
        for way in segment.ways:
            geoms.append(way.geom)
    elif isinstance(segment, rt.SplitSegment):
        # For split segments, include both forward and backward paths
        for s in segment.forward:
            geoms.extend(flatten_route(s))
        for s in segment.backward:
            geoms.extend(flatten_route(s))
    elif isinstance(segment, rt.RouteSegment):
        for s in segment.main:
            geoms.extend(flatten_route(s))
        for s in segment.appendices:
            geoms.extend(flatten_route(s))
    elif isinstance(segment, rt.AppendixSegment):
        for s in segment.main:
            geoms.extend(flatten_route(s))
    return geoms

def process_geometry(geom: shapely.geometry.base.BaseGeometry) -> Tuple[shapely.geometry.base.BaseGeometry, str]:
    """Process geometry and return a tuple (geometry, linear_state).
    linear_state is one of 'yes', 'sorted', 'no'.
    """
    if isinstance(geom, LineString):
        return geom, 'trivial'
    elif isinstance(geom, MultiLineString):
        ways = [
            rt.BaseWay(
                osm_id=i,
                tags={},
                length=int(line.length),
                direction=0,
                geom=line,
                role=''
            ) for i, line in enumerate(geom.geoms)
        ]
        
        route = build_route(ways)
        if route:
            lines = flatten_route(route)
            linear_state = route.get_linear_state()
            result_geom = lines[0] if len(lines) == 1 else MultiLineString(lines)
            print(f"linear_state: {linear_state}")
            if len(lines) == 1:
                print(f"flattened: {linear_state}")

            return result_geom, linear_state
        else:
            # Fallback if route building failed (e.g. empty)
            return geom, 'no'
    else:
        return geom, 'no'
