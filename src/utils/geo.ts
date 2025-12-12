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

    if ((geojson as any).type === 'FeatureCollection') {
        (geojson as FeatureCollection).features.forEach((f) => {
            if (f.geometry) processGeometry(f.geometry);
        });
    } else if ((geojson as any).type === 'Feature') {
        if ((geojson as Feature).geometry) processGeometry((geojson as Feature).geometry);
    } else {
        processGeometry(geojson as Geometry);
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

    if ((geojson as any).type === 'FeatureCollection') {
        (geojson as FeatureCollection).features.forEach((f) => {
            if (f.geometry) processGeometry(f.geometry);
        });
    } else if ((geojson as any).type === 'Feature') {
        if ((geojson as Feature).geometry) processGeometry((geojson as Feature).geometry);
    } else {
        processGeometry(geojson as Geometry);
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

            if ((geojson as any).type === 'FeatureCollection') {
                (geojson as FeatureCollection).features.forEach((f) => {
                    if (f.geometry) processGeometry(f.geometry);
                });
            } else if ((geojson as any).type === 'Feature') {
                if ((geojson as Feature).geometry) processGeometry((geojson as Feature).geometry);
            } else {
                processGeometry(geojson as Geometry);
            }

            if (minX === Infinity) return null;
            return [minX, minY, maxX, maxY];
        }
