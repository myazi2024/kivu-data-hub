import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, MapPin, FileText, AlertCircle, SearchIcon, Info, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { useCadastralSearch } from '@/hooks/useCadastralSearch';
import { useSearchConfig } from '@/hooks/useSearchConfig';
import { supabase } from '@/integrations/supabase/client';
import CadastralResultsDialog from './CadastralResultsDialog';
import CadastralContributionDialog from './CadastralContributionDialog';
import CCCIntroDialog from './CCCIntroDialog';
import ParcelInfoPanel from './ParcelInfoPanel';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const FIXED_TEXT = "Ex: ";

interface ParcelData {
  id: string;
  parcel_number: string;
  gps_coordinates: any;
  current_owner_name: string;
  area_sqm: number;
  province: string;
  ville: string;
  commune: string;
  quartier: string;
  latitude?: number;
  longitude?: number;
  deleted_at?: string | null;
}

const CadastralSearchWithMap = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [showContributionDialog, setShowContributionDialog] = useState(false);
  const [showIntroDialog, setShowIntroDialog] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  // Map states
  const [parcels, setParcels] = useState<ParcelData[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<ParcelData | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Layer[]>([]);
  
  const {
    searchQuery,
    setSearchQuery,
    searchResult,
    loading,
    error,
    clearSearch,
  } = useCadastralSearch();

  const { 
    getAnimatedExamples, 
    getFormatConfig, 
    getErrorMessages 
  } = useSearchConfig();

  const animatedTexts = getAnimatedExamples();
  const formatUrbain = getFormatConfig('urbain');
  const formatRural = getFormatConfig('rural');
  const errorMessages = getErrorMessages();

  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  // Charger toutes les parcelles depuis Supabase
  useEffect(() => {
    const fetchParcels = async () => {
      setMapLoading(true);
      try {
        const { data, error } = await supabase
          .from('cadastral_parcels')
          .select('*')
          .is('deleted_at', null);

        if (error) throw error;

        const validParcels = (data || []).filter((p: ParcelData) => 
          p.gps_coordinates && 
          (Array.isArray(p.gps_coordinates) && p.gps_coordinates.length > 0 || 
           (p.latitude && p.longitude))
        );

        setParcels(validParcels);
      } catch (err) {
        console.error('Erreur lors du chargement des parcelles:', err);
      } finally {
        setMapLoading(false);
      }
    };

    fetchParcels();
  }, []);

  // Filtrer les parcelles en fonction de la recherche
  const filteredParcels = useMemo(() => {
    if (!searchQuery.trim()) return parcels;
    
    const query = searchQuery.toLowerCase();
    return parcels.filter(parcel =>
      parcel.parcel_number.toLowerCase().includes(query) ||
      parcel.current_owner_name?.toLowerCase().includes(query) ||
      parcel.commune?.toLowerCase().includes(query) ||
      parcel.quartier?.toLowerCase().includes(query)
    );
  }, [searchQuery, parcels]);

  // Initialiser la carte Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapLoading || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-1.6749, 29.2314], // Goma, RDC
      zoom: 12,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      dragging: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapLoading]);

  // Afficher les parcelles sur la carte
  useEffect(() => {
    if (!mapRef.current || filteredParcels.length === 0) return;

    const map = mapRef.current;

    // Supprimer les marqueurs existants
    markersRef.current.forEach(layer => map.removeLayer(layer));
    markersRef.current = [];

    const allCoords: L.LatLngTuple[] = [];

    filteredParcels.forEach(parcel => {
      try {
        if (Array.isArray(parcel.gps_coordinates) && parcel.gps_coordinates.length >= 3) {
          const coords = parcel.gps_coordinates.map((c: any) => [c.lat, c.lng] as L.LatLngTuple);
          
          const polygon = L.polygon(coords, {
            color: selectedParcel?.id === parcel.id ? '#ef4444' : '#3b82f6',
            weight: selectedParcel?.id === parcel.id ? 3 : 2,
            fillColor: selectedParcel?.id === parcel.id ? '#ef4444' : '#3b82f6',
            fillOpacity: selectedParcel?.id === parcel.id ? 0.3 : 0.2
          }).addTo(map);

          polygon.on('click', () => {
            setSelectedParcel(parcel);
          });

          markersRef.current.push(polygon);
          allCoords.push(...coords);
        } else if (parcel.latitude && parcel.longitude) {
          const marker = L.marker([parcel.latitude, parcel.longitude], {
            icon: L.icon({
              iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
              iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
              shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
            })
          }).addTo(map);

          marker.on('click', () => {
            setSelectedParcel(parcel);
          });

          markersRef.current.push(marker);
          allCoords.push([parcel.latitude, parcel.longitude]);
        }
      } catch (err) {
        console.error(`Erreur lors de l'affichage de la parcelle ${parcel.parcel_number}:`, err);
      }
    });

    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [filteredParcels, selectedParcel]);

  // Zoom sur une parcelle trouvée et la sélectionner
  useEffect(() => {
    if (!mapRef.current || !searchResult) return;

    const map = mapRef.current;
    const parcel = searchResult.parcel;

    // Sélectionner la parcelle pour afficher le panneau d'informations
    setSelectedParcel(parcel);

    if (Array.isArray(parcel.gps_coordinates) && parcel.gps_coordinates.length >= 3) {
      const coords = parcel.gps_coordinates.map((c: any) => [c.lat, c.lng] as L.LatLngTuple);
      map.fitBounds(coords, { padding: [50, 50], maxZoom: 16 });
    } else if (parcel.latitude && parcel.longitude) {
      map.setView([parcel.latitude, parcel.longitude], 16);
    }
  }, [searchResult]);

  // Animation machine à écrire
  useEffect(() => {
    if (searchQuery || isFocused) {
      setDisplayedText('');
      setIsTyping(false);
      return;
    }
    
    const currentText = animatedTexts[currentTextIndex];
    let charIndex = 0;
    
    setIsTyping(true);
    setDisplayedText('');
    
    const typeInterval = setInterval(() => {
      if (charIndex < currentText.length) {
        setDisplayedText(currentText.slice(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);
        
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
    setSelectedParcel(null);
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

  // Désactivé : le catalogue ne s'ouvre plus automatiquement
  // L'utilisateur doit cliquer sur "Afficher plus de données" dans le ParcelInfoPanel
  // React.useEffect(() => {
  //   if (searchResult && !showResultsDialog) {
  //     setShowResultsDialog(true);
  //   }
  // }, [searchResult, showResultsDialog]);

  const mapHeight = searchQuery || selectedParcel ? 'h-[500px] md:h-[600px]' : 'h-[350px] md:h-[400px]';

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
      {/* Barre de recherche principale */}
      <Card className="p-3 sm:p-4 shadow-lg border-border bg-background/95 backdrop-blur mb-3 sm:mb-4">
        <div className="flex flex-col space-y-3">
          <div className="flex items-center gap-2 text-foreground">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <h3 className="font-semibold text-sm sm:text-base">Recherche cadastrale</h3>
            
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
                    {formatUrbain && (
                      <div className="space-y-2">
                        <div className="flex items-baseline gap-2">
                          <code className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-semibold">
                            {formatUrbain.code}
                          </code>
                          <span className="text-xs text-muted-foreground">{formatUrbain.label}</span>
                        </div>
                        <div className="ml-1 space-y-1.5 text-xs">
                          <div className="font-mono text-foreground/80">
                            {formatUrbain.format}
                          </div>
                          <div className="space-y-1 text-muted-foreground">
                            {formatUrbain.examples?.map((ex: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-primary/40"></span>
                                <code className="text-xs">{ex.code}</code>
                                {ex.note && (
                                  <span className="text-[10px] opacity-60">({ex.note})</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <Separator />

                    {formatRural && (
                      <div className="space-y-2">
                        <div className="flex items-baseline gap-2">
                          <code className="px-2 py-0.5 bg-accent/50 text-accent-foreground rounded text-xs font-semibold">
                            {formatRural.code}
                          </code>
                          <span className="text-xs text-muted-foreground">{formatRural.label}</span>
                        </div>
                        <div className="ml-1 space-y-1.5 text-xs">
                          <div className="font-mono text-foreground/80">
                            {formatRural.format}
                          </div>
                          <div className="space-y-1 text-muted-foreground">
                            {formatRural.examples?.map((ex: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-accent/60"></span>
                                <code className="text-xs">{ex.code}</code>
                                {ex.note && (
                                  <span className="text-[10px] opacity-60">({ex.note})</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
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

          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center">
              <Search className={`h-4 w-4 ${loading ? 'animate-pulse text-primary' : 'text-muted-foreground'}`} />
            </div>
            
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
              placeholder="Rechercher une parcelle..."
              className={`pl-10 pr-4 h-11 sm:h-12 text-xs sm:text-sm font-mono tracking-wide ${
                inputStatus === 'error' ? 'border-destructive focus-visible:ring-destructive' :
                inputStatus === 'success' ? 'border-green-500 focus-visible:ring-green-500' :
                'border-input'
              }`}
            />
            
            {!searchQuery && !isFocused && (
              <div className="absolute inset-0 flex items-center pl-10 pr-4 pointer-events-none">
                <div className="text-sm text-muted-foreground/60 font-light flex flex-wrap">
                  <span className="text-muted-foreground/80">{FIXED_TEXT}</span>
                  <span>{displayedText}</span>
                  <span 
                    className={`inline-block w-0.5 h-4 bg-muted-foreground/60 ml-0.5 transition-opacity duration-100 ${
                      showCursor ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                </div>
              </div>
            )}
            
            {loading && (
              <div className="absolute inset-y-0 right-3 flex items-center">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            )}
          </div>

          {error && (
            <div className="space-y-3 animate-fade-in">
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
              
              {error.includes(errorMessages.not_found) && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
                  <p className="text-sm text-foreground leading-relaxed">
                    <strong className="block">Vérifiez manuellement notre base de données. Cliquez sur le bouton "Recherche manuelle" pour continuer.</strong>
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
                    onClick={() => setShowIntroDialog(true)}
                    disabled={!termsAccepted}
                    className={`w-full ${termsAccepted ? 'bg-primary hover:bg-primary/90' : 'bg-muted cursor-not-allowed'}`}
                  >
                    <SearchIcon className="mr-2 h-4 w-4" />
                    Recherche manuelle
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Carte intégrée */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden shadow-lg">
            <div className={`relative ${mapHeight} transition-all duration-300`}>
              {mapLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Chargement de la carte...</p>
                </div>
              )}
              <div ref={mapContainerRef} className="w-full h-full" />
            </div>
          </Card>
        </div>

        {/* Panneau d'informations de la parcelle */}
        {selectedParcel && (
          <div className="lg:col-span-1">
            <ParcelInfoPanel 
              parcel={selectedParcel} 
              onClose={() => setSelectedParcel(null)}
            />
          </div>
        )}

        {/* Message si aucune parcelle sélectionnée sur mobile */}
        {!selectedParcel && (
          <div className="lg:hidden">
            <Card className="p-4 border-dashed border-2 border-primary/20 bg-primary/5">
              <div className="text-center space-y-2">
                <MapPin className="h-8 w-8 text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Cliquez sur une parcelle pour afficher ses détails
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Dialogs */}
      {searchResult && (
        <CadastralResultsDialog
          result={searchResult}
          isOpen={showResultsDialog}
          onClose={handleCloseResults}
        />
      )}

      <CCCIntroDialog
        open={showIntroDialog}
        onOpenChange={setShowIntroDialog}
        onContinue={() => {
          setShowIntroDialog(false);
          setShowContributionDialog(true);
        }}
        parcelNumber={searchQuery}
      />

      <CadastralContributionDialog
        open={showContributionDialog}
        onOpenChange={setShowContributionDialog}
        parcelNumber={searchQuery}
      />
    </div>
  );
};

export default CadastralSearchWithMap;
