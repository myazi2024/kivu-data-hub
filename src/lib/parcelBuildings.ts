import { calculateDistance } from '@/components/cadastral/parcel-map-preview/geometry';

export interface PublicBuilding {
  index: number;
  vertices: { lat: number; lng: number }[];
  heightM: number | null;
  sides: { lengthM: number | null; calculated: boolean }[];
}

/** Use only declared outlines; never infer a building from parcel boundaries. */
export function getParcelBuildings(value: unknown): PublicBuilding[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw, index): PublicBuilding[] => {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.vertices) || raw.vertices.length < 3) return [];
    const vertices = raw.vertices.map((point: unknown) => {
      if (!point || typeof point !== 'object') return null;
      const candidate = point as Record<string, unknown>;
      if (candidate.lat == null || candidate.lng == null || candidate.lat === '' || candidate.lng === '') return null;
      const lat = Number(candidate.lat), lng = Number(candidate.lng);
      return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
    });
    if (vertices.some((point) => point === null)) return [];
    const validVertices = vertices as { lat: number; lng: number }[];
    const declaredSides = Array.isArray(raw.sides) ? raw.sides : [];
    const sides = validVertices.map((point, sideIndex) => {
      const declared = declaredSides[sideIndex]?.length == null ? NaN : Number(declaredSides[sideIndex].length);
      if (Number.isFinite(declared) && declared > 0) return { lengthM: declared, calculated: false };
      const next = validVertices[(sideIndex + 1) % validVertices.length];
      const measured = calculateDistance(point.lat, point.lng, next.lat, next.lng);
      return { lengthM: measured > 0 ? measured : null, calculated: true };
    });
    const height = raw.heightM == null ? NaN : Number(raw.heightM);
    const linkedIndex = raw.linkedIndex == null ? NaN : Number(raw.linkedIndex);
    return [{
      index: Number.isInteger(linkedIndex) && linkedIndex >= 0 ? linkedIndex : index,
      vertices: validVertices,
      heightM: Number.isFinite(height) && height > 0 ? height : null,
      sides,
    }];
  });
}