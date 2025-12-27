import { AmenityCluster, Route, RouteAmenity } from '../../types';

export const PLACE_HEADER_MAX_DISTANCE_M = 1000;

export const titleize = (s: string) => (s.length ? s[0].toUpperCase() + s.slice(1) : s);

export const normalizeAmenityClassLabel = (label: string) => {
  // Compact labels for phone-sized chips.
  const map: Record<string, string> = {
    accom: 'Accommodation',
    tourism: 'Tourism',
    other: 'Other',
    shelter: 'Shelter',
    food: 'Food',
    water: 'Water',
    hygiene: 'Hygiene',
    resupply: 'Shops',
    bike: 'Bike',
    cash: 'Cash',
    transport: 'Transport',
    street: 'Street',
    medical: 'Medical',
    place: 'Place',
  };
  return map[label] || label;
};

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

/**
 * Groups amenities into trail-distance buckets.
 *
 * This is the core “grouping” behavior for the itinerary timeline.
 */
export const buildAmenityClusters = (
  amenities: RouteAmenity[],
  bucketKm: number
): AmenityCluster[] => {
  const map = new Map<string, AmenityCluster>();

  for (const amenity of amenities) {
    const bucket = roundTo(amenity.trail_km, bucketKm);
    const key = `${bucket.toFixed(3)}`;

    let cluster = map.get(key);
    if (!cluster) {
      cluster = {
        key,
        trail_km: bucket,
        amenities: [],
        countsByClass: {},
        size: 0,
        lon: 0,
        lat: 0,
      };
      map.set(key, cluster);
    }

    cluster.amenities.push(amenity);
    cluster.countsByClass[amenity.class] = (cluster.countsByClass[amenity.class] ?? 0) + 1;
  }

  for (const cluster of map.values()) {
    cluster.size = cluster.amenities.length;
    const lonSum = cluster.amenities.reduce((sum, a) => sum + a.lon, 0);
    const latSum = cluster.amenities.reduce((sum, a) => sum + a.lat, 0);
    cluster.lon = lonSum / cluster.size;
    cluster.lat = latSum / cluster.size;
  }

  return [...map.values()].sort((a, b) => a.trail_km - b.trail_km);
};

export const pickClusterTitle = (countsByClass: Record<string, number>) => {
  const top = Object.entries(countsByClass).sort((a, b) => b[1] - a[1])[0];
  if (!top) return 'Amenities';
  return top[0];
};

