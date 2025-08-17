import React from 'react';
import { ProvinceData } from '@/types/province';

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
      style: 'currency',
      currency: 'USD',
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
    <div className="w-32 sm:w-36 md:w-40 p-2 bg-background/90 backdrop-blur-md border border-border/60 shadow-lg rounded-md">
      <div className="space-y-1">
        <h3 className="font-semibold text-xs text-foreground border-b border-border/50 pb-0.5 mb-1">
          {province.name}
        </h3>
        
        <div className="grid grid-cols-1 gap-0.5 text-[10px] leading-tight">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-[9px]">Vente/m² :</span>
            <span className="font-medium text-foreground text-right text-[9px]">{formatCurrency(province.prixMoyenVenteM2)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-[9px]">Location/m² :</span>
            <span className="font-medium text-foreground text-right text-[9px]">{formatCurrency(province.prixMoyenLoyer)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-[9px]">Taux occup. :</span>
            <span className="font-medium text-emerald-600 text-right text-[9px]">{province.tauxOccupationLocatif}%</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-[9px]">Durée loc. :</span>
            <span className="font-medium text-foreground text-right text-[9px]">{formatDuration(province.dureeMoyenneMiseLocationJours)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-[9px]">Population :</span>
            <span className="font-medium text-blue-600 text-right text-[9px]">{formatNumber(province.populationLocativeEstimee)} hab.</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-[9px]">Taux vac. :</span>
            <span className="font-medium text-orange-500 text-right text-[9px]">{province.tauxVacanceLocative}%</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-[9px]">Rec. loc. :</span>
            <span className="font-medium text-green-600 text-right text-[9px]">{formatCurrency(province.recettesLocativesUsd)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-[9px]">Rec. fisc. :</span>
            <span className="font-medium text-green-700 text-right text-[9px]">{formatCurrency(province.recettesFiscalesUsd)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-[9px]">Val. fonc. :</span>
            <span className="font-medium text-purple-600 text-right text-[9px]">{formatCurrency(province.valeurFonciereParcelleUsd)}</span>
          </div>
          
          <div className="flex justify-between items-center pt-0.5 border-t border-border/30">
            <span className="text-muted-foreground truncate">Pression :</span>
            <span className={`font-semibold px-1 py-0.5 rounded text-[9px] ${
              province.indicePresionLocative === 'Très élevé' ? 'bg-red-100/80 text-red-700 dark:bg-red-900/60 dark:text-red-300' :
              province.indicePresionLocative === 'Élevé' ? 'bg-orange-100/80 text-orange-700 dark:bg-orange-900/60 dark:text-orange-300' :
              province.indicePresionLocative === 'Modéré' ? 'bg-yellow-100/80 text-yellow-700 dark:bg-yellow-900/60 dark:text-yellow-300' :
              'bg-green-100/80 text-green-700 dark:bg-green-900/60 dark:text-green-300'
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