import { useMemo } from 'react';
import { Route, RouteFilter } from '../types';

export const filterAndSortRoutes = (
  routes: Route[],
  filter: RouteFilter,
  visibleIds: Set<number>
) => {
  let result = routes;

  // 1. Viewbox Filter
  // We now handle bbox filtering server-side in useRoutes.
  // Client-side filtering by visibleIds is too restrictive (depends on map rendering/tiles).
  // if (filter.viewboxOnly) {
  //   result = result.filter((r) => visibleIds.has(r.osm_id));
  // }

  // 2. Search Filter
  if (filter.searchQuery) {
    const q = filter.searchQuery.toLowerCase();
    result = result.filter(
      (r) =>
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.network && r.network.toLowerCase().includes(q))
    );
  }

  // 3. Sort
  if (!filter.sortBy) {
    return result;
  }

  return [...result].sort((a, b) => {
    if (filter.sortBy === 'name') {
      const nameA = a.name || 'zzzz';
      const nameB = b.name || 'zzzz';
      return nameA.localeCompare(nameB);
    }
    if (filter.sortBy === 'length') {
      return (b.length_m || 0) - (a.length_m || 0);
    }
    if (filter.sortBy === 'distance') {
      const distA = a.distance_m ?? Infinity;
      const distB = b.distance_m ?? Infinity;
      return distA - distB;
    }
    return 0;
  });
};

export const useRouteFilter = (routes: Route[], filter: RouteFilter, visibleIds: Set<number>) => {
  return useMemo(() => {
    return filterAndSortRoutes(routes, filter, visibleIds);
  }, [routes, filter, visibleIds]);
};
