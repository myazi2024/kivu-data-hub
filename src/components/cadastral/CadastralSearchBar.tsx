import React, { useState, useEffect } from 'react';
import { Search, X, MapPin, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCadastralSearch } from '@/hooks/useCadastralSearch';
import CadastralResultsDialog from './CadastralResultsDialog';

const ANIMATED_TEXTS = [
  "identifier le propriétaire",
  "consulter les limites et bornage",
  "vérifier les obligations fiscales"
];

const FIXED_TEXT = "Avec le numéro SU ou SR, ";

const CadastralSearchBar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isTextVisible, setIsTextVisible] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  
  const {
    searchQuery,
    setSearchQuery,
    searchResult,
    loading,
    error,
    clearSearch,
    validateParcelNumber
  } = useCadastralSearch();

  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  // Animation machine à écrire
  useEffect(() => {
    if (searchQuery || isFocused) {
      setDisplayedText('');
      setIsTyping(false);
      return;
    }
    
    const currentText = ANIMATED_TEXTS[currentTextIndex];
    let charIndex = 0;
    
    // Phase d'écriture
    setIsTyping(true);
    setDisplayedText('');
    
    const typeInterval = setInterval(() => {
      if (charIndex < currentText.length) {
        setDisplayedText(currentText.slice(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);
        
        // Pause avant effacement
        setTimeout(() => {
          // Phase d'effacement
          const eraseInterval = setInterval(() => {
            setDisplayedText(prev => {
              if (prev.length > 0) {
                return prev.slice(0, -1);
              } else {
                clearInterval(eraseInterval);
                // Passer au texte suivant après un court délai
                setTimeout(() => {
                  setCurrentTextIndex((prev) => (prev + 1) % ANIMATED_TEXTS.length);
                }, 500);
                return '';
              }
            });
          }, 30);
        }, 2000);
      }
    }, 50);

    return () => clearInterval(typeInterval);
  }, [currentTextIndex, searchQuery, isFocused]);

  // Animation du curseur
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);

    return () => clearInterval(cursorInterval);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setSearchQuery(value);
  };

  const handleClear = () => {
    clearSearch();
    setIsExpanded(false);
    setShowResultsDialog(false);
  };

  const handleCloseResults = () => {
    setShowResultsDialog(false);
    clearSearch();
    setIsExpanded(false);
  };

  const getInputStatus = () => {
    if (!searchQuery) return 'default';
    if (error) return 'error';
    if (loading) return 'loading';
    if (searchResult) return 'success';
    return 'typing';
  };

  const inputStatus = getInputStatus();

  // Afficher le dialog quand des résultats sont trouvés
  React.useEffect(() => {
    if (searchResult && !showResultsDialog) {
      setShowResultsDialog(true);
    }
  }, [searchResult, showResultsDialog]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Barre de recherche principale */}
      <Card className="p-4 shadow-lg border-border bg-background/95 backdrop-blur">
        <div className="flex flex-col space-y-3">
          {/* En-tête avec icône et titre */}
          <div className="flex items-center gap-2 text-foreground">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-base">Taper le numéro SU ou SR de la parcelle ici</h3>
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
            
            {/* Input principal */}
            <Input
              type="text"
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={() => {
                setIsExpanded(true);
                setIsFocused(true);
              }}
              onBlur={() => {
                setIsFocused(false);
              }}
              className={`pl-10 pr-4 h-12 text-sm font-mono tracking-wide ${
                inputStatus === 'error' ? 'border-destructive focus-visible:ring-destructive' :
                inputStatus === 'success' ? 'border-green-500 focus-visible:ring-green-500' :
                'border-input'
              }`}
            />
            
            {/* Texte animé machine à écrire */}
            {!searchQuery && !isFocused && (
              <div className="absolute inset-0 flex items-center pl-10 pr-4 pointer-events-none">
                <div 
                  className="text-sm text-muted-foreground/60 font-light flex flex-wrap"
                  style={{
                    maxWidth: 'calc(100% - 2rem)',
                    fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                  }}
                >
                  <span className="text-muted-foreground/80">{FIXED_TEXT}</span>
                  <span>{displayedText}</span>
                  <span 
                    className={`inline-block w-0.5 h-4 bg-muted-foreground/60 ml-0.5 transition-opacity duration-100 ${
                      showCursor ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{ 
                      animation: isTyping ? 'none' : undefined,
                      verticalAlign: 'middle'
                    }}
                  />
                </div>
              </div>
            )}
            
            {loading && (
              <div className="absolute inset-y-0 right-3 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>

          {/* Instructions compactes - Mobile optimized */}
          {(isExpanded && !searchResult) && (
            <div className="text-xs text-muted-foreground">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">Format : SU-LIEU-NUM ou SR-LIEU-NUM</span>
              </div>
              <div className="ml-5 space-y-0.5">
                <div>• SU = Urbaine (SU-GOMA-0456)</div>
                <div>• SR = Rurale (SR-RUTSHURU-0321)</div>
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

      {/* Dialog des résultats - Fenêtre flottante fullscreen */}
      {searchResult && (
        <CadastralResultsDialog
          result={searchResult}
          isOpen={showResultsDialog}
          onClose={handleCloseResults}
        />
      )}
    </div>
  );
};

export default CadastralSearchBar;