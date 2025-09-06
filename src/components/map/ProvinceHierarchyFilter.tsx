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

// Données hiérarchiques DRC - Corrigées pour éviter les doublons
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
  "Haut-Katanga": {
    "Lubumbashi": ["Kenya", "Kampemba", "Ruashi"],
    "Kipushi": ["Kipushi Centre", "Kasumbalesa", "Mokambo"]
  },
  "Lualaba": {
    "Kolwezi": ["Kolwezi Centre", "Manika", "Musonoie"],
    "Likasi": ["Likasi Centre", "Shituru", "Kambove"]
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
    } else if (!selectedProvince && selectedFilters.province !== 'all') {
      // Reset all filters if no province is selected
      setSelectedFilters({
        province: 'all',
        commune: 'all',
        quartier: 'all'
      });
    }
  }, [selectedProvince, selectedFilters.province]);

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
    <div className="fixed top-4 right-4 z-40 w-64 max-w-[calc(100vw-2rem)]">
      <Card className="border border-border/30 bg-background/95 backdrop-blur-sm shadow-lg">
        <CardHeader className="pb-1 px-2 pt-2">
          <CardTitle className="text-[10px] font-medium text-foreground flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Filter className="h-3 w-3 text-primary" />
              Filtres
            </div>
            {(selectedFilters.province !== 'all' || selectedFilters.commune !== 'all' || selectedFilters.quartier !== 'all') && (
              <Badge 
                variant="outline" 
                className="text-[8px] px-1 py-0 cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                onClick={resetFilters}
              >
                Reset
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-2">
          {/* Province Filter */}
          <div className="space-y-1">
            <Select 
              value={selectedFilters.province} 
              onValueChange={handleProvinceChange}
            >
              <SelectTrigger className="h-7 text-[10px]">
                <SelectValue placeholder="Province" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-[10px]">Toutes</SelectItem>
                {Object.keys(hierarchyData).map(province => (
                  <SelectItem key={province} value={province} className="text-[10px]">
                    {province}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Commune Filter */}
          {selectedFilters.province && selectedFilters.province !== 'all' && (
            <div className="space-y-1">
              <Select 
                value={selectedFilters.commune} 
                onValueChange={handleCommuneChange}
                disabled={!selectedFilters.province}
              >
                <SelectTrigger className="h-7 text-[10px]">
                  <SelectValue placeholder="Commune" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[10px]">Toutes</SelectItem>
                  {availableCommunes.map(commune => (
                    <SelectItem key={commune} value={commune} className="text-[10px]">
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
              <Select 
                value={selectedFilters.quartier} 
                onValueChange={handleQuartierChange}
                disabled={!selectedFilters.commune}
              >
                <SelectTrigger className="h-7 text-[10px]">
                  <SelectValue placeholder="Quartier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[10px]">Tous</SelectItem>
                  {availableQuartiers.map(quartier => (
                    <SelectItem key={quartier} value={quartier} className="text-[10px]">
                      {quartier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};