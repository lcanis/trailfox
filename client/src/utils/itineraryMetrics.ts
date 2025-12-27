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

    // 1. Find nearest point on trail and distance from start (km on trail)
    const snapped = turf.nearestPointOnLine(line, userPoint, { units: 'kilometers' });
    const kmOnTrail = snapped.properties.dist || 0; // distance from start of line

    // 2. Distance off-trail
    const distanceOffTrail = turf.pointToLineDistance(userPoint, line, { units: 'kilometers' });

    // 3. Distance to end
    const totalLength = turf.length(line, { units: 'kilometers' });
    const distanceToEnd = Math.max(0, totalLength - kmOnTrail);

    // 4. Distance to next item
    let distanceToNext = null;
    if (nextCluster) {
      // We assume nextCluster.trail_km is accurate and relative to the same start
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
