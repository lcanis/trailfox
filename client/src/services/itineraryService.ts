import type { FeatureCollection, Point } from 'geojson';
import { API_BASE_URL } from '../config/settings';
import { RouteAmenity, RouteAmenityProperties } from '../types';
import { fetchJsonWithTimeout } from './http';

/**
 * Endpoint for calling the RPC function
 */
const ITINERARY_RPC_URL = `${API_BASE_URL}/api/rpc/get_route_amenities`;

export const ItineraryService = {
  async fetchRouteAmenities(params: {
    routeOsmId: number;
    timeoutMs?: number;
  }): Promise<FeatureCollection<Point, RouteAmenityProperties>> {
    const { routeOsmId, timeoutMs = 8000 } = params;
    const searchRadiusM = 1000; // Always query with 1km for offline filtering

    /**
     * Arguments match the SQL function parameters:
     * target_route_id and search_radius_m
     */
    const search = new URLSearchParams({
      target_route_id: routeOsmId.toString(),
      search_radius_m: searchRadiusM.toString(),
    });

    const { data } = await fetchJsonWithTimeout<
      (RouteAmenityProperties & { lon: number; lat: number })[]
    >(
      `${ITINERARY_RPC_URL}?${search.toString()}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      },
      timeoutMs
    );

    const features: RouteAmenity[] = (data || []).map((item) => {
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
