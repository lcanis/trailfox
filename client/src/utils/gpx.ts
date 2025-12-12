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
    const name = route.properties?.name || 'Route';
    const coords = route.geometry?.coordinates || [];

    // Handle MultiLineString vs LineString
    const segments = route.geometry?.type === 'MultiLineString'
        ? coords
        : [coords];

    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Trailfox">
  <metadata>
    <name>${name}</name>
  </metadata>
  <trk>
    <name>${name}</name>
`;

    segments.forEach((segment: any[]) => {
        gpx += '    <trkseg>\n';
        segment.forEach((pt: number[]) => {
            gpx += `      <trkpt lat="${pt[1]}" lon="${pt[0]}"></trkpt>\n`;
        });
        gpx += '    </trkseg>\n';
    });

    gpx += `  </trk>
</gpx>`;

    return gpx;
};
