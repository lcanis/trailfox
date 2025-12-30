import React from 'react';
import { View } from 'react-native';
import { render } from '@testing-library/react-native';
import { ItineraryContent } from '../ItineraryContent';
import { Route } from '../../types';
import { useItinerary } from '../../hooks/useItinerary';

import { addItineraryEndpointClusters } from '../itinerary/itineraryModel';

// Mock dependencies
jest.mock('../../hooks/useItinerary');
jest.mock('../itinerary/itineraryModel', () => ({
  ...jest.requireActual('../itinerary/itineraryModel'),
  addItineraryEndpointClusters: jest.fn(),
}));
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('../../components/ListContainer', () => {
  const React = require('react');
  const { View } = require('react-native');
  const ListContainer = (props: any) => {
    const { ListHeaderComponent, ListEmptyComponent, data, renderItem, keyExtractor } = props;
    const children = [];
    if (ListHeaderComponent) children.push(ListHeaderComponent);
    if (data.length === 0 && ListEmptyComponent) children.push(ListEmptyComponent);
    data.forEach((item: any, index: number) => {
      children.push(
        React.createElement(
          React.Fragment,
          { key: keyExtractor(item, index) },
          renderItem({ item, index })
        )
      );
    });
    return React.createElement(View, { testID: 'mock-ListContainer' }, ...children);
  };
  return { ListContainer };
});
/* eslint-enable @typescript-eslint/no-require-imports */

const mockUseItinerary = useItinerary as jest.Mock;
const mockAddItineraryEndpointClusters = addItineraryEndpointClusters as jest.Mock;

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

describe('ItineraryContent', () => {
  beforeEach(() => {
    mockUseItinerary.mockReturnValue({
      rawAmenities: [],
      clusters: [],
      loading: false,
      error: null,
    });
    mockAddItineraryEndpointClusters.mockImplementation(({ clusters }) => clusters);
  });

  it('renders loading state', () => {
    mockUseItinerary.mockReturnValue({
      rawAmenities: [],
      clusters: [],
      loading: true,
      error: null,
    });

    const { getByText } = render(<ItineraryContent route={mockRoute} onClose={jest.fn()} />);

    expect(getByText('Loading itinerary…')).toBeTruthy();
  });

  it('renders error state', () => {
    mockUseItinerary.mockReturnValue({
      rawAmenities: [],
      clusters: [],
      loading: false,
      error: { message: 'Failed to load' },
    });

    const { getByText } = render(<ItineraryContent route={mockRoute} onClose={jest.fn()} />);

    expect(getByText('Could not load itinerary')).toBeTruthy();
    expect(getByText('Failed to load')).toBeTruthy();
  });

  it('renders empty state', () => {
    const { getByText } = render(<ItineraryContent route={mockRoute} onClose={jest.fn()} />);

    expect(getByText(/No amenities found within/)).toBeTruthy();
  });

  it('renders clusters', () => {
    const mockClusters = [
      {
        key: 'c1',
        trail_km: 0.5,
        size: 1,
        amenities: [
          {
            osm_id: 1,
            osm_type: 'node',
            class: 'sustenance',
            subclass: 'restaurant',
            name: 'Food Place',
            distance_from_trail_m: 10,
            tags: {},
          },
        ],
        countsByClass: { sustenance: 1 },
        countsByIcon: { amenity_restaurant: 1 },
      },
    ];

    mockUseItinerary.mockReturnValue({
      rawAmenities: [],
      clusters: mockClusters,
      loading: false,
      error: null,
    });

    const { getByText } = render(<ItineraryContent route={mockRoute} onClose={jest.fn()} />);

    expect(getByText(/Food Place/)).toBeTruthy();
    expect(getByText(/0.5 km/)).toBeTruthy();
  });

  it('calls renderWrapper if provided', () => {
    const renderWrapper = jest.fn().mockReturnValue(<View testID="mock-Wrapper" />);
    render(
      <ItineraryContent route={mockRoute} onClose={jest.fn()} renderWrapper={renderWrapper} />
    );

    expect(renderWrapper).toHaveBeenCalled();
  });
});
