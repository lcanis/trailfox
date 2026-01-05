import React from 'react';
import { render, act } from '@testing-library/react-native';

// Import after mocking
import Map from '../Map.web';
import {
  majorRouteLayer,
  regionalRouteLayer,
  localRouteLayer,
  nodeNetworkLayer,
  otherRoutesLayer,
} from '../mapLayers';

// Avoid importing the CSS during tests
jest.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));

// Mock maplibre-gl Map used in Map.web
const instances: any[] = [];
class MockMap {
  handlers: Record<string, Function> = {};
  layers: Record<string, any> = {};
  sources: Record<string, any> = {};
  constructor(opts: any) {
    instances.push(this);
  }
  on(event: string, cb: Function) {
    this.handlers[event] = cb;
    if (event === 'load') {
      // call asynchronously to simulate load
      setTimeout(() => cb(), 0);
    }
  }
  addSource(id: string, src: any) {
    this.sources[id] = src;
  }
  addLayer(layer: any) {
    this.layers[layer.id] = layer;
  }
  getZoom() {
    return 10;
  }
  isSourceLoaded() {
    return true;
  }
  queryRenderedFeatures() {
    return [];
  }
  setFilter(id: string, f: any) {
    if (this.layers[id]) this.layers[id].filter = f;
  }
  remove() {}
  resize() {}
}

jest.mock('maplibre-gl', () => ({ Map: MockMap }));

describe('Map layer filters', () => {
  it('places is_node_network filter only on node layer and excludes node networks from other layers', async () => {
    // render component
    const onHover = jest.fn();
    const onSelect = jest.fn();
    const onViewChange = jest.fn();

    const { unmount } = render(
      React.createElement(Map, {
        onHover,
        onSelect,
        onViewChange,
        onBboxChange: undefined,
        selectedId: null,
        highlightedId: null,
      } as any)
    );

    // wait for the mock map load callback to run
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    // clean up
    unmount();

    // Instead of relying on a mounted map instance, assert layer definitions exported by mapLayers
    const major = majorRouteLayer();
    const regional = regionalRouteLayer();
    const local = localRouteLayer();
    const node = nodeNetworkLayer();

    // Node layer filter must explicitly check is_node_network === true
    expect(node.filter).toEqual(['==', ['get', 'is_node_network'], true]);

    // Other layers should exclude node networks via ['!', ['==', ['get','is_node_network'], true]]
    const exclusion = ['!', ['==', ['get', 'is_node_network'], true]];
    expect(JSON.stringify(major.filter)).toContain(JSON.stringify(exclusion));
    expect(JSON.stringify(regional.filter)).toContain(JSON.stringify(exclusion));
    expect(JSON.stringify(local.filter)).toContain(JSON.stringify(exclusion));

    // network membership should use ['in', ['get','network'], ...]
    expect(JSON.stringify(major.filter)).toContain(
      JSON.stringify(['in', ['get', 'network'], ['literal', ['iwn', 'nwn']]])
    );
    expect(JSON.stringify(otherRoutesLayer().filter)).toContain(
      JSON.stringify(['!', ['in', ['get', 'network'], ['literal', ['iwn', 'nwn', 'rwn', 'lwn']]]])
    );
  });
});
