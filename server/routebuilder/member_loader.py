# SPDX-License-Identifier: GPL-3.0-or-later
#
# This file is part of the Waymarked Trails Map Project
# Copyright (C) 2024 Sarah Hoffmann
""" Load all necessary data for relation members from the database.
"""
import json
from copy import deepcopy

import sqlalchemy as sa
from geoalchemy2.shape import to_shape
from geoalchemy2 import Geography

from . import route_types as rt

def get_relation_objects(conn, members, way_table, route_table):
    """ Load all necessary data for relation members from the database.

        Returns an ordered list of SimpleWays (for ways) and
        Routes (for relations) with an additional 'role' property set
        to the member list.
    """
    data = {}

    # members is a list of dicts from osm2pgsql: {'type': 'w'|'r'|'n', 'ref': id, 'role': role}
    ways = [m['ref'] for m in members if m['type'].lower() == 'w']
    if ways:
        t = way_table
        # In Trailfox, geom is already 3857. We need length in meters.
        # We transform to 4326 before casting to geography for accurate meters.
        sql = sa.select(t.c.osm_id, t.c.geom, t.c.tags,
                        sa.func.ST_Length(sa.func.ST_Transform(t.c.geom, 4326).cast(Geography)).label('length'))\
                .where(t.c.osm_id.in_(ways))\
                .where(t.c.geom.isnot(None))
        for way in conn.execute(sql):
            data[('w', way.osm_id)] = rt.BaseWay(osm_id=way.osm_id,
                                             tags=way.tags or {},
                                             length=int(way.length), direction=0,
                                             geom=to_shape(way.geom))

    rels = [m['ref'] for m in members if m['type'].lower() == 'r']
    if rels:
        # For now, we don't support nested relations in the first pass
        # but we could load them from the 'ri' table if they were already processed.
        pass

    finallist = []
    for i, m in enumerate(members):
        key = (m['type'].lower(), m['ref'])
        if (seg := data.get(key)) is not None:
            # If a way appears two times, we need to make a copy because
            # the way may be reversed and moved around later.
            if seg.start is not None:
                seg = deepcopy(seg)
            seg.start = i
            seg.direction, seg.role = adjust_role(seg, m['role'])
            finallist.append(seg)

    return finallist

def adjust_role(seg, role) -> tuple[int, str]:
    if not role:
        return 0, ''
    
    role = role.lower()
    match role:
        case 'forward':
            return 1, ''
        case 'backward':
            return -1, ''

    outrole = '' if role == 'main' else role.strip()
    if isinstance(seg, rt.BaseWay) and seg.is_closed\
            and seg.tags.get('junction') in ('roundabout', 'circular'):
        return 1, outrole

    return 0, outrole
