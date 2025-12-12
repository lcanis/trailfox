import type { Feature, LineString, MultiLineString, Position } from 'geojson';

export const createGpx = (route: Feature<LineString | MultiLineString>): string => {
    const name = route.properties?.name || 'Route';
    if (!route.geometry) return '';

    const coords = route.geometry.coordinates;
    const segments: Position[][] = route.geometry.type === 'MultiLineString'
        ? (coords as Position[][])
        : [coords as Position[]];

    let gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Trailfox">\n  <metadata>\n    <name>${name}</name>\n  </metadata>\n  <trk>\n    <name>${name}</name>\n`;

    segments.forEach((segment) => {
        gpx += '    <trkseg>\n';
        segment.forEach((pt) => {
            gpx += `      <trkpt lat="${pt[1]}" lon="${pt[0]}"></trkpt>\n`;
        });
        gpx += '    </trkseg>\n';
    });

    gpx += `  </trk>\n</gpx>`;
    return gpx;
};
<<<<<<< HEAD
interface Route {
    properties?: {
        name?: string;
    };
    geometry?: {
        type?: string;
        coordinates?: number[][] | number[][][];
    };
}

export const createGpx = (route: Route): string => {
=======
import type { Feature, LineString, MultiLineString, Position } from 'geojson';

export const createGpx = (route: Feature<LineString | MultiLineString>): string => {
>>>>>>> 59fb1e0 (Add GeoJSON type safety to fetchGeoJSON and related functions)
    const name = route.properties?.name || 'Route';
    
    if (!route.geometry) {
        throw new Error('Cannot create GPX: route geometry is missing');
    }

    const coords = route.geometry.coordinates;

    // Handle MultiLineString vs LineString
    const segments: Position[][] = route.geometry.type === 'MultiLineString'
        ? coords as Position[][]
        : [coords as Position[]];

    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Trailfox">
  <metadata>
    <name>${name}</name>
  </metadata>
  <trk>
    <name>${name}</name>
`;

    segments.forEach((segment) => {
        gpx += '    <trkseg>\n';
        segment.forEach((pt) => {
            gpx += `      <trkpt lat="${pt[1]}" lon="${pt[0]}"></trkpt>\n`;
        });
        gpx += '    </trkseg>\n';
    });

    gpx += `  </trk>
</gpx>`;

    return gpx;
};
