import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ZoningRule, ValidationViolation } from '@/hooks/useZoningRules';
import type { SubdivisionLot, SubdivisionRoad, SubdivisionCommonSpace } from '../types';

interface ParcelGeoContext {
  province?: string | null;
  // Urbain
  ville?: string | null;
  commune?: string | null;
  quartier?: string | null;
  avenue?: string | null;
  // Rural
  territoire?: string | null;
  collectivite?: string | null;
  groupement?: string | null;
  village?: string | null;
}

export interface ZoningComplianceResult {
  loading: boolean;
  rule: ZoningRule | null;
  sectionType: 'urban' | 'rural';
  matchedLocation: string | null;
  violations: ValidationViolation[];
  hasErrors: boolean;
  hasWarnings: boolean;
  metrics: {
    lotCount: number;
    minLotSqm: number;
    maxLotSqm: number;
    minRoadWidthM: number;
    commonSpacePct: number;
    totalLotSqm: number;
    parentSqm: number;
  };
}

/**
 * Détermine la règle de zonage applicable selon la cascade géographique
 * (Avenue > Quartier > Commune > Ville pour urbain, Village > Groupement > Collectivité > Territoire pour rural),
 * puis évalue le plan en mémoire contre cette règle.
 */
export const useZoningCompliance = (
  parcelGeo: ParcelGeoContext | null | undefined,
  parentAreaSqm: number,
  lots: SubdivisionLot[],
  roads: SubdivisionRoad[],
  commonSpaces: SubdivisionCommonSpace[],
): ZoningComplianceResult => {
  const [rule, setRule] = useState<ZoningRule | null>(null);
  const [matchedLocation, setMatchedLocation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sectionType: 'urban' | 'rural' = useMemo(() => {
    if (!parcelGeo) return 'urban';
    return (parcelGeo.quartier || parcelGeo.commune || parcelGeo.ville) ? 'urban' : 'rural';
  }, [parcelGeo]);

  // Cascade des candidats du plus précis au plus général + fallback "*"
  const candidates = useMemo<string[]>(() => {
    if (!parcelGeo) return ['*'];
    const list = sectionType === 'urban'
      ? [parcelGeo.avenue, parcelGeo.quartier, parcelGeo.commune, parcelGeo.ville]
      : [parcelGeo.village, parcelGeo.groupement, parcelGeo.collectivite, parcelGeo.territoire];
    const cleaned = list.map(v => (v || '').trim()).filter(Boolean);
    return [...cleaned, '*'];
  }, [parcelGeo, sectionType]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('subdivision_zoning_rules')
        .select('*')
        .eq('is_active', true)
        .eq('section_type', sectionType)
        .in('location_name', candidates);

      if (cancelled) return;
      if (error || !data || data.length === 0) {
        setRule(null);
        setMatchedLocation(null);
      } else {
        const rows = data as ZoningRule[];
        // Préférer le candidat le plus spécifique présent dans la liste
        const matched = candidates.find(c => rows.some(r => r.location_name === c)) || null;
        const found = matched ? rows.find(r => r.location_name === matched) ?? null : null;
        setRule(found);
        setMatchedLocation(matched);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [sectionType, candidates.join('|')]);

  const metrics = useMemo(() => {
    const realLots = lots.filter(l => !l.isParentBoundary);
    const lotAreas = realLots.map(l => l.areaSqm || 0);
    const totalLotSqm = lotAreas.reduce((s, a) => s + a, 0);
    const commonSpaceSqm = commonSpaces.reduce((s, c) => s + (c.areaSqm || 0), 0);
    const minRoadWidthM = roads.length > 0 ? Math.min(...roads.map(r => r.widthM || 0)) : Infinity;
    return {
      lotCount: realLots.length,
      minLotSqm: lotAreas.length > 0 ? Math.min(...lotAreas) : 0,
      maxLotSqm: lotAreas.length > 0 ? Math.max(...lotAreas) : 0,
      minRoadWidthM,
      commonSpacePct: parentAreaSqm > 0 ? (commonSpaceSqm / parentAreaSqm) * 100 : 0,
      totalLotSqm,
      parentSqm: parentAreaSqm,
    };
  }, [lots, roads, commonSpaces, parentAreaSqm]);

  const violations = useMemo<ValidationViolation[]>(() => {
    if (!rule) return [];
    const out: ValidationViolation[] = [];
    const realLots = lots.filter(l => !l.isParentBoundary);

    // Surface min/max par lot
    realLots.forEach(lot => {
      if (rule.min_lot_area_sqm > 0 && lot.areaSqm < rule.min_lot_area_sqm) {
        out.push({
          code: 'LOT_TOO_SMALL',
          severity: 'error',
          target: `Lot ${lot.lotNumber}`,
          message: `Surface ${Math.round(lot.areaSqm)} m² < minimum ${rule.min_lot_area_sqm} m²`,
        });
      }
      if (rule.max_lot_area_sqm && lot.areaSqm > rule.max_lot_area_sqm) {
        out.push({
          code: 'LOT_TOO_LARGE',
          severity: 'warning',
          target: `Lot ${lot.lotNumber}`,
          message: `Surface ${Math.round(lot.areaSqm)} m² > maximum ${rule.max_lot_area_sqm} m²`,
        });
      }
    });

    // Largeur de voirie minimale
    if (rule.min_road_width_m > 0 && roads.length > 0) {
      roads.forEach(road => {
        if ((road.widthM || 0) < rule.min_road_width_m) {
          out.push({
            code: 'ROAD_TOO_NARROW',
            severity: 'error',
            target: road.name || `Voie`,
            message: `Largeur ${road.widthM} m < minimum ${rule.min_road_width_m} m`,
          });
        }
      });
    }

    // Espace commun minimal
    if (rule.min_common_space_pct > 0 && metrics.commonSpacePct < rule.min_common_space_pct) {
      out.push({
        code: 'COMMON_SPACE_INSUFFICIENT',
        severity: 'error',
        target: 'Espaces communs',
        message: `${metrics.commonSpacePct.toFixed(1)}% < minimum ${rule.min_common_space_pct}% requis`,
      });
    }

    // Nombre maximal de lots
    if (rule.max_lots_per_request && realLots.length > rule.max_lots_per_request) {
      out.push({
        code: 'TOO_MANY_LOTS',
        severity: 'error',
        target: 'Nombre de lots',
        message: `${realLots.length} lots > maximum ${rule.max_lots_per_request} autorisés`,
      });
    }

    return out;
  }, [rule, lots, roads, metrics]);

  return {
    loading,
    rule,
    sectionType,
    matchedLocation,
    violations,
    hasErrors: violations.some(v => v.severity === 'error'),
    hasWarnings: violations.some(v => v.severity === 'warning'),
    metrics,
  };
};
