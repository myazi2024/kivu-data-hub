import React from 'react';
import { TooltipContent } from '@/components/ui/tooltip';

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
    <TooltipContent className="w-80 p-4 bg-card border border-border shadow-lg">
      <div className="space-y-3">
        <h3 className="font-semibold text-lg text-foreground border-b border-border pb-2">
          {province.name}
        </h3>
        
        <div className="grid grid-cols-1 gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Prix moyen vente au m²:</span>
            <span className="font-medium text-foreground">{formatCurrency(province.prixMoyenVenteM2)} USD/m²</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Prix moyen location au m²:</span>
            <span className="font-medium text-foreground">{formatCurrency(province.prixMoyenLoyer)} USD/m²</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Taux d'occupation locatif:</span>
            <span className="font-medium text-foreground">{province.tauxOccupationLocatif}%</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Durée moyenne mise en location:</span>
            <span className="font-medium text-foreground">{formatDuration(province.dureeMoyenneMiseLocationJours)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Population locative estimée:</span>
            <span className="font-medium text-foreground">{formatNumber(province.populationLocativeEstimee)} habitants</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Taux de vacance locative:</span>
            <span className="font-medium text-foreground">{province.tauxVacanceLocative}%</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Recettes locatives:</span>
            <span className="font-medium text-foreground">{formatCurrency(province.recettesLocativesUsd)} USD</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Recettes fiscales estimées:</span>
            <span className="font-medium text-foreground">{formatCurrency(province.recettesFiscalesUsd)} USD</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valeur foncière moyenne:</span>
            <span className="font-medium text-foreground">{formatCurrency(province.valeurFonciereParcelleUsd)} USD</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Indice de pression locative:</span>
            <span className={`font-medium ${
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
    </TooltipContent>
  );
};

export default ProvinceTooltip;