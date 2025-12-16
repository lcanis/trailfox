import { Route } from '../types';
import { API_BASE_URL, API_URL } from '../config/settings';
import { fetchJsonWithTimeout } from './http';

const SELECT_FIELDS =
  'osm_id,name,network,length_m,route_type,symbol,merged_geom_type,tags,geom_quality,geom_parts';

const ROUTES_BY_DISTANCE_URL = `${API_BASE_URL}/api/rpc/routes_by_distance`;

const DEFAULT_PAGE_SIZE = 500;

const fetchAllPages = async <T>(
  makeUrl: (offset: number, limit: number) => string,
  init: RequestInit | undefined,
  timeoutMs: number,
  pageSize: number = DEFAULT_PAGE_SIZE
): Promise<T[]> => {
  const all: T[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await fetchJsonWithTimeout<T[]>(makeUrl(offset, pageSize), init, timeoutMs);
    all.push(...page);
    if (page.length < pageSize) {
      break;
    }
  }
  return all;
};

export const RouteService = {
  async fetchAll(timeoutMs: number = 8000): Promise<Route[]> {
    try {
      // Paginate to avoid huge single responses as the dataset grows.
      // Use a stable ordering to ensure pagination is deterministic.
      return await fetchAllPages<Route>(
        (offset, limit) =>
          `${API_URL}?select=${SELECT_FIELDS}&order=osm_id.asc&limit=${limit}&offset=${offset}`,
        undefined,
        timeoutMs
      );
    } catch (error) {
      console.error('Failed to fetch routes:', error);
      throw error;
    }
  },

  async fetchAllByDistance(
    params: { lon: number; lat: number },
    timeoutMs: number = 8000
  ): Promise<Route[]> {
    try {
      // PostgREST supports limit/offset for table-valued functions.
      return await fetchAllPages<Route>(
        (offset, limit) => `${ROUTES_BY_DISTANCE_URL}?limit=${limit}&offset=${offset}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        },
        timeoutMs
      );
    } catch (error) {
      console.error('Failed to fetch routes by distance:', error);
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
