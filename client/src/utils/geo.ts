export function getBounds(geojson: any): [number, number, number, number] | null {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  const processCoords = (coords: any[]) => {
    if (typeof coords[0] === 'number') {
      const [x, y] = coords;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    } else {
      coords.forEach(processCoords);
    }
  };

  if (geojson.type === 'FeatureCollection') {
    geojson.features.forEach((f: any) => processCoords(f.geometry.coordinates));
  } else if (geojson.type === 'Feature') {
    processCoords(geojson.geometry.coordinates);
  } else if (geojson.geometry) {
    processCoords(geojson.geometry.coordinates);
  } else {
    return null;
  }

  if (minX === Infinity) return null;
  return [minX, minY, maxX, maxY];
}
