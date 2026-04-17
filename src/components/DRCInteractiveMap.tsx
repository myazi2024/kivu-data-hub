import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppAppearance } from '@/hooks/useAppAppearance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MapPin, BarChart3, Info, Database, Loader2, Copy, Check, Maximize, Minimize, Clock } from 'lucide-react';
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
import { MAP_TAB_PROFILES, type MapTabProfile } from '@/config/mapTabProfiles';

/** Province IDs and names for the 26 provinces */
const PROVINCE_META: { id: string; name: string }[] = [
  { id: 'CDKN', name: 'Kinshasa' },
  { id: 'CDNK', name: 'Nord-Kivu' },
  { id: 'CDSK', name: 'Sud-Kivu' },
  { id: 'CDBC', name: 'Kongo-Central' },
  { id: 'CDHK', name: 'Haut-Katanga' },
  { id: 'CDLU', name: 'Lualaba' },
  { id: 'CDKC', name: 'Kasaï-Central' },
  { id: 'CDKS', name: 'Kasaï' },
  { id: 'CDKE', name: 'Kasaï-Oriental' },
  { id: 'CDSA', name: 'Sankuru' },
  { id: 'CDLO', name: 'Lomami' },
  { id: 'CDMA', name: 'Maniema' },
  { id: 'CDTO', name: 'Tshopo' },
  { id: 'CDIT', name: 'Ituri' },
  { id: 'CDHU', name: 'Haut-Uele' },
  { id: 'CDBU', name: 'Bas-Uele' },
  { id: 'CDMO', name: 'Mongala' },
  { id: 'CDSU', name: 'Sud-Ubangi' },
  { id: 'CDNU', name: 'Nord-Ubangi' },
  { id: 'CDTU', name: 'Tshuapa' },
  { id: 'CDMN', name: 'Mai-Ndombe' },
  { id: 'CDKL', name: 'Kwilu' },
  { id: 'CDKG', name: 'Kwango' },
  { id: 'CDTA', name: 'Tanganyika' },
  { id: 'CDHL', name: 'Haut-Lomami' },
  { id: 'CDEQ', name: 'Équateur' },
];


/** Compute the 11 new indicators from filtered record sets */
function computeIndicators(
  parcels: any[],
  titleRequests: any[],
  disputes: any[],
  mortgages: any[],
  mutationRequests: any[],
  expertiseRequests: any[],
  contributions: any[],
) {
  const certEnreg = parcels.filter(p => normalizeTitleType(p.property_title_type) === "Certificat d'enregistrement").length;
  const contratLoc = parcels.filter(p => normalizeTitleType(p.property_title_type) === "Contrat de location (Contrat d'occupation provisoire)").length;
  const ficheParc = parcels.filter(p => normalizeTitleType(p.property_title_type) === "Fiche parcellaire").length;

  const activeMortgages = mortgages.filter((m: any) => m.mortgage_status === 'active').length;
  const pendingMutations = mutationRequests.filter((m: any) => m.status === 'pending' || m.status === 'en_cours').length;
  const pendingExpertises = expertiseRequests.filter((e: any) => e.status === 'pending' || e.status === 'en_cours').length;

  const totalArea = parcels.reduce((s: number, p: any) => s + (p.area_sqm || 0), 0);
  const avgSurface = parcels.length > 0 ? totalArea / parcels.length : 0;

  let buildingSurfaceSum = 0, buildingSurfaceCount = 0;
  let buildingHeightSum = 0, buildingHeightCount = 0;
  contributions.forEach((c: any) => {
    const shapes = Array.isArray(c.building_shapes) ? c.building_shapes : [];
    shapes.forEach((s: any) => {
      const area = s.areaSqm || (s.width && s.height ? s.width * s.height : 0);
      if (area > 0) { buildingSurfaceSum += area; buildingSurfaceCount++; }
      if (s.heightM > 0) { buildingHeightSum += s.heightM; buildingHeightCount++; }
    });
  });

  return {
    certEnregCount: certEnreg,
    contratLocCount: contratLoc,
    ficheParcCount: ficheParc,
    titleRequestsCount: titleRequests.length,
    disputesCount: disputes.length,
    activeMortgagesCount: activeMortgages,
    pendingMutationsCount: pendingMutations,
    pendingExpertisesCount: pendingExpertises,
    avgParcelSurfaceSqm: Math.round(avgSurface * 10) / 10,
    avgBuildingSurfaceSqm: buildingSurfaceCount > 0 ? Math.round((buildingSurfaceSum / buildingSurfaceCount) * 10) / 10 : 0,
    avgBuildingHeightM: buildingHeightCount > 0 ? Math.round((buildingHeightSum / buildingHeightCount) * 10) / 10 : 0,
    parcelsCount: parcels.length,
  };
}

