import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Filter, MapPin, Building2, TrendingUp } from 'lucide-react';

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
    <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20 shadow-none">
      <CardContent className="p-2 space-y-2">
        {/* En-tête ultra compact */}
        <div className="flex items-center gap-1 mb-1">
          <Filter className="w-3 h-3 text-primary flex-shrink-0" />
          <h3 className="text-xs font-medium text-foreground">Filtres</h3>
        </div>

        {/* Filtres en grid compact - 2 colonnes sur mobile, 1 sur desktop */}
        <div className="grid grid-cols-2 md:grid-cols-1 gap-2 md:gap-1">
          {/* Type de zone */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-foreground flex items-center gap-0.5">
              <MapPin className="w-2.5 h-2.5 text-primary" />
              Zone
            </label>
            <Select 
              value={filters.zoneType} 
              onValueChange={(value) => onFiltersChange({ ...filters, zoneType: value })}
            >
              <SelectTrigger className="h-6 text-[10px] bg-background/80 border-primary/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="province">Provinces</SelectItem>
                <SelectItem value="ville">Villes</SelectItem>
                <SelectItem value="commune">Communes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Typologie */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-foreground flex items-center gap-0.5">
              <Building2 className="w-2.5 h-2.5 text-primary" />
              Type
            </label>
            <Select 
              value={filters.typologieDominante} 
              onValueChange={(value) => onFiltersChange({ ...filters, typologieDominante: value })}
            >
              <SelectTrigger className="h-6 text-[10px] bg-background/80 border-primary/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="appartements">Apparts</SelectItem>
                <SelectItem value="maisons">Maisons</SelectItem>
                <SelectItem value="mixte">Mixte</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Pression foncière */}
          <div className="space-y-1 col-span-2 md:col-span-1">
            <label className="text-[10px] font-medium text-foreground flex items-center gap-0.5">
              <TrendingUp className="w-2.5 h-2.5 text-primary" />
              Pression
            </label>
            <Select 
              value={filters.pressionFonciere} 
              onValueChange={(value) => onFiltersChange({ ...filters, pressionFonciere: value })}
            >
              <SelectTrigger className="h-6 text-[10px] bg-background/80 border-primary/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="Faible">Faible</SelectItem>
                <SelectItem value="Modéré">Modéré</SelectItem>
                <SelectItem value="Élevé">Élevé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Taux de vacance compact */}
          <div className="space-y-1 col-span-2 md:col-span-1">
            <label className="text-[10px] font-medium text-foreground flex items-center justify-between">
              <span className="flex items-center gap-0.5">
                <TrendingUp className="w-2.5 h-2.5 text-primary" />
                Vacance
              </span>
              <span className="text-[9px] text-primary font-medium">
                {filters.tauxVacanceMin}%-{filters.tauxVacanceMax}%
              </span>
            </label>
            <div className="px-1">
              <Slider
                value={[filters.tauxVacanceMin, filters.tauxVacanceMax]}
                onValueChange={(value) => onFiltersChange({ 
                  ...filters, 
                  tauxVacanceMin: value[0], 
                  tauxVacanceMax: value[1] 
                })}
                max={100}
                min={0}
                step={5}
                className="w-full h-1"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};