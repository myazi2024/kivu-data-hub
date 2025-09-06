import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProvinceHierarchyFilterProps {
  selectedProvince?: string;
  onFilterChange: (filters: {
    province: string;
    commune: string;
    quartier: string;
  }) => void;
}

// Données hiérarchiques DRC
const hierarchyData = {
  "Kinshasa": {
    "Kalamu": ["Kalamu", "Matonge", "Victoire"],
    "Gombe": ["Gombe", "Centre-ville", "Funa"],
    "Kintambo": ["Kintambo", "Ngaba", "Salongo"]
  },
  "Nord-Kivu": {
    "Goma": ["Karisimbi", "Nyarushishi", "Les Volcans", "Himbi"],
    "Butembo": ["Bulengera", "Mususa", "Kambingwa"],
    "Beni": ["Boikene", "Tamende", "Bunabora"]
  },
  "Sud-Kivu": {
    "Bukavu": ["Ibanda", "Kadutu", "Bagira"],
    "Uvira": ["Kakombe", "Kilibula", "Kimanga"],
    "Kamituga": ["Kamituga Centre", "Kitutu", "Mukungwe"]
  },
  "Katanga": {
    "Lubumbashi": ["Kenya", "Kampemba", "Ruashi"],
    "Likasi": ["Likasi Centre", "Shituru", "Kambove"],
    "Kolwezi": ["Kolwezi Centre", "Manika", "Musonoie"]
  },
  "Haut-Katanga": {
    "Lubumbashi": ["Kenya", "Kampemba", "Ruashi"],
    "Kipushi": ["Kipushi Centre", "Kasumbalesa", "Mokambo"]
  }
};

export const ProvinceHierarchyFilter: React.FC<ProvinceHierarchyFilterProps> = ({ 
  selectedProvince,
  onFilterChange 
}) => {
  const [selectedFilters, setSelectedFilters] = useState({
    province: selectedProvince || 'all',
    commune: 'all',
    quartier: 'all'
  });

  // Reset filters when selectedProvince changes
  useEffect(() => {
    if (selectedProvince && selectedProvince !== selectedFilters.province) {
      setSelectedFilters({
        province: selectedProvince,
        commune: 'all',
        quartier: 'all'
      });
    }
  }, [selectedProvince]);

  const handleProvinceChange = (province: string) => {
    const newFilters = {
      province,
      commune: 'all',
      quartier: 'all'
    };
    setSelectedFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleCommuneChange = (commune: string) => {
    const newFilters = {
      ...selectedFilters,
      commune,
      quartier: 'all'
    };
    setSelectedFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleQuartierChange = (quartier: string) => {
    const newFilters = {
      ...selectedFilters,
      quartier
    };
    setSelectedFilters(newFilters);
    onFilterChange(newFilters);
  };

  const availableCommunes = selectedFilters.province && selectedFilters.province !== 'all' ? 
    Object.keys(hierarchyData[selectedFilters.province as keyof typeof hierarchyData] || {}) : 
    [];

  const availableQuartiers = selectedFilters.province && selectedFilters.province !== 'all' && selectedFilters.commune && selectedFilters.commune !== 'all' ?
    hierarchyData[selectedFilters.province as keyof typeof hierarchyData]?.[selectedFilters.commune] || [] :
    [];

  const resetFilters = () => {
    const newFilters = { province: 'all', commune: 'all', quartier: 'all' };
    setSelectedFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <Card className="border border-border/30">
      <CardHeader className="pb-2 px-3 pt-3">
        <CardTitle className="text-xs font-medium text-foreground flex items-center gap-2">
          <Filter className="h-3 w-3 text-primary" />
          Filtres territoriaux
          {(selectedFilters.province !== 'all' || selectedFilters.commune !== 'all' || selectedFilters.quartier !== 'all') && (
            <Badge 
              variant="outline" 
              className="text-[9px] px-1 py-0 cursor-pointer hover:bg-destructive/10 hover:text-destructive"
              onClick={resetFilters}
            >
              Réinitialiser
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-3">
        {/* Province Filter */}
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground block">
            Province
          </label>
          <Select 
            value={selectedFilters.province} 
            onValueChange={handleProvinceChange}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Sélectionnez une province" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Toutes les provinces</SelectItem>
              {Object.keys(hierarchyData).map(province => (
                <SelectItem key={province} value={province} className="text-xs">
                  {province}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Commune Filter */}
        {selectedFilters.province && selectedFilters.province !== 'all' && (
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
              <ChevronRight className="h-2 w-2" />
              Commune
            </label>
            <Select 
              value={selectedFilters.commune} 
              onValueChange={handleCommuneChange}
              disabled={!selectedFilters.province}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Sélectionnez une commune" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Toutes les communes</SelectItem>
                {availableCommunes.map(commune => (
                  <SelectItem key={commune} value={commune} className="text-xs">
                    {commune}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Quartier Filter */}
        {selectedFilters.province && selectedFilters.province !== 'all' && selectedFilters.commune && selectedFilters.commune !== 'all' && (
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
              <ChevronRight className="h-2 w-2" />
              Quartier
            </label>
            <Select 
              value={selectedFilters.quartier} 
              onValueChange={handleQuartierChange}
              disabled={!selectedFilters.commune}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Sélectionnez un quartier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Tous les quartiers</SelectItem>
                {availableQuartiers.map(quartier => (
                  <SelectItem key={quartier} value={quartier} className="text-xs">
                    {quartier}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Active Filters Display */}
        {(selectedFilters.province !== 'all' || selectedFilters.commune !== 'all' || selectedFilters.quartier !== 'all') && (
          <div className="pt-2 border-t border-border/30">
            <div className="text-[10px] font-medium text-muted-foreground mb-1">
              Sélection active:
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedFilters.province && selectedFilters.province !== 'all' && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0">
                  {selectedFilters.province}
                </Badge>
              )}
              {selectedFilters.commune && selectedFilters.commune !== 'all' && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0">
                  {selectedFilters.commune}
                </Badge>
              )}
              {selectedFilters.quartier && selectedFilters.quartier !== 'all' && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0">
                  {selectedFilters.quartier}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};