# SPDX-License-Identifier: GPL-3.0-or-later
import shapely
from shapely.geometry import MultiLineString, LineString
from . import build_route
from . import route_types as rt
from typing import Tuple
from shapely.ops import linemerge


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
            linear_state = route.get_linear_state()
            lines = flatten_route(route)
            
            if linear_state in ('yes', 'sorted') and len(lines) > 1:
                # Trust route_builder's ordering and stitch manually
                coords = list(lines[0].coords)
                for line in lines[1:]:
                    # Append coordinates, skipping the first one which duplicates the previous last
                    coords.extend(line.coords[1:])
                lines = [LineString(coords)]
            elif len(lines) > 1:
                # Try linemerge for other cases
                merged = linemerge(lines)
                if isinstance(merged, LineString):
                    lines = [merged]
                elif isinstance(merged, MultiLineString):
                    lines = list(merged.geoms)

            result_geom = lines[0] if len(lines) == 1 else MultiLineString(lines)
            
            return result_geom, linear_state
        else:
            # Fallback if route building failed (e.g. empty)
            return geom, 'no'
    else:
        return geom, 'no'
