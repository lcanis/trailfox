import React from 'react';
import { render } from '@testing-library/react-native';
import { useItinerary } from '../../hooks/useItinerary';

import { Platform } from 'react-native';

// Mock the web itinerary map to avoid maplibregl loading in Jest/JSDOM
const mockItineraryMap = jest.fn(() => null);
jest.mock('../../components/ItineraryMap.web', () => ({
  __esModule: true,
  default: mockItineraryMap,
}));

jest.mock('../../hooks/useItinerary');
const mockUseItinerary = useItinerary as jest.Mock;

const mockRoute = {
  osm_id: 1,
  name: 'R',
  network: 'rwn',
  route_type: 'hiking',
  symbol: null,
  merged_geom_type: 'LineString',
  tags: { from: 'A', to: 'B' },
  length_m: 1000,
  geom_quality: 'ok',
};

describe('Itinerary splitter drag', () => {
  let origPlatform: string;
  beforeEach(() => {
    mockUseItinerary.mockReturnValue({
      rawAmenities: [],
      clusters: [],
      loading: false,
      error: null,
    });
    origPlatform = Platform.OS;
    (Platform as any).OS = 'web';
  });

  afterEach(() => {
    (Platform as any).OS = origPlatform;
  });

  it('registers mousemove/mouseup listeners when dragging starts', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ItineraryScreen } = require('../ItineraryScreen.web');

    const origAdd = (window as any).addEventListener;
    const origRemove = (window as any).removeEventListener;
    const calls: any[] = [];
    (window as any).addEventListener = (name: string, fn: any) => calls.push([name, fn]);
    (window as any).removeEventListener = () => {};

    // Provide a minimal document object for the test environment so startDrag can set userSelect
    const origDocument = (global as any).document;
    (global as any).document = { body: { style: {} } } as any;

    const result = render(
      <ItineraryScreen route={mockRoute} onClose={jest.fn()} mapCenter={[1, 2]} />
    );

    const root = (result as any).UNSAFE_root;
    const found = root.findAllByProps({ role: 'separator' });
    expect(found.length).toBeGreaterThan(0);

    // simulate mousedown by calling the prop directly
    const sep = found[0];
    sep.props.onMouseDown({ clientX: 100, preventDefault: () => {} });

    expect(calls.some((c) => c[0] === 'mousemove')).toBe(true);
    expect(calls.some((c) => c[0] === 'mouseup')).toBe(true);

    // restore
    (window as any).addEventListener = origAdd || ((name: string, fn: any) => {});
    (window as any).removeEventListener = origRemove || (() => {});
    (global as any).document = origDocument;
  });
});
