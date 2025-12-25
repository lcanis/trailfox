import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
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
const mockScrollToOffset = jest.fn();
jest.mock('../../components/ListContainer', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockListContainer = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      scrollToIndex: mockScrollToIndex,
      scrollToOffset: mockScrollToOffset,
    }));
    return (
      <View testID="list-container" onLayout={props.onLayout}>
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
    mockUseUserLocation.mockImplementation(() => ({
      location: null,
      errorMsg: null,
      permissionStatus: 'granted',
      requestPermission: jest.fn(),
    }));
  });

  it('scrolls to the nearest cluster when following user and location updates', async () => {
    jest.useFakeTimers();
    // Start with user at 0,0 (far from clusters)
    mockUseUserLocation.mockImplementation(() => ({
      location: { latitude: 0, longitude: 0 },
      requestPermission: jest.fn(),
    }));

    const { getByText, rerender, getByTestId } = render(
      <ItineraryScreen route={mockRoute} onClose={jest.fn()} />
    );

    // Trigger layout to set listHeight
    fireEvent(getByTestId('list-container'), 'layout', {
      nativeEvent: { layout: { height: 500 } },
    });

    // Enable follow mode
    fireEvent.press(getByText('Toggle Follow'));

    // Update user location to be near c2 (20, 20)
    mockUseUserLocation.mockImplementation(() => ({
      location: { latitude: 19.9, longitude: 19.9 },
      requestPermission: jest.fn(),
    }));

    // Re-render to trigger the effect
    rerender(<ItineraryScreen route={mockRoute} onClose={jest.fn()} />);

    // Advance timers for the setTimeout in ItineraryContent
    await act(async () => {
      jest.advanceTimersByTime(550);
    });

    // Expect a programmatic scroll call to happen.
    // Implementation may prefer scrollToIndex(viewPosition) and fall back to scrollToOffset.
    expect(
      mockScrollToIndex.mock.calls.length + mockScrollToOffset.mock.calls.length
    ).toBeGreaterThan(0);
    jest.useRealTimers();
  });

  it('does not scroll if not following user', async () => {
    mockUseUserLocation.mockImplementation(() => ({
      location: { latitude: 0, longitude: 0 },
      requestPermission: jest.fn(),
    }));

    const { rerender } = render(<ItineraryScreen route={mockRoute} onClose={jest.fn()} />);

    // Do NOT enable follow mode

    // Update user location to be near c2
    mockUseUserLocation.mockImplementation(() => ({
      location: { latitude: 19.9, longitude: 19.9 },
      requestPermission: jest.fn(),
    }));

    rerender(<ItineraryScreen route={mockRoute} onClose={jest.fn()} />);

    expect(mockScrollToIndex).not.toHaveBeenCalled();
  });
});
