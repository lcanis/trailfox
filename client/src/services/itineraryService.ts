import { API_BASE_URL } from '../config/settings';
import { RouteAmenity } from '../types';
import { fetchJsonWithTimeout } from './http';

const ITINERARY_RPC_URL = `${API_BASE_URL}/api/rpc/get_route_amenities`;

export const ItineraryService = {
  async fetchRouteAmenities(params: {
    routeOsmId: number;
    searchRadiusM?: number;
    timeoutMs?: number;
  }): Promise<RouteAmenity[]> {
    const { routeOsmId, searchRadiusM = 1000, timeoutMs = 8000 } = params;

    const search = new URLSearchParams({
      target_route_id: routeOsmId.toString(),
      search_radius_m: searchRadiusM.toString(),
    });

    const { data } = await fetchJsonWithTimeout<RouteAmenity[]>(
      `${ITINERARY_RPC_URL}?${search.toString()}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      },
      timeoutMs
    );

    return data || [];
  },
};
