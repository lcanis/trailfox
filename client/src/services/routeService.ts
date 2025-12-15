import { Route } from '../types';
import { API_URL } from '../config/settings';
import { fetchJsonWithTimeout } from './http';

const SELECT_FIELDS =
  'osm_id,name,network,length_m,route_type,symbol,merged_geom_type,tags,geom_quality,geom_parts';

export const RouteService = {
  async fetchAll(timeoutMs: number = 8000): Promise<Route[]> {
    try {
      return await fetchJsonWithTimeout<Route[]>(
        `${API_URL}?select=${SELECT_FIELDS}`,
        undefined,
        timeoutMs
      );
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
