import { Route } from '../types';

const API_URL = '/api/routes';
const SELECT_FIELDS = 'osm_id,name,network,length_m,route_type,symbol,tags';

export const RouteService = {
    async fetchAll(): Promise<Route[]> {
        try {
            const response = await fetch(`${API_URL}?select=${SELECT_FIELDS}`);
            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }
            const data = await response.json();
            return data as Route[];
        } catch (error) {
            console.error('Failed to fetch routes:', error);
            throw error;
        }
    },

    async fetchGeoJSON(id: number): Promise<any> {
        try {
            const response = await fetch(`${API_URL}?osm_id=eq.${id}`, {
                headers: { 'Accept': 'application/geo+json' }
            });
            if (!response.ok) throw new Error('Failed to fetch geometry');
            return await response.json();
        } catch (error) {
            console.error('GPX fetch error:', error);
            throw error;
        }
    }
};
