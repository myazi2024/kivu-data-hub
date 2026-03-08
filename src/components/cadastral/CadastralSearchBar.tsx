import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, Loader2, AlertCircle, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useCadastralSearch } from '@/hooks/useCadastralSearch';
import { useCatalogConfig } from '@/hooks/useCatalogConfig';
import CadastralResultsDialog from './CadastralResultsDialog';
import CadastralContributionDialog from './CadastralContributionDialog';
import CCCIntroDialog from './CCCIntroDialog';
import { cn } from '@/lib/utils';

const FIXED_TEXT = "Ex: ";

// Caractères autorisés: lettres, chiffres, /, -, _
const ALLOWED_CHARS_REGEX = /^[a-zA-Z0-9\/\-_\s]*$/;

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
  
  // Animation shake pour caractères invalides
  const [isShaking, setIsShaking] = useState(false);
  const [showInvalidCharWarning, setShowInvalidCharWarning] = useState(false);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const {
    searchQuery,
    setSearchQuery,
    searchResult,
    loading,
    error,
    clearSearch
  } = useCadastralSearch();

  // Listen for external requests to open the results dialog
  useEffect(() => {
    const handleOpenCatalog = () => {
      if (searchResult) {
        setShowResultsDialog(true);
      }
    };
    window.addEventListener('open-cadastral-results-dialog', handleOpenCatalog);
    return () => window.removeEventListener('open-cadastral-results-dialog', handleOpenCatalog);
  }, [searchResult]);

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

  const triggerShakeAnimation = () => {
    setIsShaking(true);
    setShowInvalidCharWarning(true);
    
    setTimeout(() => setIsShaking(false), 500);
    
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    warningTimeoutRef.current = setTimeout(() => {
      setShowInvalidCharWarning(false);
    }, 3000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    if (!ALLOWED_CHARS_REGEX.test(value)) {
      triggerShakeAnimation();
      return;
    }
    
    setSearchQuery(value);
    setShowInvalidCharWarning(false);
  };

  const handleSelectSuggestion = (parcelNumber: string) => {
    setSearchQuery(parcelNumber);
    setSearchSuggestions([]);
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
    }
  }, [searchResult, showResultsDialog]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* Modern search container */}
      <div className={cn(
        "relative overflow-visible transition-transform",
        isShaking && "animate-[shake_0.5s_ease-in-out]"
      )}>
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
            20%, 40%, 60%, 80% { transform: translateX(4px); }
          }
        `}</style>

        {/* Glassmorphism search pill */}
        <div className={cn(
          "relative rounded-2xl transition-all duration-300",
          "bg-background/95 backdrop-blur-xl",
          "shadow-[0_4px_24px_-4px_hsl(var(--primary)/0.15)]",
          "border border-border/50",
          isFocused && "shadow-[0_8px_32px_-4px_hsl(var(--primary)/0.25)] border-primary/30",
          inputStatus === 'success' && "border-primary/40 shadow-[0_4px_24px_-4px_hsl(var(--primary)/0.15)]",
          inputStatus === 'error' && "border-destructive/40 shadow-[0_4px_24px_-4px_hsl(var(--destructive)/0.2)]",
        )}>
          {/* Top accent bar */}
          <div className={cn(
            "absolute inset-x-0 top-0 h-[2px] rounded-t-2xl transition-all duration-300",
            isFocused
              ? "bg-gradient-to-r from-transparent via-primary to-transparent opacity-100"
              : "bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-60"
          )} />

          <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
            {/* Search icon with pulse when loading */}
            <div className={cn(
              "relative flex items-center justify-center h-9 w-9 rounded-xl shrink-0 transition-all duration-300",
              isFocused ? "bg-primary/10" : "bg-muted/60",
              loading && "animate-pulse"
            )}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Search className={cn(
                  "h-4 w-4 transition-colors duration-200",
                  isFocused ? "text-primary" : "text-muted-foreground"
                )} />
              )}
            </div>

            {/* Input field */}
            <div className="flex-1 relative">
              <Input
                type="text"
                value={searchQuery}
                onChange={handleInputChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                  setIsFocused(false);
                  setTimeout(() => setSearchSuggestions([]), 200);
                }}
                placeholder=""
                className={cn(
                  "h-9 border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                  "text-sm sm:text-base font-medium text-foreground placeholder:text-muted-foreground",
                  "px-1"
                )}
                disabled={loading}
              />

              {/* Animated placeholder overlay */}
              {!searchQuery && !isFocused && displayedText && (
                <div className="absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none flex items-center text-muted-foreground">
                  <span className="text-sm opacity-50">{FIXED_TEXT}</span>
                  <span className="text-sm font-medium text-muted-foreground/70">
                    {displayedText}
                    {showCursor && <span className="text-primary animate-pulse">|</span>}
                  </span>
                </div>
              )}
            </div>

            {/* Clear button */}
            {!loading && searchQuery && (
              <button
                onClick={handleClearSearch}
                className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Suggestions dropdown */}
          {searchSuggestions.length > 0 && (
            <div className="border-t border-border/30">
              <div className="py-1.5 max-h-60 overflow-y-auto">
                {searchSuggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSelectSuggestion(suggestion.parcel_number)}
                    className={cn(
                      "w-full px-4 py-2.5 text-left transition-colors duration-150",
                      "hover:bg-primary/5 active:bg-primary/10",
                      index !== searchSuggestions.length - 1 && "border-b border-border/20"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 shrink-0">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-primary truncate">{suggestion.parcel_number}</p>
                        {(suggestion.ville || suggestion.commune || suggestion.quartier) && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {[suggestion.ville, suggestion.commune, suggestion.quartier].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                      <Search className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Invalid character warning - floating pill below */}
        {showInvalidCharWarning && (
          <div className="absolute left-0 right-0 mt-2 z-50 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="mx-auto max-w-fit px-3 py-2 rounded-xl bg-amber-50 border border-amber-200/80 shadow-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <p className="text-xs font-medium text-amber-800">
                  Caractères acceptés : A-Z, 0-9, / , - , _
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error state - floating card below */}
        {error && (
          <div className="mt-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3 backdrop-blur-sm">
              <div className="flex items-start gap-2.5">
                <div className="flex items-center justify-center h-6 w-6 rounded-lg bg-destructive/10 shrink-0 mt-0.5">
                  <X className="h-3.5 w-3.5 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-destructive">{error}</p>
                  {error.includes('Aucune parcelle trouvée') && (
                    <div className="mt-2.5 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Parcelle introuvable. Contribuez en l'ajoutant !
                      </p>
                      <Button
                        onClick={() => setShowIntroDialog(true)}
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs rounded-lg border-primary/30 text-primary hover:bg-primary/5"
                      >
                        Ajouter cette parcelle
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

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
