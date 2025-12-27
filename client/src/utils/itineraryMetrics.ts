import * as turf from '@turf/turf';
import { AmenityCluster } from '../types';

export interface UserItineraryMetrics {
  kmOnTrail: number;
  distanceOffTrail: number;
  distanceToNext: number | null;
  distanceToEnd: number;
}

/**
 * Calculates metrics for the user's current location relative to the trail.
 *
 * @param userLocation Current user coordinates [lat, lon]
 * @param routeGeoJSON GeoJSON of the trail (FeatureCollection or Feature)
 * @param nextCluster The next cluster in the itinerary after the user's position
 * @returns UserItineraryMetrics object
 */
export function calculateUserMetrics(
  userLocation: { latitude: number; longitude: number },
  routeGeoJSON: any,
  nextCluster: AmenityCluster | null
): UserItineraryMetrics | null {
  if (!userLocation || !routeGeoJSON) return null;

  try {
    const userPoint = turf.point([userLocation.longitude, userLocation.latitude]);

    // Extract the line geometry from GeoJSON
    let line: any = null;
    if (routeGeoJSON.type === 'FeatureCollection') {
      line = routeGeoJSON.features[0];
    } else {
      line = routeGeoJSON;
    }

    if (!line) return null;

    // 1. Find nearest point on trail using planar math on 4326 coordinates.
    // 1. Find nearest point on trail using planar math on 4326 coordinates.
    // This matches PostGIS ST_LineLocatePoint(geom, pt) and ensures
    // consistency between server-calculated amenity KM and client-calculated user KM.
    // We use a simple planar projection (lon/lat as x/y) for the fraction.
    // TODO: verify this - using the proper projection
    const coords = line.geometry.coordinates;
    const pt = [userLocation.longitude, userLocation.latitude];

    let minMag = Infinity;
    let totalPlanarLength = 0;
    let bestPlanarLoc = 0;

    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const dx = p2[0] - p1[0];
      const dy = p2[1] - p1[1];
      const segLenSq = dx * dx + dy * dy;
      const segLen = Math.sqrt(segLenSq);

      let t = 0;
      if (segLenSq > 0) {
        t = ((pt[0] - p1[0]) * dx + (pt[1] - p1[1]) * dy) / segLenSq;
        t = Math.max(0, Math.min(1, t));
      }

      const px = p1[0] + t * dx;
      const py = p1[1] + t * dy;
      const distSq = (pt[0] - px) * (pt[0] - px) + (pt[1] - py) * (pt[1] - py);

      if (distSq < minMag) {
        minMag = distSq;
        bestPlanarLoc = totalPlanarLength + t * segLen;
      }
      totalPlanarLength += segLen;
    }

    const progressFraction = totalPlanarLength > 0 ? bestPlanarLoc / totalPlanarLength : 0;

    // 2. Scale the fraction to the official ellipsoidal length
    const properties = (routeGeoJSON as any).properties || {};
    const officialTotalLength = (properties.length_m || 0) / 1000;
    const turfTotalLength = turf.length(line, { units: 'kilometers' });
    const totalLength = officialTotalLength || turfTotalLength;

    const kmOnTrail = progressFraction * totalLength;

    // 3. Distance off-trail (always use Haversine for real-world meters)
    const distanceOffTrail = turf.pointToLineDistance(userPoint, line, { units: 'kilometers' });

    // 4. Distance to end
    const distanceToEnd = Math.max(0, totalLength - kmOnTrail);

    // 5. Distance to next item
    let distanceToNext = null;
    if (nextCluster) {
      distanceToNext = Math.max(0, nextCluster.trail_km - kmOnTrail);
    }

    return {
      kmOnTrail,
      distanceOffTrail,
      distanceToNext,
      distanceToEnd,
    };
  } catch (error) {
    console.error('Error calculating user metrics:', error);
    return null;
  }
}

/**
 * Detects if a route is circular or pseudo-circular (start and end within 200m).
 */
export function isRouteCircular(routeGeoJSON: any): boolean {
  if (!routeGeoJSON) return false;
  try {
    let line: any = null;
    if (routeGeoJSON.type === 'FeatureCollection') {
      line = routeGeoJSON.features[0];
    } else {
      line = routeGeoJSON;
    }
    if (!line || !line.geometry || !line.geometry.coordinates) return false;

    const coords = line.geometry.coordinates;
    if (coords.length === 0) return false;

    // Handle both LineString and MultiLineString
    const isMulti = line.geometry.type === 'MultiLineString';
    const firstPointCoords = isMulti ? coords[0][0] : coords[0];
    const lastLine = isMulti ? coords[coords.length - 1] : coords;
    const lastPointCoords = lastLine[lastLine.length - 1];

    const firstPoint = turf.point(firstPointCoords);
    const lastPoint = turf.point(lastPointCoords);

    const distance = turf.distance(firstPoint, lastPoint, { units: 'kilometers' });
    return distance <= 0.2; // 200m
  } catch (e) {
    return false;
  }
}

/**
 * Calculates distance from a custom start point, handling wrap-around for circular routes.
 */
export function calculateKmFromStart(
  currentKm: number,
  startKm: number,
  totalLength: number,
  isCircular: boolean
): number {
  let diff = currentKm - startKm;
  if (isCircular && diff < 0) {
    diff += totalLength;
  }
  return diff;
}

/**
 * Simple distance calculation between two points in KM.
 */
export function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const from = turf.point([lon1, lat1]);
  const to = turf.point([lon2, lat2]);
  return turf.distance(from, to, { units: 'kilometers' });
}
