import { filterAndSortRoutes } from '../useRouteFilter';
import type { Route, RouteFilter } from '../../types';

describe('filterAndSortRoutes', () => {
  const baseRoute: Route = {
    osm_id: 1,
    name: 'R1',
    network: null,
    length_m: 1000,
    route_type: 'hiking',
    symbol: null,
    merged_geom_type: 'LINESTRING',
    tags: null,
  };

  const baseFilter: RouteFilter = {
    searchQuery: '',
    viewboxOnly: false,
    sortBy: null,
  };

  it('sorts by distance ascending when distance_m is present', () => {
    const routes: Route[] = [
      { ...baseRoute, osm_id: 1, name: 'Far', distance_m: 10_000 },
      { ...baseRoute, osm_id: 2, name: 'Near', distance_m: 100 },
    ];

    const out = filterAndSortRoutes(
      routes,
      { ...baseFilter, sortBy: 'distance' },
      new Set<number>()
    );

    expect(out.map((r) => r.name)).toEqual(['Near', 'Far']);
  });

  it('keeps stable-ish ordering when distance_m is missing', () => {
    const routes: Route[] = [
      { ...baseRoute, osm_id: 1, name: 'A', distance_m: null },
      { ...baseRoute, osm_id: 2, name: 'B', distance_m: undefined },
    ];

    const out = filterAndSortRoutes(
      routes,
      { ...baseFilter, sortBy: 'distance' },
      new Set<number>()
    );

    // Both distances are Infinity; comparator returns 0 so relative order is preserved.
    expect(out.map((r) => r.name)).toEqual(['A', 'B']);
  });
});
