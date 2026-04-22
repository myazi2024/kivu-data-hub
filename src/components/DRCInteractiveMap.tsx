import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useAppAppearance } from '@/hooks/useAppAppearance';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSwipePager } from '@/hooks/useSwipePager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MapPin, BarChart3, Info, Database, Loader2, Maximize, Minimize, Clock, RotateCcw } from 'lucide-react';
import ShareButton from '@/components/shared/ShareButton';
import { toast } from 'sonner';
import { normalizeTitleType } from '@/utils/titleTypeNormalizer';
import DRCMapWithTooltip from './DRCMapWithTooltip';
import DRCCommunesMap from './DRCCommunesMap';
import DRCQuartiersMap from './DRCQuartiersMap';
import DRCTerritoiresMap from './DRCTerritoiresMap';

import { ProvinceData } from '@/types/province';
import ProvinceDataVisualization from './visualizations/ProvinceDataVisualization';
import { useLandDataAnalytics } from '@/hooks/useLandDataAnalytics';
import { useTestEnvironment } from '@/hooks/useTestEnvironment';
import { useTabChartsConfig, ANALYTICS_TABS_REGISTRY } from '@/hooks/useAnalyticsChartsConfig';
import { getTerritoiresForProvince, getProvinceForTerritoire } from '@/lib/geographicData';
import { MAP_TAB_PROFILES, computeAdaptiveTiers, NO_DATA_COLOR, type MapTabProfile, type MapTier } from '@/config/mapTabProfiles';
import { norm, buildScopePredicate } from './map/meta/mapMeta';
import { useMapDrilldown } from './map/hooks/useMapDrilldown';
import { useMapIndicators } from './map/hooks/useMapIndicators';
import { MapLegend } from './map/ui/MapLegend';
import { MapScopeLegend } from './map/ui/MapScopeLegend';
import { MapKPICards } from './map/ui/MapKPICards';




interface DRCInteractiveMapProps {
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

const DRCInteractiveMap = ({ onFullscreenChange }: DRCInteractiveMapProps) => {
  const provincesDataRef = React.useRef<ProvinceData[]>([]);
  const drilldown = useMapDrilldown(() => provincesDataRef.current);
  const {
    selectedProvince,
    externalProvinceId,
    selectedVille,
    selectedCommune,
    selectedQuartier,
    selectedTerritoire,
    selectedSectionType,
    activeAnalyticsTab,
    setSelectedProvince,
    setExternalProvinceId,
    setSelectedVille,
    setSelectedCommune,
    setSelectedQuartier,
    setSelectedTerritoire,
    setSelectedSectionType,
    setActiveAnalyticsTab,
    handleProvinceFilter,
    clearGeoSelection,
  } = drilldown;

  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [activeMobilePanel, setActiveMobilePanel] = useState<'map' | 'analytics'>('map');
  const [isMapZoomed, setIsMapZoomed] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [forcedTab, setForcedTab] = useState<string | null>(null);
  const mapCardRef = React.useRef<HTMLDivElement>(null);
  const analyticsColRef = React.useRef<HTMLDivElement>(null);
  const analyticsTitleRef = React.useRef<HTMLSpanElement>(null);
  const mapTitleRef = React.useRef<HTMLHeadingElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);

  const isMobile = useIsMobile();
  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const onAnalyticsPanel = activeMobilePanel === 'analytics';
  const pagerIndex = onAnalyticsPanel ? 1 : 0;

  const { ref: pagerRef, isDragging, pageWidth, dragProgress } = useSwipePager<HTMLDivElement>({
    pageCount: 2,
    index: pagerIndex,
    onIndexChange: (i) => setActiveMobilePanel(i === 1 ? 'analytics' : 'map'),
    enabled: isMobile,
    ignoreSelector: '[data-swipe-ignore], [role="dialog"], [data-radix-popper-content-wrapper], button, a, input, textarea, select',
  });

  // Reset scroll + focus management quand le panneau mobile change (UX + a11y)
  useEffect(() => {
    if (!isMobile) return;
    const id = window.setTimeout(() => {
      if (onAnalyticsPanel) {
        const scrollEl = analyticsColRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
        if (scrollEl) scrollEl.scrollTop = 0;
        analyticsTitleRef.current?.focus({ preventScroll: true });
      } else {
        mapTitleRef.current?.focus({ preventScroll: true });
      }
    }, 320);
    return () => window.clearTimeout(id);
  }, [activeMobilePanel, isMobile, onAnalyticsPanel]);

