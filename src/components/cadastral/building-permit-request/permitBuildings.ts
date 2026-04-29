/**
 * Helpers for the "Demander une autorisation" service to handle parcels
 * with multiple buildings, mirroring the CCC form's `additional_constructions`
 * model. Aligned with `tax-calculator/taxBuildings.ts` for consistency.
 *
 * Source of truth: `cadastral_contributions.additional_constructions` (jsonb)
 * + the root-level construction_* columns (= "main" building).
 */

export interface PermitKnownBuilding {
  ref: string; // 'main' | `extra-${i}` | 'new'
  label: string;
  /** CCC values: 'Résidentielle' | 'Commerciale' | 'Industrielle' | 'Agricole' | 'Terrain nu' */
  constructionType?: string | null;
  /** CCC values: 'Durable' | 'Semi-durable' | 'Précaire' | 'Non bâti' */
  constructionNature?: string | null;
  /** CCC declared_usage raw value */
  declaredUsage?: string | null;
  constructionYear?: number | null;
  /** Footprint area for the building (defaults to parcel area_sqm for `main`) */
  areaSqm?: number;
  apartmentNumber?: string | null;
  floorNumber?: string | null;
}

/**
 * Build the list of buildings known on a parcel (main + additional).
 * Returns an empty array if no construction data is available.
 */
export function buildKnownBuildingsForPermit(parcelData: any): PermitKnownBuilding[] {
  if (!parcelData) return [];
  const list: PermitKnownBuilding[] = [];

  const hasMainConstruction =
    !!parcelData.construction_type &&
    parcelData.construction_type !== 'Terrain nu';

  if (hasMainConstruction || parcelData.construction_nature) {
    list.push({
      ref: 'main',
      label: 'Construction principale',
      constructionType: parcelData.construction_type ?? null,
      constructionNature: parcelData.construction_nature ?? null,
      declaredUsage: parcelData.declared_usage ?? null,
      constructionYear: parcelData.construction_year ?? null,
      areaSqm: Number(parcelData.area_sqm) || undefined,
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
      constructionType: c.constructionType ?? c.propertyCategory ?? null,
      constructionNature: c.constructionNature ?? null,
      declaredUsage: c.declaredUsage ?? null,
      constructionYear: c.constructionYear ?? null,
      // No per-building footprint in CCC schema yet — fallback to parcel area
      areaSqm: Number(c.areaSqm) || Number(parcelData.area_sqm) || undefined,
      apartmentNumber: c.apartmentNumber ?? null,
      floorNumber: c.floorNumber ?? null,
    });
  });

  return list;
}