export const getAvailableClasses = (rawAmenities: RouteAmenity[]) => {
  const counts = new Map<string, number>();
  for (const a of rawAmenities) {
    counts.set(a.class, (counts.get(a.class) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([cls]) => cls);
};

export const getTotalAmenities = (clusters: AmenityCluster[]) =>
  clusters.reduce((sum, c) => sum + c.amenities.length, 0);

export const getClusterMinDistanceM = (cluster: AmenityCluster) =>
  Math.min(...cluster.amenities.map((a) => a.distance_from_trail_m));

export const getClusterPlaceTitle = (
  cluster: AmenityCluster,
  maxDistanceFromTrailM: number = PLACE_HEADER_MAX_DISTANCE_M
) => {
  const places = cluster.amenities
    .filter((a) => a.class === 'Place' && a.distance_from_trail_m <= maxDistanceFromTrailM)
    .slice()
    .sort((a, b) => a.distance_from_trail_m - b.distance_from_trail_m);

  const best = places[0];
  if (!best) return null;
  if (best.name) return best.name;
  if (best.subclass) return titleize(best.subclass);
  return null;
};

export const getClusterDisplayTitle = (cluster: AmenityCluster) => {
  // Special case: for single-item clusters show subclass: name (when available)
  // as a concise header. This prevents duplicating the same label in the details list.
  if (cluster.amenities.length === 1) {
    const a = cluster.amenities[0];
    if (a.name && a.subclass) {
      return { title: `${titleize(a.subclass)}: ${a.name}`, isPlaceHeader: false };
    }
    if (a.name) {
      return { title: a.name, isPlaceHeader: false };
    }
    if (a.subclass) {
      return { title: titleize(a.subclass), isPlaceHeader: false };
    }
  }

  const placeTitle = getClusterPlaceTitle(cluster);
  const firstNamed = cluster.amenities.find((a) => a.name)?.name;
  const title = placeTitle || firstNamed || pickClusterTitle(cluster.countsByClass);
  return { title, isPlaceHeader: Boolean(placeTitle) };
};

export const addItineraryEndpointClusters = (params: {
  clusters: AmenityCluster[];
  route: Route;
}) => {
  const { clusters, route } = params;

  const epsKm = 0.001;
  const out: AmenityCluster[] = [...clusters];

  // Start (trail_km=0)
  const hasStart = out.some((c) => Math.abs(c.trail_km - 0) <= epsKm);
  if (!hasStart) {
    const startName = route.tags?.from || 'Start';
    const startAmenity: RouteAmenity = {
      route_osm_id: route.osm_id,
      osm_type: 'N',
      osm_id: -1,
      name: startName,
      class: 'Place',
      subclass: null,
      lon: out.length ? out[0].lon : 0,
      lat: out.length ? out[0].lat : 0,
      distance_from_trail_m: 0,
      trail_km: 0,
      tags: null,
    };

    out.unshift({
      key: `start-${route.osm_id}`,
      trail_km: 0,
      amenities: [startAmenity],
      countsByClass: { Place: 1 },
      size: 1,
      lon: startAmenity.lon,
      lat: startAmenity.lat,
    });
  }

  // End (trail_km = route.length_m / 1000)
  const routeKm = route.length_m ? route.length_m / 1000.0 : null;
  if (routeKm !== null) {
    const hasEnd = out.some((c) => Math.abs((c.trail_km || 0) - routeKm) <= epsKm);
    if (!hasEnd) {
      const endName = route.tags?.to || 'End';
      const endAmenity: RouteAmenity = {
        route_osm_id: route.osm_id,
        osm_type: 'N',
        osm_id: -2,
        name: endName,
        class: 'Place',
        subclass: null,
        lon: out.length ? out[out.length - 1].lon : 0,
        lat: out.length ? out[out.length - 1].lat : 0,
        distance_from_trail_m: 0,
        trail_km: routeKm,
        tags: null,
      };

      out.push({
        key: `end-${route.osm_id}`,
        trail_km: routeKm,
        amenities: [endAmenity],
        countsByClass: { Place: 1 },
        size: 1,
        lon: endAmenity.lon,
        lat: endAmenity.lat,
      });
    }
  }

  // Sort by trail_km ascending
  out.sort((a, b) => (a.trail_km || 0) - (b.trail_km || 0));
  return out;
};

export const getDisplayedClusters = (clustersWithEndpoints: AmenityCluster[], invert: boolean) => {
  if (!invert) return clustersWithEndpoints;
  return [...clustersWithEndpoints].reverse();
};

export const sanitizeSelectedClusterKey = (params: {
  selectedKey: string | null;
  clusters: AmenityCluster[];
}) => {
  const { selectedKey, clusters } = params;
  if (!selectedKey) return null;
  const stillExists = clusters.some((c) => c.key === selectedKey);
  return stillExists ? selectedKey : null;
};

export const getTimelineMarginTop = (params: {
  displayedClusters: AmenityCluster[];
  index: number;
  pixelsPerKm: number;
}) => {
  const { displayedClusters, index, pixelsPerKm } = params;
  if (index === 0) return 0;
  const curr = displayedClusters[index];
  const prev = displayedClusters[index - 1];

  const currKm = curr.kmFromStart ?? curr.trail_km;
  const prevKm = prev.kmFromStart ?? prev.trail_km;

  const deltaKm = Math.abs(currKm - prevKm);
  return deltaKm * pixelsPerKm;
};
