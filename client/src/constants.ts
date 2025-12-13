export const NETWORK_MAP: Record<string, { label: string, color: string }> = {
    'iwn': { label: 'International', color: '#e41a1c' },
    'nwn': { label: 'National', color: '#377eb8' },
    'rwn': { label: 'Regional', color: '#4daf4a' },
    'lwn': { label: 'Local', color: '#ff7f00' },
};

// START_LOCATION_MODE, PREDEFINED_LOCATIONS and DEVELOPER_MODE have been moved
// to src/config/settings.ts to make them easily editable by developers.
export { START_LOCATION_MODE, PREDEFINED_LOCATIONS, DEVELOPER_MODE } from './config/settings';

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

export const COLLAPSE_OSM_TAGS_BY_DEFAULT = true;
