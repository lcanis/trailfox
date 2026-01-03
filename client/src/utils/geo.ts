export function getBounds(geojson: any): [number, number, number, number] | null {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  const processCoords = (coords: any[]) => {
    if (!coords || coords.length === 0) return;
    if (typeof coords[0] === 'number') {
      const [x, y] = coords;
      if (typeof x !== 'number' || typeof y !== 'number') return;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    } else {
      coords.forEach(processCoords);
    }
  };

  if (!geojson) return null;

  if (geojson.type === 'FeatureCollection') {
    geojson.features.forEach((f: any) => {
      if (f.geometry && f.geometry.coordinates) {
        processCoords(f.geometry.coordinates);
      }
    });
  } else if (geojson.type === 'Feature') {
    if (geojson.geometry && geojson.geometry.coordinates) {
      processCoords(geojson.geometry.coordinates);
    }
  } else if (geojson.geometry) {
    if (geojson.geometry.coordinates) {
      processCoords(geojson.geometry.coordinates);
    }
  } else if (geojson.coordinates) {
    processCoords(geojson.coordinates);
  } else {
    return null;
  }

  if (minX === Infinity) return null;
  return [minX, minY, maxX, maxY];
}
