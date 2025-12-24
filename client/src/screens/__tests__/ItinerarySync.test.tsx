import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ItineraryScreen } from '../ItineraryScreen';
import { Route } from '../../types';
import { useItinerary } from '../../hooks/useItinerary';
import { useUserLocation } from '../../hooks/useUserLocation';

// Mock dependencies
jest.mock('../../components/ItineraryMap', () => {
  const React = require('react');
  const { View, Button } = require('react-native');
  const MockItineraryMap = (props: any) => (
    <View testID="itinerary-map">
      {props.isFollowingUser ? <View testID="map-following-user" /> : null}
      <Button title="Toggle Follow" onPress={props.onToggleFollowUser} />
    </View>
  );
  return MockItineraryMap;
});

jest.mock('../../hooks/useItinerary');
jest.mock('../../hooks/useUserLocation');

// Mock ListContainer to spy on scrollToIndex
const mockScrollToIndex = jest.fn();
jest.mock('../../components/ListContainer', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockListContainer = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      scrollToIndex: mockScrollToIndex,
    }));
    return (
      <View testID="list-container">
        {props.renderItem &&
          props.data.map((item: any, index: number) => (
            <React.Fragment key={index}>{props.renderItem({ item, index })}</React.Fragment>
          ))}
      </View>
    );
  });
  MockListContainer.displayName = 'ListContainer';
  return {
    ListContainer: MockListContainer,
  };
});

const mockUseItinerary = useItinerary as jest.Mock;
const mockUseUserLocation = useUserLocation as jest.Mock;

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

const mockClusters = [
  {
    key: 'c1',
    lat: 10,
    lon: 10,
    trail_km: 1.5,
    amenities: [],
    countsByClass: {},
    size: 1,
  },
  {
    key: 'c2',
    lat: 20,
    lon: 20,
    trail_km: 5.0,
    amenities: [],
    countsByClass: {},
    size: 1,
  },
];

describe('ItineraryScreen Synchronization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseItinerary.mockReturnValue({
      rawAmenities: [],
      clusters: mockClusters,
      loading: false,
      error: null,
    });
    mockUseUserLocation.mockReturnValue({
      location: null,
      errorMsg: null,
      permissionStatus: 'granted',
    });
  });

  it('scrolls to the nearest cluster when following user and location updates', async () => {
    // Start with user at 0,0 (far from clusters)
    mockUseUserLocation.mockReturnValue({
      location: { latitude: 0, longitude: 0 },
    });

    const { getByText, rerender } = render(
      <ItineraryScreen route={mockRoute} onClose={jest.fn()} />
    );

    // Enable follow mode
    fireEvent.press(getByText('Toggle Follow'));

    // Update user location to be near c2 (20, 20)
    mockUseUserLocation.mockReturnValue({
      location: { latitude: 19.9, longitude: 19.9 },
    });

    // Re-render to trigger the effect
    rerender(<ItineraryScreen route={mockRoute} onClose={jest.fn()} />);

    // Expect scrollToIndex to be called with index 1 (c2)
    expect(mockScrollToIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 1,
        animated: true,
      })
    );
  });

  it('does not scroll if not following user', async () => {
    mockUseUserLocation.mockReturnValue({
      location: { latitude: 0, longitude: 0 },
    });

    const { rerender } = render(<ItineraryScreen route={mockRoute} onClose={jest.fn()} />);

    // Do NOT enable follow mode

    // Update user location to be near c2
    mockUseUserLocation.mockReturnValue({
      location: { latitude: 19.9, longitude: 19.9 },
    });

    rerender(<ItineraryScreen route={mockRoute} onClose={jest.fn()} />);

    expect(mockScrollToIndex).not.toHaveBeenCalled();
  });
});
