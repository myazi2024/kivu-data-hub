// Fonctions géométriques pures utilisées par ParcelMapPreview (calculs de
// surface, distance, chevauchement de polygones). Aucune dépendance à React
// ou à Leaflet : elles opèrent uniquement sur des coordonnées.

// Calculer la surface d'un polygone à partir de sommets GPS (Shoelace formula en mètres)
export const calculateBuildingArea = (vertices: { lat: number; lng: number }[]): number => {
  if (vertices.length < 3) return 0;
  const avgLat = vertices.reduce((s, v) => s + v.lat, 0) / vertices.length;
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((avgLat * Math.PI) / 180);
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    const xi = vertices[i].lng * metersPerDegLng;
    const yi = vertices[i].lat * metersPerDegLat;
    const xj = vertices[j].lng * metersPerDegLng;
    const yj = vertices[j].lat * metersPerDegLat;
    area += xi * yj - xj * yi;
  }
  return Math.abs(area / 2);
};

// Calculer la distance entre 2 points GPS (Haversine)
export const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
};

// Calculer les limites géographiques
export const calculateBounds = (coords: [number, number][]) => {
  const lats = coords.map(c => c[0]);
  const lngs = coords.map(c => c[1]);
  return {
    minLat: Math.min(...lats) - 0.005,
    maxLat: Math.max(...lats) + 0.005,
    minLng: Math.min(...lngs) - 0.005,
    maxLng: Math.max(...lngs) + 0.005
  };
};

// Calculer surface polygone (formule sphérique, en mètres carrés)
export const calculatePolygonArea = (coords: [number, number][]): number => {
  if (coords.length < 3) return 0;

  let area = 0;
  const toRad = Math.PI / 180;
  const R = 6371000;

  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    const lat1 = coords[i][0] * toRad;
    const lat2 = coords[j][0] * toRad;
    const lng1 = coords[i][1] * toRad;
    const lng2 = coords[j][1] * toRad;

    area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  area = Math.abs(area * R * R / 2);
  return Math.round(area * 100) / 100;
};

// Point dans polygone
export const isPointInPolygon = (point: [number, number], polygon: [number, number][]): boolean => {
  let inside = false;
  const [x, y] = point;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
};

// Vérifier chevauchement polygones
export const checkPolygonOverlap = (
  poly1: [number, number][],
  poly2: [number, number][]
): { hasOverlap: boolean; area?: number } => {
  const hasPointInside = poly1.some(point => isPointInPolygon(point, poly2)) ||
                         poly2.some(point => isPointInPolygon(point, poly1));

  if (!hasPointInside) return { hasOverlap: false };

  const overlapPoints = poly1.filter(point => isPointInPolygon(point, poly2));
  if (overlapPoints.length > 2) {
    const area = calculatePolygonArea(overlapPoints);
    return { hasOverlap: true, area };
  }

  return { hasOverlap: true };
};
