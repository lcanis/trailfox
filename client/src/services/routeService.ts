import { Route } from '../types';
import { API_URL } from '../config/settings';
import { fetchJsonWithTimeout } from './http';

const SELECT_FIELDS =
  'osm_id,name,network,length_m,route_type,symbol,merged_geom_type,tags,geom_quality,geom_parts';

const DEFAULT_PAGE_SIZE = 50;

export const RouteService = {
  async fetchRoutes(
    offset: number = 0,
    limit: number = DEFAULT_PAGE_SIZE,
    timeoutMs: number = 8000
  ): Promise<Route[]> {
    try {
      const url = `${API_URL}?select=${SELECT_FIELDS}&order=osm_id.asc&limit=${limit}&offset=${offset}`;
      return await fetchJsonWithTimeout<Route[]>(url, undefined, timeoutMs);
    } catch (error) {
      console.error('Failed to fetch routes:', error);
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
