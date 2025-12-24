import { useState, useCallback } from 'react';
import { useRoutes } from './useRoutes';
import { Route, RouteFilter as RouteFilterType } from '../types';

export const useDiscoveryScreen = () => {
  // UI State
  const [filter, setFilter] = useState<RouteFilterType>({
    searchQuery: '',
    viewboxOnly: true,
    sortBy: null, // No sort initially
  });

  const [bbox, setBbox] = useState<[number, number, number, number] | undefined>(undefined);

  const { routes, totalCount, loading, error, loadMore, hasMore } = useRoutes({
    bbox: filter.viewboxOnly ? bbox : undefined,
    searchQuery: filter.searchQuery,
    sortBy: filter.sortBy,
  });

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [itineraryRouteId, setItineraryRouteId] = useState<number | null>(null);

  // Derived Data
  // We rely on server-side filtering and sorting via useRoutes.
  // Client-side filtering is removed to avoid confusion with pagination.
  const displayedRoutes = routes;

  const activeId = selectedId || hoveredId;
  // Show details for selected route, or hovered if none selected.
  const targetId = selectedId || hoveredId;
  const detailsRoute = targetId ? routes.find((r) => r.osm_id === targetId) : null;
  const itineraryRoute = itineraryRouteId
    ? routes.find((r) => r.osm_id === itineraryRouteId)
    : null;

  // Handlers
  const handleViewChange = useCallback((_ids: Set<number>) => {
    // setVisibleIds(ids); // Client-side filtering disabled
  }, []);

  const handleBboxChange = useCallback((newBbox: [number, number, number, number]) => {
    setBbox(newBbox);
  }, []);

  const handleSelect = useCallback((route: Route) => {
    setSelectedId(route.osm_id);
  }, []);

  const handleMapSelect = useCallback((id: number | null) => {
    setSelectedId(id);
  }, []);

  const handleMapHover = useCallback((id: number | null) => {
    setHoveredId(id);
  }, []);

  const handleOpenItinerary = useCallback((route: Route) => {
    setItineraryRouteId(route.osm_id);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedId(null);
  }, []);

  const handleCloseItinerary = useCallback(() => {
    setItineraryRouteId(null);
  }, []);

  return {
    // State
    filter,
    setFilter,
    bbox,
    setBbox,
    routes,
    totalCount,
    loading,
    error,
    loadMore,
    hasMore,
    selectedId,
    setSelectedId,
    hoveredId,
    setHoveredId,
    itineraryRouteId,
    setItineraryRouteId,

    // Derived
    displayedRoutes,
    activeId,
    detailsRoute,
    itineraryRoute,

    // Handlers
    handleViewChange,
    handleBboxChange,
    handleSelect,
    handleMapSelect,
    handleMapHover,
    handleOpenItinerary,
    handleCloseDetails,
    handleCloseItinerary,
  };
};
