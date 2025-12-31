# TODO items for the front end

* be consistent in coordinate handling. e.g. ItineraryMapProps is userLocation?: { latitude[!!!!SIC first]: number; longitude: number } | null; VS   initialCenter?: [number, number] | null;
* standardize on geojson [lon lat]

## Discovery

* add search for places - maputnik has a nice implementation
* add zoom and compass buttons
* route sidebar: "Hiking Trails" instead of "routes"
* review and update symbol/icon generation (should it be done in the backend maybe?)
* filter routes by Network/pilgrimage=yes/Length/arbitrary OSM tag (dev mode)/
* add: offer 'order by distance from current location'
* color scheme consistency

## Itinerary

* map: DRY - clusters to geojson repeated in itinerarymap.web and .native
* icons need to be fixed!
* calculate trail_km client-side for consistency and scalable performance
* use DB-SCAN based clustering
* expo/vector-icons external link to google/apple maps/osm/comaps/osmand/
* | ellipsis-vertical
* instead of amenities filter based on distance, use a low/medium/high complexity
* this requires a full-blown settings dialog with all classes/subclasses and their distance to include in one of those three - 
* for instance you won't care for a bench or waste basket if >100m off-trail, but supermarket and accomodation is interesting. for instance places is almost always interesting for display
* amenities filter should be progressive and handle small geometries better (reflow)
* better names for amenities, more granular

## Major tasks

* improve design
* Stage-ifier
* QR code/links for planning
