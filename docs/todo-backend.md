# TODOs for itinerarius server

## first priority - smaller tasks

- see review.md
- add start and end in the db, not in frontend (doesn't know the full route - revert 00e344a1cc184bb81bae948b5af18195a26dd979)
- review and optimize the route_amenities view - can be simplifies since corner cases need a routebuilder
- prepare schema for incremental update of OSM data - https://docs.osmcode.org/pyosmium/latest/user_manual/10-Replication-Tools/
- Ensure route relations expose both `ref` and `name` consistently in API/tiles.
- add elevation gain support

## keep for later, do not work on this for now

- download GeoPackage for offline use
- research SRTM data

- research and experiment with LOD (level of detail) for zooming in to routes - but martin might have implemented this already:
  - LOD1: geom_search -> 50m (for sidebar, search)
  - LOD2: geom_vector_tile -> 10m (for overview map)
  - LOD3: geom -> for route details

- parse wikidata or otherwise search for logos with better quality than osmc:symbol

- check details of <https://wiki.openstreetmap.org/wiki/Ideas_for_a_new_Hiking_Map>, although it is not that recent so most items have already been implemented

Routes:

- superroutes - this means that E1, via alpina and Trail du Mont Blanc (TMB) hikers should wait a bit
- knotennetzwerk ()
- in case of a relation:route the code of the path should be rendered in text, this code is normally in ref=*. When name=* is present it should be displayed as well.

- add `landuse_areas` tables and implement algorithm from town-location.md

Discovered corner cases:

- route `1952362` (Sentier du Sud 1) geometry is a highly fragmented `MULTILINESTRING` (many segments/branches). Our current linear-referencing/segment ordering can pick a “start” that is effectively mid-trail (e.g. timeline starts near Noertzange) instead of the intended `from=Pulvermühle → to=Dudelange`.
  - route relation is composed of many member ways/relations that are not strictly sequential (possibly dozens), with gaps/branches; simple heuristics (bbox projection ordering, longest-segment, etc.) are not sufficient.
  - Needs: robust path ordering (topology walk) and/or explicit start anchoring using route tags (`from`/`to`) or user-selected start.
  - see https://hiking.waymarkedtrails.org/#route?id=1952362&type=relation&map=14.0/49.527/6.086
  - https://github.com/waymarkedtrails/waymarked-trails-site/issues/2

4. **Environment Segmentation**
   - Intersect trails with `landuse_areas` to get `env_class` segments.

5. **GeoPackage Export & API**
   - Export per-trail GeoPackage with required tables.
   - Provide `/trails` and `/trails/{id}/package` endpoints.
