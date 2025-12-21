import { API_BASE_URL } from '../config/settings';
import { RouteAmenity } from '../types';
import { fetchJsonWithTimeout } from './http';

const ITINERARY_URL = `${API_BASE_URL}/api/route_amenities`;

const SELECT_FIELDS = [
  'route_osm_id',
  'osm_type',
  'osm_id',
  'name',
  'class',
  'subclass',
  'lon',
  'lat',
  'distance_from_trail_m',
  'trail_km',
  'tags',
].join(',');

export const ItineraryService = {
  async fetchRouteAmenities(params: {
    routeOsmId: number;
    maxDistanceFromTrailM?: number;
    timeoutMs?: number;
  }): Promise<RouteAmenity[]> {
    const { routeOsmId, maxDistanceFromTrailM = 1000, timeoutMs = 8000 } = params;

    // Use relative URLs on web (same-origin) and absolute URLs on native.
    // Avoid `new URL('/path')` which throws without a base URL in browsers.
    const search = new URLSearchParams({
      select: SELECT_FIELDS,
      route_osm_id: `eq.${routeOsmId}`,
      distance_from_trail_m: `lte.${maxDistanceFromTrailM}`,
    });

    const { data } = await fetchJsonWithTimeout<RouteAmenity[]>(
      `${ITINERARY_URL}?${search.toString()}`,
      undefined,
      timeoutMs
    );
    return data;
  },
};
