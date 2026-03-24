export interface ProvinceData {
  id: string;
  name: string;
  // Données cadastrales réelles
  parcelsCount: number;
  titleRequestsCount: number;
  revenueUsd: number;
  contributionsCount: number;
  mutationsCount: number;
  disputesCount: number;
  densityLevel: 'Faible' | 'Modéré' | 'Élevé' | 'Très élevé';
  certificatesCount: number;
  invoicesCount: number;
  expertisesCount: number;
  fiscalRevenueUsd: number;
  // Indicateurs calculés
  disputeResolutionRate?: number; // %
  totalSurfaceHa?: number; // hectares
}
