import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Filter } from 'lucide-react';

interface TerritorialFiltersProps {
  filters: {
    zoneType: string;
    typologieDominante: string;
    pressionFonciere: string;
    tauxVacanceMin: number;
    tauxVacanceMax: number;
  };
  onFiltersChange: (filters: any) => void;
}

export const TerritorialFilters: React.FC<TerritorialFiltersProps> = ({ filters, onFiltersChange }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Filter className="w-4 h-4" />
          Filtres territoriaux
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-xs font-medium mb-1 block">Type de zone</label>
          <Select 
            value={filters.zoneType} 
            onValueChange={(value) => onFiltersChange({ ...filters, zoneType: value })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les zones</SelectItem>
              <SelectItem value="province">Provinces</SelectItem>
              <SelectItem value="ville">Villes</SelectItem>
              <SelectItem value="commune">Communes</SelectItem>
              <SelectItem value="quartier">Quartiers</SelectItem>
              <SelectItem value="avenue">Avenues</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-medium mb-1 block">Typologie dominante</label>
          <Select 
            value={filters.typologieDominante} 
            onValueChange={(value) => onFiltersChange({ ...filters, typologieDominante: value })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes typologies</SelectItem>
              <SelectItem value="appartements">Appartements</SelectItem>
              <SelectItem value="maisons">Maisons individuelles</SelectItem>
              <SelectItem value="immeubles">Immeubles</SelectItem>
              <SelectItem value="mixte">Usage mixte</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-medium mb-1 block">Pression foncière</label>
          <Select 
            value={filters.pressionFonciere} 
            onValueChange={(value) => onFiltersChange({ ...filters, pressionFonciere: value })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous niveaux</SelectItem>
              <SelectItem value="Faible">Faible</SelectItem>
              <SelectItem value="Modéré">Modéré</SelectItem>
              <SelectItem value="Élevé">Élevé</SelectItem>
              <SelectItem value="Très élevé">Très élevé</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-medium mb-2 block">
            Taux de vacance ({filters.tauxVacanceMin}% - {filters.tauxVacanceMax}%)
          </label>
          <Slider
            value={[filters.tauxVacanceMin, filters.tauxVacanceMax]}
            onValueChange={(value) => onFiltersChange({ 
              ...filters, 
              tauxVacanceMin: value[0], 
              tauxVacanceMax: value[1] 
            })}
            max={100}
            min={0}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};