import React, { useState } from 'react';
import { Search, X, MapPin, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCadastralSearch } from '@/hooks/useCadastralSearch';
import CadastralResultCard from './CadastralResultCard';

const CadastralSearchBar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    searchQuery,
    setSearchQuery,
    searchResult,
    loading,
    error,
    clearSearch,
    validateParcelNumber
  } = useCadastralSearch();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setSearchQuery(value);
  };

  const handleClear = () => {
    clearSearch();
    setIsExpanded(false);
  };

  const getPlaceholder = () => {
    return "Rechercher une parcelle (ex: SU-GOMA-0456, SR-RUTSHURU-0321)";
  };

  const getInputStatus = () => {
    if (!searchQuery) return 'default';
    if (error) return 'error';
    if (loading) return 'loading';
    if (searchResult) return 'success';
    return 'typing';
  };

  const inputStatus = getInputStatus();

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Barre de recherche principale */}
      <Card className="p-4 shadow-lg border-border bg-background/95 backdrop-blur">
        <div className="flex flex-col space-y-3">
          {/* En-tête avec icône et titre */}
          <div className="flex items-center gap-2 text-foreground">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-base">Recherche Cadastrale</h3>
            <div className="flex-1" />
            {searchResult && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClear}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Champ de recherche */}
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center">
              <Search className={`h-4 w-4 ${loading ? 'animate-pulse text-primary' : 'text-muted-foreground'}`} />
            </div>
            <Input
              type="text"
              placeholder={getPlaceholder()}
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={() => setIsExpanded(true)}
              className={`pl-10 pr-4 h-12 text-sm font-mono tracking-wide ${
                inputStatus === 'error' ? 'border-destructive focus-visible:ring-destructive' :
                inputStatus === 'success' ? 'border-green-500 focus-visible:ring-green-500' :
                'border-input'
              }`}
            />
            {loading && (
              <div className="absolute inset-y-0 right-3 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>

          {/* Instructions et aide */}
          {(isExpanded && !searchResult) && (
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3" />
                <span>Format attendu : <code className="bg-muted px-1 rounded">SU-LOCATION-NUMERO</code> ou <code className="bg-muted px-1 rounded">SR-LOCATION-NUMERO</code></span>
              </div>
              <div className="ml-5">
                • SU = Section Urbaine (ex: SU-GOMA-0456)
              </div>
              <div className="ml-5">
                • SR = Section Rurale (ex: SR-RUTSHURU-0321)
              </div>
            </div>
          )}

          {/* Message d'erreur */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
              {error}
            </div>
          )}
        </div>
      </Card>

      {/* Résultats de recherche */}
      {searchResult && (
        <div className="mt-4">
          <CadastralResultCard 
            result={searchResult}
            onClose={handleClear}
          />
        </div>
      )}
    </div>
  );
};

export default CadastralSearchBar;