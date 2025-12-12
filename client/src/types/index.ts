export interface Route {
    osm_id: number;
    name: string | null;
    network: string | null;
    length_m: number | null;
    route_type: string | null;
    symbol: string | null;
    tags: Record<string, string> | null;
}

export type SortOption = 'name' | 'length' | null;

export interface RouteFilter {
    searchQuery: string;
    viewboxOnly: boolean;
    sortBy: SortOption;
}
