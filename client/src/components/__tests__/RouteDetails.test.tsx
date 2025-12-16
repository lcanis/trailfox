import React from 'react';
import { render } from '@testing-library/react-native';
import { RouteDetails } from '../RouteDetails';
import type { Route } from '../../types';

const baseRoute: Route = {
  osm_id: 123,
  name: 'Test Route',
  network: null,
  length_m: 12345,
  route_type: 'hiking',
  symbol: null,
  merged_geom_type: 'LINESTRING',
  geom_quality: 'ok_singleline',
  geom_parts: 1,
  tags: null,
};

describe('RouteDetails route builder status', () => {
  it('shows OK when geom_quality starts with ok_', () => {
    const { getByText } = render(
      <RouteDetails route={baseRoute} onClose={() => {}} onOpenItinerary={() => {}} />
    );

    getByText('Route builder OK');
    getByText('✅');
  });

  it('treats ok_ only when it is a prefix (not just contained)', () => {
    const route: Route = { ...baseRoute, geom_quality: 'some_ok_singleline' };
    const { getByText } = render(
      <RouteDetails route={route} onClose={() => {}} onOpenItinerary={() => {}} />
    );

    // Should be treated as warning now because it doesn't start with ok_
    getByText('⚠️');
    getByText('Route builder reports some_ok_singleline. Itinerary may not be correct.');
  });

  it('shows warning when geom_quality does not contain ok_', () => {
    const route: Route = { ...baseRoute, geom_quality: '4 parts', geom_parts: 4 };

    const { getByText } = render(
      <RouteDetails route={route} onClose={() => {}} onOpenItinerary={() => {}} />
    );

    getByText('⚠️');
    getByText('Route builder reports 4 parts. Itinerary may not be correct.');
  });

  it('shows warning when geom_quality is missing', () => {
    const route: Route = { ...baseRoute, geom_quality: null };

    const { getByText } = render(
      <RouteDetails route={route} onClose={() => {}} onOpenItinerary={() => {}} />
    );

    getByText('⚠️');
    getByText('Route builder reports unknown. Itinerary may not be correct.');
  });
});
