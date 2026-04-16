import React, { useState, useEffect, memo, useMemo, Suspense } from 'react';
import { useAppAppearance } from '@/hooks/useAppAppearance';
import { FileText, Building, Search, ArrowRightLeft, Scissors, AlertTriangle, Loader2, Database, History, Award, Receipt, Landmark, FileCheck, DollarSign } from 'lucide-react';
import { useLandDataAnalytics, LandAnalyticsData } from '@/hooks/useLandDataAnalytics';
import { ProvinceData } from '@/types/province';
import { useAnalyticsTabsConfig, useTabChartsConfig, ANALYTICS_TABS_REGISTRY } from '@/hooks/useAnalyticsChartsConfig';
import { ProvinceFilterContext, MapProvinceContext, VilleFilterContext, CommuneFilterContext, VilleChangeContext, CommuneChangeContext, QuartierFilterContext, QuartierChangeContext, TerritoireFilterContext, TerritoireChangeContext, SectionTypeContext, SectionTypeChangeContext } from './filters/AnalyticsFilters';
import { WatermarkContext, WatermarkConfigContext, WatermarkConfig } from './shared/ChartCard';

// Lazy-loaded block components
const TitleRequestsBlock = React.lazy(() => import('./blocks/TitleRequestsBlock').then(m => ({ default: m.TitleRequestsBlock })));
const ParcelsWithTitleBlock = React.lazy(() => import('./blocks/ParcelsWithTitleBlock').then(m => ({ default: m.ParcelsWithTitleBlock })));
const ContributionsBlock = React.lazy(() => import('./blocks/ContributionsBlock').then(m => ({ default: m.ContributionsBlock })));
const ExpertiseBlock = React.lazy(() => import('./blocks/ExpertiseBlock').then(m => ({ default: m.ExpertiseBlock })));
const MutationBlock = React.lazy(() => import('./blocks/MutationBlock').then(m => ({ default: m.MutationBlock })));
const SubdivisionBlock = React.lazy(() => import('./blocks/SubdivisionBlock').then(m => ({ default: m.SubdivisionBlock })));
const DisputesBlock = React.lazy(() => import('./blocks/DisputesBlock').then(m => ({ default: m.DisputesBlock })));
const MortgagesBlock = React.lazy(() => import('./blocks/MortgagesBlock').then(m => ({ default: m.MortgagesBlock })));
const BuildingPermitsBlock = React.lazy(() => import('./blocks/BuildingPermitsBlock').then(m => ({ default: m.BuildingPermitsBlock })));
const TaxesBlock = React.lazy(() => import('./blocks/TaxesBlock').then(m => ({ default: m.TaxesBlock })));
const OwnershipHistoryBlock = React.lazy(() => import('./blocks/OwnershipHistoryBlock').then(m => ({ default: m.OwnershipHistoryBlock })));
const CertificatesBlock = React.lazy(() => import('./blocks/CertificatesBlock').then(m => ({ default: m.CertificatesBlock })));
const InvoicesBlock = React.lazy(() => import('./blocks/InvoicesBlock').then(m => ({ default: m.InvoicesBlock })));

const BlockFallback = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-4 w-4 animate-spin text-primary" />
    <span className="ml-2 text-xs text-muted-foreground">Chargement du bloc...</span>
  </div>
);

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  'title-requests': FileText,
  'parcels-titled': Building,
  'contributions': Database,
  'expertise': Search,
  'mutations': ArrowRightLeft,
  'subdivision': Scissors,
  'disputes': AlertTriangle,
  'mortgages': Landmark,
  'building-permits': FileCheck,
  'taxes': DollarSign,
  'ownership': History,
  'certificates': Award,
  'invoices': Receipt,
};

const BLOCK_MAP: Record<string, React.ComponentType<{ data: any }>> = {
  'title-requests': TitleRequestsBlock,
  'parcels-titled': ParcelsWithTitleBlock,
  'contributions': ContributionsBlock,
  'expertise': ExpertiseBlock,
  'mutations': MutationBlock,
  'subdivision': SubdivisionBlock,
  'disputes': DisputesBlock,
  'mortgages': MortgagesBlock,
  'building-permits': BuildingPermitsBlock,
  'taxes': TaxesBlock,
  'ownership': OwnershipHistoryBlock,
  'certificates': CertificatesBlock,
  'invoices': InvoicesBlock,
};

interface ProvinceDataVisualizationProps {
  analytics: LandAnalyticsData;
  selectedProvince?: ProvinceData | null;
  onProvinceFilter?: (provinceName: string | undefined) => void;
  onVilleChange?: (ville: string | undefined) => void;
  onCommuneChange?: (commune: string | undefined) => void;
  onQuartierChange?: (quartier: string | undefined) => void;
  onTerritoireChange?: (territoire: string | undefined) => void;
  onSectionTypeChange?: (sectionType: string) => void;
  selectedVille?: string | null;
  selectedCommune?: string | null;
  selectedQuartier?: string | null;
  selectedTerritoire?: string | null;
  selectedSectionType?: string | null;
}