  // Teaser physique au mount : la page Analytics « pointe le bout de son nez ».
  // Une seule fois par device, skip si reduced-motion.
  useEffect(() => {
    if (!isMobile || prefersReducedMotion) return;
    let seen = false;
    try { seen = localStorage.getItem('drc-pager-teaser-seen') === '1'; } catch { /* noop */ }
    if (seen) return;
    const el = trackRef.current;
    if (!el) return;
    const startId = window.setTimeout(() => {
      // Animation keyframes : 0 → -40 → +18 → 0 sur ~900ms (easeOutBack via CSS)
      const prevTransition = el.style.transition;
      el.style.transition = 'transform 320ms cubic-bezier(.34,1.56,.64,1)';
      el.style.setProperty('--pager-teaser', '-40px');
      const t1 = window.setTimeout(() => {
        el.style.setProperty('--pager-teaser', '18px');
      }, 340);
      const t2 = window.setTimeout(() => {
        el.style.setProperty('--pager-teaser', '0px');
      }, 640);
      const t3 = window.setTimeout(() => {
        el.style.transition = prevTransition;
        try { localStorage.setItem('drc-pager-teaser-seen', '1'); } catch { /* noop */ }
      }, 980);
      // Cleanup nested timers via ref-bound array
      (el as any).__teaserTimers = [t1, t2, t3];
    }, 600);
    return () => {
      window.clearTimeout(startId);
      const timers: number[] | undefined = (el as any).__teaserTimers;
      if (timers) timers.forEach((t) => window.clearTimeout(t));
      el.style.setProperty('--pager-teaser', '0px');
    };
  }, [isMobile, prefersReducedMotion]);


  const { isTestRoute } = useTestEnvironment();
  const { data: analytics, isLoading, dataUpdatedAt } = useLandDataAnalytics(isTestRoute);
  const { config: brandingConfig } = useAppAppearance();

  const rdcMapDefaults = ANALYTICS_TABS_REGISTRY['rdc-map']
    ? [...ANALYTICS_TABS_REGISTRY['rdc-map'].kpis, ...ANALYTICS_TABS_REGISTRY['rdc-map'].charts]
    : [];
  const { isChartVisible, getChartConfig } = useTabChartsConfig('rdc-map', rdcMapDefaults);

  const globalDefaults = ANALYTICS_TABS_REGISTRY['_global']
    ? [...ANALYTICS_TABS_REGISTRY['_global'].kpis, ...ANALYTICS_TABS_REGISTRY['_global'].charts]
    : [];
  const { getChartConfig: getGlobalConfig } = useTabChartsConfig('_global', globalDefaults);

  /** Build tooltip line configs from admin config */
  const tooltipLineConfigs = useMemo(() => {
    const keys = [
      'tooltip-cert-enreg', 'tooltip-contrat-loc', 'tooltip-fiche-parc', 'tooltip-title-req',
      'tooltip-disputes', 'tooltip-mortgages', 'tooltip-mutations', 'tooltip-expertises',
      'tooltip-avg-surface', 'tooltip-avg-building', 'tooltip-avg-height',
    ];
    return keys.map(key => ({
      key,
      visible: isChartVisible(key),
      title: getChartConfig(key)?.custom_title || '',
    }));
  }, [isChartVisible, getChartConfig]);

  const dt = (key: string, fallback: string) => getChartConfig(key)?.custom_title || fallback;

  /** Active profile for the analytics tab — null when on default 'rdc-map' tab */
  const activeProfile: MapTabProfile | null = useMemo(
    () => MAP_TAB_PROFILES[activeAnalyticsTab] || null,
    [activeAnalyticsTab],
  );

  const { provincesData, scopedStats, totalParcels } = useMapIndicators({
    analytics,
    activeProfile,
    selectedProvince,
    selectedVille,
    selectedCommune,
    selectedQuartier,
    selectedTerritoire,
  });
  provincesDataRef.current = provincesData;

