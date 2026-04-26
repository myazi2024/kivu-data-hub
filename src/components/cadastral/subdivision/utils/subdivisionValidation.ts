// Orchestrator for subdivision validation. Lives outside geometry.ts to avoid
// an import cycle between geometry.ts and polygonOps.ts.

import { SubdivisionLot } from '../types';
import { Point2D } from '../types';
import { validateSubdivision as baseValidate, ValidationResult } from './geometry';
import { isPolygonInsidePolygon, lotTouchesRoad } from './polygonOps';
import type { MetricFrame } from './metrics';

export interface ExtendedValidationOptions {
  parentVertices?: Point2D[];
  roads?: { path: Point2D[]; widthM: number }[];
  metricFrame?: MetricFrame;
  /** When true, every lot must touch a road (enclavement check). */
  requireRoadAccess?: boolean;
}

export function validateSubdivisionFull(
  lots: SubdivisionLot[],
  parentAreaSqm: number,
  options: ExtendedValidationOptions = {},
): ValidationResult {
  // Base checks (areas, overlaps, duplicate numbers, tightened tolerance).
  const base = baseValidate(lots, parentAreaSqm);
  const errors = [...base.errors];
  const warnings = [...base.warnings];

  // Boundary: every lot vertex must lie inside the parent parcel.
  if (options.parentVertices && options.parentVertices.length >= 3) {
    for (const lot of lots) {
      if (!isPolygonInsidePolygon(lot.vertices, options.parentVertices, 1e-3)) {
        errors.push(`Le lot ${lot.lotNumber} dépasse les limites de la parcelle mère.`);
      }
    }
  }

  // Enclavement: each lot must touch a road.
  if (options.requireRoadAccess && options.roads && options.metricFrame) {
    for (const lot of lots) {
      if (!lotTouchesRoad(lot.vertices, options.roads, options.metricFrame)) {
        errors.push(
          `Le lot ${lot.lotNumber} est enclavé : il n'a pas d'accès à une voie.`,
        );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