const ProvinceDataVisualization: React.FC<ProvinceDataVisualizationProps> = ({
  analytics, selectedProvince, onProvinceFilter, onVilleChange, onCommuneChange, onQuartierChange, onTerritoireChange, onSectionTypeChange,
  selectedVille, selectedCommune, selectedQuartier, selectedTerritoire, selectedSectionType,
}) => {
  const { visibleTabs, isLoading: tabsLoading } = useAnalyticsTabsConfig();
  const [activeTab, setActiveTab] = useState('');

  // Load global watermark config
  const globalDefaults = ANALYTICS_TABS_REGISTRY['_global']
    ? [...ANALYTICS_TABS_REGISTRY['_global'].kpis, ...ANALYTICS_TABS_REGISTRY['_global'].charts]
    : [];
  const { getChartConfig: getGlobalConfig } = useTabChartsConfig('_global', globalDefaults);
  const watermarkText = getGlobalConfig('global-watermark')?.custom_title || 'BIC - Tous droits réservés';
  const { config: appearanceConfig } = useAppAppearance();
  const watermarkConfig: WatermarkConfig = useMemo(() => ({
    opacity: parseFloat(getGlobalConfig('logo-watermark-opacity')?.custom_title || '0.06') || 0.06,
    size: parseInt(getGlobalConfig('logo-watermark-size')?.custom_title || '80', 10) || 80,
    position: getGlobalConfig('logo-watermark-position')?.custom_title || 'center',
    logoUrl: (appearanceConfig.logo_url as string) || undefined,
  }), [getGlobalConfig, appearanceConfig.logo_url]);

  // Set default active tab once visible tabs are loaded
  React.useEffect(() => {
    if (visibleTabs.length > 0 && (!activeTab || !visibleTabs.find(t => t.key === activeTab))) {
      setActiveTab(visibleTabs[0].key);
    }
  }, [visibleTabs, activeTab]);

  if (tabsLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="ml-2 text-xs text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  const BlockComponent = BLOCK_MAP[activeTab];

  return (
    <div className="flex flex-row lg:flex-col h-full w-full min-h-0 overflow-hidden">
      {/* Tabs */}
      <div className="w-20 sm:w-24 lg:w-full shrink-0 border-r lg:border-r-0 lg:border-b border-border/40 bg-background overflow-y-auto overflow-x-hidden lg:overflow-y-hidden lg:overflow-x-auto scrollbar-hide">
        <div className="flex flex-col lg:flex-row lg:items-center gap-0.5 p-0.5 lg:w-max">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const IconComp = ICON_MAP[tab.key];
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1 px-1.5 py-1.5 lg:px-2 lg:py-1.5 text-[12px] sm:text-[13px] lg:text-[10px] whitespace-nowrap rounded-md transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                }`}
                title={tab.label}
              >
                {IconComp && <IconComp className="h-3 w-3 shrink-0 hidden lg:block" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden p-1 lg:p-0 lg:mt-1.5">
        <WatermarkContext.Provider value={watermarkText}>
          <WatermarkConfigContext.Provider value={watermarkConfig}>
            <MapProvinceContext.Provider value={selectedProvince?.name || null}>
              <ProvinceFilterContext.Provider value={onProvinceFilter || null}>
                <VilleChangeContext.Provider value={onVilleChange || null}>
                  <CommuneChangeContext.Provider value={onCommuneChange || null}>
                    <QuartierChangeContext.Provider value={onQuartierChange || null}>
                      <TerritoireChangeContext.Provider value={onTerritoireChange || null}>
                        <SectionTypeContext.Provider value={selectedSectionType || null}>
                          <SectionTypeChangeContext.Provider value={onSectionTypeChange || null}>
                            <VilleFilterContext.Provider value={selectedVille || null}>
                              <CommuneFilterContext.Provider value={selectedCommune || null}>
                                <QuartierFilterContext.Provider value={selectedQuartier || null}>
                                  <TerritoireFilterContext.Provider value={selectedTerritoire || null}>
                                    {BlockComponent ? (
                                      <Suspense fallback={<BlockFallback />}>
                                        <BlockComponent data={analytics} />
                                      </Suspense>
                                    ) : null}
                                  </TerritoireFilterContext.Provider>
                                </QuartierFilterContext.Provider>
                              </CommuneFilterContext.Provider>
                            </VilleFilterContext.Provider>
                          </SectionTypeChangeContext.Provider>
                        </SectionTypeContext.Provider>
                      </TerritoireChangeContext.Provider>
                    </QuartierChangeContext.Provider>
                  </CommuneChangeContext.Provider>
                </VilleChangeContext.Provider>
              </ProvinceFilterContext.Provider>
            </MapProvinceContext.Provider>
          </WatermarkConfigContext.Provider>
        </WatermarkContext.Provider>
      </div>
    </div>
  );
};

export default memo(ProvinceDataVisualization);
