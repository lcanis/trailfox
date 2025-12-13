# Itinerarius – v1 Requirements & Implementation Plan

## 1. Product Scope & Core Concept

Itinerarius is a **vertical, linear trail guide**: a logistics-first view of long-distance trails for hikers (v1) and later cyclists. It replaces the traditional map with a vertically scrolling strip of the journey, optimized for mobile usage patterns.

- **Primary interaction:** Vertical scrolling list/strip.
- **Default order:** Nearest upcoming items at the **top**; configurable inversion (nearest at bottom) in settings for advanced users.
- **Core metaphor:** "Instagram/Twitter-like feed of the next kilometers" rather than a geographic map.

---

## 2. Frontend (React Native / Expo)

### 2.1 Platform & Technical Foundations

- **Framework:** React Native with Expo.
- **Offline-first:**
  - Trail data shipped or downloaded as a **GeoPackage** file.
  - Stored via `expo-file-system` for fully offline use once cached.
  - Read-only queries from the GeoPackage (no editing).
- **Design priority:** Clean, focused UI with strong typographic hierarchy and intuitive iconography.

File structure for multi-platform:

```text
app/
├── screens/
│   ├── Timeline.tsx (shared logic)
│   ├── Timeline.web.tsx (web-only UI)
│   └── Timeline.ios.tsx (iOS-only UI)
├── hooks/ (100% shared)
├── services/geopackage.ts (100% shared, but different imports per platform)
└── types/ (100% shared)
````

Shared hooks for timeline logic:

```text
// Reusable across web + iOS
export const useTrailTimeline = (trailId: string) => {
  const [stops, setStops] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [filter, setFilter] = useState({...});
  // All your filtering, sorting, clustering logic
  return { stops, userLocation, filter, setFilter };
}
```

### 2.2 Main Screen – Vertical Trail Timeline

The main screen is a **vertical, scrollable timeline** of the selected trail or stage.

#### 2.2.1 Structure

- **Top section (status header)**
  - Current trail name and stage (e.g. "Stage 3 – Town A → Town B").
  - High-level stats: total km for stage, climbed meters (if available), ETA based on simple pace model (optional v1.5).

- **Vertical timeline list** (core of the screen)
  - Each **item** represents a waypoint along the trail:
    - Major towns/villages.
    - Key junctions or huts.
    - Clusters of amenities around a certain distance.
  - Distance model:
    - For each item, show:
      - `distance_from_start` (e.g. "12.3 km from start").
      - `distance_from_you` (if GPS on) (e.g. "Next stop in 4.7 km").
  - "Now" marker:
    - Fixed marker near top of screen representing **your current location** on the trail.
    - Upcoming items appear **below** in the list if ordered by increasing distance (but see ordering rules below).

#### 2.2.2 Ordering & Direction

- **Default behavior:**
  - Sort items by **distance along trail** (km). 
  - When GPS is available, the list is **auto-scrolled** so that:
    - The **nearest upcoming item** is at or near the **top** of the screen.
  - Scrolling direction: swipe **up** to look **further into the future**, swipe **down** to move back toward start.

- **Configurable direction (settings):**
  - Option: "Invert timeline direction".
    - If enabled:
      - Nearest upcoming item is anchored towards the **bottom**.
      - Swiping **down** looks further ahead.
  - Default: **off** – nearest upcoming item appears at the top.

#### 2.2.3 Item Layout & Design

Each vertical item should have a compact, card-like layout:

- **Left side:**
  - A vertical line representing the trail, with a dot for each item.
  - Color of line segment and dot reflects **environment class** (forest, town, field, etc.).

- **Right side:**
  - **Title:** Stop or cluster name (e.g. "Village of X", "Water + Café" etc.).
  - **Subtitle line:**
    - `X km from start` · `Y km from you`.
  - **Amenity icons row (clustered):**
    - Small icons with counts: e.g. `🏨 ×3  🍽 ×5  🛒 ×2`.
    - Tap opens bottom sheet with full amenity list.

- **Current position item:**
  - Special styling: arrow or marker icon, highlight color.
  - Text: "You are here" + `km from start`.

### 2.3 Amenity Clustering & Filtering

#### 2.3.1 Categories & Tags (from OSM)

Backed by OSM tags (see backend section), the frontend receives normalized categories:

- **Accommodation:** hotel, hostel, guest_house, alpine_hut, camp_site, etc.
- **Food/Drink:** restaurant, fast_food, cafe, bar, pub.
- **Resupply:** supermarket, convenience, general, bakery, etc.
- **Banking/Cash:** bank, atm.
- **Bike/Sports:** bicycle shop, sports shop.
- **Transportation:** airport, rail station/halt, bus station, bus stop.
- **Medical:** pharmacy, hospital, clinic, doctors, dentist.
- **Other hiker-relevant:** drinking_water, toilets, showers, tourism=information, etc.

#### 2.3.2 Default Filter Logic

- **Default visible categories:**
  - Accommodation, food/drink, supermarkets/minimarts, key transportation, basic medical.
- **Default hidden (toggleable):**
  - Full banking, gas station, bike shop (and other niche categories).
- **Distance filter:**
  - Global slider: `max_distance_from_trail`.
  - Default: **1 km for hiking**.
  - Amenities beyond this radius:
    - Either hidden entirely or shown with reduced opacity and a small "> 1 km" indicator.

#### 2.3.3 Clustering Strategy (Frontend)

- Group amenities by distance along trail (`trail_km`) into clusters:
  - Option A (preferred): Pre-grouped in backend (`cluster_id`, `cluster_km`).
  - Option B: Client-side grouping by bucketing amenities into e.g. 200–500 m windows.
- Each vertical item for a cluster shows:
  - Dominant amenity types (icons + counts).
  - Distances from you and from start.

### 2.4 Navigation & Screens

- **Bottom tab bar:**
  - `Timeline` (default) – vertical linear view.
  - `Map` – rough online-only map (optional in v1; can be basic polyline + markers).
  - `Search` – trail discovery (stub in v1, full later).
  - `Settings` – filters, offline data, direction preference.

- **Timeline → Details navigation:**
  - Tap on any item (town, cluster, hut):
    - Show bottom sheet with:
      - Detailed amenity list.
      - Links to open item in **external map** (Google Maps, Apple Maps, Organic Maps).
      - Raw OSM details (name, opening hours, website, phone, etc.).

### 2.5 Discoverability of Trails (Stub in v1)

For v1, keep it minimal but prepare the structure:

- **Trail selection screen:**
  - Static list of 1–N trails loaded from backend (`/trails`).
  - Show basic metadata: name, length, country, type.

- **Future features (to design for, but not fully implement):**
  - **Text search:** free-text filter on trail name/country.
  - **Location-based search:** "Trails near me" via current GPS location and backend spatial query.
  - **Map search:** online 2D map showing trail geometries; tap to select.

---

## 3. Visual Language & Gradients (Further Iterations)

Even if not fully implemented in v1, design should anticipate the following gradient concepts:

- **Color gradients as second dimension of meaning:**
  - **Distance from trail:**
    - Icons for amenities **fade** (lower opacity) as distance from trail increases.
    - Possible color shift from saturated (on trail) to desaturated (far away).
  - **Environment type:**
    - Background of timeline changes gradually:
      - `urban` → warm, slightly orange/gray.
      - `forest` → greenish.
      - `field/grassland` → pale yellow/green.
  - **Elevation profile (optional):**
    - Subtle gradient overlay to hint at climbs/descents (e.g. darker for steep climbs).

- **Data source for environment classification (OSM):**
  - **Urban / built-up:**
    - `landuse=residential`, `landuse=commercial`, `landuse=industrial`, `landuse=urban`, and `building=*` polygons.
    - Optionally, `place=city|town|village` points as labels.
  - **Forest:**
    - `landuse=forest`, `natural=wood` polygons.
  - **Fields / agriculture:**
    - `landuse=farmland`, `landuse=meadow`, `landuse=grass`, `landuse=orchard`, `landuse=vineyard`, relevant `natural=*` like `wetland`.

These tags are used on the backend to derive `env_class` per trail segment; frontend consumes a simple, compact representation.

---

## 4. Backend (PostGIS) Overview

### 4.1 Core Responsibilities

- Import and normalize OSM data (amenities, landuse, routes).
- Maintain **trails** with geometry and linear referencing (distance along trail).
- Associate OSM amenities with each trail and compute:
  - Distance from trail.
  - Position along trail (`trail_km`).
- Classify trail segments by environment (urban/forest/field/etc.).
- Export all relevant data per trail into a **GeoPackage** for the mobile app.

### 4.2 Key Tables & Concepts

- `trails`
  - `id`, `name`, `type` (hiking, bicycle), `length_km`, `geom`, `country`, `slug`.
- `trail_segments`
  - `id`, `trail_id`, `seq`, `geom`, `start_km`, `end_km`, `env_class`.
- `amenities`
  - `id`, `osm_id`, `name`, `category`, `subtype`, `geom`, `raw_tags` JSONB.
- `trail_amenities`
  - `trail_id`, `amenity_id`, `distance_from_trail_m`, `trail_km`, `cluster_id`, `is_default_visible`.
- `landuse_areas`
  - `id`, `osm_id`, `class` (`urban`, `forest`, `field`, ...), `geom`.

### 4.3 Amenity Tag Mapping (OSM → Categories)

- **Accommodation**
  - `tourism=hotel`, `tourism=hostel`, `tourism=guest_house`, `tourism=alpine_hut`, `tourism=camp_site`, `tourism=caravan_site`, `tourism=chalet`, `amenity=shelter` (with subtype).
- **Food/Drink**
  - `amenity=restaurant`, `amenity=fast_food`, `amenity=cafe`, `amenity=bar`, `amenity=pub`, `amenity=biergarten`.
- **Resupply (Shops)**
  - `shop=supermarket`, `shop=convenience`, `shop=general`, `shop=department_store`, `shop=greengrocer`, `shop=bakery`, `shop=butcher`.
  - Gas stations: `amenity=fuel`.
- **Banking/Cash**
  - `amenity=bank`, `amenity=atm`, `amenity=bureau_de_change`.
- **Bike / Sports**
  - `shop=bicycle`, `shop=sports`.
- **Transportation**
  - `aeroway=aerodrome|airport`, `railway=station|halt`, `amenity=bus_station`, `highway=bus_stop`.
- **Medical**
  - `amenity=pharmacy`, `amenity=hospital`, `amenity=clinic`, `amenity=doctors`, `amenity=dentist`.
- **Other Hiker-Relevant** (optional but recommended)
  - `amenity=drinking_water`, `amenity=fountain`, `amenity=toilets`, `amenity=shower`, `amenity=public_bath`, `tourism=information`, `information=guidepost|map`, `emergency=phone|defibrillator`, `natural=hot_spring`, `leisure=swimming_pool`.

### 4.4 Environment Classification (Why Not Boundaries?)

- Initial approach:
  - Get all place nodes

- **Better approach: landuse/natural/building clusters**
  - Use `landuse=*`, `natural=*`, `building=*` as a vector map of actual ground usage.
  - Intersect the trail with these polygons to derive `env_class` per distance segment.

see town-location.md for details

### 4.5 GeoPackage Export

Per trail, export a compact GeoPackage containing at least:

- `trail_line` – LineString, full geometry.
- `trail_stops` – Point, main settlements / huts with `trail_km`.
- `trail_amenities` – Point, with category, subtype, `distance_from_trail_m`, `trail_km`, `cluster_id`, `is_default_visible`, `raw_tags`.
- `trail_environment_segments` – LineString or attribute table with `start_km`, `end_km`, `env_class`.

The mobile app only needs read-only access to these tables.

---

## 5. First Iteration Plan (Concrete)

### 5.1 v1 Functional Scope

- Target user: **hikers** (walking speed, 1 km default radius).
- Geography: limited to 1–2 showcase trails for development.
- Features:
  - query db online for development and validation
  - Vertical timeline with stops and amenity clusters.
  - Basic filters and distance filter.
  - Simple trail selection from a list.
  - Settings with direction toggle (invert timeline) and category toggles.

### 5.2 Implementation Steps – Backend


3. **Linear Referencing & Amenity Association**
   - For each trail, compute length and distance measures along the line.
   - For amenities within buffer (e.g. 1–5 km):
     - Compute `distance_from_trail_m` and `trail_km`.
     - Assign `cluster_id` (by bucketing or spatial grouping).


### 5.3 Implementation Steps – Frontend

1. **Setup**
   - Initialize Expo app.
   - Set up navigation (bottom tabs + stack for details).

2. **Data Layer**
   - Implement GeoPackage access (bridge or JS library).
   - Define TypeScript models for `Trail`, `Stop`, `Amenity`, `EnvironmentSegment`.

3. **Trail Selection Flow**
   - Fetch `/trails`, present list, download selected package.
   - Persist chosen trail and path to local GeoPackage.

4. **Vertical Timeline Screen**
   - Render stops and clusters as vertically scrolling items.
   - Highlight current position with GPS.
   - Implement default order (nearest upcoming at top) and auto-scroll.

5. **Amenity Filters & Details**
   - Filter UI (categories, max distance slider).
   - Bottom sheet for amenity details and external map links.

6. **Settings**
   - Implement direction toggle (invert vertical order behavior only in UI).
   - Store preferences locally.

7. **(Optional v1.5) Rough Map View**
   - Simple online map with trail polyline and main stops.

---

## 6. Later Iterations (Preview)

- **Cycling Mode:**
  - Different default distance radius (e.g. 3–5 km).
  - Different clustering strategy for services relevant to cyclists.

- **Richer Gradients & Elevation:**
  - Elevation-aware gradients and difficulty cues along the vertical strip.

- **Advanced Search & Discovery:**
  - Text, location, and map-based trail search with ranking.

- **Custom GPX Import:**
  - User-provided GPX used as the main trail line, matched against OSM amenities.

This document defines the vertical interaction paradigm and a concrete first-iteration scope for both frontend and backend, aligned with your offline and OSM-based vision.