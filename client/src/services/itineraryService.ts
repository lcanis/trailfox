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

    const url = new URL(ITINERARY_URL);
    url.searchParams.set('select', SELECT_FIELDS);
    url.searchParams.set('route_osm_id', `eq.${routeOsmId}`);
    url.searchParams.set('distance_from_trail_m', `lte.${maxDistanceFromTrailM}`);

    return await fetchJsonWithTimeout<RouteAmenity[]>(url.toString(), undefined, timeoutMs);
  },
};
