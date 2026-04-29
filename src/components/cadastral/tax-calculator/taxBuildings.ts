/**
 * Helpers for the tax service to handle parcels with multiple buildings,
 * matching the CCC form's `additionalConstructions` model.
 *
 * Source of truth: `cadastral_contributions.additional_constructions` (jsonb)
 * + the root-level construction_* columns (= "main" building).
 */

import {
  detectConstructionType,
  detectUsageType,
} from './taxSharedUtils';

export interface TaxKnownBuilding {
  ref: string; // 'main' | `extra-${i}`
  label: string;
  /** CCC nature value: 'Durable' | 'Semi-durable' | 'Précaire' | 'Non bâti' */
  constructionNature?: string | null;
  /** Internal calculator type derived from nature */
  constructionType?: 'en_dur' | 'semi_dur' | 'en_paille' | null;
  /** CCC declared_usage raw value (FR picklist) */
  declaredUsage?: string | null;
  /** Internal usage type derived from declared_usage */
  usageType?: 'residential' | 'commercial' | 'industrial' | 'agricultural' | 'mixed';
  constructionYear?: number | null;
  /** Footprint area for the building, defaults to parcel area_sqm for `main` */
  areaSqm?: number;
  propertyCategory?: string | null;
  apartmentNumber?: string | null;
  floorNumber?: string | null;
}

/**
 * Build the list of buildings known on a parcel (main + additional).
 * Returns an empty array if no construction data is available.
 */
export function buildKnownBuildings(parcelData: any): TaxKnownBuilding[] {
  if (!parcelData) return [];
  const list: TaxKnownBuilding[] = [];

  const hasMainConstruction =
    !!parcelData.construction_type &&
    parcelData.construction_type !== 'Terrain nu';

  if (hasMainConstruction || parcelData.construction_nature) {
    list.push({
      ref: 'main',
      label: 'Construction principale',
      constructionNature: parcelData.construction_nature ?? null,
      constructionType: detectConstructionType(parcelData),
      declaredUsage: parcelData.declared_usage ?? null,
      usageType: detectUsageType(parcelData),
      constructionYear: parcelData.construction_year ?? null,
      areaSqm: Number(parcelData.area_sqm) || undefined,
      propertyCategory: parcelData.construction_type ?? null,
    });
  }

  const extras = Array.isArray(parcelData.additional_constructions)
    ? (parcelData.additional_constructions as any[])
    : [];

  extras.forEach((c: any, i: number) => {
    const ref = `extra-${i}`;
    const labelParts: string[] = [];
    if (c.propertyCategory) labelParts.push(c.propertyCategory);
    if (c.apartmentNumber) labelParts.push(`Appt ${c.apartmentNumber}`);
    if (c.floorNumber) labelParts.push(`Étage ${c.floorNumber}`);
    const label = labelParts.length > 0
      ? labelParts.join(' • ')
      : `Construction ${i + 2}`;

    list.push({
      ref,
      label,
      constructionNature: c.constructionNature ?? null,
      constructionType: detectConstructionType({ construction_nature: c.constructionNature }),
      declaredUsage: c.declaredUsage ?? null,
      usageType: detectUsageType({ declared_usage: c.declaredUsage }),
      constructionYear: c.constructionYear ?? null,
      // No per-building footprint in CCC schema yet — fallback to parcel area
      areaSqm: Number(parcelData.area_sqm) || undefined,
      propertyCategory: c.propertyCategory ?? null,
      apartmentNumber: c.apartmentNumber ?? null,
      floorNumber: c.floorNumber ?? null,
    });
  });

  return list;
}

/**
 * Map an internal construction type back to the CCC `construction_nature` value
 * (source of truth picklist). Returns null when unknown.
 */
export function toCccConstructionNature(
  type: 'en_dur' | 'semi_dur' | 'en_paille' | null | undefined,
): 'Durable' | 'Semi-durable' | 'Précaire' | null {
  switch (type) {
    case 'en_dur': return 'Durable';
    case 'semi_dur': return 'Semi-durable';
    case 'en_paille': return 'Précaire';
    default: return null;
  }
}

/**
 * Legacy `construction_type` label kept for backward compatibility with
 * existing rows / admin UI.
 */
export function toLegacyConstructionType(
  type: 'en_dur' | 'semi_dur' | 'en_paille' | null | undefined,
): 'En dur' | 'Semi-dur' | 'En paille' | null {
  switch (type) {
    case 'en_dur': return 'En dur';
    case 'semi_dur': return 'Semi-dur';
    case 'en_paille': return 'En paille';
    default: return null;
  }
}

/**
 * Map the calculator usage type back to the CCC picklist label
 * when the parcel doesn't already carry a value. Never overwrite a value
 * already set on the parcel — only return a fallback for new contributions.
 */
export function toCccDeclaredUsage(
  usage: 'residential' | 'commercial' | 'industrial' | 'agricultural' | 'mixed',
  parcelDeclaredUsage?: string | null,
): string | null {
  if (parcelDeclaredUsage && parcelDeclaredUsage.trim().length > 0) {
    return parcelDeclaredUsage; // never overwrite CCC truth
  }
  switch (usage) {
    case 'residential': return 'Habitation';
    case 'commercial': return 'Commerce';
    case 'industrial': return 'Industrie';
    case 'agricultural': return 'Agriculture';
    case 'mixed': return 'Usage mixte';
    default: return null;
  }
}
