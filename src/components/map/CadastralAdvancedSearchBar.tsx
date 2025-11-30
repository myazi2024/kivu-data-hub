import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Filter, History, Star, MapPin, Download, Share2, Maximize2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import CadastralSearchFilters from './CadastralSearchFilters';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { exportToCSV, copyShareableLink } from '@/utils/cadastralMapExport';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';

interface CadastralAdvancedSearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  onClear: () => void;
  filters: any;
  onFiltersChange: (filters: any) => void;
  results: any[];
  totalCount: number;
  onUseGeolocation: () => void;
  onToggleFullscreen: () => void;
  compact?: boolean;
}

const CadastralAdvancedSearchBar: React.FC<CadastralAdvancedSearchBarProps> = ({
  query,
  onQueryChange,
  onClear,
  filters,
  onFiltersChange,
  results,
  totalCount,
  onUseGeolocation,
  onToggleFullscreen,
  compact = false
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const { history, favorites, addToHistory, removeFromHistory, addToFavorites, removeFromFavorites } = useSearchHistory();

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== null && v !== '');

  const handleSaveSearch = () => {
    const name = prompt('Nom de la recherche:');
    if (name) {
      addToFavorites(filters, name);
      toast.success('Recherche sauvegardée');
    }
  };

  const handleExport = () => {
    if (results.length === 0) {
      toast.error('Aucun résultat à exporter');
      return;
    }
    exportToCSV(results);
  };

  const handleShare = () => {
    copyShareableLink(filters);
  };

  return (
    <div className={`absolute top-4 left-4 right-4 md:left-6 md:right-auto md:w-[420px] z-[1000] transition-all duration-300 ${compact ? 'scale-90 origin-top-left' : ''}`}>
      <Card className="shadow-lg backdrop-blur-sm bg-background/95">
        <CardContent className={`${compact ? 'p-2' : 'p-3'} space-y-2`}>
          {/* Barre de recherche principale */}
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground ${compact ? 'h-3 w-3' : 'h-4 w-4'}`} />
            <Input
              placeholder={compact ? "Rechercher..." : "Rechercher une parcelle..."}
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              className={`pl-10 pr-10 ${compact ? 'h-8 text-xs' : 'h-10 text-sm'}`}
            />
            {query && (
              <Button
                variant="ghost"
                size="sm"
                className={`absolute right-1 top-1/2 -translate-y-1/2 ${compact ? 'h-6 w-6' : 'h-8 w-8'}`}
                onClick={onClear}
              >
                <X className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
              </Button>
            )}
          </div>

          {/* Barre d'actions */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="sm"
              className={compact ? 'h-7 text-xs' : 'h-8 text-sm'}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className={`${compact ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-1.5'}`} />
              Filtres
              {hasActiveFilters && (
                <Badge variant="destructive" className="ml-1.5 h-4 w-4 p-0 text-[10px] flex items-center justify-center">
                  !
                </Badge>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className={compact ? 'h-7 text-xs' : 'h-8 text-sm'}
              onClick={onUseGeolocation}
            >
              <MapPin className={compact ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-1.5'} />
              Ma position
            </Button>

            {/* Menu historique */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className={compact ? 'h-7 px-2' : 'h-8 px-2.5'}>
                  <History className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel className="text-xs">Historique</DropdownMenuLabel>
                {history.length === 0 ? (
                  <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                    Aucun historique
                  </div>
                ) : (
                  history.slice(0, 5).map(item => (
                    <DropdownMenuItem
                      key={item.id}
                      onClick={() => onFiltersChange(item.filters)}
                      className="text-xs cursor-pointer"
                    >
                      <span className="truncate">{item.label}</span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Menu favoris */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className={compact ? 'h-7 px-2' : 'h-8 px-2.5'}>
                  <Star className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel className="text-xs">Favoris</DropdownMenuLabel>
                {favorites.length === 0 ? (
                  <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                    Aucun favori
                  </div>
                ) : (
                  favorites.map(fav => (
                    <DropdownMenuItem
                      key={fav.id}
                      onClick={() => onFiltersChange(fav.filters)}
                      className="text-xs cursor-pointer"
                    >
                      <span className="truncate">{fav.name}</span>
                    </DropdownMenuItem>
                  ))
                )}
                {hasActiveFilters && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSaveSearch} className="text-xs">
                      <Star className="h-3 w-3 mr-2" />
                      Sauvegarder cette recherche
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Actions export/partage */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className={compact ? 'h-7 px-2' : 'h-8 px-2.5'}>
                  <Download className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExport} className="text-xs">
                  <Download className="h-3 w-3 mr-2" />
                  Exporter CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShare} className="text-xs">
                  <Share2 className="h-3 w-3 mr-2" />
                  Copier le lien
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              className={compact ? 'h-7 px-2' : 'h-8 px-2.5'}
              onClick={onToggleFullscreen}
            >
              <Maximize2 className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
            </Button>
          </div>

          {/* Compteur de résultats */}
          {totalCount > 0 && (
            <div className={`text-muted-foreground ${compact ? 'text-[10px]' : 'text-xs'}`}>
              {totalCount} parcelle{totalCount > 1 ? 's' : ''} trouvée{totalCount > 1 ? 's' : ''}
            </div>
          )}

          {/* Panneau de filtres */}
          {showFilters && (
            <CadastralSearchFilters
              filters={filters}
              onFiltersChange={onFiltersChange}
              compact={compact}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CadastralAdvancedSearchBar;
