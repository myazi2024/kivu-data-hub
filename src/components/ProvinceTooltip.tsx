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
    <div className="w-24 sm:w-28 md:w-32 p-1.5 bg-background/80 backdrop-blur-md border border-border/60 shadow-lg rounded-md">
      <div className="space-y-1">
        <h3 className="font-semibold text-xs text-foreground border-b border-border/50 pb-0.5 mb-1">
          {province.name}
        </h3>
        
        <div className="grid grid-cols-1 gap-0.5 text-[10px] leading-tight">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground truncate">Vente m² :</span>
            <span className="font-medium text-foreground text-right">{formatCurrency(province.prixMoyenVenteM2)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground truncate">Location m² :</span>
            <span className="font-medium text-foreground text-right">{formatCurrency(province.prixMoyenLoyer)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground truncate">Taux occup. :</span>
            <span className="font-medium text-emerald-600 text-right">{province.tauxOccupationLocatif}%</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground truncate">Durée loc. :</span>
            <span className="font-medium text-foreground text-right">{formatDuration(province.dureeMoyenneMiseLocationJours)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground truncate">Population :</span>
            <span className="font-medium text-blue-600 text-right">{formatNumber(province.populationLocativeEstimee)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground truncate">Taux vac. :</span>
            <span className="font-medium text-orange-500 text-right">{province.tauxVacanceLocative}%</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground truncate">Rec. loc. :</span>
            <span className="font-medium text-green-600 text-right">{formatCurrency(province.recettesLocativesUsd)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground truncate">Rec. fisc. :</span>
            <span className="font-medium text-green-700 text-right">{formatCurrency(province.recettesFiscalesUsd)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground truncate">Val. fonc. :</span>
            <span className="font-medium text-purple-600 text-right">{formatCurrency(province.valeurFonciereParcelleUsd)}</span>
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