/** Normalize string for comparison */
const norm = (s?: string | null) => (s || '').trim().toLowerCase();

/** Build a filter predicate based on the most specific geo scope */
function buildScopePredicate(
  province?: string,
  ville?: string,
  commune?: string,
  quartier?: string,
  territoire?: string,
): (record: any) => boolean {
  if (quartier) return (r) => norm(r.quartier) === norm(quartier) && norm(r.commune) === norm(commune) && norm(r.ville) === norm(ville) && norm(r.province) === norm(province);
  if (commune) return (r) => norm(r.commune) === norm(commune) && norm(r.ville) === norm(ville) && norm(r.province) === norm(province);
  if (ville) return (r) => norm(r.ville) === norm(ville) && norm(r.province) === norm(province);
  if (territoire && province) return (r) => norm(r.territoire) === norm(territoire) && norm(r.province) === norm(province);
  if (territoire) return (r) => norm(r.territoire) === norm(territoire);
  if (province) return (r) => norm(r.province) === norm(province);
  return () => false;
}

interface DRCInteractiveMapProps {
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

const DRCInteractiveMap = ({ onFullscreenChange }: DRCInteractiveMapProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedProvince, setSelectedProvince] = useState<ProvinceData | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [activeMobilePanel, setActiveMobilePanel] = useState<'map' | 'details' | 'analytics'>('map');
  const [isMapZoomed, setIsMapZoomed] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [externalProvinceId, setExternalProvinceId] = useState<string | null>(null);
  const [selectedVille, setSelectedVille] = useState<string | undefined>(() => searchParams.get('ville') || undefined);
  const [selectedCommune, setSelectedCommune] = useState<string | undefined>(() => searchParams.get('commune') || undefined);
  const [selectedQuartier, setSelectedQuartier] = useState<string | undefined>(() => searchParams.get('quartier') || undefined);
  const [selectedTerritoire, setSelectedTerritoire] = useState<string | undefined>(() => searchParams.get('territoire') || undefined);
  const [selectedSectionType, setSelectedSectionType] = useState<string>(() => searchParams.get('section') || 'all');
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<string>('rdc-map');
  const mapCardRef = React.useRef<HTMLDivElement>(null);
  const urlInitRef = React.useRef(false);

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

  /** Build province data from real Supabase analytics. When a profile is active,
   *  inject the profile-driven metricValue and extraTooltipLines on each province. */
  const provincesData: ProvinceData[] = useMemo(() => {
    if (!analytics) return PROVINCE_META.map(p => buildEmptyProvince(p));

    const { parcels, titleRequests, contributions, disputes, mutationRequests, expertiseRequests, mortgages } = analytics;

    return PROVINCE_META.map(meta => {
      const pFilter = (r: any) => r.province === meta.name;
      const indicators = computeIndicators(
        parcels.filter(pFilter),
        titleRequests.filter(pFilter),
        disputes.filter(pFilter),
        (mortgages || []).filter(pFilter),
        mutationRequests.filter(pFilter),
        expertiseRequests.filter(pFilter),
        contributions.filter(pFilter),
      );

      const base: ProvinceData = { id: meta.id, name: meta.name, ...indicators };

      if (activeProfile) {
        const ctx = { analytics, provinceName: meta.name };
        base.metricValue = activeProfile.metric(ctx);
        base.extraTooltipLines = activeProfile.tooltipLines(ctx);
      }
      return base;
    });
  }, [analytics, activeProfile]);

