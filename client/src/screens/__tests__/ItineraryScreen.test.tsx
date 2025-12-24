import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ItineraryScreen } from '../ItineraryScreen';
import { Route } from '../../types';

import { useItinerary } from '../../hooks/useItinerary';

// Mock dependencies
jest.mock('../../components/ItineraryMap', () => 'ItineraryMap');
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

describe('ItineraryScreen', () => {
  beforeEach(() => {
    mockUseItinerary.mockReturnValue({
      rawAmenities: [],
      clusters: [],
      loading: false,
      error: null,
    });
  });

  it('renders the map and bottom sheet content', async () => {
    const onClose = jest.fn();
    const { getByText, getByTestId } = render(
      <ItineraryScreen route={mockRoute} onClose={onClose} />
    );

    // Check for Map (mocked)
    // Since ItineraryMap is mocked as a string 'ItineraryMap', it might render as <ItineraryMap /> or text.
    // In React Native testing library with string mocks, it usually renders a View with that name as type?
    // Or if we mock it as a component returning null?
    // Let's check if we can find the bottom sheet.

    // The NativeBottomSheet mock in jest.setup.ts renders a View with testID="bottom-sheet"
    expect(getByTestId('bottom-sheet')).toBeTruthy();

    // Check for title
    expect(getByText('Test Route')).toBeTruthy();

    // Check for close button
    fireEvent.press(getByText('×'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders the itinerary list items', () => {
    const mockClusters = [
      {
        key: 'c1',
        trail_km: 1.5,
        amenities: [
          {
            osm_id: 1,
            osm_type: 'node',
            class: 'amenity',
            subclass: 'cafe',
            name: 'Coffee Shop',
            distance_from_trail_m: 10,
            tags: {},
          },
        ],
        countsByClass: { amenity: 1 },
        size: 1,
      },
    ];

    mockUseItinerary.mockReturnValue({
      rawAmenities: [],
      clusters: mockClusters,
      loading: false,
      error: null,
    });

    const { getByText } = render(<ItineraryScreen route={mockRoute} onClose={jest.fn()} />);

    expect(getByText(/Coffee Shop/)).toBeTruthy();
    expect(getByText(/1.5 km/)).toBeTruthy();
  });
});
