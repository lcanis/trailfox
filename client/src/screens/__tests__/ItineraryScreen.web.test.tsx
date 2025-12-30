import React from 'react';
import { render } from '@testing-library/react-native';
import { Route } from '../../types';
import { useItinerary } from '../../hooks/useItinerary';

// Mock the web-specific ItineraryMap so we can inspect what props are passed to it
const mockItineraryMap = jest.fn(() => null);
jest.mock('../../components/ItineraryMap.web', () => ({
  __esModule: true,
  default: mockItineraryMap,
}));
jest.mock('../../hooks/useItinerary');

const mockUseItinerary = useItinerary as jest.Mock;

const mockRoute: Route = {
  osm_id: 123,
  name: 'Test Route',
  network: 'rwn',
  route_type: 'hiking',
  symbol: null,
  merged_geom_type: 'LineString',
  tags: { from: 'A', to: 'B' },
  length_m: 1000,
  geom_quality: 'ok',
};

describe('ItineraryScreen.web', () => {
  beforeEach(() => {
    mockUseItinerary.mockReturnValue({
      rawAmenities: [],
      clusters: [],
      loading: false,
      error: null,
    });
    mockItineraryMap.mockClear();
  });

  it('forwards discovery map center to the itinerary map as initialCenter', () => {
    const center: [number, number] = [1.23, 4.56];

    // Import the web-specific ItineraryScreen after mocks are in place
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ItineraryScreen } = require('../ItineraryScreen.web');

    render(<ItineraryScreen route={mockRoute} onClose={jest.fn()} mapCenter={center} />);

    expect(mockItineraryMap).toHaveBeenCalled();
    const call = (mockItineraryMap.mock.calls[0] ?? []) as any[];
    const props = (call[0] ?? {}) as any;
    expect(props.initialCenter).toEqual(center);
  });
});
