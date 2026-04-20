import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navigation from '@/components/ui/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { MapPin, Loader2, Search, X, MessageCircle, AlertTriangle, Settings2, Star, Sparkles, HelpCircle, MapPinPlus, FileCheck2, AlertCircle, LocateFixed } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import CCCIntroDialog from '@/components/cadastral/CCCIntroDialog';
import CadastralContributionDialog from '@/components/cadastral/CadastralContributionDialog';
import AdvancedSearchFilters from '@/components/cadastral/AdvancedSearchFilters';
import SearchHistory from '@/components/cadastral/SearchHistory';
import ParcelActionsDropdown from '@/components/cadastral/ParcelActionsDropdown';
import LandTitleRequestDialog from '@/components/cadastral/LandTitleRequestDialog';
import LandTitleTermsDialog from '@/components/cadastral/LandTitleTermsDialog';
import CadastralResultsDialog from '@/components/cadastral/CadastralResultsDialog';
import CadastralCartButton from '@/components/cadastral/CadastralCartButton';
import { useAdvancedCadastralSearch } from '@/hooks/useAdvancedCadastralSearch';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useSearchBarConfig } from '@/hooks/useSearchBarConfig';
import { useCadastralSearch } from '@/hooks/useCadastralSearch';
import { useMapConfig } from '@/hooks/useMapConfig';
import { useAppAppearance } from '@/hooks/useAppAppearance';

import { useCadastralMapData, useParcelHistory, type ParcelData } from '@/hooks/useCadastralMapData';
import { useStripeReturnHandler } from '@/hooks/useStripeReturnHandler';
import { useLandTitleNotificationFlow } from '@/hooks/useLandTitleNotificationFlow';
import { useLeafletMap } from '@/hooks/useLeafletMap';
import { playFeedbackBeep } from '@/lib/feedbackAudio';
import { trackEvent } from '@/lib/analytics';

import 'leaflet/dist/leaflet.css';

