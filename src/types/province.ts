export interface ProvinceData {
  id: string;
  name: string;
  // Indicateurs par type de titre
  certEnregCount: number;
  contratLocCount: number;
  ficheParcCount: number;
  // Volumes
  titleRequestsCount: number;
  disputesCount: number;
  activeMortgagesCount: number;
  pendingMutationsCount: number;
  pendingExpertisesCount: number;
  // Moyennes
  avgParcelSurfaceSqm: number;
  avgBuildingSurfaceSqm: number;
  avgBuildingHeightM: number;
  // Kept for choropleth (parcels total)
  parcelsCount: number;
}
