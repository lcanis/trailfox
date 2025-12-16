import React from 'react';
import { render } from '@testing-library/react-native';
import { RouteList } from '../RouteList';
import type { Route, RouteFilter } from '../../types';

const baseRoute: Route = {
  osm_id: 1,
  name: 'R1',
  network: 'rwn',
  length_m: 10000,
  route_type: 'hiking',
  symbol: null,
  merged_geom_type: 'LINESTRING',
  geom_quality: null,
  geom_parts: 1,
  tags: null,
};

const emptyFilter: RouteFilter = { searchQuery: '', viewboxOnly: false, sortBy: null };

describe('RouteList quality indicator', () => {
  it('shows a green check for routes with geom_quality starting with ok_', () => {
    const routes = [{ ...baseRoute, osm_id: 2, name: 'OK Route', geom_quality: 'ok_singleline' }];
    const { getByText, getByA11yLabel } = render(
      <RouteList
        routes={routes}
        filter={emptyFilter}
        onFilterChange={() => {}}
        onSelect={() => {}}
      />
    );

    getByText('OK Route');
    getByText('✅');
  });

  it('shows a yellow cross for routes without ok_ prefix', () => {
    const routes = [{ ...baseRoute, osm_id: 3, name: 'Bad Route', geom_quality: '4 parts' }];
    const { getByText, getByA11yLabel } = render(
      <RouteList
        routes={routes}
        filter={emptyFilter}
        onFilterChange={() => {}}
        onSelect={() => {}}
      />
    );

    getByText('Bad Route');
    getByText('✖️');
  });
});
