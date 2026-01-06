import { Route, SortOption, LoopFilterOption } from '../types';
import { API_URL, API_ROOT } from '../config/settings';
import { fetchJsonWithTimeout } from './http';

const SELECT_FIELDS =
  'osm_id,name,network,length_m,route_type,symbol,roundtrip,merged_geom_type,tags,geom_quality,geom_parts';

const DEFAULT_PAGE_SIZE = 20;

// Sanitize user-provided search queries to avoid malformed PostgREST filters
const sanitizeSearchQuery = (q: string): string => q.replace(/[*"'%\\]/g, '').trim();

const getOrderParam = (sortBy: SortOption): string => {
  if (sortBy === 'name') return 'name.asc';
  if (sortBy === 'length') return 'length_m.desc';
  return 'osm_id.asc';
};

export const RouteService = {
  async fetchRoutes(
    offset: number = 0,
    limit: number = DEFAULT_PAGE_SIZE,
    sortBy: SortOption = null,
    searchQuery?: string,
    loop?: LoopFilterOption,
    timeoutMs: number = 15000
  ): Promise<{ routes: Route[]; totalCount: number | null }> {
    try {
      const order = getOrderParam(sortBy);
      let url = `${API_URL}?select=${SELECT_FIELDS}&order=${order}&limit=${limit}&offset=${offset}`;

      if (searchQuery) {
        const safe = sanitizeSearchQuery(searchQuery);
        url += `&name=ilike.*${encodeURIComponent(safe)}*`;
      }

      if (loop === 'loop') {
        url += '&roundtrip=eq.true';
      } else if (loop === 'point_to_point') {
        url += '&roundtrip=eq.false';
      }

      // Request exact count from PostgREST
      const { data, count } = await fetchJsonWithTimeout<Route[]>(
        url,
        { headers: { Prefer: 'count=exact' } },
        timeoutMs
      );
      return { routes: data, totalCount: count };
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
    sortBy: SortOption = null,
    searchQuery?: string,
    loop?: LoopFilterOption,
    timeoutMs: number = 15000
  ): Promise<{ routes: Route[]; totalCount: number | null }> {
    try {
      // Use the RPC function
      let url = `${API_ROOT}/rpc/routes_in_bbox?min_lon=${minLon}&min_lat=${minLat}&max_lon=${maxLon}&max_lat=${maxLat}&limit=${limit}&offset=${offset}`;

      const order = getOrderParam(sortBy);
      // For RPC, we can append order param to sort the result set
      url += `&order=${order}`;

      if (searchQuery) {
        // Pass sanitized search query to the RPC function
        const safe = sanitizeSearchQuery(searchQuery);
        url += `&search_query=${encodeURIComponent(safe)}`;
      }

      if (loop === 'loop') {
        url += '&roundtrip_filter=true';
      } else if (loop === 'point_to_point') {
        url += '&roundtrip_filter=false';
      }

      const urlWithSelect = `${url}&select=${SELECT_FIELDS}`;
      // Request exact count from PostgREST
      const { data, count } = await fetchJsonWithTimeout<Route[]>(
        urlWithSelect,
        { headers: { Prefer: 'count=exact' } },
        timeoutMs
      );
      return { routes: data, totalCount: count };
    } catch (error) {
      console.error('Failed to fetch routes in bbox:', error);
      throw error;
    }
  },

  async fetchGeoJSON(id: number, timeoutMs: number = 15000): Promise<any> {
    try {
      const { data } = await fetchJsonWithTimeout<any>(
        `${API_URL}?osm_id=eq.${id}`,
        { headers: { Accept: 'application/geo+json' } },
        timeoutMs
      );
      return data;
    } catch (error) {
      console.error('GeoJSON fetch error:', error);
      throw error;
    }
  },

  async fetchRouteById(id: number, timeoutMs: number = 15000): Promise<Route | null> {
    try {
      const { data } = await fetchJsonWithTimeout<Route[]>(
        `${API_URL}?osm_id=eq.${id}&select=${SELECT_FIELDS}`,
        {},
        timeoutMs
      );
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Failed to fetch route by ID:', error);
      throw error;
    }
  },

  async fetchRouteParents(id: number, timeoutMs: number = 15000) {
    try {
      const { data } = await fetchJsonWithTimeout<any[]>(
        `${API_ROOT}/route_parents?child_id=eq.${id}`,
        {},
        timeoutMs
      );
      return data || [];
    } catch (error) {
      console.error('Failed to fetch route parents:', error);
      return [];
    }
  },

  async fetchRouteChildren(id: number, timeoutMs: number = 15000) {
    try {
      const { data } = await fetchJsonWithTimeout<any[]>(
        `${API_ROOT}/route_children?parent_id=eq.${id}&order=sequence.asc`,
        {},
        timeoutMs
      );
      return data || [];
    } catch (error) {
      console.error('Failed to fetch route children:', error);
      return [];
    }
  },
};
