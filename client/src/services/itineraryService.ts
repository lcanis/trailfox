import type { FeatureCollection, Point } from 'geojson';
import { API_BASE_URL } from '../config/settings';
import { RouteAmenity, RouteAmenityProperties } from '../types';
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
  }): Promise<FeatureCollection<Point, RouteAmenityProperties>> {
    const { routeOsmId, maxDistanceFromTrailM = 1000, timeoutMs = 8000 } = params;

    const search = new URLSearchParams({
      select: SELECT_FIELDS,
      route_osm_id: `eq.${routeOsmId}`,
      distance_from_trail_m: `lte.${maxDistanceFromTrailM}`,
    });

    const { data } = await fetchJsonWithTimeout<
      (RouteAmenityProperties & { lon: number; lat: number })[]
    >(`${ITINERARY_URL}?${search.toString()}`, undefined, timeoutMs);

    const features: RouteAmenity[] = data.map((item) => {
      const { lon, lat, ...properties } = item;
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lon, lat],
        },
        properties,
      };
    });

    return {
      type: 'FeatureCollection',
      features,
    };
  },
};