const CadastralMap = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Data layer
  const { parcels, subdivisionLots, loading } = useCadastralMapData();
  const [filteredParcels, setFilteredParcels] = useState<ParcelData[]>([]);

  // Selection
  const [selectedParcel, setSelectedParcel] = useState<ParcelData | null>(null);
  const { data: selectedParcelHistory, isLoading: loadingHistory } = useParcelHistory(selectedParcel?.id ?? null);
  const hasIncompleteData = useMemo(() => {
    if (!selectedParcel || !selectedParcelHistory) return false;
    const hasLocation = !!(selectedParcel.province && selectedParcel.ville);
    const hasGPS = Array.isArray(selectedParcel.gps_coordinates) && selectedParcel.gps_coordinates.length > 0;
    const hasLocationHistory = hasLocation || selectedParcelHistory.boundary_history.length > 0 || hasGPS;
    const hasHistory = selectedParcelHistory.ownership_history.length > 0;
    const hasObligations = selectedParcelHistory.tax_history.length > 0 || selectedParcelHistory.mortgage_history.length > 0;
    return [hasLocationHistory, hasHistory, hasObligations].filter(v => !v).length >= 2;
  }, [selectedParcel, selectedParcelHistory]);

  // Search UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<ParcelData[]>([]);
  const [showIntroDialog, setShowIntroDialog] = useState(false);
  const [showContributionDialog, setShowContributionDialog] = useState(false);
  const [actionsExpanded, setActionsExpanded] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showManualSearchNotification, setShowManualSearchNotification] = useState(false);
  const [isSearchBarActive, setIsSearchBarActive] = useState(false);
  const [showLandTitleDialog, setShowLandTitleDialog] = useState(false);
  const [showLandTitleTermsDialog, setShowLandTitleTermsDialog] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [showServiceCatalog, setShowServiceCatalog] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [showInvalidCharNotification, setShowInvalidCharNotification] = useState(false);
  const invalidCharTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notificationDismissedRef = useRef(false);

  // Viewport height for responsive positioning
  const [viewportHeight, setViewportHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setViewportHeight(window.innerHeight), 150);
    };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); clearTimeout(timeout); };
  }, []);

  const advancedSearch = useAdvancedCadastralSearch();
  const searchHistory = useSearchHistory();
  const { config: searchBarConfig, buildAllowedRegex } = useSearchBarConfig();
  const { config: mapConfig } = useMapConfig();
  const { config: appearance } = useAppAppearance();
  const cadastralSearch = useCadastralSearch();

  // Stripe return polling (with progress indicator)
  const { polling: stripePolling, pollProgress } = useStripeReturnHandler();

  // Land title notification state machine (replaces 4 setTimeout cascades)
  const landTitle = useLandTitleNotificationFlow(hasUserInteracted);

  // Leaflet map (init + tiles via provider + on-demand geo + incremental render)
  const { mapReady, renderLayers, requestUserLocation, centerOnParcel } = useLeafletMap({
    containerRef: mapContainerRef,
    ready: !loading,
    onParcelClick: (p) => setSelectedParcel(p),
  });

  // Sync filteredParcels with base data
  useEffect(() => { setFilteredParcels(parcels); }, [parcels]);

  // Predictive search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchSuggestions([]);
      setFilteredParcels(parcels);
      return;
    }
    const q = searchQuery.toLowerCase();
    const filtered = parcels.filter(p => p.parcel_number.toLowerCase().includes(q));
    setSearchSuggestions(filtered.slice(0, 5));
    setFilteredParcels(filtered);
  }, [searchQuery, parcels]);

  // Render layers (incremental diff inside the hook)
  useEffect(() => {
    if (!mapReady) return;
    renderLayers({ parcels: filteredParcels, subdivisionLots });
  }, [mapReady, filteredParcels, subdivisionLots, renderLayers]);

  // Manual-search notification timer
  useEffect(() => {
    if (searchQuery && filteredParcels.length === 0 && !showManualSearchNotification && !notificationDismissedRef.current) {
      inactivityTimerRef.current = setTimeout(() => setShowManualSearchNotification(true), 5000);
    }
    return () => { if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current); };
  }, [searchQuery, filteredParcels.length, showManualSearchNotification]);

  useEffect(() => { notificationDismissedRef.current = false; }, [searchQuery]);

  // Listen for open-ccc-dialog event
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.parcelNumber) setSearchQuery(detail.parcelNumber);
      setShowContributionDialog(true);
    };
    window.addEventListener('open-ccc-dialog', handler);
    return () => window.removeEventListener('open-ccc-dialog', handler);
  }, []);

  const handleSelectParcel = useCallback((parcel: ParcelData) => {
    setSelectedParcel(parcel);
    setSearchQuery(parcel.parcel_number);
    setSearchSuggestions([]);
    centerOnParcel(parcel, 19);
    void trackEvent('cadastral_map_parcel_select', { parcel_number: parcel.parcel_number });
  }, [centerOnParcel]);

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchSuggestions([]);
    setFilteredParcels(parcels);
    setSelectedParcel(null);
  };

  const handleManualSearchClick = useCallback(() => {
    notificationDismissedRef.current = true;
    setShowManualSearchNotification(false);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    setShowIntroDialog(true);
  }, []);

  const handleApplyFilters = async () => {
    const results = await advancedSearch.searchParcels();
    if (results.length > 0) {
      setFilteredParcels(results as any);
      toast.success(`${results.length} parcelle(s) trouvée(s)`);
      setShowAdvancedSearch(false);
    } else {
      toast.error('Aucune parcelle ne correspond aux critères');
    }
    const filterSummary = Object.entries(advancedSearch.filters)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}:${v}`)
      .join(', ');
    if (filterSummary) searchHistory.addToHistory(`Filtres: ${filterSummary}`, advancedSearch.filters);
  };

  const handleSelectFromHistory = (query: string) => {
    setSearchQuery(query);
    setShowAdvancedSearch(false);
    setFilteredParcels(parcels.filter(p => p.parcel_number.toLowerCase().includes(query.toLowerCase())));
  };

  const handleSelectFromFavorites = (parcelNumber: string) => {
    setShowAdvancedSearch(false);
    const parcel = parcels.find(p => p.parcel_number === parcelNumber);
    if (parcel) handleSelectParcel(parcel);
  };

  const handleAddToFavorites = () => {
    if (!selectedParcel) return;
    searchHistory.addToFavorites({
      parcel_number: selectedParcel.parcel_number,
      parcel_id: selectedParcel.id,
      owner_name: selectedParcel.current_owner_name,
      location: `${selectedParcel.province || ''} ${selectedParcel.ville || ''} ${selectedParcel.commune || ''}`.trim(),
    });
    toast.success('Parcelle ajoutée aux favoris');
  };

  const handleClearFiltersAndReset = () => {
    advancedSearch.clearFilters();
    setFilteredParcels(parcels);
    toast.success('Filtres réinitialisés');
  };

  const handleWhatsAppClick = () => {
    const phone = appearance.support_whatsapp_number || '243816996077';
    const message = appearance.support_whatsapp_message || "Bonjour, j'ai besoin d'aide concernant les informations cadastrales.";
    void trackEvent('cadastral_map_whatsapp_click');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleGeolocate = () => {
    void trackEvent('cadastral_map_geolocate');
    requestUserLocation();
  };

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <Navigation />

      <main className="flex-1 relative" style={{ height: 'calc(100vh - 4rem)' }}>
        {/* Dynamic zoom control positioning */}
        <style>{`
          .leaflet-bottom.leaflet-right .leaflet-control-zoom {
            margin-bottom: ${
              selectedParcel
                ? isMobile
                  ? actionsExpanded ? `${Math.min(viewportHeight * 0.55, 416)}px` : `${Math.min(viewportHeight * 0.28, 176)}px`
                  : actionsExpanded ? `${Math.min(viewportHeight * 0.5, 384)}px` : `${Math.min(viewportHeight * 0.22, 160)}px`
                : isMobile
                  ? isSearchBarActive ? '1rem' : `${Math.min(viewportHeight * 0.28, 208)}px`
                  : '1rem'
            } !important;
            transition: margin-bottom 0.3s ease !important;
          }
        `}</style>

        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Chargement des parcelles...</p>
            </div>
          </div>
        ) : (
          <div ref={mapContainerRef} style={{ width: '100%', height: 'calc(100vh - 4rem)' }} />
        )}

        {/* Stripe polling indicator */}
        {stripePolling && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1100] bg-background/95 backdrop-blur-md rounded-xl shadow-lg border border-border/50 px-4 py-2 text-xs flex items-center gap-2" role="status" aria-live="polite">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <span>Vérification du paiement... {Math.round(pollProgress * 100)}%</span>
          </div>
        )}

        {/* Geolocate floating button (on-demand, no auto prompt) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGeolocate}
              className="absolute right-3 z-[800] h-9 w-9 rounded-xl shadow-lg p-0"
              style={{ bottom: isMobile ? `${Math.min(viewportHeight * 0.4, 320)}px` : '7rem' }}
              aria-label="Me localiser"
            >
              <LocateFixed className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Me localiser</TooltipContent>
        </Tooltip>

        {/* Search overlay */}
        <div
          className={`absolute left-3 z-[900] ${isMobile ? 'right-3' : 'w-[min(24rem,calc(100vw-1.5rem))]'} transform-gpu`}
          style={{
            transition: 'top 0.3s ease, transform 0.3s ease',
            top: isSearchBarActive || selectedParcel ? '0.75rem' : `${viewportHeight - 180}px`,
          }}
        >
          <div className="bg-background/95 backdrop-blur-md rounded-2xl shadow-[0_10px_40px_-8px_rgba(0,0,0,0.9),0_4px_16px_-4px_rgba(0,0,0,0.6)] border border-border/50 overflow-hidden">
            <div className={`${selectedParcel && isMobile ? 'p-2' : 'p-2.5'}`}>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <div className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${selectedParcel && isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-muted-foreground z-10`}>
                    <Search className="h-full w-full" />
                  </div>
                  <Input
                    placeholder={selectedParcel && isMobile ? searchBarConfig.placeholder.map_compact : searchBarConfig.placeholder.map_default}
                    value={searchQuery}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      const normalizedValue = inputValue.toUpperCase();
                      const invalidRegex = buildAllowedRegex();
                      const hasInvalidChars = invalidRegex.test(normalizedValue);

                      if (hasInvalidChars) {
                        if (searchBarConfig.feedback.sound_enabled) {
                          playFeedbackBeep(searchBarConfig.feedback.sound_frequency, searchBarConfig.feedback.sound_duration);
                        }
                        if (searchBarConfig.feedback.shake_enabled) {
                          setIsShaking(true);
                          setTimeout(() => setIsShaking(false), searchBarConfig.feedback.shake_duration);
                        }
                        setShowInvalidCharNotification(true);
                        if (invalidCharTimeoutRef.current) clearTimeout(invalidCharTimeoutRef.current);
                        invalidCharTimeoutRef.current = setTimeout(() => setShowInvalidCharNotification(false), 3000);
                      }

                      const sanitizedValue = normalizedValue.replace(new RegExp(invalidRegex.source, 'g'), '');
                      setSearchQuery(sanitizedValue);
                      if (sanitizedValue) setHasUserInteracted(true);
                    }}
                    onFocus={() => {
                      setIsSearchBarActive(true);
                      setHasUserInteracted(true);
                      if (showAdvancedSearch) setShowAdvancedSearch(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchQuery.trim()) {
                        searchHistory.addToHistory(searchQuery);
                        void trackEvent('cadastral_map_search', { query: searchQuery });
                      }
                    }}
                    type="text"
                    inputMode="text"
                    className={`${selectedParcel && isMobile ? 'h-8 text-xs pl-8' : 'h-9 text-sm pl-9'} pr-8 rounded-${searchBarConfig.appearance.border_radius} border-0 bg-muted/50 focus-visible:ring-1 focus-visible:ring-${searchBarConfig.appearance.accent_color}/50 transition-all ${isShaking ? 'animate-shake border-destructive' : ''}`}
                  />

                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`absolute right-1 top-1/2 -translate-y-1/2 ${selectedParcel && isMobile ? 'h-6 w-6' : 'h-7 w-7'} p-0 rounded-full hover:bg-destructive/10`}
                      onClick={handleClearSearch}
                      aria-label="Effacer la recherche"
                    >
                      <X className={`${selectedParcel && isMobile ? 'h-3 w-3' : 'h-3.5 w-3.5'} text-muted-foreground`} />
                    </Button>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (selectedParcel) return;
                    setIsSearchBarActive(true);
                    setShowAdvancedSearch(!showAdvancedSearch);
                    setHasUserInteracted(true);
                  }}
                  disabled={!!selectedParcel}
                  className={`${selectedParcel && isMobile ? 'h-8 w-8' : 'h-9 w-9'} shrink-0 rounded-xl ${showAdvancedSearch ? 'bg-primary/10 text-primary' : 'bg-muted/50'} hover:bg-muted transition-colors`}
                  aria-label="Recherche avancée"
                  title="Recherche avancée"
                >
                  <Settings2 className={`${selectedParcel && isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} transition-transform duration-300 ${showAdvancedSearch ? 'rotate-90' : ''}`} />
                </Button>

                {/* Land title button (state-machine driven) */}
                {landTitle.showButton && (isMobile ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <Popover open={landTitle.showNotification} onOpenChange={(o) => { if (!o) landTitle.dismiss(); }}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (selectedParcel) return;
                                landTitle.dismiss();
                                setShowLandTitleTermsDialog(true);
                                setHasUserInteracted(true);
                              }}
                              disabled={!!selectedParcel}
                              className={`${selectedParcel && isMobile ? 'h-8 w-8' : 'h-9 w-9'} shrink-0 rounded-xl transition-colors relative`}
                              aria-label="Demander un titre foncier"
                            >
                              <FileCheck2 className={`${selectedParcel && isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
                              {landTitle.showNotification && (
                                <span className="absolute -top-1 -right-1 h-3 w-3 bg-yellow-400 rounded-full animate-pulse shadow-lg border border-yellow-300" aria-hidden="true" />
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent side="top" align="end" sideOffset={10} className={cn('w-[320px] rounded-xl border border-destructive/30 bg-destructive text-destructive-foreground p-3 shadow-lg text-xs leading-relaxed')}>
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                              <span>Le numéro parcellaire (SU/SR) figure sur le titre foncier. Si vous n'avez pas encore de titre foncier, cliquez ici pour faire votre demande.</span>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={8}>Demander un titre foncier</TooltipContent>
                  </Tooltip>
                ) : (
                  <Popover open={landTitle.showNotification} onOpenChange={(o) => { if (!o) landTitle.dismiss(); }}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (selectedParcel) return;
                          landTitle.dismiss();
                          setShowLandTitleTermsDialog(true);
                          setHasUserInteracted(true);
                        }}
                        disabled={!!selectedParcel}
                        className={`h-9 w-9 shrink-0 rounded-xl transition-all duration-300 ease-in-out relative gap-1.5 text-xs font-medium overflow-hidden px-0 ${selectedParcel ? '' : 'hover:w-auto group hover:px-3'}`}
                        aria-label="Demander un titre foncier"
                      >
                        <FileCheck2 className="h-4 w-4 shrink-0" />
                        <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover:max-w-[200px] group-hover:opacity-100 transition-all duration-300 ease-in-out">Demander un titre foncier</span>
                        {landTitle.showNotification && (
                          <span className="absolute -top-1 -right-1 h-3 w-3 bg-yellow-400 rounded-full animate-pulse shadow-lg border border-yellow-300" aria-hidden="true" />
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent side="top" align="end" sideOffset={10} className={cn('w-[320px] rounded-xl border border-destructive/30 bg-destructive text-destructive-foreground p-3 shadow-lg text-xs leading-relaxed')}>
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span>Le numéro parcellaire (SU/SR) figure sur le titre foncier. Si vous n'avez pas encore de titre foncier, cliquez ici pour faire votre demande.</span>
                      </div>
                    </PopoverContent>
                  </Popover>
                ))}
              </div>

              {/* Advanced search */}
              <div className={`overflow-hidden transition-all duration-300 ease-out ${showAdvancedSearch ? 'max-h-[500px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
                <div className="border-t border-border/30 pt-3 space-y-3">
                  {advancedSearch.loading && (
                    <div className="flex items-center justify-center py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="ml-2 text-xs text-muted-foreground">Recherche...</span>
                    </div>
                  )}
                  <AdvancedSearchFilters
                    filters={advancedSearch.filters}
                    onFiltersChange={advancedSearch.updateFilters}
                    onSearch={handleApplyFilters}
                    onClear={handleClearFiltersAndReset}
                    isCompact={true}
                  />
                  <SearchHistory
                    onSelectHistory={handleSelectFromHistory}
                    onSelectFavorite={handleSelectFromFavorites}
                    isCompact={true}
                  />
                </div>
              </div>

              {/* Suggestions */}
              {searchSuggestions.length > 0 && !(selectedParcel && isMobile) && !showAdvancedSearch && (
                <div className="mt-2 rounded-xl bg-muted/30 overflow-hidden max-h-36 overflow-y-auto">
                  {searchSuggestions.map((parcel, index) => (
                    <button
                      key={parcel.id}
                      onClick={() => handleSelectParcel(parcel)}
                      className={`w-full text-left px-3 py-2 hover:bg-primary/5 transition-colors flex items-center justify-between ${index !== searchSuggestions.length - 1 ? 'border-b border-border/30' : ''}`}
                    >
                      <div>
                        <div className="font-mono font-bold text-xs text-primary">{parcel.parcel_number}</div>
                        <div className="text-[10px] text-muted-foreground">{parcel.ville || parcel.province}</div>
                      </div>
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}

              {!(selectedParcel && isMobile) && !showAdvancedSearch && (
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {searchQuery ? `${filteredParcels.length} résultat(s)` : `${parcels.length} parcelles`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {showInvalidCharNotification && (
            <div className="mt-2 animate-fade-in">
              <div className="bg-destructive text-destructive-foreground text-xs p-3 rounded-xl shadow-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium mb-0.5">{searchBarConfig.error_message.title}</p>
                    <p className="text-destructive-foreground/90 text-[11px]">{searchBarConfig.error_message.description}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Manual contribution CTA when no result */}
        {searchQuery && filteredParcels.length === 0 && !selectedParcel && (
          <div className={`absolute z-[890] animate-fade-in ${isMobile ? 'left-1/2 -translate-x-1/2 bottom-[28rem]' : 'left-3 top-[8.5rem]'}`} style={isMobile ? {} : { width: '24rem' }}>
            <div className="relative">
              <Button
                variant="default"
                size="lg"
                className="h-11 px-5 text-sm font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary animate-scale-in w-full"
                onClick={handleManualSearchClick}
              >
                <div className="flex items-center justify-center gap-2">
                  <div className="h-7 w-7 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                    <MapPinPlus className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold">Ajouter cette parcelle</div>
                    <div className="text-[10px] opacity-80 font-normal">Ajoutez "{searchQuery}" au cadastre numérique de la RDC</div>
                  </div>
                </div>
              </Button>
              {showManualSearchNotification && (
                <div className="mt-2 animate-scale-in">
                  <div className="bg-yellow-400 text-yellow-900 text-xs px-4 py-2.5 rounded-xl shadow-lg text-center w-64 mx-auto">
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>Cette parcelle n'existe pas encore</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selected parcel panel */}
        {selectedParcel && (
          <div className={`absolute ${isMobile ? 'bottom-2 left-3 right-3 max-w-[340px] mx-auto' : 'bottom-4 right-4 w-80'} z-[1000]`}>
            <div className="bg-background/98 backdrop-blur-xl rounded-3xl shadow-[0_8px_40px_-12px_hsl(var(--primary)/1),0_4px_16px_-4px_rgba(0,0,0,1)] border border-border/40 overflow-hidden">
              <ParcelActionsDropdown
                parcelNumber={selectedParcel.parcel_number}
                parcelId={selectedParcel.id}
                parcelData={selectedParcel}
                expanded={actionsExpanded}
                onCollapse={() => setActionsExpanded(false)}
                onRequestLandTitle={() => setShowLandTitleTermsDialog(true)}
              />

              <div className="relative px-3.5 py-3 flex items-center justify-between">
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center border border-primary/10">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="font-mono font-bold text-sm text-primary leading-none tracking-tight">{selectedParcel.parcel_number}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{selectedParcel.ville || selectedParcel.province}</p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 w-7 p-0 rounded-xl transition-all ${searchHistory.isFavorite(selectedParcel.id) ? 'text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20' : 'text-muted-foreground hover:bg-muted'}`}
                    onClick={handleAddToFavorites}
                    aria-label="Ajouter aux favoris"
                  >
                    <Star className={`h-3.5 w-3.5 ${searchHistory.isFavorite(selectedParcel.id) ? 'fill-yellow-500' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                    onClick={() => { setSelectedParcel(null); setActionsExpanded(false); }}
                    aria-label="Fermer le panneau parcelle"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="px-3.5 pb-3.5">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/5 border border-primary/10 text-[10px]">
                    <span className="text-muted-foreground">Surface</span>
                    <span className="font-semibold text-foreground">
                      {selectedParcel.area_sqm?.toLocaleString()} m²
                    </span>
                  </div>
                  {selectedParcel.commune && (
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/60 text-[10px]">
                      <span className="font-medium text-foreground/80">{selectedParcel.commune}</span>
                    </div>
                  )}
                  {selectedParcel.quartier && (
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/60 text-[10px]">
                      <span className="font-medium text-foreground/80">{selectedParcel.quartier}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-1.5">
                  <Button
                    onClick={async () => {
                      if (!selectedParcel) return;
                      await cadastralSearch.searchParcel(selectedParcel.parcel_number);
                      setShowServiceCatalog(true);
                    }}
                    className="flex-1 h-9 text-xs rounded-xl font-medium shadow-sm"
                    size="sm"
                    disabled={cadastralSearch.loading}
                  >
                    {cadastralSearch.loading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Search className="h-3 w-3 mr-1.5" />
                        {isMobile ? 'Données' : 'Plus de données'}
                      </>
                    )}
                  </Button>
                  <Button
                    variant={actionsExpanded ? 'default' : 'secondary'}
                    size="sm"
                    className={`flex-1 h-9 text-xs rounded-xl font-medium gap-1 transition-all ${actionsExpanded ? 'shadow-sm' : ''}`}
                    onClick={() => setActionsExpanded(prev => !prev)}
                  >
                    {actionsExpanded ? 'Fermer' : 'Actions'}
                    {actionsExpanded ? <X className="h-3 w-3" /> : <Settings2 className="h-3 w-3" />}
                  </Button>
                  <Button
                    onClick={handleWhatsAppClick}
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0 rounded-xl shrink-0"
                    aria-label="Aide WhatsApp"
                    title="Aide WhatsApp"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {hasIncompleteData && (
                  <button
                    onClick={() => setShowContributionDialog(true)}
                    className="w-full mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/15 transition-colors text-left"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                    <span className="text-[10px] text-orange-700 leading-tight">Données incomplètes - Cliquez pour contribuer</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        {mapConfig?.legend?.enabled !== false && (() => {
          const legendItems = (mapConfig?.legend?.items || []).filter(item => item.enabled);
          const legendIconMap: Record<string, { desktop: React.ReactNode; mobile: React.ReactNode }> = {
            bornage_gps: {
              desktop: <div className="w-2 h-2 bg-red-500/20 border border-red-500 rounded-sm" />,
              mobile: <div className="w-2 h-2 bg-red-500/20 border border-red-500 rounded-sm shrink-0" />,
            },
            sans_bornage: {
              desktop: <MapPin className="h-2 w-2 text-blue-500" />,
              mobile: <MapPin className="h-2 w-2 text-blue-500 shrink-0" />,
            },
            limites: {
              desktop: <div className="w-2 h-px bg-red-500" />,
              mobile: <div className="w-2 h-px bg-red-500 shrink-0" />,
            },
            dimensions: {
              desktop: <div className="px-0.5 text-[5px] font-bold text-red-500 border border-red-500 rounded bg-white leading-none">12m</div>,
              mobile: <div className="px-0.5 text-[5px] font-bold text-red-500 border border-red-500 rounded bg-white leading-none shrink-0">12m</div>,
            },
            incompletes: {
              desktop: <AlertTriangle className="h-2 w-2 text-orange-500" />,
              mobile: <AlertTriangle className="h-2 w-2 text-orange-500 shrink-0" />,
            },
            favorite: {
              desktop: <Star className="h-2 w-2 text-yellow-500 fill-yellow-500" />,
              mobile: <Star className="h-2 w-2 text-yellow-500 fill-yellow-500 shrink-0" />,
            },
          };
          if (legendItems.length === 0) return null;
          return (
            <>
              <div className="absolute top-3 right-3 z-[800] hidden md:block max-h-[calc(100vh-8rem)] overflow-auto">
                <div className="bg-background/95 backdrop-blur-md rounded-lg shadow-lg border border-border/50 p-1.5">
                  <p className="text-[7px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Légende</p>
                  <div className="space-y-0.5">
                    {legendItems.map(item => (
                      <div key={item.key} className="flex items-center gap-1 text-[7px]">
                        {legendIconMap[item.key]?.desktop}
                        <span className="text-muted-foreground">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute left-3 z-[800] md:hidden" style={{
                bottom: `${selectedParcel
                  ? (actionsExpanded ? Math.min(viewportHeight * 0.55, 480) : Math.min(viewportHeight * 0.3, 240))
                  : Math.min(viewportHeight * 0.25, 192)}px`,
                transition: 'bottom 0.3s ease',
              }}>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="secondary" size="sm" className="h-7 w-7 rounded-lg shadow-lg p-0" aria-label="Afficher la légende">
                      <HelpCircle className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="start" sideOffset={8} className="w-36 rounded-lg p-1.5">
                    <p className="text-[7px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Légende</p>
                    <div className="space-y-0.5">
                      {legendItems.map(item => (
                        <div key={item.key} className="flex items-center gap-1 text-[7px]">
                          {legendIconMap[item.key]?.mobile}
                          <span className="text-muted-foreground">{item.mobileLabel}</span>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </>
          );
        })()}
      </main>

      {showIntroDialog && (
        <CCCIntroDialog
          open={showIntroDialog}
          onOpenChange={(open) => setShowIntroDialog(open)}
          onContinue={() => { setShowIntroDialog(false); setShowContributionDialog(true); }}
          parcelNumber={searchQuery}
        />
      )}

      {showContributionDialog && (
        <CadastralContributionDialog
          open={showContributionDialog}
          onOpenChange={setShowContributionDialog}
          parcelNumber={selectedParcel?.parcel_number || searchQuery}
        />
      )}

      <LandTitleTermsDialog
        open={showLandTitleTermsDialog}
        onOpenChange={setShowLandTitleTermsDialog}
        onAccept={() => setShowLandTitleDialog(true)}
      />

      <LandTitleRequestDialog
        open={showLandTitleDialog}
        onOpenChange={setShowLandTitleDialog}
      />

      {cadastralSearch.searchResult && (
        <CadastralResultsDialog
          result={cadastralSearch.searchResult}
          isOpen={showServiceCatalog}
          onClose={() => { setShowServiceCatalog(false); cadastralSearch.clearSearch(); }}
        />
      )}

      <CadastralCartButton />
    </div>
  );
};

export default CadastralMap;
