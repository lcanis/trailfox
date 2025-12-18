import { useState, useEffect, useCallback } from 'react';
import { Route } from '../types';
import { RouteService } from '../services/routeService';

const PAGE_SIZE = 50;

export const useRoutes = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const loadRoutes = useCallback(async (currentOffset: number, isRefresh: boolean = false) => {
    try {
      setLoading(true);
      const newRoutes = await RouteService.fetchRoutes(currentOffset, PAGE_SIZE);

      if (isRefresh) {
        setRoutes(newRoutes);
      } else {
        setRoutes((prev) => [...prev, ...newRoutes]);
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
  }, []);

  // Initial load
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

  return { routes, loading, error, loadMore, hasMore, refresh };
};
