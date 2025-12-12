import { useMemo } from 'react';
import { Route, RouteFilter } from '../types';

export const useRouteFilter = (
    routes: Route[],
    filter: RouteFilter,
    visibleIds: Set<number>
) => {
    return useMemo(() => {
        let result = routes;

        // 1. Viewbox Filter
        if (filter.viewboxOnly) {
            result = result.filter(r => visibleIds.has(r.osm_id));
        }

        // 2. Search Filter
        if (filter.searchQuery) {
            const q = filter.searchQuery.toLowerCase();
            result = result.filter(r =>
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
            return 0;
        });
    }, [routes, filter.searchQuery, filter.viewboxOnly, filter.sortBy, visibleIds]);
};
