import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
    
    // Arrêter le shake après l'animation
    setTimeout(() => setIsShaking(false), 500);
    
    // Masquer l'avertissement après 3 secondes
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    warningTimeoutRef.current = setTimeout(() => {
      setShowInvalidCharWarning(false);
    }, 3000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Vérifier si les caractères sont autorisés
    if (!ALLOWED_CHARS_REGEX.test(value)) {
      triggerShakeAnimation();
      return; // Ne pas mettre à jour la valeur si caractères invalides
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
      <Card className={cn(
        "relative overflow-visible bg-white/95 backdrop-blur-sm border-white/20 shadow-2xl transition-transform",
        isShaking && "animate-[shake_0.5s_ease-in-out]"
      )}>
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
            20%, 40%, 60%, 80% { transform: translateX(4px); }
          }
        `}</style>
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 relative">
            <div className="h-11 w-11 shrink-0 flex items-center justify-center text-seloger-red">
              <Search className="h-5 w-5" />
            </div>

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
                  "h-11 pr-10 text-base font-medium transition-all duration-200",
                  inputStatus === 'loading' && 'border-blue-400 ring-2 ring-blue-100',
                  inputStatus === 'error' && 'border-red-400 ring-2 ring-red-100',
                  inputStatus === 'success' && 'border-green-400 ring-2 ring-green-100',
                  !searchQuery && !isFocused && 'border-gray-200',
                  isShaking && 'border-amber-400 ring-2 ring-amber-100'
                )}
                disabled={loading}
              />

              {!searchQuery && !isFocused && displayedText && (
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center text-muted-foreground">
                  <span className="opacity-60">{FIXED_TEXT}</span>
                  <span className="font-medium">
                    {displayedText}
                    {showCursor && <span className="animate-pulse">|</span>}
                  </span>
                </div>
              )}

              {searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-[100] max-h-64 overflow-y-auto">
                  {searchSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSelectSuggestion(suggestion.parcel_number)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-seloger-red">{suggestion.parcel_number}</p>
                          {(suggestion.ville || suggestion.commune || suggestion.quartier) && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {[suggestion.ville, suggestion.commune, suggestion.quartier].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                        <Search className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-5 w-5 animate-spin text-seloger-red" />
                </div>
              )}
              {!loading && searchQuery && (
                <button onClick={handleClearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {/* Notification contextuelle pour caractères invalides */}
          {showInvalidCharWarning && (
            <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 animate-fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-amber-800">Caractère non autorisé</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Caractères acceptés : lettres (A-Z), chiffres (0-9), / , - , _
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 sm:p-4 rounded-lg bg-red-50 border border-red-200">
              <div className="flex items-start gap-3">
                <X className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                  {error.includes('Aucune parcelle trouvée') && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-red-700">
                        Cette parcelle n'existe pas encore dans notre base de données. Vous pouvez contribuer en ajoutant ces informations !
                      </p>
                      <Button onClick={() => setShowIntroDialog(true)} variant="outline" size="sm" className="text-seloger-red border-seloger-red hover:bg-seloger-red/10">
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
