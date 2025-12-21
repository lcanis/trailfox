import { Route } from '../types';
import { API_URL, API_ROOT } from '../config/settings';
import { fetchJsonWithTimeout } from './http';

const SELECT_FIELDS =
  'osm_id,name,network,length_m,route_type,symbol,merged_geom_type,tags,geom_quality,geom_parts';

const DEFAULT_PAGE_SIZE = 20;

export const RouteService = {
  async fetchRoutes(
    offset: number = 0,
    limit: number = DEFAULT_PAGE_SIZE,
    timeoutMs: number = 15000
  ): Promise<Route[]> {
    try {
      const url = `${API_URL}?select=${SELECT_FIELDS}&order=osm_id.asc&limit=${limit}&offset=${offset}`;
      return await fetchJsonWithTimeout<Route[]>(url, undefined, timeoutMs);
    } catch (error) {
      console.error('Failed to fetch routes:', error);
      throw error;
    }
  },

  async fetchRoutesInBbox(
    minLon: number,
    minLat: number,
    maxLon: number,
    maxLat: number,
    limit: number = DEFAULT_PAGE_SIZE,
    offset: number = 0,
    searchQuery?: string,
    timeoutMs: number = 15000
  ): Promise<Route[]> {
    try {
      // Use the RPC function
      let url = `${API_ROOT}/rpc/routes_in_bbox?min_lon=${minLon}&min_lat=${minLat}&max_lon=${maxLon}&max_lat=${maxLat}&limit=${limit}&offset=${offset}`;

      if (searchQuery) {
        // Simple case-insensitive search on name or network
        // PostgREST doesn't support OR across columns easily on RPC results without 'or' param which is complex.
        // But we can filter by name.
        // Actually, for complex OR logic (name OR network), it's better to do it in the RPC or client-side if dataset is small.
        // Since we are paginating, client-side filtering of a page is wrong (we might miss matches on next pages).
        // So we should filter on server.
        // Let's assume for now we just filter by name if provided, or we rely on client side if the result set is small enough (limit=50).
        // But wait, if we limit=50 on server, and then filter client side, we might show 0 results even if there are matches in the DB.
        // So server side search is important.

        // PostgREST syntax for OR: ?or=(name.ilike.*q*,network.ilike.*q*)
        url += `&or=(name.ilike.*${encodeURIComponent(searchQuery)}*,network.ilike.*${encodeURIComponent(searchQuery)}*)`;
      }

      const urlWithSelect = `${url}&select=${SELECT_FIELDS}`;
      return await fetchJsonWithTimeout<Route[]>(urlWithSelect, undefined, timeoutMs);
    } catch (error) {
      console.error('Failed to fetch routes in bbox:', error);
      throw error;
    }
  },

  async fetchGeoJSON(id: number, timeoutMs: number = 15000): Promise<any> {
    try {
      return await fetchJsonWithTimeout<any>(
        `${API_URL}?osm_id=eq.${id}`,
        { headers: { Accept: 'application/geo+json' } },
        timeoutMs
      );
    } catch (error) {
      console.error('GeoJSON fetch error:', error);
      throw error;
    }
  },
};
