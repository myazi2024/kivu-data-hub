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
    <div className="w-48 p-2 bg-card border border-border shadow-lg rounded-md">
      <div className="space-y-1">
        <h3 className="font-medium text-sm text-foreground border-b border-border pb-1">
          {province.name}
        </h3>
        
        <div className="space-y-0.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Vente:</span>
            <span className="font-medium text-foreground">{formatCurrency(province.prixMoyenVenteM2)} USD/m²</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Location:</span>
            <span className="font-medium text-foreground">{formatCurrency(province.prixMoyenLoyer)} USD/m²</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Occupation:</span>
            <span className="font-medium text-foreground">{province.tauxOccupationLocatif}%</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Population:</span>
            <span className="font-medium text-foreground">{formatNumber(province.populationLocativeEstimee)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pression:</span>
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