  // ── URL → State: initialize province from URL on first load ──
  useEffect(() => {
    if (urlInitRef.current || provincesData.length === 0) return;
    urlInitRef.current = true;
    const pName = searchParams.get('province');
    if (pName) {
      const normalize = (s: string) => s.toLowerCase().replace(/[-\s]/g, '');
      const province = provincesData.find(p => normalize(p.name) === normalize(pName));
      if (province) {
        setSelectedProvince(province);
        setExternalProvinceId(province.id);
      }
    }
  }, [provincesData, searchParams]);

  // ── State → URL: sync filters to URL params ──
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedProvince) params.set('province', selectedProvince.name);
    if (selectedVille) params.set('ville', selectedVille);
    if (selectedCommune) params.set('commune', selectedCommune);
    if (selectedQuartier) params.set('quartier', selectedQuartier);
    if (selectedTerritoire) params.set('territoire', selectedTerritoire);
    if (selectedSectionType !== 'all') params.set('section', selectedSectionType);
    setSearchParams(params, { replace: true });
  }, [selectedProvince, selectedVille, selectedCommune, selectedQuartier, selectedTerritoire, selectedSectionType]);

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

  const totalParcels = useMemo(() => provincesData.reduce((s, p) => s + p.parcelsCount, 0), [provincesData]);
  const todayStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  /** Scoped stats: recalculate KPIs based on the most specific geographic filter */
  const scopedStats = useMemo(() => {
    if (!analytics || !selectedProvince) return null;
    const predicate = buildScopePredicate(selectedProvince.name, selectedVille, selectedCommune, selectedQuartier, selectedTerritoire);
    const { parcels, titleRequests, contributions, disputes, mutationRequests, expertiseRequests, mortgages } = analytics;

    return computeIndicators(
      parcels.filter(predicate),
      titleRequests.filter(predicate),
      disputes.filter(predicate),
      (mortgages || []).filter(predicate),
      mutationRequests.filter(predicate),
      expertiseRequests.filter(predicate),
      contributions.filter(predicate),
    );
  }, [analytics, selectedProvince, selectedVille, selectedCommune, selectedQuartier, selectedTerritoire]);

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

  /** Handle province filter from Analytics → zoom map */
  const handleProvinceFilter = React.useCallback((provinceName: string | undefined) => {
    if (!provinceName) {
      setSelectedProvince(null);
      setExternalProvinceId(null);
      setSelectedVille(undefined);
      setSelectedCommune(undefined);
      setSelectedQuartier(undefined);
      setSelectedTerritoire(undefined);
      return;
    }
    const normalize = (s: string) => s.toLowerCase().replace(/[-\s]/g, '');
    const province = provincesData.find(p => normalize(p.name) === normalize(provinceName));
    if (province) {
      setSelectedProvince(province);
      setExternalProvinceId(province.id);
      setSelectedVille(undefined);
      setSelectedCommune(undefined);
      setSelectedQuartier(undefined);
      setSelectedTerritoire(undefined);
    }
  }, [provincesData]);

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

  const handleCopyImage = async () => {
    if (!mapCardRef.current || isCopying) return;
    setIsCopying(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(mapCardRef.current, { backgroundColor: null, scale: 2, borderRadius: 12 } as any);
      canvas.toBlob(async (blob) => {
        if (blob) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          toast.success('Image copiée dans le presse-papier');
        }
        setIsCopying(false);
      }, 'image/png');
    } catch {
      toast.error('Impossible de copier l\'image');
      setIsCopying(false);
    }
  };

  /** Choropleth color: profile-driven when an analytics tab is active, else default tiers */
  const getProvinceColor = (province: ProvinceData) => {
    if (activeProfile) {
      const v = province.metricValue ?? 0;
      const tier = activeProfile.tiers.find(t => v >= t.min && v <= t.max) || activeProfile.tiers[0];
      return tier.color;
    }
    const count = province.parcelsCount;
    const tier = DENSITY_TIERS.find(t => count >= t.min && count <= t.max) || DENSITY_TIERS[0];
    return tier.color;
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Chargement des données...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative">
        {/* Contrôle mobile: bascule Analytics */}
        <div className="lg:hidden fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="flex items-center justify-center gap-1.5 bg-background/95 backdrop-blur-sm border border-border/50 rounded-full px-2.5 py-1.5 shadow-lg">
            <Button size="sm" variant={activeMobilePanel !== 'analytics' ? 'default' : 'outline'} onClick={() => setActiveMobilePanel('map')} aria-label="Carte & Données" className="rounded-full h-7 px-3 text-[10px] gap-1">
              <MapPin className="w-3 h-3" />
              Carte
            </Button>
            <Button size="sm" variant={activeMobilePanel === 'analytics' ? 'default' : 'outline'} onClick={() => setActiveMobilePanel('analytics')} aria-label="Analytics" className="rounded-full h-7 px-3 text-[10px] gap-1">
              <BarChart3 className="w-3 h-3" />
              Analytics
            </Button>
          </div>
        </div>

        {/* Desktop: grille 2 colonnes | Mobile: 2 panneaux côte à côte */}
        <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-12 gap-1 sm:gap-2 p-1 sm:p-2 pb-14 lg:pb-2">
          
          {/* Colonne gauche: Carte + Détails province */}
          <div className={`${activeMobilePanel === 'analytics' ? 'hidden lg:flex' : 'flex'} lg:col-span-4 flex-col min-h-0 h-full gap-1 sm:gap-2`}>
            
            {/* Carte RDC */}
            <div className={`flex flex-col min-h-0 transition-all duration-300 w-full ${selectedProvince ? 'h-1/2 lg:h-auto' : 'h-full lg:h-auto'} lg:flex-[3]`}>
              <Card ref={mapCardRef} className="analytics-panel border-0 flex-1 overflow-hidden flex flex-col">
                <CardContent className="p-0 flex-1 flex flex-col relative min-h-0">
                  <div className="bg-muted/20 px-2 py-0.5 border-b border-border/30 flex-shrink-0">
                    <h2 className="text-[10px] sm:text-xs font-medium text-foreground flex items-center gap-1">
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
                        : selectedVille && selectedCommune && selectedVille.toLowerCase() === 'goma'
                        ? `Découpage des quartiers de la commune de ${selectedCommune} — ${selectedVille}`
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
                      <div key="territoires" className="w-full h-full animate-fade-in">
                        <DRCTerritoiresMap
                          province={selectedProvince?.name}
                          territoire={selectedTerritoire}
                          showAll={!selectedProvince}
                          territoireNames={selectedProvince ? getTerritoiresForProvince(selectedProvince.name) : undefined}
                          onTerritoireSelect={(name) => {
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
                    ) : selectedVille && selectedCommune && selectedVille.toLowerCase() === 'goma' ? (
                      <div key="quartiers" className="w-full h-full animate-fade-in">
                        <DRCQuartiersMap ville={selectedVille} commune={selectedCommune} quartier={selectedQuartier} onQuartierSelect={setSelectedQuartier} />
                      </div>
                    ) : selectedVille ? (
                      <div key="communes" className="w-full h-full animate-fade-in">
                        <DRCCommunesMap ville={selectedVille} commune={selectedCommune} onCommuneSelect={setSelectedCommune} />
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
                  {selectedProvince && (activeProfile || scopedStats) && (
                    <div className="absolute bottom-5 left-2 z-10 bg-background/80 backdrop-blur-sm rounded px-1.5 py-1 border border-border/30 animate-fade-in max-w-[140px]">
                      <div className="text-[10px] font-medium text-foreground mb-0.5 truncate">{scopeLabel}</div>
                      <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
                        {activeProfile && analytics
                          ? (activeProfile.legendStats?.({ analytics, provinceName: selectedProvince.name })
                              ?? activeProfile.tooltipLines({ analytics, provinceName: selectedProvince.name }).slice(0, 4)
                            ).map((s, i) => (
                              <div key={i} className="flex justify-between gap-2">
                                <span className="truncate">{s.label}</span>
                                <span className={`font-medium ${s.color || 'text-foreground'}`}>{s.value}</span>
                              </div>
                            ))
                          : (
                            <>
                              <div className="flex justify-between gap-2"><span>Certif. enreg.</span><span className="font-medium text-foreground">{formatNumber(scopedStats!.certEnregCount)}</span></div>
                              <div className="flex justify-between gap-2"><span>Titres dem.</span><span className="font-medium text-foreground">{formatNumber(scopedStats!.titleRequestsCount)}</span></div>
                              <div className="flex justify-between gap-2"><span>Litiges</span><span className="font-medium text-foreground">{formatNumber(scopedStats!.disputesCount)}</span></div>
                              <div className="flex justify-between gap-2"><span>Sup. moy.</span><span className="font-medium text-foreground">{scopedStats!.avgParcelSurfaceSqm > 0 ? `${scopedStats!.avgParcelSurfaceSqm} m²` : '—'}</span></div>
                            </>
                          )}
                      </div>
                    </div>
                  )}

                  {/* Pied de carte : date + copyright */}
                  <div className="absolute bottom-0 left-0 right-0 z-10 text-center py-0.5 flex items-center justify-center gap-0.5">
                    <span className="text-[10px] text-muted-foreground">{todayStr} — {watermarkText}</span>
                    {brandingConfig?.logo_url && <img src={String(brandingConfig.logo_url)} alt="" className="h-3 w-3 inline-block object-contain" />}
                  </div>
                  
                  <div className="absolute bottom-5 right-2 z-10 flex gap-1">
                    {/* Bouton copier en image — configurable */}
                    {isChartVisible('map-copy-button') && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6 rounded-full bg-background/80 backdrop-blur-sm border-border/50 shadow-sm"
                        onClick={handleCopyImage}
                        title="Copier en image"
                        disabled={isCopying}
                      >
                        {isCopying ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                      </Button>
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
                            <span className="text-blue-700 dark:text-blue-300">Données calculées depuis Supabase</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                            <span className="text-emerald-700 dark:text-emerald-300">Couleur = densité de parcelles</span>
                          </div>
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
                    <div className="p-2 space-y-2">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
                          <span className="text-[11px] sm:text-xs font-medium text-foreground truncate">{scopeLabel}</span>
                        </div>
                        <button
                          onClick={() => { setSelectedProvince(null); setSelectedVille(undefined); setSelectedCommune(undefined); setSelectedQuartier(undefined); }}
                          className="lg:hidden flex-shrink-0 h-5 w-5 flex items-center justify-center rounded-full bg-muted hover:bg-destructive hover:text-destructive-foreground transition-colors text-muted-foreground"
                          aria-label="Fermer"
                        >
                          <span className="text-xs font-medium leading-none">✕</span>
                        </button>
                      </div>
                      
                      {/* Indicateurs fonciers */}
                      <div className="space-y-1">
                        <h5 className="text-[10px] font-medium text-foreground flex items-center gap-1">
                          <Database className="h-3 w-3 text-primary" />
                          Indicateurs fonciers
                        </h5>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                          {isChartVisible('detail-cert-enreg') && (
                            <Card className="analytics-card border-0 p-1">
                              <div className="text-[10px] text-muted-foreground truncate">{dt('detail-cert-enreg', 'Certif. enregistrement')}</div>
                              <div className="text-[11px] font-bold text-primary">{formatNumber(scopedStats.certEnregCount)}</div>
                            </Card>
                          )}
                          {isChartVisible('detail-contrat-loc') && (
                            <Card className="analytics-card border-0 p-1">
                              <div className="text-[10px] text-muted-foreground truncate">{dt('detail-contrat-loc', 'Contrat location')}</div>
                              <div className="text-[11px] font-bold text-blue-600">{formatNumber(scopedStats.contratLocCount)}</div>
                            </Card>
                          )}
                          {isChartVisible('detail-fiche-parc') && (
                            <Card className="analytics-card border-0 p-1">
                              <div className="text-[10px] text-muted-foreground truncate">{dt('detail-fiche-parc', 'Fiche parcellaire')}</div>
                              <div className="text-[11px] font-bold text-emerald-600">{formatNumber(scopedStats.ficheParcCount)}</div>
                            </Card>
                          )}
                          {isChartVisible('detail-title-req') && (
                            <Card className="analytics-card border-0 p-1">
                              <div className="text-[10px] text-muted-foreground truncate">{dt('detail-title-req', 'Titres demandés')}</div>
                              <div className="text-[11px] font-bold text-violet-600">{formatNumber(scopedStats.titleRequestsCount)}</div>
                            </Card>
                          )}
                          {isChartVisible('detail-disputes') && (
                            <Card className="analytics-card border-0 p-1">
                              <div className="text-[10px] text-muted-foreground truncate">{dt('detail-disputes', 'Litiges fonciers')}</div>
                              <div className="text-[11px] font-bold text-orange-500">{formatNumber(scopedStats.disputesCount)}</div>
                            </Card>
                          )}
                          {isChartVisible('detail-mortgages') && (
                            <Card className="analytics-card border-0 p-1">
                              <div className="text-[10px] text-muted-foreground truncate">{dt('detail-mortgages', 'Hypothèques actives')}</div>
                              <div className="text-[11px] font-bold text-red-600">{formatNumber(scopedStats.activeMortgagesCount)}</div>
                            </Card>
                          )}
                          {isChartVisible('detail-mutations') && (
                            <Card className="analytics-card border-0 p-1">
                              <div className="text-[10px] text-muted-foreground truncate">{dt('detail-mutations', 'Mutations en cours')}</div>
                              <div className="text-[11px] font-bold text-violet-600">{formatNumber(scopedStats.pendingMutationsCount)}</div>
                            </Card>
                          )}
                          {isChartVisible('detail-expertises') && (
                            <Card className="analytics-card border-0 p-1">
                              <div className="text-[10px] text-muted-foreground truncate">{dt('detail-expertises', 'Expertises en cours')}</div>
                              <div className="text-[11px] font-bold text-blue-600">{formatNumber(scopedStats.pendingExpertisesCount)}</div>
                            </Card>
                          )}
                          {isChartVisible('detail-avg-surface') && (
                            <Card className="analytics-card border-0 p-1">
                              <div className="text-[10px] text-muted-foreground truncate">{dt('detail-avg-surface', 'Sup. moy. parcelle')}</div>
                              <div className="text-[11px] font-bold text-emerald-700">{scopedStats.avgParcelSurfaceSqm > 0 ? `${formatNumber(scopedStats.avgParcelSurfaceSqm)} m²` : '—'}</div>
                            </Card>
                          )}
                          {isChartVisible('detail-avg-building') && (
                            <Card className="analytics-card border-0 p-1">
                              <div className="text-[10px] text-muted-foreground truncate">{dt('detail-avg-building', 'Sup. moy. construction')}</div>
                              <div className="text-[11px] font-bold text-emerald-600">{scopedStats.avgBuildingSurfaceSqm > 0 ? `${formatNumber(scopedStats.avgBuildingSurfaceSqm)} m²` : '—'}</div>
                            </Card>
                          )}
                          {isChartVisible('detail-avg-height') && (
                            <Card className="analytics-card border-0 p-1">
                              <div className="text-[10px] text-muted-foreground truncate">{dt('detail-avg-height', 'Haut. moy. construction')}</div>
                              <div className="text-[11px] font-bold text-blue-600">{scopedStats.avgBuildingHeightM > 0 ? `${scopedStats.avgBuildingHeightM} m` : '—'}</div>
                            </Card>
                          )}
                        </div>
                      </div>
                    </div>
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
          <div className={`${activeMobilePanel !== 'analytics' ? 'hidden lg:flex' : 'flex'} lg:col-span-8 flex-col min-h-0 h-full`}>
            <Card className="flex-1 flex flex-col overflow-hidden border-border/30 min-h-0">
              <CardHeader className="px-2 py-1 border-b border-border/20 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[11px] sm:text-xs font-medium text-foreground flex items-center gap-1">
                    <BarChart3 className="h-3.5 w-3.5 text-primary" />
                    <span>Analytics</span>
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
                    selectedVille={selectedVille}
                    selectedCommune={selectedCommune}
                    selectedQuartier={selectedQuartier}
                    selectedTerritoire={selectedTerritoire}
                    selectedSectionType={selectedSectionType}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
    </div>
  );
};

/** Build an empty province for loading state */
function buildEmptyProvince(meta: { id: string; name: string }): ProvinceData {
  return {
    id: meta.id,
    name: meta.name,
    certEnregCount: 0,
    contratLocCount: 0,
    ficheParcCount: 0,
    titleRequestsCount: 0,
    disputesCount: 0,
    activeMortgagesCount: 0,
    pendingMutationsCount: 0,
    pendingExpertisesCount: 0,
    avgParcelSurfaceSqm: 0,
    avgBuildingSurfaceSqm: 0,
    avgBuildingHeightM: 0,
    parcelsCount: 0,
  };
}

export default DRCInteractiveMap;
