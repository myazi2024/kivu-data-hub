import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, Loader2, Info, Zap, TrendingUp, Command } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useCadastralSearch } from '@/hooks/useCadastralSearch';
import { useCatalogConfig } from '@/hooks/useCatalogConfig';
import { useInactivityNotification } from '@/hooks/useInactivityNotification';
import CadastralResultsDialog from './CadastralResultsDialog';
import CadastralContributionDialog from './CadastralContributionDialog';
import CCCIntroDialog from './CCCIntroDialog';

const FIXED_TEXT = "Ex: ";

interface ParcelSuggestion {
  id: string;
  parcel_number: string;
  current_owner_name: string;
  ville: string | null;
  commune: string | null;
  quartier: string | null;
}

const CadastralSearchBar = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [showContributionDialog, setShowContributionDialog] = useState(false);
  const [showIntroDialog, setShowIntroDialog] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [fromMap, setFromMap] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<ParcelSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  const {
    searchQuery,
    setSearchQuery,
    searchResult,
    loading,
    error,
    clearSearch
  } = useCadastralSearch();
  
  const { showNotification, dismissNotification, resetInactivity } = useInactivityNotification({
    delay: 5000,
    enabled: !isFocused && !searchQuery
  });

  useEffect(() => {
    const urlSearchQuery = searchParams.get('search');
    const fromParam = searchParams.get('from');
    if (urlSearchQuery) {
      setSearchQuery(urlSearchQuery.toUpperCase());
      setFromMap(fromParam === 'map');
      setSearchParams({});
    }
  }, []);

  const { config: catalogConfig } = useCatalogConfig();
  const animatedTexts = catalogConfig.search_animated_examples;

  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  // Recherche prédictive
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchSuggestions([]);
        return;
      }

      setLoadingSuggestions(true);
      try {
        const { data, error } = await supabase
          .from('cadastral_parcels')
          .select('id, parcel_number, current_owner_name, ville, commune, quartier')
          .ilike('parcel_number', `%${searchQuery}%`)
          .is('deleted_at', null)
          .limit(5);

        if (error) {
          console.error('Erreur recherche suggestions:', error);
          setSearchSuggestions([]);
        } else {
          setSearchSuggestions(data || []);
        }
      } catch (err) {
        console.error('Erreur:', err);
        setSearchSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Animation placeholder
  useEffect(() => {
    if (searchQuery || isFocused) {
      setDisplayedText('');
      return;
    }
    
    const currentText = animatedTexts[currentTextIndex];
    let charIndex = 0;
    
    const typeInterval = setInterval(() => {
      if (charIndex < currentText.length) {
        setDisplayedText(currentText.slice(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setTimeout(() => {
          const eraseInterval = setInterval(() => {
            setDisplayedText(prev => {
              if (prev.length > 0) {
                return prev.slice(0, -1);
              } else {
                clearInterval(eraseInterval);
                setTimeout(() => {
                  setCurrentTextIndex((prev) => (prev + 1) % animatedTexts.length);
                }, 1500);
                return '';
              }
            });
          }, 100);
        }, 4500);
      }
    }, 120);

    return () => clearInterval(typeInterval);
  }, [currentTextIndex, searchQuery, isFocused, animatedTexts]);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);
    return () => clearInterval(cursorInterval);
  }, []);

  // Chargement des recherches récentes
  useEffect(() => {
    const stored = localStorage.getItem('cadastral_recent_searches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored).slice(0, 3));
      } catch (e) {
        console.error('Erreur chargement historique:', e);
      }
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    resetInactivity();
  };
  
  const saveToRecentSearches = (query: string) => {
    const updated = [query, ...recentSearches.filter(q => q !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('cadastral_recent_searches', JSON.stringify(updated));
  };

  const handleSelectSuggestion = (parcelNumber: string) => {
    setSearchQuery(parcelNumber);
    setSearchSuggestions([]);
    saveToRecentSearches(parcelNumber);
  };

  const handleClearSearch = () => {
    clearSearch();
    setSearchSuggestions([]);
    setShowResultsDialog(false);
  };

  const inputStatus = loading ? 'loading' : error ? 'error' : searchResult ? 'success' : 'default';

  useEffect(() => {
    if (searchResult && !showResultsDialog) {
      setShowResultsDialog(true);
      if (searchQuery) saveToRecentSearches(searchQuery);
    }
  }, [searchResult, showResultsDialog]);

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('#cadastral-search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <Card className="group relative overflow-visible bg-gradient-to-br from-white/98 via-white/95 to-white/90 backdrop-blur-xl border-2 border-white/30 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] hover:shadow-[0_12px_40px_0_rgba(31,38,135,0.25)] transition-all duration-500 animate-in fade-in slide-in-from-top-4">
        {/* Gradient animé border */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-seloger-red/20 via-blue-500/20 to-seloger-red/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
        
        <div className="relative p-4 sm:p-6">
          {/* Header avec info contextuelle */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="absolute inset-0 bg-seloger-red/20 rounded-full blur-md animate-pulse" />
                <div className="relative h-9 w-9 shrink-0 flex items-center justify-center text-seloger-red bg-seloger-red/10 rounded-full ring-2 ring-seloger-red/20 transition-all duration-300 group-hover:scale-110 group-hover:ring-4">
                  <Search className="h-4 w-4" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Recherche cadastrale</h3>
                <p className="text-[10px] text-muted-foreground">Trouvez votre parcelle en quelques secondes</p>
              </div>
            </div>
            
            {/* Badge raccourci clavier */}
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 border border-border/50">
              <Command className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground">K</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 relative">
            <div className="flex-1 relative">
              <Input
                id="cadastral-search-input"
                type="text"
                value={searchQuery}
                onChange={handleInputChange}
                onFocus={() => {
                  setIsFocused(true);
                  dismissNotification();
                }}
                onBlur={() => {
                  setIsFocused(false);
                  setTimeout(() => setSearchSuggestions([]), 200);
                }}
                placeholder=""
                className={`h-12 pl-4 pr-24 text-base font-medium transition-all duration-300 bg-white/80 backdrop-blur-sm
                  ${inputStatus === 'loading' ? 'border-blue-400 ring-4 ring-blue-100/50 shadow-lg shadow-blue-100' : ''}
                  ${inputStatus === 'error' ? 'border-red-400 ring-4 ring-red-100/50 shadow-lg shadow-red-100' : ''}
                  ${inputStatus === 'success' ? 'border-green-400 ring-4 ring-green-100/50 shadow-lg shadow-green-100' : ''}
                  ${isFocused ? 'border-seloger-red ring-4 ring-seloger-red/10 shadow-lg' : 'border-border/50'}
                  hover:border-seloger-red/50 hover:shadow-md`}
                disabled={loading}
              />

              {!searchQuery && !isFocused && displayedText && (
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center text-muted-foreground">
                  <span className="opacity-50 text-sm">{FIXED_TEXT}</span>
                  <span className="font-semibold bg-gradient-to-r from-seloger-red to-blue-600 bg-clip-text text-transparent animate-in fade-in slide-in-from-left-2">
                    {displayedText}
                    {showCursor && <span className="text-seloger-red animate-pulse ml-0.5">|</span>}
                  </span>
                </div>
              )}
              
              {/* Popover notification d'aide */}
              <Popover open={showNotification && !isFocused} onOpenChange={(open) => !open && dismissNotification()}>
                <PopoverTrigger asChild>
                  <button className="absolute right-16 top-1/2 -translate-y-1/2 opacity-0 pointer-events-none">
                    <Info className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent 
                  side="bottom" 
                  align="end"
                  className="w-80 p-4 bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200 shadow-xl animate-in fade-in slide-in-from-top-2"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 shrink-0 flex items-center justify-center bg-blue-100 rounded-full">
                      <Zap className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="font-semibold text-sm text-foreground">Astuce de recherche</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Entrez un numéro cadastral pour rechercher une parcelle. Les formats acceptés :
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-1 pl-4">
                        <li className="flex items-center gap-2">
                          <div className="h-1 w-1 rounded-full bg-blue-500" />
                          <span><strong>Urbain:</strong> SU/1234/VILLE</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1 w-1 rounded-full bg-blue-500" />
                          <span><strong>Rural:</strong> SR/01/2345/TERR</span>
                        </li>
                      </ul>
                      <div className="flex items-center gap-2 pt-2">
                        <TrendingUp className="h-3 w-3 text-green-600" />
                        <span className="text-[10px] text-green-600 font-medium">Recherche prédictive activée</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={dismissNotification}
                    className="absolute top-2 right-2 h-6 w-6 flex items-center justify-center rounded-full hover:bg-blue-100 transition-colors"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                </PopoverContent>
              </Popover>

              {/* Suggestions avec animations */}
              {searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white/95 backdrop-blur-xl border-2 border-border/50 rounded-xl shadow-2xl z-[100] max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-4 duration-300">
                  {searchSuggestions.map((suggestion, idx) => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSelectSuggestion(suggestion.parcel_number)}
                      style={{ animationDelay: `${idx * 50}ms` }}
                      className="group/item w-full px-4 py-3 text-left hover:bg-gradient-to-r hover:from-seloger-red/5 hover:to-blue-500/5 transition-all duration-200 border-b border-border/30 last:border-b-0 animate-in fade-in slide-in-from-top-2 hover:scale-[1.02] hover:shadow-md"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-gradient-to-r from-seloger-red to-blue-500 shrink-0 group-hover/item:scale-150 transition-transform" />
                            <p className="font-bold text-seloger-red group-hover/item:text-blue-600 transition-colors truncate">{suggestion.parcel_number}</p>
                          </div>
                          {(suggestion.ville || suggestion.commune || suggestion.quartier) && (
                            <p className="text-xs text-muted-foreground mt-1 ml-4 truncate">
                              {[suggestion.ville, suggestion.commune, suggestion.quartier].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                        <Search className="h-4 w-4 text-muted-foreground group-hover/item:text-seloger-red shrink-0 transition-colors group-hover/item:scale-110" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {/* Historique de recherche */}
              {!searchQuery && isFocused && recentSearches.length > 0 && searchSuggestions.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white/95 backdrop-blur-xl border-2 border-border/50 rounded-xl shadow-2xl z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="px-4 py-2 border-b border-border/30 bg-muted/30">
                    <p className="text-xs font-semibold text-muted-foreground">Recherches récentes</p>
                  </div>
                  {recentSearches.slice(0, 3).map((search, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectSuggestion(search)}
                      style={{ animationDelay: `${idx * 50}ms` }}
                      className="group/recent w-full px-4 py-3 text-left hover:bg-gradient-to-r hover:from-seloger-red/5 hover:to-blue-500/5 transition-all duration-200 border-b border-border/30 last:border-b-0 animate-in fade-in slide-in-from-left-2"
                    >
                      <div className="flex items-center gap-3">
                        <TrendingUp className="h-4 w-4 text-muted-foreground group-hover/recent:text-seloger-red transition-colors" />
                        <span className="font-medium text-foreground group-hover/recent:text-seloger-red transition-colors">{search}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* États visuels améliorés */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {loading && (
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-md animate-pulse" />
                      <Loader2 className="relative h-5 w-5 animate-spin text-blue-600" />
                    </div>
                    <span className="text-xs font-medium text-blue-600 animate-pulse">Recherche...</span>
                  </div>
                )}
                {!loading && searchQuery && (
                  <button 
                    onClick={handleClearSearch} 
                    className="group/clear h-7 w-7 flex items-center justify-center rounded-full bg-muted/50 hover:bg-red-100 transition-all duration-200 hover:scale-110"
                  >
                    <X className="h-4 w-4 text-muted-foreground group-hover/clear:text-red-600 transition-colors" />
                  </button>
                )}
                {!loading && !searchQuery && (
                  <div className="h-7 w-7 flex items-center justify-center rounded-full bg-muted/30">
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Message d'erreur modernisé */}
          {error && (
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-red-50 to-red-100/50 border-2 border-red-200 shadow-lg animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 shrink-0 flex items-center justify-center bg-red-100 rounded-full ring-2 ring-red-200">
                  <X className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800 mb-1">{error}</p>
                  {error.includes('Aucune parcelle trouvée') && (
                    <div className="mt-3 space-y-3">
                      <p className="text-xs text-red-700 leading-relaxed">
                        Cette parcelle n'existe pas encore dans notre base de données. Vous pouvez contribuer en ajoutant ces informations et obtenir un code CCC !
                      </p>
                      <Button 
                        onClick={() => setShowIntroDialog(true)} 
                        size="sm" 
                        className="bg-gradient-to-r from-seloger-red to-red-700 hover:from-seloger-red/90 hover:to-red-700/90 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Ajouter cette parcelle
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {showResultsDialog && searchResult && (
        <CadastralResultsDialog 
          result={searchResult} 
          isOpen={showResultsDialog} 
          onClose={() => setShowResultsDialog(false)} 
          fromMap={fromMap}
        />
      )}

      {showIntroDialog && (
        <CCCIntroDialog 
          open={showIntroDialog} 
          onOpenChange={setShowIntroDialog} 
          onContinue={() => {
            setShowIntroDialog(false);
            setShowContributionDialog(true);
          }} 
          parcelNumber={searchQuery} 
        />
      )}

      {showContributionDialog && (
        <CadastralContributionDialog 
          open={showContributionDialog} 
          onOpenChange={setShowContributionDialog} 
          parcelNumber={searchQuery} 
        />
      )}
    </>
  );
};

export default CadastralSearchBar;
