import type { FeatureCollection, Feature, Geometry, Position } from 'geojson';

export function getBounds(geojson: FeatureCollection | Feature | Geometry): [number, number, number, number] | null {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    const processCoords = (coords: Position | Position[] | Position[][] | Position[][][]): void => {
        if (typeof coords[0] === 'number') {
            const [x, y] = coords as Position;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        } else {
            (coords as Position[] | Position[][] | Position[][][]).forEach(processCoords);
        }
    };

    function processGeometry(geometry: Geometry): void {
        if (geometry.type === 'GeometryCollection') {
            geometry.geometries.forEach(processGeometry);
        } else if (geometry.type === 'Point') {
            processCoords(geometry.coordinates as Position);
        } else if (geometry.type === 'MultiPoint' || geometry.type === 'LineString') {
            processCoords(geometry.coordinates as Position[]);
        } else if (geometry.type === 'MultiLineString' || geometry.type === 'Polygon') {
            processCoords(geometry.coordinates as Position[][]);
        } else if (geometry.type === 'MultiPolygon') {
            processCoords(geometry.coordinates as Position[][][]);
        }
    }

    if (geojson.type === 'FeatureCollection') {
        geojson.features.forEach((f) => {
            if (f.geometry) processGeometry(f.geometry);
        });
    } else if (geojson.type === 'Feature') {
        if (geojson.geometry) processGeometry(geojson.geometry);
    } else {
        processGeometry(geojson);
    }

    if (minX === Infinity) return null;
    return [minX, minY, maxX, maxY];
}
import type { FeatureCollection, Feature, Geometry, Position } from 'geojson';

export function getBounds(geojson: FeatureCollection | Feature | Geometry): [number, number, number, number] | null {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    const processCoords = (coords: Position | Position[] | Position[][] | Position[][][]): void => {
        if (typeof coords[0] === 'number') {
            const [x, y] = coords as Position;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        } else {
            (coords as Position[] | Position[][] | Position[][][]).forEach(processCoords);
        }
    };

    function processGeometry(geometry: Geometry): void {
        if (geometry.type === 'GeometryCollection') {
            geometry.geometries.forEach(processGeometry);
        } else if (geometry.type === 'Point') {
            processCoords(geometry.coordinates as Position);
        } else if (geometry.type === 'MultiPoint' || geometry.type === 'LineString') {
            processCoords(geometry.coordinates as Position[]);
        } else if (geometry.type === 'MultiLineString' || geometry.type === 'Polygon') {
            processCoords(geometry.coordinates as Position[][]);
        } else if (geometry.type === 'MultiPolygon') {
            processCoords(geometry.coordinates as Position[][][]);
        }
    }

    if (geojson.type === 'FeatureCollection') {
        geojson.features.forEach((f) => {
            if (f.geometry) processGeometry(f.geometry);
        });
    } else if (geojson.type === 'Feature') {
        if (geojson.geometry) processGeometry(geojson.geometry);
    } else {
        processGeometry(geojson);
    }

    if (minX === Infinity) return null;
    return [minX, minY, maxX, maxY];
}
import type { FeatureCollection, Feature, Geometry, Position } from 'geojson';

export function getBounds(geojson: FeatureCollection | Feature | Geometry): [number, number, number, number] | null {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    const processCoords = (coords: Position | Position[] | Position[][] | Position[][][]): void => {
        if (typeof coords[0] === 'number') {
            const [x, y] = coords as Position;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        } else {
            (coords as Position[] | Position[][] | Position[][][]).forEach(processCoords);
        }
    };

    const processGeometry = (geometry: Geometry): void => {
        if (geometry.type === 'GeometryCollection') {
            geometry.geometries.forEach(processGeometry);
        } else if (geometry.type === 'Point') {
            processCoords(geometry.coordinates as Position);
        } else if (geometry.type === 'MultiPoint' || geometry.type === 'LineString') {
            processCoords(geometry.coordinates as Position[]);
        } else if (geometry.type === 'MultiLineString' || geometry.type === 'Polygon') {
            processCoords(geometry.coordinates as Position[][]);
        } else if (geometry.type === 'MultiPolygon') {
            processCoords(geometry.coordinates as Position[][][]);
        }
    }

    if (geojson.type === 'FeatureCollection') {
        geojson.features.forEach((f) => {
            if (f.geometry) processGeometry(f.geometry);
        });
    } else if (geojson.type === 'Feature') {
        if (geojson.geometry) processGeometry(geojson.geometry);
    } else {
        processGeometry(geojson);
    }

    if (minX === Infinity) return null;
    return [minX, minY, maxX, maxY];
}
=======
import type { FeatureCollection, Feature, Geometry, Position } from 'geojson';

export function getBounds(geojson: FeatureCollection | Feature | Geometry): [number, number, number, number] | null {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    const processCoords = (coords: Position | Position[] | Position[][] | Position[][][]): void => {
        if (typeof coords[0] === 'number') {
            const [x, y] = coords as Position;
>>>>>>> 59fb1e0 (Add GeoJSON type safety to fetchGeoJSON and related functions)
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
<<<<<<< HEAD
        } else if (Array.isArray(coords)) {
            coords.forEach(processCoords);
=======
        } else {
            (coords as Position[] | Position[][] | Position[][][]).forEach(processCoords);
>>>>>>> 59fb1e0 (Add GeoJSON type safety to fetchGeoJSON and related functions)
        }
    };

    if (geojson.type === 'FeatureCollection') {
<<<<<<< HEAD
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
=======
        geojson.features.forEach((f) => {
            if (f.geometry) {
                processGeometry(f.geometry);
            }
        });
    } else if (geojson.type === 'Feature') {
        if (geojson.geometry) {
            processGeometry(geojson.geometry);
        }
    } else {
        processGeometry(geojson);
>>>>>>> 59fb1e0 (Add GeoJSON type safety to fetchGeoJSON and related functions)
    }

    if (minX === Infinity) return null;
    return [minX, minY, maxX, maxY];
}
