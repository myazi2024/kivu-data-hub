import { useMemo } from 'react';
import { useGeoJsonData } from '@/lib/mapProjection';
import { buildDistrictColors, matchAreaToDistrict, matchCommuneToDistrict } from '@/lib/landDistrictMapping';

export interface LandDistrictAreaFeature {
  properties: { name: string; is_in_admi?: string };
  geometry: { type: string; coordinates: unknown[] };
}

export interface LandDistrictFeature {
  feature: LandDistrictAreaFeature;
  area: string;
  province?: string;
  district: string;
  source: 'area' | 'commune';
}

/**
 * Territoires + communes compilés en circonscriptions foncières.
 * Seules les correspondances exactes (même province) sont retournées dans `districtFeatures` ;
 * les autres zones restent dans `unmatchedAreas` pour un rendu gris inerte.
 */
export function useLandDistrictFeatures() {
  const features = useGeoJsonData<LandDistrictAreaFeature>('/drc-territoires.geojson');
  const communeFeatures = useGeoJsonData<LandDistrictAreaFeature>('/drc-communes.geojson');

  const areas = useMemo(
    () => features.map((f) => ({ feature: f, ...matchAreaToDistrict(f.properties.name) })),
    [features],
  );
  const communes = useMemo(
    () => communeFeatures.map((f) => ({
      feature: f,
      ...matchCommuneToDistrict(f.properties.name, f.properties.is_in_admi ?? ''),
    })),
    [communeFeatures],
  );
  const districtFeatures = useMemo<LandDistrictFeature[]>(() => [
    ...areas.flatMap((item) => item.district ? [{ ...item, district: item.district, source: 'area' as const }] : []),
    ...communes.flatMap((item) => item.district ? [{ ...item, district: item.district, source: 'commune' as const }] : []),
  ], [areas, communes]);
  const unmatchedAreas = useMemo(() => areas.filter((a) => !a.district), [areas]);
  const colors = useMemo(() => buildDistrictColors(districtFeatures.map((i) => i.district)), [districtFeatures]);

  return { features, areas, unmatchedAreas, districtFeatures, colors, loaded: features.length > 0 };
}
