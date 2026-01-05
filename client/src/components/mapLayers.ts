export function majorRouteLayer() {
  return {
    id: 'routes-line-major',
    type: 'line',
    minzoom: 6,
    filter: [
      'all',
      ['in', ['get', 'network'], ['literal', ['iwn', 'nwn']]],
      ['!', ['==', ['get', 'is_node_network'], true]],
    ],
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': ['match', ['get', 'network'], 'iwn', '#e41a1c', 'nwn', '#377eb8', '#333'],
      'line-width': ['match', ['get', 'network'], 'iwn', 6, 'nwn', 5, 3],
      'line-opacity': 0.8,
    },
  } as any;
}

export function regionalRouteLayer() {
  return {
    id: 'routes-line-regional',
    type: 'line',
    minzoom: 8,
    filter: [
      'all',
      ['==', ['get', 'network'], 'rwn'],
      ['!', ['==', ['get', 'is_node_network'], true]],
    ],
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#4daf4a', 'line-width': 4, 'line-opacity': 0.8 },
  } as any;
}

export function localRouteLayer() {
  return {
    id: 'routes-line-local',
    type: 'line',
    minzoom: 10,
    filter: [
      'all',
      ['==', ['get', 'network'], 'lwn'],
      ['!', ['==', ['get', 'is_node_network'], true]],
    ],
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#ff7f00', 'line-width': 3, 'line-opacity': 0.8 },
  } as any;
}

export function nodeNetworkLayer() {
  return {
    id: 'routes-line-node-network',
    type: 'line',
    minzoom: 11,
    filter: ['==', ['get', 'is_node_network'], true],
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': '#bbbbbb',
      'line-width': 1.5,
      'line-opacity': 0.45,
      'line-dasharray': [2, 2],
    },
  } as any;
}

export function otherRoutesLayer() {
  return {
    id: 'routes-line-other',
    type: 'line',
    minzoom: 11,
    filter: [
      'all',
      ['!', ['in', ['get', 'network'], ['literal', ['iwn', 'nwn', 'rwn', 'lwn']]]],
      ['!', ['==', ['get', 'is_node_network'], true]],
    ],
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#999999', 'line-width': 3, 'line-opacity': 0.8 },
  } as any;
}
