// Metric frame — accurate meter projection from normalized (0-1) coords.
//
// Why: gpsToNormalized projects via GPS bounding box; 1° longitude ≠ 1° latitude
// in meters, so the normalized grid is anisotropic. Using a single √A scale
// distorts every length and area. The frame holds two independent scales
// (sxM, syM) so distance/area calculations match real-world GPS meters.

import { GpsPoint, Point2D } from '../types';
import { gpsDistance, getBoundingBox, polygonArea } from './geometry';

export interface MetricFrame {
  sxM: number; // meters per 1.0 unit on X (longitude axis)
  syM: number; // meters per 1.0 unit on Y (latitude axis)
  /** True if frame was derived from GPS bounds (accurate); false = isotropic √A fallback */
  hasGps: boolean;
}

/**
 * Build a metric frame from the parent parcel's GPS bounds + known area.
 * Falls back to an isotropic √areaSqm scale when GPS data is missing.
 */
export function buildMetricFrame(
  parentGps: GpsPoint[] | undefined,
  parentAreaSqm: number,
): MetricFrame {
  if (parentGps && parentGps.length >= 3) {
    const bb = getBoundingBox(parentGps);
    const midLat = (bb.minLat + bb.maxLat) / 2;
    // Width: distance along the equator-parallel at midLat
    const widthM = gpsDistance(
      { lat: midLat, lng: bb.minLng },
      { lat: midLat, lng: bb.maxLng },
    );
    const heightM = gpsDistance(
      { lat: bb.minLat, lng: (bb.minLng + bb.maxLng) / 2 },
      { lat: bb.maxLat, lng: (bb.minLng + bb.maxLng) / 2 },
    );
    if (widthM > 0 && heightM > 0) {
      return { sxM: widthM, syM: heightM, hasGps: true };
    }
  }
  const s = Math.sqrt(Math.max(1, parentAreaSqm));
  return { sxM: s, syM: s, hasGps: false };
}

/** Length in meters of an edge between two normalized points. */
export function edgeLengthM(a: Point2D, b: Point2D, frame: MetricFrame): number {
  const dx = (b.x - a.x) * frame.sxM;
  const dy = (b.y - a.y) * frame.syM;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Perimeter of a polygon in meters using the metric frame. */
export function polygonPerimeterM(poly: Point2D[], frame: MetricFrame): number {
  if (poly.length < 2) return 0;
  let p = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    p += edgeLengthM(poly[i], poly[j], frame);
  }
  return p;
}

/**
 * Accurate polygon area in square meters.
 * normalized polygon area × (sxM × syM) — independent of any "parent area" assumption.
 */
export function polygonAreaSqmAccurate(poly: Point2D[], frame: MetricFrame): number {
  if (poly.length < 3) return 0;
  return polygonArea(poly) * frame.sxM * frame.syM;
}

/** Format meters in a uniform French style: 12,4 m  /  124 m  /  1,2 km. */
export function formatMeters(m: number): string {
  if (!isFinite(m) || m <= 0) return '0 m';
  if (m >= 1000) return `${(m / 1000).toFixed(2).replace('.', ',')} km`;
  if (m < 100) return `${m.toFixed(1).replace('.', ',')} m`;
  return `${Math.round(m)} m`;
}

/** Format square meters: 240 m²  /  1 250 m²  /  1,25 ha. */
export function formatSqm(m2: number): string {
  if (!isFinite(m2) || m2 <= 0) return '0 m²';
  if (m2 >= 10000) return `${(m2 / 10000).toFixed(2).replace('.', ',')} ha`;
  return `${Math.round(m2).toLocaleString('fr-FR')} m²`;
}
