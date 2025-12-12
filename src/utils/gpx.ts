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
