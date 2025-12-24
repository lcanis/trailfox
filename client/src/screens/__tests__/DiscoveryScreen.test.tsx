import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DiscoveryScreen } from '../DiscoveryScreen';
import { useRoutes } from '../../hooks/useRoutes';

// Mock dependencies
jest.mock('../../hooks/useRoutes');
jest.mock('../../components/Map', () => 'Map');
jest.mock('../../components/NativeBottomSheet', () => ({
  NativeBottomSheet: ({ children, mapComponent }: any) => (
    <>
      {mapComponent}
      {children}
    </>
  ),
}));
jest.mock('../../components/RouteDetails', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    RouteDetails: ({ route, onClose }: any) => (
      <View testID="route-details">
        <Text>Details for {route.name}</Text>
        <TouchableOpacity onPress={onClose} testID="close-details">
          <Text>Close</Text>
        </TouchableOpacity>
      </View>
    ),
  };
});

jest.mock('../ItineraryScreen', () => ({
  ItineraryScreen: () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { View } = require('react-native');
    return <View testID="mock-itinerary-screen" />;
  },
}));

const mockRoutes = [
  { osm_id: 1, name: 'Route A', network: 'rwn' },
  { osm_id: 2, name: 'Route B', network: 'lwn' },
];

describe('DiscoveryScreen', () => {
  beforeEach(() => {
    (useRoutes as jest.Mock).mockReturnValue({
      routes: mockRoutes,
      totalCount: 2,
      loading: false,
      error: null,
      loadMore: jest.fn(),
      hasMore: false,
    });
  });

  it('renders the map and route list', () => {
    const { getByText, getByPlaceholderText } = render(<DiscoveryScreen />);

    // Check for Map (mocked string component might not be queryable by text easily if it's just 'Map')
    // But we can check for list items
    expect(getByText('Route A')).toBeTruthy();
    expect(getByText('Route B')).toBeTruthy();

    // Check for search input
    expect(getByPlaceholderText('Search routes...')).toBeTruthy();
  });

  it('selecting a route shows details and closing returns to list', () => {
    const { getByText, queryByText, getByTestId } = render(<DiscoveryScreen />);

    // Select Route A
    fireEvent.press(getByText('Route A'));

    // Should show RouteDetails
    expect(getByText('Details for Route A')).toBeTruthy();

    // List should be hidden (in Native mode)
    expect(queryByText('Route B')).toBeNull();

    // Close details
    fireEvent.press(getByTestId('close-details'));

    // List should be back
    expect(getByText('Route A')).toBeTruthy();
    expect(getByText('Route B')).toBeTruthy();
    expect(queryByText('Details for Route A')).toBeNull();
  });
});
