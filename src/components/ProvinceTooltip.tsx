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
    <div className="w-64 p-3 bg-background/95 backdrop-blur-sm border border-border shadow-xl rounded-lg">
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-foreground border-b border-border pb-1 mb-2">
          {province.name}
        </h3>
        
        <div className="grid grid-cols-1 gap-1.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Vente au m² :</span>
            <span className="font-medium text-foreground">{formatCurrency(province.prixMoyenVenteM2)} USD/m²</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Location au m² :</span>
            <span className="font-medium text-foreground">{formatCurrency(province.prixMoyenLoyer)} USD/m²</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Taux d'occupation :</span>
            <span className="font-medium text-emerald-600">{province.tauxOccupationLocatif}%</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Durée mise en location :</span>
            <span className="font-medium text-foreground">{formatDuration(province.dureeMoyenneMiseLocationJours)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Population estimée :</span>
            <span className="font-medium text-blue-600">{formatNumber(province.populationLocativeEstimee)} hab.</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Taux de vacance :</span>
            <span className="font-medium text-orange-500">{province.tauxVacanceLocative}%</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Recettes locatives :</span>
            <span className="font-medium text-green-600">{formatCurrency(province.recettesLocativesUsd)} USD</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Recettes fiscales :</span>
            <span className="font-medium text-green-700">{formatCurrency(province.recettesFiscalesUsd)} USD</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Valeur foncière :</span>
            <span className="font-medium text-purple-600">{formatCurrency(province.valeurFonciereParcelleUsd)} USD</span>
          </div>
          
          <div className="flex justify-between items-center pt-1 border-t border-border/50">
            <span className="text-muted-foreground">Pression locative :</span>
            <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${
              province.indicePresionLocative === 'Très élevé' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
              province.indicePresionLocative === 'Élevé' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' :
              province.indicePresionLocative === 'Modéré' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
              'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
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