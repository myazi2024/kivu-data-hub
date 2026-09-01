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
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';
import CCCIntroDialog from '@/components/cadastral/CCCIntroDialog';
import CadastralContributionDialog from '@/components/cadastral/CadastralContributionDialog';
import AdvancedSearchFilters from '@/components/cadastral/AdvancedSearchFilters';
import SearchHistory from '@/components/cadastral/SearchHistory';
import CadastralSearchModeToggle, { type CadastralSearchMode } from '@/components/cadastral/CadastralSearchModeToggle';
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
import { computeEffectiveAreaSqm } from '@/utils/parcelGeometricArea';

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
  const selectedParcelEffectiveArea = useMemo(() => {
    if (!selectedParcel) return 0;
    const gps = Array.isArray(selectedParcel.gps_coordinates)
      ? (selectedParcel.gps_coordinates as any[])
          .map((c: any) => ({ lat: Number(c?.lat), lng: Number(c?.lng) }))
          .filter((p) => isFinite(p.lat) && isFinite(p.lng))
      : [];
    return computeEffectiveAreaSqm(gps, selectedParcel.area_sqm || 0);
  }, [selectedParcel]);
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
  const debouncedQuery = useDebounce(searchQuery, 250);
  const [searchMode, setSearchMode] = useState<CadastralSearchMode>('parcel');
  const [titleMatchIds, setTitleMatchIds] = useState<Set<string>>(new Set());
  const [searchSuggestions, setSearchSuggestions] = useState<ParcelData[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  /** True tant qu'un jeu de résultats provient de la recherche avancée. */
  const [advancedFiltersApplied, setAdvancedFiltersApplied] = useState(false);
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

  // Container-relative sizing for the desktop search bar position.
  // The search overlay lives inside <main> (height = 100dvh - 4rem), so we must
  // measure the container's real height (not window.innerHeight) to avoid the
  // bar drifting below the visible area and being clipped by overflow-hidden.
  const searchCardRef = useRef<HTMLDivElement>(null);
  const [mapContainerHeight, setMapContainerHeight] = useState(0);
  const [searchCardHeight, setSearchCardHeight] = useState(0);
  useEffect(() => {
    const mapEl = mapContainerRef.current;
    const cardEl = searchCardRef.current;
    if (!mapEl) return;
    const mapObs = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height;
      if (h && h > 0) setMapContainerHeight(h);
    });
    mapObs.observe(mapEl);
    const cardObs = new ResizeObserver((entries) => {
      const h = entries[0]?.borderBoxSize?.[0]?.blockSize ?? entries[0]?.contentRect.height;
      if (h && h > 0) setSearchCardHeight(h);
    });
    if (cardEl) cardObs.observe(cardEl);
    return () => { mapObs.disconnect(); cardObs.disconnect(); };
  }, []);

  const advancedSearch = useAdvancedCadastralSearch();
  const searchHistory = useSearchHistory();
  const { config: searchBarConfig, buildAllowedRegex } = useSearchBarConfig();

  /** Jeu de caractères interdits selon le mode de recherche. */
  const modeRegex = useCallback(
    (mode: CadastralSearchMode) => (mode === 'title' ? /[^A-Z0-9./\- ]/ : buildAllowedRegex()),
    [buildAllowedRegex]
  );
  const sanitizeForMode = useCallback(
    (value: string, mode: CadastralSearchMode) =>
      value.toUpperCase().replace(new RegExp(modeRegex(mode).source, 'g'), ''),
    [modeRegex]
  );
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

  // Predictive search — parcel number (SU/SR) or property title number.
  // Debounced so a fast typist doesn't re-filter 2000 parcels and redraw all
  // Leaflet layers on every keystroke.
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchSuggestions([]);
      setHighlightedIndex(-1);
      if (!advancedFiltersApplied) setFilteredParcels(parcels);
      return;
    }
    const q = debouncedQuery.toLowerCase().trim();
    const byParcel = parcels.filter(p => p.parcel_number?.toLowerCase().includes(q));
    const byTitle = parcels.filter(
      p => (p.title_reference_number || '').toLowerCase().includes(q) && !byParcel.some(bp => bp.id === p.id)
    );
    // Mode chooses which match is prioritised; the other is always kept as fallback.
    const filtered = searchMode === 'title' ? [...byTitle, ...byParcel] : [...byParcel, ...byTitle];
    setTitleMatchIds(new Set(byTitle.map(p => p.id)));
    setSearchSuggestions(filtered.slice(0, 5));
    setHighlightedIndex(-1);
    setFilteredParcels(filtered);
  }, [debouncedQuery, parcels, searchMode, advancedFiltersApplied]);


  // Render layers (incremental diff inside the hook)
  useEffect(() => {
    if (!mapReady) return;
    renderLayers({ parcels: filteredParcels, subdivisionLots });
  }, [mapReady, filteredParcels, subdivisionLots, renderLayers]);

  /** Recherche stabilisée : le débounce est passé et les parcelles sont chargées. */
  const searchSettled = !loading && debouncedQuery === searchQuery;
  const noResult = !!searchQuery.trim() && searchSettled && filteredParcels.length === 0;

  // Manual-search notification timer
  useEffect(() => {
    if (noResult && !showManualSearchNotification && !notificationDismissedRef.current) {
      inactivityTimerRef.current = setTimeout(() => setShowManualSearchNotification(true), 5000);
    }
    return () => { if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current); };
  }, [noResult, showManualSearchNotification]);

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
    const label = searchMode === 'title' && parcel.title_reference_number
      ? parcel.title_reference_number
      : parcel.parcel_number;
    setSelectedParcel(parcel);
    setSearchQuery(label);
    setSearchSuggestions([]);
    setHighlightedIndex(-1);
    searchHistory.addToHistory(label);
    centerOnParcel(parcel, 19);
    void trackEvent('cadastral_map_parcel_select', { parcel_number: parcel.parcel_number, search_mode: searchMode });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerOnParcel, searchMode]);

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchSuggestions([]);
    setHighlightedIndex(-1);
    setAdvancedFiltersApplied(false);
    setFilteredParcels(parcels);
    setSelectedParcel(null);
  };

  const handleManualSearchClick = useCallback(() => {
    notificationDismissedRef.current = true;
    setShowManualSearchNotification(false);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    setShowIntroDialog(true);
  }, []);

  const applyAdvancedFilters = async (filters?: typeof advancedSearch.filters) => {
    const results = await advancedSearch.searchParcels(filters);
    if (results.length > 0) {
      setSearchQuery('');
      setSearchSuggestions([]);
      setAdvancedFiltersApplied(true);
      setFilteredParcels(results as any);
      toast.success(`${results.length} parcelle(s) trouvée(s)`);
      setShowAdvancedSearch(false);
    } else {
      toast.error('Aucune parcelle ne correspond aux critères');
    }
    return results;
  };

  const handleApplyFilters = async () => {
    await applyAdvancedFilters();
    const filterSummary = Object.entries(advancedSearch.filters)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}:${v}`)
      .join(', ');
    if (filterSummary) searchHistory.addToHistory(`Filtres: ${filterSummary}`, advancedSearch.filters);
  };

  const handleSelectFromHistory = (query: string) => {
    setShowAdvancedSearch(false);
    // Une entrée « Filtres: ... » n'est pas un texte recherchable : on rejoue les
    // filtres avancés mémorisés au lieu de l'injecter dans la barre standard.
    const item = searchHistory.history.find(h => h.query === query);
    if (query.startsWith('Filtres:') || (item?.filters && Object.keys(item.filters).length > 0)) {
      if (item?.filters) {
        advancedSearch.updateFilters(item.filters);
        void applyAdvancedFilters(item.filters);
      } else {
        toast.error('Ces filtres ne sont plus disponibles');
      }
      return;
    }
    setAdvancedFiltersApplied(false);
    setSearchQuery(query);
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

      <main
        className="flex-1 relative min-h-0 overflow-hidden"
        style={{
          height: 'calc(100dvh - 4rem)',
          // CSS var consumed by the inline rule below — no JS viewport math.
          ['--map-zoom-offset' as any]: selectedParcel
            ? (isMobile ? (actionsExpanded ? '70dvh' : '32dvh') : (actionsExpanded ? '24rem' : '10rem'))
            : (isMobile ? '1rem' : '1rem'),
        }}
      >
        <style>{`
          .leaflet-bottom.leaflet-right .leaflet-control-zoom {
            margin-bottom: var(--map-zoom-offset, 1rem) !important;
            transition: margin-bottom 0.3s ease !important;
          }
        `}</style>

        {/* Conteneur Leaflet TOUJOURS monté pour garantir un parent dimensionné */}
        <div ref={mapContainerRef} className="absolute inset-0" />
        {loading && (
          <div className="absolute inset-0 z-[500] flex items-center justify-center bg-background/60 backdrop-blur-sm pointer-events-none">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Chargement des parcelles...</p>
            </div>
          </div>
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
              className={cn(
                'absolute right-3 z-[800] h-10 w-10 rounded-xl shadow-lg p-0',
                isMobile ? 'top-[4.5rem]' : 'bottom-28'
              )}
              aria-label="Me localiser"
            >
              <LocateFixed className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Me localiser</TooltipContent>
        </Tooltip>

        {/* Search overlay */}
        <div
          className={`absolute left-3 z-[900] ${isMobile ? 'right-3 top-3' : 'w-[min(24rem,calc(100vw-1.5rem))]'} transform-gpu`}
          style={!isMobile ? {
            transition: 'top 0.3s ease, transform 0.3s ease',
            top: isSearchBarActive || selectedParcel ? '0.75rem' : `${Math.max(mapContainerHeight - (searchCardHeight || 160) - 24, 12)}px`,
          } : undefined}
        >
          <div ref={searchCardRef} className="bg-background/95 backdrop-blur-md rounded-2xl shadow-[0_10px_40px_-8px_rgba(0,0,0,0.9),0_4px_16px_-4px_rgba(0,0,0,0.6)] border border-border/50 overflow-hidden">
            <div className="p-2.5">
              {!(selectedParcel && isMobile) && (
                <CadastralSearchModeToggle
                  mode={searchMode}
                  onModeChange={(m) => {
                    setSearchMode(m);
                    // Le mode « titre » tolère des caractères interdits en mode parcelle :
                    // on re-nettoie la saisie pour éviter une requête impossible.
                    setSearchQuery(prev => sanitizeForMode(prev, m));
                    setHasUserInteracted(true);
                    void trackEvent('cadastral_map_search_mode', { mode: m });
                  }}
                  className="mb-2"
                />
              )}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10">
                    <Search className="h-full w-full" />
                  </div>
                  <Input
                    placeholder={searchMode === 'title' ? 'N° du titre de propriété...' : searchBarConfig.placeholder.map_default}
                    value={searchQuery}
                    onChange={(e) => {
                      const normalizedValue = e.target.value.toUpperCase();
                      const invalidRegex = modeRegex(searchMode);
                      const hasInvalidChars = invalidRegex.test(normalizedValue);

                      if (hasInvalidChars && searchMode === 'parcel') {
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

                      const sanitizedValue = sanitizeForMode(normalizedValue, searchMode);
                      setAdvancedFiltersApplied(false);
                      setSearchQuery(sanitizedValue);
                      if (sanitizedValue) setHasUserInteracted(true);
                    }}
                    onFocus={() => {
                      setIsSearchBarActive(true);
                      setHasUserInteracted(true);
                      if (showAdvancedSearch) setShowAdvancedSearch(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown' && searchSuggestions.length > 0) {
                        e.preventDefault();
                        setHighlightedIndex(i => (i + 1) % searchSuggestions.length);
                        return;
                      }
                      if (e.key === 'ArrowUp' && searchSuggestions.length > 0) {
                        e.preventDefault();
                        setHighlightedIndex(i => (i <= 0 ? searchSuggestions.length - 1 : i - 1));
                        return;
                      }
                      if (e.key === 'Escape') {
                        setSearchSuggestions([]);
                        setHighlightedIndex(-1);
                        return;
                      }
                      if (e.key === 'Enter' && searchQuery.trim()) {
                        void trackEvent('cadastral_map_search', { query: searchQuery, search_mode: searchMode });
                        const target = searchSuggestions[highlightedIndex >= 0 ? highlightedIndex : 0];
                        if (target) {
                          handleSelectParcel(target);
                        } else {
                          searchHistory.addToHistory(searchQuery);
                        }
                      }
                    }}
                    type="text"
                    inputMode="text"
                    role="combobox"
                    aria-expanded={searchSuggestions.length > 0}
                    aria-controls="cadastral-search-suggestions"
                    aria-autocomplete="list"
                    aria-activedescendant={highlightedIndex >= 0 ? `cadastral-suggestion-${highlightedIndex}` : undefined}
                    aria-label={searchMode === 'title' ? 'Rechercher par numéro du titre de propriété' : 'Rechercher par numéro de parcelle'}
                    className={`h-10 text-sm pl-9 pr-8 rounded-${searchBarConfig.appearance.border_radius} border-0 bg-muted/50 focus-visible:ring-1 focus-visible:ring-${searchBarConfig.appearance.accent_color}/50 transition-all ${isShaking ? 'animate-shake border-destructive' : ''}`}
                  />



                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 rounded-full hover:bg-destructive/10"
                      onClick={handleClearSearch}
                      aria-label="Effacer la recherche"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
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
                  className={`h-10 shrink-0 rounded-full gap-1.5 px-3 ${showAdvancedSearch ? 'bg-red-600 text-white' : 'bg-red-500 text-white'} hover:bg-red-700 transition-colors shadow-sm`}
                  aria-label="Recherche avancée"
                  title="Recherche avancée"
                >
                  <Settings2 className={`h-4 w-4 transition-transform duration-300 ${showAdvancedSearch ? 'rotate-90' : ''}`} />
                  {!isMobile && <span className="text-[11px] font-medium">Avancée</span>}
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
                              className="h-10 w-10 shrink-0 rounded-xl transition-colors relative"
                              aria-label="Demander un titre foncier"
                            >
                              <FileCheck2 className="h-4 w-4" />
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
                  {searchSuggestions.map((parcel, index) => {
                    const isTitleMatch = titleMatchIds.has(parcel.id);
                    return (
                      <button
                        key={parcel.id}
                        onClick={() => handleSelectParcel(parcel)}
                        className={`w-full text-left px-3 py-2 hover:bg-primary/5 transition-colors flex items-center justify-between gap-2 ${index !== searchSuggestions.length - 1 ? 'border-b border-border/30' : ''}`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-xs text-primary truncate">{parcel.parcel_number}</span>
                            {isTitleMatch && (
                              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">Titre</span>
                            )}
                          </div>
                          {isTitleMatch && parcel.title_reference_number && (
                            <div className="text-[10px] font-mono text-foreground/80 truncate">
                              {parcel.property_title_type ? `${parcel.property_title_type} — ` : ''}{parcel.title_reference_number}
                            </div>
                          )}
                          <div className="text-[10px] text-muted-foreground truncate">
                            {[parcel.current_owner_name, parcel.ville || parcel.province].filter(Boolean).join(' — ')}
                          </div>
                        </div>
                        <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                      </button>
                    );
                  })}
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

          {/* Manual contribution CTA when no result — rendered inside the search overlay so it sits directly below the bar and stays accessible on both desktop and mobile */}
          {searchQuery && filteredParcels.length === 0 && !selectedParcel && (
            <div className="mt-2 animate-fade-in">
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
          )}
        </div>

        {/* Selected parcel panel */}
        {selectedParcel && (
          <div
            className={`absolute z-[1000] ${isMobile ? 'inset-x-0 bottom-0' : 'bottom-4 right-4 w-80'}`}
            style={isMobile ? { paddingBottom: 'env(safe-area-inset-bottom)' } : undefined}
          >
            <div className={`bg-background/98 backdrop-blur-xl ${isMobile ? 'rounded-t-3xl border-t' : 'rounded-3xl border'} shadow-[0_8px_40px_-12px_hsl(var(--primary)/1),0_4px_16px_-4px_rgba(0,0,0,1)] border-border/40 overflow-hidden`}>
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
                    className={`h-9 w-9 p-0 rounded-xl transition-all ${searchHistory.isFavorite(selectedParcel.id) ? 'text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20' : 'text-muted-foreground hover:bg-muted'}`}
                    onClick={handleAddToFavorites}
                    aria-label="Ajouter aux favoris"
                  >
                    <Star className={`h-4 w-4 ${searchHistory.isFavorite(selectedParcel.id) ? 'fill-yellow-500' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                    onClick={() => { setSelectedParcel(null); setActionsExpanded(false); }}
                    aria-label="Fermer le panneau parcelle"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="px-3.5 pb-3.5">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/5 border border-primary/10 text-[10px]">
                    <span className="text-muted-foreground">Surface</span>
                    <span className="font-semibold text-foreground">
                      {selectedParcelEffectiveArea.toLocaleString()} m²
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
                    className="flex-1 h-10 text-xs rounded-xl font-medium shadow-sm"
                    size="sm"
                    disabled={cadastralSearch.loading}
                  >
                    {cadastralSearch.loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Search className="h-3.5 w-3.5 mr-1.5" />
                        {isMobile ? 'Données' : 'Plus de données'}
                      </>
                    )}
                  </Button>
                  <Button
                    variant={actionsExpanded ? 'default' : 'secondary'}
                    size="sm"
                    className={`flex-1 h-10 text-xs rounded-xl font-medium gap-1 transition-all ${actionsExpanded ? 'shadow-sm' : ''}`}
                    onClick={() => setActionsExpanded(prev => !prev)}
                  >
                    {actionsExpanded ? 'Fermer' : 'Actions'}
                    {actionsExpanded ? <X className="h-3.5 w-3.5" /> : <Settings2 className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    onClick={handleWhatsAppClick}
                    variant="outline"
                    size="sm"
                    className="h-10 w-10 p-0 rounded-xl shrink-0"
                    aria-label="Aide WhatsApp"
                    title="Aide WhatsApp"
                  >
                    <MessageCircle className="h-4 w-4" />
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
              <div className="absolute right-3 z-[800] md:hidden top-[8rem]">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="secondary" size="sm" className="h-9 w-9 rounded-xl shadow-lg p-0" aria-label="Afficher la légende">
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="left" align="start" sideOffset={8} className="w-40 rounded-lg p-1.5">
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
          parcelNumber={selectedParcel?.parcel_number || (searchMode === 'title' ? '' : searchQuery)}
          initialTitleReferenceNumber={!selectedParcel && searchMode === 'title' ? searchQuery : undefined}
          searchOrigin={searchMode}
        />
      )}


      <LandTitleTermsDialog
        open={showLandTitleTermsDialog}
        onOpenChange={setShowLandTitleTermsDialog}
        onAccept={() => setShowLandTitleDialog(true)}
      />

      {showLandTitleDialog && (
        <LandTitleRequestDialog
          open={showLandTitleDialog}
          onOpenChange={setShowLandTitleDialog}
        />
      )}

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
