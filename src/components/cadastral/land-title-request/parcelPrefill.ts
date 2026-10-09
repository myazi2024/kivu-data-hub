import { supabase } from '@/integrations/supabase/client';
import type { ParcelLocationData, ParcelValorisationData, ParcelBuildingPermit } from './types';

export interface LandTitleParcelPrefill {
  location: ParcelLocationData;
  areaSqm: number | null;
  valorisation: ParcelValorisationData | null;
  permits: ParcelBuildingPermit[];
}

/** Normalise le type de section d'une parcelle vers 'urbaine' | 'rurale'. */
export const toSectionType = (parcelType: string | null | undefined): 'urbaine' | 'rurale' => {
  const t = (parcelType || '').trim();
  return t === 'Urbain' || t === 'urbaine' || t === 'SU' ? 'urbaine' : 'rurale';
};

/**
 * Préremplissage via le serveur (`get_land_title_parcel_prefill`) : localisation,
 * superficie, construction et autorisations. Jamais l'identité du propriétaire.
 */
export const fetchLandTitleParcelPrefill = async (parcelNumber: string): Promise<LandTitleParcelPrefill | null> => {
  const { data, error } = await supabase.rpc('get_land_title_parcel_prefill' as any, { p_parcel_number: parcelNumber });
  if (error) throw error;
  const d = data as any;
  if (!d) return null;
  const location: ParcelLocationData = {
    province: d.province || '',
    sectionType: toSectionType(d.parcel_type),
    ville: d.ville || '',
    commune: d.commune || '',
    quartier: d.quartier || '',
    avenue: d.avenue || '',
    territoire: d.territoire || '',
    collectivite: d.collectivite || '',
    groupement: d.groupement || '',
    village: d.village || '',
    parcelSides: Array.isArray(d.parcel_sides) ? d.parcel_sides : [],
    gpsCoordinates: Array.isArray(d.gps_coordinates) ? d.gps_coordinates : [],
  };
  const hasValo = d.construction_type || d.construction_nature || d.declared_usage || d.property_category;
  const valorisation: ParcelValorisationData | null = hasValo ? {
    propertyCategory: d.property_category || '',
    constructionType: d.construction_type || '',
    constructionNature: d.construction_nature || '',
    constructionMaterials: d.construction_materials || '',
    declaredUsage: d.declared_usage || '',
    standing: d.standing || '',
    constructionYear: d.construction_year || undefined,
    floorNumber: d.floor_number || '',
  } : null;
  return {
    location,
    areaSqm: d.area_sqm ?? null,
    valorisation,
    permits: Array.isArray(d.permits) ? d.permits : [],
  };
};
