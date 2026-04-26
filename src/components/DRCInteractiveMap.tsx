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
import { norm, buildScopePredicate, sliceAnalyticsByPredicate, type GeoScopedRecord } from './map/meta/mapMeta';
import { useMapDrilldown } from './map/hooks/useMapDrilldown';
import { useMapIndicators } from './map/hooks/useMapIndicators';
import { useMapFullscreen } from './map/hooks/useMapFullscreen';
import { useMobilePagerEffects } from './map/hooks/useMobilePagerEffects';
import { MapLegend } from './map/ui/MapLegend';
import { MapScopeLegend } from './map/ui/MapScopeLegend';
import { MapKPICards } from './map/ui/MapKPICards';
import { MapMobilePager } from './map/ui/MapMobilePager';
import { useMapProjection } from './map/context/MapProjectionContext';
import { normalizeProvinceName } from '@/lib/provinceNameNormalize';
import { Sparkles, X } from 'lucide-react';




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
  const [mapInstance, setMapInstance] = useState<unknown>(null);
  const [activeMobilePanel, setActiveMobilePanel] = useState<'map' | 'analytics'>('map');
  const [isMapZoomed, setIsMapZoomed] = useState(false);

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

  useMobilePagerEffects({
    isMobile,
    onAnalyticsPanel,
    prefersReducedMotion,
    trackRef,
    analyticsColRef,
    analyticsTitleRef,
    mapTitleRef,
    activeMobilePanel,
  });


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

  // ── Projection issue d'un visuel analytics (override doux du profil) ──
  const { projection, scope, setScope, clearProjection } = useMapProjection();

  // Auto-reset de la projection quand l'utilisateur change d'onglet analytics
  React.useEffect(() => {
    if (projection && projection.sourceTab !== activeAnalyticsTab) {
      clearProjection();
    }
  }, [activeAnalyticsTab, projection, clearProjection]);

  /** Palette par défaut pour les tiers de projection (HSL semantic-aware) */
  const PROJECTION_PALETTE: [string, string, string, string] = useMemo(
    () => [
      'hsl(var(--muted))',
      'hsl(var(--primary) / 0.35)',
      'hsl(var(--primary) / 0.65)',
      'hsl(var(--primary))',
    ],
    [],
  );

  /** Dataset effectivement projeté selon le scope choisi (filtré ou global) */
  const projectionData = useMemo(() => {
    if (!projection) return null;
    return scope === 'global' && projection.byProvinceGlobal
      ? projection.byProvinceGlobal
      : projection.byProvince;
  }, [projection, scope]);

  /** Tiers adaptatifs construits depuis la projection visuelle (si active) */
  const projectionTiers: MapTier[] | null = useMemo(() => {
    if (!projection || !projectionData) return null;
    const values = Object.values(projectionData).filter(v => Number.isFinite(v));
    const fallback: MapTier[] = [
      { label: '0', min: 0, max: 0, color: 'hsl(var(--muted))' },
      { label: '1+', min: 1, max: Infinity, color: 'hsl(var(--primary))' },
    ];
    return computeAdaptiveTiers(values, projection.palette || PROJECTION_PALETTE, fallback, projection.unit || '');
  }, [projection, projectionData, PROJECTION_PALETTE]);



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



  // Fullscreen: state, toggle, keyboard shortcut (F)
  const { isFullscreen, toggleFullscreen } = useMapFullscreen(onFullscreenChange);

  const getMapBlob = useCallback(async (): Promise<Blob> => {
    if (!mapCardRef.current) throw new Error('No map ref');
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(mapCardRef.current, { backgroundColor: null, scale: 2 });
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/png');
    });
  }, []);

  /** Choropleth color: projection > profile > default density tiers */
  const getProvinceColor = useCallback((province: ProvinceData) => {
    if (projection && projectionTiers) {
      const key = normalizeProvinceName(province.name);
      const v = projection.byProvince[key] ?? 0;
      if (v <= 0) return NO_DATA_COLOR;
      const tier = projectionTiers.find(t => v >= t.min && v <= t.max) || projectionTiers[0];
      return tier.color;
    }
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
  }, [projection, projectionTiers, activeProfile, adaptiveTiers, DENSITY_TIERS]);

  /** Avertir l'utilisateur si la projection n'a aucune province reconnue par la carte */
  React.useEffect(() => {
    if (!projection || !provincesData.length) return;
    const matched = provincesData.some(p => (projection.byProvince[normalizeProvinceName(p.name)] ?? 0) > 0);
    if (!matched) {
      toast.warning('Aucune province reconnue dans ce visuel', {
        description: 'Les noms de provinces des données ne correspondent pas à la carte.',
        duration: 3500,
      });
    }
  }, [projection, provincesData]);

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

      const matchPredicate = (name: string): ((r: GeoScopedRecord) => boolean) => {
        const n = norm(name);
        return (r) => {
          if (level === 'commune') return norm(r.commune) === n && (!selectedVille || norm(r.ville) === norm(selectedVille));
          if (level === 'quartier') return norm(r.quartier) === n && (!selectedCommune || norm(r.commune) === norm(selectedCommune));
          return norm(r.territoire) === n && (!selectedProvince || norm(r.province) === norm(selectedProvince.name));
        };
      };

      return (entityName: string): string | undefined => {
        const sliced = sliceAnalyticsByPredicate(analytics, matchPredicate(entityName), '__entity__');
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

  return (
    <div ref={pagerRef} className="w-full h-full flex flex-col overflow-hidden relative" style={{ touchAction: isMobile ? 'pan-y' : undefined }}>

        <MapMobilePager
          activeMobilePanel={activeMobilePanel}
          setActiveMobilePanel={setActiveMobilePanel}
          isDragging={isDragging}
          isMobile={isMobile}
          dragProgress={dragProgress}
        />

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

                  {/* Bandeau « Mode visuel » — affiché quand un graphique projette ses données */}
                  {projection && (
                    <div className="flex items-center justify-between gap-2 px-2 py-1 bg-primary/10 border-b border-primary/30 animate-fade-in">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Sparkles className="h-3 w-3 text-primary shrink-0" />
                        <span className="text-[10px] sm:text-[11px] text-primary font-medium truncate">
                          Mode visuel : {projection.label}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={clearProjection}
                        className="shrink-0 h-5 w-5 inline-flex items-center justify-center rounded-full hover:bg-primary/20 text-primary transition-colors"
                        aria-label="Quitter le mode visuel"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}

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
                      const scopedAnalytics = sliceAnalyticsByPredicate(analytics, predicate, selectedProvince.name);
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

                  {/* Mini-légende choroplèthe — projection prioritaire, sinon profil */}
                  {projection && projectionTiers ? (
                    <MapLegend
                      activeProfile={{
                        tabKey: 'projection',
                        label: projection.label,
                        legendTitle: projection.label,
                        tiers: projectionTiers,
                        dataSource: projection.dataSource,
                        metric: () => 0,
                        tooltipLines: () => [],
                      } as MapTabProfile}
                      adaptiveTiers={projectionTiers}
                      hasAnyMetricData={Object.values(projection.byProvince).some(v => v > 0)}
                    />
                  ) : activeProfile && (
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
