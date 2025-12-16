export interface Route {
  osm_id: number;
  name: string | null;
  network: string | null;
  length_m: number | null;
  route_type: string | null;
  symbol: string | null;
  merged_geom_type: string | null;
  // Distance from current location to the route (meters). Only present when
  // fetched via `api.routes_by_distance`.
  distance_m?: number | null;
  geom_quality?: string | null;
  geom_parts?: number | null;
  tags: Record<string, string> | null;
}

export * from './itinerary';

export type SortOption = 'name' | 'length' | 'distance' | null;

export interface RouteFilter {
  searchQuery: string;
  viewboxOnly: boolean;
  sortBy: SortOption;
}
