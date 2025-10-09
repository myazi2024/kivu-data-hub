import React, { useState, useEffect } from 'react';
import { Search, X, MapPin, FileText, AlertCircle, Plus, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { useCadastralSearch } from '@/hooks/useCadastralSearch';
import CadastralResultsDialog from './CadastralResultsDialog';
import CadastralContributionDialog from './CadastralContributionDialog';

const ANIMATED_TEXTS = [
  "SU/2130/KIN",
  "SU/0456/GOM",
  "SR/01/0987/BEN",
  "SR/0321/MAS"
];

const FIXED_TEXT = "Ex: ";

const CadastralSearchBar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [showContributionDialog, setShowContributionDialog] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isTextVisible, setIsTextVisible] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  
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
                }, 1500);
                return '';
              }
            });
          }, 100);
        }, 4500);
      }
    }, 120);

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
            <h3 className="font-semibold text-base">Recherche cadastrale</h3>
            
            {/* Popover avec informations format */}
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Info className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      Format cadastral RDC
                    </h4>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Section Urbaine */}
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <code className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-semibold">SU</code>
                        <span className="text-xs text-muted-foreground">Section Urbaine</span>
                      </div>
                      <div className="ml-1 space-y-1.5 text-xs">
                        <div className="font-mono text-foreground/80">
                          SU/[Section]/[Parcelle]/[Code]
                        </div>
                        <div className="space-y-1 text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-primary/40"></span>
                            <code className="text-xs">SU/2130/KIN</code>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-primary/40"></span>
                            <code className="text-xs">SU/0456/GOM</code>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-primary/40"></span>
                            <code className="text-xs">SU/2130/1/KIN</code>
                            <span className="text-[10px] opacity-60">(Morcellement)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Section Rurale */}
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <code className="px-2 py-0.5 bg-accent/50 text-accent-foreground rounded text-xs font-semibold">SR</code>
                        <span className="text-xs text-muted-foreground">Section Rurale</span>
                      </div>
                      <div className="ml-1 space-y-1.5 text-xs">
                        <div className="font-mono text-foreground/80">
                          SR/[Section]/[Parcelle]/[Code]
                        </div>
                        <div className="space-y-1 text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-accent/60"></span>
                            <code className="text-xs">SR/01/0987/BEN</code>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-accent/60"></span>
                            <code className="text-xs">SR/0321/MAS</code>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

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


          {/* Message d'erreur avec option de contribution */}
          {error && (
            <div className="space-y-3 animate-fade-in">
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
              
              {error.includes('Aucune parcelle trouvée') && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3 animate-fade-in shadow-sm hover:shadow-md transition-all duration-300">
                  <p className="text-sm text-foreground leading-relaxed">
                    Il est possible qu'il y ait une erreur de saisie ou que cette parcelle ne soit pas encore enregistrée dans notre base de données ou n'a pas encore été attribué un numéro parcellaire.
                    <strong className="block mt-2">Vérifiez manuellement dans notre base des données les informations à votre disposition pour s'en assurer.</strong>
                  </p>
                  
                  <div className="flex items-start gap-3 py-2">
                    <Checkbox 
                      id="terms-acceptance"
                      checked={termsAccepted}
                      onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                      className="mt-1"
                    />
                    <label 
                      htmlFor="terms-acceptance" 
                      className="text-xs text-muted-foreground leading-relaxed cursor-pointer"
                    >
                      J'accepte les{' '}
                      <a 
                        href="/about-ccc" 
                        target="_blank"
                        className="text-primary hover:underline font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        termes et conditions d'utilisation
                      </a>
                      {' '}et je certifie que les informations que je fournirai sont exactes.
                    </label>
                  </div>
                  
                  <Button 
                    onClick={() => setShowContributionDialog(true)}
                    className="w-full group transition-all duration-300 hover:scale-[1.02] hover:shadow-lg disabled:hover:scale-100 disabled:hover:shadow-none"
                    variant="default"
                    disabled={!termsAccepted}
                  >
                    <Plus className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-90" />
                    Ajouter une information
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Dialog des résultats */}
      {searchResult && (
        <CadastralResultsDialog
          result={searchResult}
          isOpen={showResultsDialog}
          onClose={handleCloseResults}
        />
      )}

      {/* Dialog de contribution */}
      <CadastralContributionDialog
        open={showContributionDialog}
        onOpenChange={setShowContributionDialog}
        parcelNumber={searchQuery}
      />
    </div>
  );
};

export default CadastralSearchBar;
