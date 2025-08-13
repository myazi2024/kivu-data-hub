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
    <div className="w-60 p-2 bg-card border border-border shadow-lg rounded-md">
      <div className="space-y-1">
        <h3 className="font-semibold text-xs text-foreground border-b border-border pb-0.5">
          Province : {province.name}
        </h3>
        
        <div className="space-y-0.5 text-[10px]">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-[10px]">Vente au m² :</span>
            <span className="font-medium text-foreground text-[10px]">{formatCurrency(province.prixMoyenVenteM2)} USD/m²</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-[10px]">Location au m² :</span>
            <span className="font-medium text-foreground text-[10px]">{formatCurrency(province.prixMoyenLoyer)} USD/m²</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-[10px]">Taux d'occupation :</span>
            <span className="font-medium text-foreground text-[10px]">{province.tauxOccupationLocatif}%</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-[10px]">Durée mise en location :</span>
            <span className="font-medium text-foreground text-[10px]">{formatDuration(province.dureeMoyenneMiseLocationJours)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-[10px]">Population estimée :</span>
            <span className="font-medium text-foreground text-[10px]">{formatNumber(province.populationLocativeEstimee)} hab.</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-[10px]">Taux de vacance :</span>
            <span className="font-medium text-foreground text-[10px]">{province.tauxVacanceLocative}%</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-[10px]">Recettes locatives :</span>
            <span className="font-medium text-foreground text-[10px]">{formatCurrency(province.recettesLocativesUsd)} USD</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-[10px]">Recettes fiscales :</span>
            <span className="font-medium text-foreground text-[10px]">{formatCurrency(province.recettesFiscalesUsd)} USD</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-[10px]">Valeur foncière :</span>
            <span className="font-medium text-foreground text-[10px]">{formatCurrency(province.valeurFonciereParcelleUsd)} USD</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-[10px]">Pression locative :</span>
            <span className={`font-medium text-[10px] ${
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