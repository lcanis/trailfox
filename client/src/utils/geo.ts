import { GeoJSON, Feature, FeatureCollection, Geometry } from 'geojson';

export function getBounds(geojson: GeoJSON): [number, number, number, number] | null {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // GeoJSON coordinates can be deeply nested arrays of numbers
    const processCoords = (coords: any) => {
        if (Array.isArray(coords) && typeof coords[0] === 'number') {
            const [x, y] = coords as [number, number];
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        } else if (Array.isArray(coords)) {
            coords.forEach(processCoords);
        }
    };

    if (geojson.type === 'FeatureCollection') {
        const fc = geojson as FeatureCollection;
        fc.features.forEach((f: Feature) => {
            if (f.geometry && f.geometry.coordinates) {
                processCoords(f.geometry.coordinates);
            }
        });
    } else if (geojson.type === 'Feature') {
        const f = geojson as Feature;
        if (f.geometry && f.geometry.coordinates) {
            processCoords(f.geometry.coordinates);
        }
    } else {
        // Geometry object
        const g = geojson as Geometry;
        if (g.coordinates) {
            processCoords(g.coordinates);
        } else {
            return null;
        }
    }

    if (minX === Infinity) return null;
    return [minX, minY, maxX, maxY];
}