  /** Adaptive tiers from real province distribution (quartiles), with static fallback */
  const adaptiveTiers: MapTier[] | null = useMemo(() => {
    if (!activeProfile || !activeProfile.palette) return null;
    const values = provincesData.map(p => p.metricValue ?? 0);
    return computeAdaptiveTiers(values, activeProfile.palette, activeProfile.tiers, activeProfile.adaptiveUnit || '');
  }, [activeProfile, provincesData]);



  /** Paliers choroplèthes — configurables depuis admin */
  const DENSITY_TIERS = useMemo(() => {
    const tierKeys = ['map-tier-1', 'map-tier-2', 'map-tier-3', 'map-tier-4'];
    const defaultTiers = [
      { label: 'Faible', min: 0, max: 30, color: '#bec8d1' },
      { label: 'Modéré', min: 31, max: 100, color: '#f0b90b' },
      { label: 'Élevé', min: 101, max: 500, color: '#e87422' },
      { label: 'Très élevé', min: 501, max: Infinity, color: '#b31942' },
    ];
    return defaultTiers.map((d, i) => {
      const cfg = getChartConfig(tierKeys[i]);
      return {
        ...d,
        label: cfg?.custom_title?.replace(/\s*\(.*\)/, '') || d.label,
        color: cfg?.custom_color || d.color,
      };
    });
  }, [getChartConfig]);

  /** Watermark: map-specific fallback to global */
  const watermarkText = useMemo(() => {
    const mapWm = getChartConfig('map-watermark')?.custom_title;
    const globalWm = getGlobalConfig('global-watermark')?.custom_title;
    return mapWm || globalWm || 'BIC - Tous droits réservés';
  }, [getChartConfig, getGlobalConfig]);
  const formatNumber = (value: number): string => new Intl.NumberFormat('fr-FR').format(value);

