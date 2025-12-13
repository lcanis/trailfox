# TODOs for itinerarius server

## first priority - smaller tasks

- see review.md
- prepare schema for incremental update of OSM data
- Ensure route relations expose both `ref` and `name` consistently in API/tiles.

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

4. **Environment Segmentation**
   - Intersect trails with `landuse_areas` to get `env_class` segments.

5. **GeoPackage Export & API**
   - Export per-trail GeoPackage with required tables.
   - Provide `/trails` and `/trails/{id}/package` endpoints.
