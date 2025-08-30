export interface ProvinceData {
  id: string;
  name: string;
  // Prix & Valeur
  prixMoyenLoyer: number;
  prixMoyenVenteM2: number;
  valeurFonciereParcelleUsd: number;
  // Performance locative
  tauxOccupationLocatif: number;
  dureeMoyenneMiseLocationJours: number;
  tauxVacanceLocative: number;
  indicePresionLocative: 'Faible' | 'Modéré' | 'Élevé' | 'Très élevé';
  // Activité du marché
  volumeAnnoncesImmobilieres: number;
  nombreTransactionsEstimees: number;
  // Population & usage
  populationLocativeEstimee: number;
  // Recettes & fiscalité
  recettesLocativesUsd: number;
  recettesFiscalesUsd: number;
  // Autres
  variationLoyer3Mois: number;
  typologieDominante: string;
  
  // Nouveaux indicateurs étendus
  rendementLocatifBrut?: number; // %
  tauxCroissancePrixAnnuel?: number; // %
  permisConstruireMois?: number; // unités/mois
  tauxAccessibiliteLogement?: number; // %
  repartitionTypologique?: {
    residential: number; // %
    commercial: number; // %
    mixte: number; // %
  };
  tauxPropriete?: number; // %
  indicePresionFonciere?: number; // ratio demande/offre
  
  // Données temporelles pour les graphiques
  historiquePrix?: Array<{
    mois: string;
    loyer: number;
    vente: number;
  }>;
  
  // Métadonnées géographiques
  region?: 'Est' | 'Ouest' | 'Centre' | 'Sud' | 'Nord';
  zone?: 'Urbaine' | 'Rurale' | 'Mixte';
}

// Interface standardisée pour la cohérence des données territoriales
export interface StandardizedZoneMetrics {
  // Métriques financières
  prixMoyenLoyer: number;
  prixMoyenVenteM2: number;
  recettesTheorique: number;
  
  // Métriques marché
  tauxVacanceLocative: number;
  variationPrix3Mois: number;
  volumeAnnonces: number;
  
  // Métriques démographiques
  populationLocative: number;
  densiteResidentielle: number;
  
  // Métriques qualitatives
  pressionFonciere: 'Faible' | 'Modéré' | 'Élevé' | 'Très élevé';
  typologieDominante: string;
}