  const todayStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });


  /** Label for the detail block header */
  const scopeLabel = useMemo(() => {
    const parts: string[] = [];
    if (selectedQuartier) parts.push(selectedQuartier);
    if (selectedCommune) parts.push(selectedCommune);
    if (selectedVille) parts.push(selectedVille);
    if (selectedTerritoire) parts.push(selectedTerritoire);
    if (selectedProvince) parts.push(selectedProvince.name);
    return parts.join(' — ') || '';
  }, [selectedProvince, selectedVille, selectedCommune, selectedQuartier, selectedTerritoire]);



  // Fullscreen sync
  React.useEffect(() => {
    const handler = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      onFullscreenChange?.(fs);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, [onFullscreenChange]);

  const toggleFullscreen = React.useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        toast.error('Le mode plein écran n\'est pas disponible');
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Keyboard shortcut: F to toggle fullscreen
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'f') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && target.matches('input, textarea, select, [contenteditable="true"]')) return;
      e.preventDefault();
      toggleFullscreen();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleFullscreen]);

  const getMapBlob = useCallback(async (): Promise<Blob> => {
    if (!mapCardRef.current) throw new Error('No map ref');
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(mapCardRef.current, { backgroundColor: null, scale: 2, borderRadius: 12 } as any);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/png');
    });
  }, []);

  /** Choropleth color: profile-driven when an analytics tab is active, else default tiers */
  const getProvinceColor = useCallback((province: ProvinceData) => {
    if (activeProfile) {
      if (province.noData) return NO_DATA_COLOR;
      const v = province.metricValue ?? 0;
      const tiers = adaptiveTiers || activeProfile.tiers;
      const tier = tiers.find(t => v >= t.min && v <= t.max) || tiers[0];
      return tier.color;
    }
    const count = province.parcelsCount;
    const tier = DENSITY_TIERS.find(t => count >= t.min && count <= t.max) || DENSITY_TIERS[0];
    return tier.color;
  }, [activeProfile, adaptiveTiers, DENSITY_TIERS]);

  /** Reset to default RDC map view */
  const resetToDefaultMap = useCallback(() => {
    setForcedTab('rdc-map');
    setActiveAnalyticsTab('rdc-map');
  }, []);

  /** Callback once the forced tab has been applied — clears it to avoid re-trigger loops */
  const handleForcedTabApplied = useCallback(() => {
    setForcedTab(null);
  }, []);

  /** Generic per-entity color factory: re-uses the active profile's metric on a slice
   *  filtered by the chosen geographic level (commune | quartier | territoire). */
  const buildEntityColorFn = useCallback(
    (level: 'commune' | 'quartier' | 'territoire') => {
      if (!activeProfile || !analytics) return undefined;

      const matchPredicate = (name: string) => {
        const n = norm(name);
        return (r: any) => {
          if (level === 'commune') return norm(r.commune) === n && (!selectedVille || norm(r.ville) === norm(selectedVille));
          if (level === 'quartier') return norm(r.quartier) === n && (!selectedCommune || norm(r.commune) === norm(selectedCommune));
          return norm(r.territoire) === n && (!selectedProvince || norm(r.province) === norm(selectedProvince.name));
        };
      };

      return (entityName: string): string | undefined => {
        const pred = matchPredicate(entityName);
        const slicer = <T,>(arr: T[]): T[] => (arr || []).filter(pred as any).map((r: any) => ({ ...r, province: '__entity__' })) as T[];
        const sliced = {
          ...analytics,
          parcels: slicer(analytics.parcels as any),
          contributions: slicer(analytics.contributions as any),
          titleRequests: slicer(analytics.titleRequests as any),
          disputes: slicer(analytics.disputes as any),
          mortgages: slicer((analytics.mortgages || []) as any),
          mutationRequests: slicer(analytics.mutationRequests as any),
          expertiseRequests: slicer(analytics.expertiseRequests as any),
          subdivisionRequests: slicer((analytics as any).subdivisionRequests || []),
          ownershipHistory: slicer((analytics as any).ownershipHistory || []),
          certificates: slicer((analytics as any).certificates || []),
          invoices: slicer((analytics as any).invoices || []),
          buildingPermits: slicer((analytics as any).buildingPermits || []),
          taxHistory: slicer((analytics as any).taxHistory || []),
        } as typeof analytics;

        const v = activeProfile.metric({ analytics: sliced, provinceName: '__entity__' });
        if (v <= 0) return NO_DATA_COLOR;
        const tiers = adaptiveTiers || activeProfile.tiers;
        const tier = tiers.find(t => v >= t.min && v <= t.max) || tiers[0];
        return tier.color;
      };
    },
    [activeProfile, analytics, selectedVille, selectedCommune, selectedProvince, adaptiveTiers],
  );

  const getCommuneColor = useMemo(() => buildEntityColorFn('commune'), [buildEntityColorFn]);
  const getQuartierColor = useMemo(() => buildEntityColorFn('quartier'), [buildEntityColorFn]);
  const getTerritoireColor = useMemo(() => buildEntityColorFn('territoire'), [buildEntityColorFn]);

  /** Whether the current adaptive tiers contain any non-zero data */
  const hasAnyMetricData = useMemo(() => {
    if (!activeProfile) return true;
    return provincesData.some(p => (p.metricValue ?? 0) > 0);
  }, [activeProfile, provincesData]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Chargement des données...</span>
      </div>
    );
  }

  // Fluid iOS-style page indicators driven by dragProgress
  const progressTowardNext = isMobile && isDragging
    ? Math.max(0, Math.min(1, onAnalyticsPanel ? dragProgress : -dragProgress))
    : 0;
  const activeBarW = 16 - progressTowardNext * 10;
  const inactiveBarW = 6 + progressTowardNext * 10;

  return (
    <div ref={pagerRef} className="w-full h-full flex flex-col overflow-hidden relative" style={{ touchAction: isMobile ? 'pan-y' : undefined }}>

        <div className="lg:hidden fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="flex flex-col items-center gap-1.5">
            {/* Pagination bars — fluid stretch driven by dragProgress */}
            <div className="flex items-center gap-1.5" role="tablist" aria-label="Vue active">
              <span
                role="tab"
                aria-selected={!onAnalyticsPanel}
                aria-label="Carte"
                className="h-1.5 rounded-full transition-[width,background-color] duration-150"
                style={{ width: `${onAnalyticsPanel ? inactiveBarW : activeBarW}px`, backgroundColor: onAnalyticsPanel ? 'hsl(var(--muted-foreground) / 0.4)' : 'hsl(var(--primary))' }}
              />
              <span
                role="tab"
                aria-selected={onAnalyticsPanel}
                aria-label="Analytics"
                className="h-1.5 rounded-full transition-[width,background-color] duration-150"
                style={{ width: `${onAnalyticsPanel ? activeBarW : inactiveBarW}px`, backgroundColor: !onAnalyticsPanel ? 'hsl(var(--muted-foreground) / 0.4)' : 'hsl(var(--primary))' }}
              />
            </div>
            <div className="flex items-center justify-center gap-1.5 bg-background/95 backdrop-blur-sm border border-border/50 rounded-full px-2.5 py-1.5 shadow-lg">
              <Button size="sm" variant={activeMobilePanel !== 'analytics' ? 'default' : 'outline'} onClick={() => setActiveMobilePanel('map')} aria-label="Carte & Données" aria-live="polite" className="rounded-full h-7 px-3 text-[10px] gap-1">
                <MapPin className="w-3 h-3" />
                Carte
              </Button>
              <Button size="sm" variant={activeMobilePanel === 'analytics' ? 'default' : 'outline'} onClick={() => setActiveMobilePanel('analytics')} aria-label="Analytics" aria-live="polite" className="rounded-full h-7 px-3 text-[10px] gap-1">
                <BarChart3 className="w-3 h-3" />
                Analytics
              </Button>
            </div>
          </div>
        </div>

        {/* Desktop: grille 2 colonnes | Mobile: track horizontal 200% piloté par CSS var pour 60fps */}
        <div className="flex-1 min-h-0 overflow-hidden p-1 sm:p-2 pb-14 lg:pb-2">
          <div
            ref={trackRef}
            style={isMobile ? {
              width: '200%',
              transform: `translate3d(calc(${onAnalyticsPanel ? '-50%' : '0%'} + var(--pager-drag-x, 0px) + var(--pager-teaser, 0px)), 0, 0)`,
              transition: isDragging ? 'none' : 'transform 320ms cubic-bezier(.22,.61,.36,1)',
              willChange: 'transform',
            } : undefined}
            className="h-full flex flex-row lg:w-auto lg:grid lg:grid-cols-12 gap-1 sm:gap-2"
          >

          {/* Colonne gauche: Carte + Détails province */}
          <div
            className="w-1/2 lg:w-auto shrink-0 lg:shrink lg:col-span-4 flex flex-col min-h-0 h-full gap-1 sm:gap-2"
          >
            
            {/* Carte RDC */}
            <div className={`flex flex-col min-h-0 transition-all duration-300 w-full ${selectedProvince ? 'h-1/2 lg:h-auto' : 'h-full lg:h-auto'} lg:flex-[3]`}>
              <Card ref={mapCardRef} className="analytics-panel border-0 flex-1 overflow-hidden flex flex-col">
                <CardContent className="p-0 flex-1 flex flex-col relative min-h-0">
                  <div className="bg-muted/20 px-2 py-0.5 border-b border-border/30 flex-shrink-0">
                    <h2
                      ref={mapTitleRef}
                      tabIndex={-1}
                      className="text-[10px] sm:text-xs font-medium text-foreground flex items-center gap-1 outline-none"
                    >
                      <MapPin className="h-3 w-3 text-primary" />
                      <span>{selectedTerritoire ? `${selectedTerritoire} — ${selectedProvince?.name || ''}` : selectedSectionType === 'rurale' && selectedProvince ? `Territoires — ${selectedProvince.name}` : selectedSectionType === 'rurale' ? 'Territoires — RDC' : selectedVille ? `${selectedVille}${selectedCommune ? ` — ${selectedCommune}` : ''}${selectedQuartier ? ` — ${selectedQuartier}` : ''}` : selectedProvince ? `${activeProfile ? `${activeProfile.label} — ` : ''}${selectedProvince.name}` : activeProfile ? `${activeProfile.label} — République Démocratique du Congo` : 'République Démocratique du Congo'}</span>
                    </h2>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      {selectedTerritoire
                        ? `Découpe du territoire de ${selectedTerritoire} — ${selectedProvince?.name || ''}`
                        : selectedSectionType === 'rurale' && selectedProvince
                        ? `Territoires de la province de ${selectedProvince.name}`
                        : selectedSectionType === 'rurale'
                        ? 'Carte des 164 territoires de la RDC'
                        : selectedVille && selectedCommune
                        ? `Découpage des quartiers de la commune de ${selectedCommune} — ${selectedVille}${selectedVille.toLowerCase() !== 'goma' ? ' (source OSM/HDX)' : ''}`
                        : selectedVille
                        ? `Découpage communal de la ville de ${selectedVille}`
                        : selectedProvince
                        ? `Données foncières cadastrales de ${selectedProvince.name} — Total : ${formatNumber(selectedProvince.parcelsCount)} parcelles enregistrées`
                        : `${getChartConfig('map-header-note')?.custom_title || 'Répartition géographique des données foncières cadastrales'} — Total : ${formatNumber(totalParcels)} parcelles enregistrées`
                      }
                    </p>
                  </div>
                  
                   <div className="flex-1 min-h-0 overflow-hidden flex items-center justify-center p-1">
                    {selectedSectionType === 'rurale' || (selectedTerritoire && selectedProvince) ? (
                      <div key="territoires" className="w-full h-full animate-scale-in">
                        <DRCTerritoiresMap
                          province={selectedProvince?.name}
                          territoire={selectedTerritoire}
                          showAll={!selectedProvince}
                          territoireNames={selectedProvince ? getTerritoiresForProvince(selectedProvince.name) : undefined}
                          getEntityColor={getTerritoireColor}
                          profileLabel={activeProfile?.legendTitle}
                          onTerritoireSelect={(name) => {
                            // Toggle: re-clicking selected territoire dezooms
                            if (selectedTerritoire && selectedTerritoire.toLowerCase() === name.toLowerCase()) {
                              setSelectedTerritoire(undefined);
                              return;
                            }
                            if (!selectedProvince) {
                              const provinceName = getProvinceForTerritoire(name);
                              if (provinceName) {
                                const province = provincesData.find(p => p.name === provinceName);
                                if (province) {
                                  setSelectedProvince(province);
                                  setExternalProvinceId(province.id);
                                }
                              }
                            }
                            setSelectedTerritoire(name);
                            setSelectedSectionType('rurale');
                          }}
                        />
                      </div>
                    ) : selectedVille && selectedCommune ? (
                      <div key={`quartiers-${selectedVille}`} className="w-full h-full animate-scale-in">
                        <DRCQuartiersMap
                          ville={selectedVille}
                          commune={selectedCommune}
                          quartier={selectedQuartier}
                          dataSource={selectedVille.toLowerCase() === 'goma' ? 'goma' : 'national'}
                          onQuartierSelect={(name) => {
                            // Toggle: re-clicking selected quartier dezooms
                            setSelectedQuartier(prev => (prev && prev.toLowerCase() === name.toLowerCase()) ? undefined : name);
                          }}
                          getEntityColor={getQuartierColor}
                          profileLabel={activeProfile?.legendTitle}
                        />
                      </div>
                    ) : selectedVille ? (
                      <div key="communes" className="w-full h-full animate-scale-in">
                        <DRCCommunesMap
                          ville={selectedVille}
                          commune={selectedCommune}
                          onCommuneSelect={(name) => {
                            // Toggle: re-clicking selected commune dezooms
                            setSelectedCommune(prev => (prev && prev.toLowerCase() === name.toLowerCase()) ? undefined : name);
                          }}
                          getEntityColor={getCommuneColor}
                          profileLabel={activeProfile?.legendTitle}
                        />
                      </div>
                    ) : (
                      <div key="provinces" className="w-full h-full flex items-center justify-center animate-fade-in" style={{ transform: 'scale(0.9)', transformOrigin: 'center center' }}>
                        <DRCMapWithTooltip
                          provincesData={provincesData}
                          selectedProvince={selectedProvince?.id || null}
                          externalZoomProvinceId={externalProvinceId}
                          onProvinceSelect={setSelectedProvince}
                          onProvinceHover={setHoveredProvince}
                          hoveredProvince={hoveredProvince}
                          getProvinceColor={getProvinceColor}
                          onMapReady={setMapInstance}
                          tooltipLineConfigs={tooltipLineConfigs}
                          onZoomChange={(zoomed) => { setIsMapZoomed(zoomed); if (!zoomed) setExternalProvinceId(null); }}
                          onProvinceDeselect={() => setSelectedProvince(null)}
                        />
                      </div>
                    )}
                  </div>
                  {/* Légende contextuelle — scope dynamique (profil ou défaut) */}
                  {selectedProvince && (activeProfile || scopedStats) && (() => {
                    let profileLines: { label: string; value: string; color?: string }[] | undefined;
                    if (activeProfile && analytics) {
                      const predicate = buildScopePredicate(selectedProvince.name, selectedVille, selectedCommune, selectedQuartier, selectedTerritoire);
                      const sliceArr = <T,>(arr: T[]): T[] => (arr || []).filter(predicate as any).map((r: any) => ({ ...r, province: selectedProvince.name })) as T[];
                      const scopedAnalytics = {
                        ...analytics,
                        parcels: sliceArr(analytics.parcels as any),
                        contributions: sliceArr(analytics.contributions as any),
                        titleRequests: sliceArr(analytics.titleRequests as any),
                        disputes: sliceArr(analytics.disputes as any),
                        mortgages: sliceArr((analytics.mortgages || []) as any),
                        mutationRequests: sliceArr(analytics.mutationRequests as any),
                        expertiseRequests: sliceArr(analytics.expertiseRequests as any),
                        subdivisionRequests: sliceArr((analytics as any).subdivisionRequests || []),
                        ownershipHistory: sliceArr((analytics as any).ownershipHistory || []),
                        certificates: sliceArr((analytics as any).certificates || []),
                        invoices: sliceArr((analytics as any).invoices || []),
                        buildingPermits: sliceArr((analytics as any).buildingPermits || []),
                        taxHistory: sliceArr((analytics as any).taxHistory || []),
                      } as typeof analytics;
                      const ctx = { analytics: scopedAnalytics, provinceName: selectedProvince.name };
                      profileLines = activeProfile.legendStats?.(ctx) ?? activeProfile.tooltipLines(ctx).slice(0, 4);
                    }
                    return (
                      <MapScopeLegend
                        scopeLabel={scopeLabel}
                        profileLines={profileLines}
                        fallbackStats={scopedStats ? {
                          certEnregCount: scopedStats.certEnregCount,
                          titleRequestsCount: scopedStats.titleRequestsCount,
                          disputesCount: scopedStats.disputesCount,
                          avgParcelSurfaceSqm: scopedStats.avgParcelSurfaceSqm,
                        } : undefined}
                        formatNumber={formatNumber}
                      />
                    );
                  })()}

                  {/* Pied de carte : date + copyright */}
                  <div className="absolute bottom-0 left-0 right-0 z-10 text-center py-0.5 flex items-center justify-center gap-0.5">
                    <span className="text-[10px] text-muted-foreground">{todayStr} — {watermarkText}</span>
                    {brandingConfig?.logo_url && <img src={String(brandingConfig.logo_url)} alt="" className="h-3 w-3 inline-block object-contain" />}
                  </div>

                  {/* Mini-légende choroplèthe par profil — visible quand un onglet métier est actif */}
                  {activeProfile && (
                    <MapLegend
                      activeProfile={activeProfile}
                      adaptiveTiers={adaptiveTiers}
                      hasAnyMetricData={hasAnyMetricData}
                    />
                  )}

                  <div className="absolute bottom-5 right-2 z-10 flex gap-1">
                    {/* Bouton réinitialiser à la vue par défaut — visible uniquement si profil métier actif */}
                    {activeProfile && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6 rounded-full bg-background/80 backdrop-blur-sm border-border/50 shadow-sm"
                        onClick={resetToDefaultMap}
                        title="Revenir à la vue cartographique par défaut"
                        aria-label="Revenir à la vue cartographique par défaut"
                      >
                        <RotateCcw className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    )}
                    {/* Bouton partager (image carte) — configurable */}
                    {isChartVisible('map-copy-button') && (
                      <ShareButton
                        getBlob={getMapBlob}
                        title={`Carte RDC — ${activeProfile?.tabKey || 'vue par défaut'}`}
                        variant="map"
                      />
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6 rounded-full bg-background/80 backdrop-blur-sm border-border/50 shadow-sm"
                      onClick={toggleFullscreen}
                      title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
                    >
                      {isFullscreen ? <Minimize className="h-3 w-3 text-muted-foreground" /> : <Maximize className="h-3 w-3 text-muted-foreground" />}
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="h-6 w-6 rounded-full bg-background/80 backdrop-blur-sm border-border/50 shadow-sm">
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent side="top" align="end" className="w-64 p-2 text-[10px]">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1">
                            <Info className="h-3 w-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            <span className="text-blue-700 dark:text-blue-300">
                              Données calculées depuis Supabase{activeProfile?.dataSource ? ` — table ${activeProfile.dataSource}` : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                            <span className="text-emerald-700 dark:text-emerald-300">
                              Couleur = {activeProfile ? activeProfile.legendTitle.toLowerCase() : 'densité de parcelles'}
                            </span>
                          </div>
                          {activeProfile && adaptiveTiers && (
                            <div className="flex items-center gap-1">
                              <BarChart3 className="h-3 w-3 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                              <span className="text-violet-700 dark:text-violet-300">Paliers calculés par quartiles (Q1/Q2/Q3)</span>
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Données géographiques — scoped stats */}
            <div className={`${activeMobilePanel === 'analytics' ? 'hidden lg:block' : selectedProvince ? 'h-1/2' : 'hidden lg:block'} lg:h-auto lg:flex-[2] min-h-0 overflow-hidden transition-all duration-300 w-full`}>
              <Card className="analytics-panel border-0 h-full flex flex-col overflow-hidden">
                <ScrollArea className="flex-1">
                  {selectedProvince && scopedStats ? (
                    <MapKPICards
                      scopeLabel={scopeLabel}
                      scopedStats={scopedStats}
                      isChartVisible={isChartVisible}
                      dt={dt}
                      formatNumber={formatNumber}
                      onClose={() => { setSelectedProvince(null); setSelectedVille(undefined); setSelectedCommune(undefined); setSelectedQuartier(undefined); }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full p-4">
                      <p className="text-[10px] text-muted-foreground text-center">Cliquez sur une province</p>
                    </div>
                  )}
                </ScrollArea>
              </Card>
            </div>
          </div>

          {/* Colonne droite: Analytics */}
          <div
            ref={analyticsColRef}
            className="w-1/2 lg:w-auto shrink-0 lg:shrink lg:col-span-8 flex flex-col min-h-0 h-full"
          >
            <Card className="flex-1 flex flex-col overflow-hidden border-border/30 min-h-0">
              <CardHeader className="px-2 py-1 border-b border-border/20 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[11px] sm:text-xs font-medium text-foreground flex items-center gap-1">
                    <BarChart3 className="h-3.5 w-3.5 text-primary" />
                    <span ref={analyticsTitleRef} tabIndex={-1} className="outline-none">Analytics</span>
                  </CardTitle>
                  {dataUpdatedAt > 0 && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 gap-0.5 font-normal text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      Maj {new Date(dataUpdatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden charts-compact text-[10px] min-h-0">
                <div className="h-full p-1.5 sm:p-2">
                <ProvinceDataVisualization 
                    analytics={analytics!}
                    selectedProvince={selectedProvince}
                    onProvinceFilter={handleProvinceFilter}
                    onVilleChange={setSelectedVille}
                    onCommuneChange={setSelectedCommune}
                    onQuartierChange={setSelectedQuartier}
                    onTerritoireChange={setSelectedTerritoire}
                    onSectionTypeChange={setSelectedSectionType}
                    onActiveTabChange={setActiveAnalyticsTab}
                    selectedVille={selectedVille}
                    selectedCommune={selectedCommune}
                    selectedQuartier={selectedQuartier}
                    selectedTerritoire={selectedTerritoire}
                    selectedSectionType={selectedSectionType}
                    initialTab={activeAnalyticsTab}
                    forcedTab={forcedTab}
                    onForcedTabApplied={handleForcedTabApplied}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          </div>
        </div>
    </div>
  );
};


export default DRCInteractiveMap;
