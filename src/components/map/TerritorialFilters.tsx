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
    <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
      <CardContent className="p-3 space-y-3">
        {/* En-tête compact avec icône */}
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Filter className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Filtres</h3>
            <p className="text-xs text-muted-foreground">Affinez votre recherche</p>
          </div>
        </div>

        {/* Filtres organisés en grid compact */}
        <div className="grid grid-cols-1 gap-3">
          {/* Type de zone avec icône */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3 text-primary" />
              Type de zone
            </label>
            <Select 
              value={filters.zoneType} 
              onValueChange={(value) => onFiltersChange({ ...filters, zoneType: value })}
            >
              <SelectTrigger className="h-8 text-xs bg-background/80 border-primary/20 hover:border-primary/40 transition-colors">
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

          {/* Typologie avec icône */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground flex items-center gap-1">
              <Building2 className="w-3 h-3 text-primary" />
              Typologie
            </label>
            <Select 
              value={filters.typologieDominante} 
              onValueChange={(value) => onFiltersChange({ ...filters, typologieDominante: value })}
            >
              <SelectTrigger className="h-8 text-xs bg-background/80 border-primary/20 hover:border-primary/40 transition-colors">
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

          {/* Pression foncière avec icône */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-primary" />
              Pression foncière
            </label>
            <Select 
              value={filters.pressionFonciere} 
              onValueChange={(value) => onFiltersChange({ ...filters, pressionFonciere: value })}
            >
              <SelectTrigger className="h-8 text-xs bg-background/80 border-primary/20 hover:border-primary/40 transition-colors">
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

          {/* Taux de vacance avec slider amélioré */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-primary" />
                Taux de vacance
              </span>
              <span className="text-xs text-primary font-semibold">
                {filters.tauxVacanceMin}% - {filters.tauxVacanceMax}%
              </span>
            </label>
            <div className="px-2">
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
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};