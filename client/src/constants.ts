export const NETWORK_MAP: Record<string, { label: string, color: string }> = {
    'iwn': { label: 'International', color: '#e41a1c' },
    'nwn': { label: 'National', color: '#377eb8' },
    'rwn': { label: 'Regional', color: '#4daf4a' },
    'lwn': { label: 'Local', color: '#ff7f00' },
};

// Map Start Location Configuration
// Options: 'luxembourg', 'munich', 'user'
export const START_LOCATION_MODE: 'luxembourg' | 'munich' | 'user' = 'user';

export const PREDEFINED_LOCATIONS: Record<string, { center: [number, number], zoom: number }> = {
    luxembourg: { center: [6.13, 49.61], zoom: 9 },
    munich: { center: [11.58, 48.13], zoom: 10 },
};

export const IGNORED_TAGS = [
    'network',
    'website',
    'wikipedia',
    'symbol',
    'osmc:symbol',
    'route',
    'type',
    'distance',
    'name',
    'osm_id',
    'length_m',
    'from',
    'to',
    'source',
    'fixme',
    'url'
];

export const DEVELOPER_MODE = true;
export const COLLAPSE_OSM_TAGS_BY_DEFAULT = true;
