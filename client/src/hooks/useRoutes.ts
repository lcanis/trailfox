import { useState, useEffect, useCallback } from 'react';
import { Route, SortOption } from '../types';
import { RouteService } from '../services/routeService';

const PAGE_SIZE = 20;

export const useRoutes = (filter?: {
  bbox?: [number, number, number, number];
  searchQuery?: string;
  sortBy?: SortOption;
}) => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const bbox = filter?.bbox;
  const searchQuery = filter?.searchQuery;
  const sortBy = filter?.sortBy || null;
  // Create a stable key for bbox to use in dependency array
  const bboxKey = bbox ? bbox.join(',') : '';

  const loadRoutes = useCallback(
    async (currentOffset: number, isRefresh: boolean = false) => {
      try {
        setLoading(true);
        let newRoutes: Route[];
        let count: number | null = null;

        if (bboxKey) {
          const [minLon, minLat, maxLon, maxLat] = bboxKey.split(',').map(Number);
          const result = await RouteService.fetchRoutesInBbox(
            minLon,
            minLat,
            maxLon,
            maxLat,
            PAGE_SIZE,
            currentOffset,
            sortBy,
            searchQuery
          );
          newRoutes = result.routes;
          count = result.totalCount;
        } else {
          const result = await RouteService.fetchRoutes(
            currentOffset,
            PAGE_SIZE,
            sortBy,
            searchQuery
          );
          newRoutes = result.routes;
          count = result.totalCount;
        }

        if (isRefresh) {
          setRoutes(newRoutes);
          setTotalCount(count);
        } else {
          setRoutes((prev) => [...prev, ...newRoutes]);
          // Don't update totalCount on pagination to avoid flicker, unless it was null
          setTotalCount((prev) => (prev === null ? count : prev));
        }

        if (newRoutes.length < PAGE_SIZE) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    },
    [bboxKey, searchQuery, sortBy]
  );

  // Initial load and reload when filter changes
  useEffect(() => {
    loadRoutes(0, true);
  }, [loadRoutes]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextOffset = routes.length;
      loadRoutes(nextOffset, false);
    }
  }, [loading, hasMore, routes.length, loadRoutes]);

  const refresh = useCallback(() => {
    setHasMore(true);
    loadRoutes(0, true);
  }, [loadRoutes]);

  return { routes, totalCount, loading, error, loadMore, hasMore, refresh };
};
