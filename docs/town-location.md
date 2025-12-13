# what is a valid approach for location of towns along a trail in itinerarius from OSM data?

I have seen admin_center, but not always. And that is also not always the actual town center.

## Valid Initial Approaches for Town Location in Itinerarius from OSM Data

Based on the use of Itinerarius and the limitations identified with `admin_center` and boundary centroids, here are pragmatic initial approaches for locating towns along a trail using OSM data:

### **Best Initial Approach: Place Nodes (place=*)**

The most reliable initial strategy is to **use `place` nodes directly** from OpenStreetMap. This is the recommended tagging practice because:[^1][^2]

- **Place nodes are explicitly positioned at settlement centers** — OSM wiki guidance states to "place a node at the center of the village, like the central square, a central administrative or religious building or a central road junction."[^1]
- **Hierarchical coverage** — Query the place hierarchy in order of relevance to your trail context:
  - `place=city`
  - `place=town`
  - `place=village`
  - `place=hamlet` (for smaller settlements)

This gives you actual mapped points rather than computed centroids, which are more reliable for user-facing features.[^2]

### **Fallback Approach: Building Cluster Centroid**

If place nodes are missing or sparse in your region, compute a **centroid from dense building clusters** within administrative boundaries:[^3]

1. Extract all buildings within a boundary using `building=*` tags
2. Cluster them using spatial density algorithms (DBSCAN is well-documented for this use case)
3. Calculate the median centroid of the densest cluster
4. This centroid typically falls near actual town centers (markets, plazas, central streets)

This approach works because actual town centers have concentrated building density, unlike boundary geometric centroids which can fall in arbitrary locations (forests, fields, etc.).

### **Why Not Boundary Geometric Centroids**

Boundary polygon centroids fail because:[^4]

- A municipality boundary can include forests, farmland, or water that push the geometric centroid away from the actual settlement
- The centroid may fall outside the built-up area entirely

### Ideal approach: 

Similar to fallback, but also locate the nearest place of the cluster to the trail or when entering and exiting the cluster
Additionally cluster landuse=forest and similar to get an idea of how remote a trail is.

[^1]: https://wiki.openstreetmap.org/wiki/Tag:place=town

[^2]: https://wiki.openstreetmap.org/wiki/Key:place

[^3]: https://bytes.swiggy.com/solving-the-last-last-mile-maps-poi-entry-gates-f7fb0d5ddd47

[^4]: https://nominatim.org/2020/11/11/places-and-boundaries.html

[^5]: itinerarius-requirements.md

[^6]: itinerary-pitch.md

[^7]: plan.md

[^8]: http://maning.github.io/noroadtown/

[^9]: https://www.geofabrik.de/data/geofabrik-osm-gis-standard-0.6.pdf

[^10]: https://pmc.ncbi.nlm.nih.gov/articles/PMC5854971/

[^11]: https://community.openstreetmap.org/t/label-and-admin-centre-nodes-for-boundaries/122944

[^12]: https://www.sciencedirect.com/science/article/pii/S2226585624001511

[^13]: https://help.openstreetmap.org/questions/4068/when-does-it-make-sense-to-use-place-on-an-area

[^14]: https://www.spatialtech.org/osm-clustering-neighborhoods.html

[^15]: https://wiki.openstreetmap.org/wiki/Tag:place=city

[^16]: https://eurovelo.com/download/document/2020-10-14_Cycle_Route_Segmentation_Vfinal_EN.pdf

[^17]: https://www.reddit.com/r/openstreetmap/comments/rot97x/which_tags_to_focus_for_outdoor_hiking_cycling/

[^18]: https://trailrouter.com

[^19]: https://wiki.openstreetmap.org/wiki/Key:amenity

[^20]: https://help.openstreetmap.org/questions/10851/place-node-vs-area/

[^21]: https://blog.mapillary.com/community/2017/04/07/mapping-hiking-routes-openstreetmap-mapillary.html

[^22]: https://wiki.openstreetmap.org/wiki/Tag:route=hiking

[^23]: https://help.openstreetmap.org/questions/15984/place-boundary-tags-reorganization-for-an-entire-country/

[^24]: https://www.youtube.com/watch?v=cnX5y9nwxGE

[^25]: https://www.trailforks.com/about/features/route_planner/

[^26]: https://nailthetrail.com/best-hiking-apps-test-review/

[^27]: https://www.trailforks.com

[^28]: https://wiki.openstreetmap.org/wiki/Map_features

[^29]: https://steamcommunity.com/app/548430/discussions/1/6670425060413546179/

[^30]: https://support.komoot.com/hc/en-us/articles/360022830972-Improving-the-komoot-map-using-OpenStreetMap

[^31]: https://wiki.openstreetmap.org/wiki/Key:building

[^32]: https://learn.arcgis.com/en/projects/extract-informal-settlements-with-samlora/

[^33]: https://stackoverflow.com/questions/71974170/coordinates-of-city-centers-from-openstreetmap-via-osmnx

[^34]: https://www.scitepress.org/PublishedPapers/2022/110887/110887.pdf

[^35]: https://stackoverflow.com/questions/59766685/how-to-assign-locations-as-cluster-centroids-and-run-clustering-to-find-the-near

[^36]: https://en.wikipedia.org/wiki/Template:OSM_Location_map

[^37]: https://www.european-mountaineers.eu/storage/app/media/Project and public-documents/Erasmus plus good governance/2022Waymarking_in_Europe_4th_Edition_E-Book-final-3.pdf

[^38]: https://learn2phoenix.github.io/projects/poi.pdf

[^39]: https://community.openstreetmap.org/t/some-places-have-both-a-node-and-a-way/114220

