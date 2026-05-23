import { buildMetricFrame, polygonAreaSqmAccurate } from '@/components/cadastral/subdivision/utils/metrics';
import { gpsToNormalized } from '@/components/cadastral/subdivision/utils/geometry';

export type GpsPoint = { lat: number; lng: number };

/**
 * Compute effective parcel surface (m²) from GPS polygon when available.
 * Falls back to the DB-stored area when polygon is missing or invalid.
 * Keeps display coherent with the geometric side lengths shown to the user.
 */
export function computeEffectiveAreaSqm(
  gpsCoords: GpsPoint[] | null | undefined,
  dbAreaSqm: number,
): number {
  if (Array.isArray(gpsCoords) && gpsCoords.length >= 3) {
    try {
      const frame = buildMetricFrame(gpsCoords as any, dbAreaSqm || 1);
      const normVerts = gpsCoords.map((g) => gpsToNormalized(g as any, gpsCoords as any));
      const geomArea = polygonAreaSqmAccurate(normVerts, frame);
      if (isFinite(geomArea) && geomArea > 0) return Math.round(geomArea);
    } catch {
      // ignore and fall back to DB value
    }
  }
  return Math.round(dbAreaSqm || 0);
}
