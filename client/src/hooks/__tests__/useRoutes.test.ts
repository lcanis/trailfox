import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useRoutes } from '../useRoutes';
import { RouteService } from '../../services/routeService';

// Mock RouteService
jest.mock('../../services/routeService');

const mockRoutes = Array.from({ length: 20 }, (_, i) => ({
  osm_id: i,
  name: `Route ${i}`,
  network: 'rwn',
}));

describe('useRoutes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch routes in bbox by default if bbox is provided', async () => {
    (RouteService.fetchRoutesInBbox as jest.Mock).mockResolvedValue({
      routes: mockRoutes,
      totalCount: 2,
    });

    const bbox: [number, number, number, number] = [6, 49, 7, 50];
    const { result } = renderHook(() => useRoutes({ bbox }));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(RouteService.fetchRoutesInBbox).toHaveBeenCalledWith(
      6,
      49,
      7,
      50,
      expect.any(Number), // limit
      0, // offset
      null, // sortBy
      undefined // searchQuery
    );
    expect(result.current.routes).toEqual(mockRoutes);
    expect(result.current.totalCount).toBe(2);
  });

  it('should fetch all routes if bbox is not provided', async () => {
    (RouteService.fetchRoutes as jest.Mock).mockResolvedValue({
      routes: mockRoutes,
      totalCount: 100,
    });

    const { result } = renderHook(() => useRoutes({}));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(RouteService.fetchRoutes).toHaveBeenCalledWith(
      0,
      expect.any(Number),
      null, // sortBy
      undefined // searchQuery
    );
    expect(result.current.routes).toEqual(mockRoutes);
    expect(result.current.totalCount).toBe(100);
  });

  it('should append routes when loadMore is called', async () => {
    (RouteService.fetchRoutes as jest.Mock).mockResolvedValue({
      routes: mockRoutes,
      totalCount: 100,
    });

    const { result } = renderHook(() => useRoutes({}));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Mock next page
    const nextRoutes = [{ osm_id: 100, name: 'Route 100' }];
    (RouteService.fetchRoutes as jest.Mock).mockResolvedValue({
      routes: nextRoutes,
      totalCount: 100,
    });

    await act(async () => {
      result.current.loadMore();
    });

    // Wait for the second call to resolve and state to update
    await waitFor(() => expect(result.current.routes.length).toBe(21));

    expect(RouteService.fetchRoutes).toHaveBeenCalledTimes(2);
    // The first call was with offset 0, the second with offset 20 (length of mockRoutes)
    expect(RouteService.fetchRoutes).toHaveBeenLastCalledWith(
      20,
      20,
      null, // sortBy
      undefined // searchQuery
    );
  });

  it('should handle sorting', async () => {
    (RouteService.fetchRoutes as jest.Mock).mockResolvedValue({
      routes: mockRoutes,
      totalCount: 100,
    });

    const { result } = renderHook(() => useRoutes({ sortBy: 'name' }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(RouteService.fetchRoutes).toHaveBeenCalledWith(0, expect.any(Number), 'name', undefined);
  });

  it('should update routes when bbox changes', async () => {
    const initialRoutes = [{ osm_id: 1, name: 'Route 1' }];
    const newRoutes = [{ osm_id: 2, name: 'Route 2' }];

    (RouteService.fetchRoutesInBbox as jest.Mock)
      .mockResolvedValueOnce({
        routes: initialRoutes,
        totalCount: 1,
      })
      .mockResolvedValueOnce({
        routes: newRoutes,
        totalCount: 1,
      });

    const initialBbox: [number, number, number, number] = [6, 49, 7, 50];
    const newBbox: [number, number, number, number] = [6.1, 49.1, 6.9, 49.9];

    const { result, rerender } = renderHook(
      ({ bbox }: { bbox: [number, number, number, number] }) => useRoutes({ bbox }),
      {
        initialProps: { bbox: initialBbox },
      }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.routes).toEqual(initialRoutes);
    expect(RouteService.fetchRoutesInBbox).toHaveBeenCalledWith(
      6,
      49,
      7,
      50,
      expect.any(Number),
      0,
      null, // sortBy
      undefined // searchQuery
    );

    // Update bbox
    rerender({ bbox: newBbox });

    await waitFor(() => expect(result.current.routes).toEqual(newRoutes));
    expect(RouteService.fetchRoutesInBbox).toHaveBeenCalledWith(
      6.1,
      49.1,
      6.9,
      49.9,
      expect.any(Number),
      0,
      null, // sortBy
      undefined // searchQuery
    );
  });
});
