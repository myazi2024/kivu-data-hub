import React from 'react';

interface ProvinceData {
  id: string;
  name: string;
  prixMoyenLoyer: number;
  prixMoyenVenteM2: number;
  valeurFonciereParcelleUsd: number;
  tauxOccupationLocatif: number;
  dureeMoyenneMiseLocationJours: number;
  tauxVacanceLocative: number;
  indicePresionLocative: 'Faible' | 'Modéré' | 'Élevé' | 'Très élevé';
  volumeAnnoncesImmobilieres: number;
  nombreTransactionsEstimees: number;
  populationLocativeEstimee: number;
  recettesLocativesUsd: number;
  recettesFiscalesUsd: number;
  variationLoyer3Mois: number;
  typologieDominante: string;
}

interface ProvinceTooltipProps {
  province: ProvinceData;
}

const ProvinceTooltip: React.FC<ProvinceTooltipProps> = ({ province }) => {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatDuration = (days: number) => {
    if (days >= 30) {
      const months = Math.round(days / 30);
      return `${months} mois`;
    }
    return `${days} jours`;
  };

  return (
    <div className="w-64 p-3 bg-card border border-border shadow-lg rounded-md">
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-foreground border-b border-border pb-1">
          Province : {province.name}
        </h3>
        
        <div className="space-y-1 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs">Vente au m² :</span>
            <span className="font-medium text-foreground text-xs">{formatCurrency(province.prixMoyenVenteM2)} USD/m²</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs">Location au m² :</span>
            <span className="font-medium text-foreground text-xs">{formatCurrency(province.prixMoyenLoyer)} USD/m²</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs">Taux d'occupation :</span>
            <span className="font-medium text-foreground text-xs">{province.tauxOccupationLocatif}%</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs">Durée mise en location :</span>
            <span className="font-medium text-foreground text-xs">{formatDuration(province.dureeMoyenneMiseLocationJours)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs">Population estimée :</span>
            <span className="font-medium text-foreground text-xs">{formatNumber(province.populationLocativeEstimee)} hab.</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs">Taux de vacance :</span>
            <span className="font-medium text-foreground text-xs">{province.tauxVacanceLocative}%</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs">Recettes locatives :</span>
            <span className="font-medium text-foreground text-xs">{formatCurrency(province.recettesLocativesUsd)} USD</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs">Recettes fiscales :</span>
            <span className="font-medium text-foreground text-xs">{formatCurrency(province.recettesFiscalesUsd)} USD</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs">Valeur foncière :</span>
            <span className="font-medium text-foreground text-xs">{formatCurrency(province.valeurFonciereParcelleUsd)} USD</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs">Pression locative :</span>
            <span className={`font-medium text-xs ${
              province.indicePresionLocative === 'Très élevé' ? 'text-destructive' :
              province.indicePresionLocative === 'Élevé' ? 'text-orange-500' :
              province.indicePresionLocative === 'Modéré' ? 'text-yellow-500' :
              'text-emerald-500'
            }`}>
              {province.indicePresionLocative}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProvinceTooltip;