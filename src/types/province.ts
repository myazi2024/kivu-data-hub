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
}