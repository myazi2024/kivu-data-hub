import React, { useState, memo } from 'react';
import { FileText, Map, Search, ArrowRightLeft, Scissors, AlertTriangle, Loader2, Database, MapPin, History, ShieldAlert, Award, Receipt } from 'lucide-react';
import { useLandDataAnalytics } from '@/hooks/useLandDataAnalytics';
import { TitleRequestsBlock } from './blocks/TitleRequestsBlock';
import { ParcelsWithTitleBlock } from './blocks/ParcelsWithTitleBlock';
import { ContributionsBlock } from './blocks/ContributionsBlock';
import { ExpertiseBlock } from './blocks/ExpertiseBlock';
import { MutationBlock } from './blocks/MutationBlock';
import { SubdivisionBlock } from './blocks/SubdivisionBlock';
import { DisputesBlock } from './blocks/DisputesBlock';

import { BoundaryConflictsBlock } from './blocks/BoundaryConflictsBlock';
import { OwnershipHistoryBlock } from './blocks/OwnershipHistoryBlock';
import { FraudAttemptsBlock } from './blocks/FraudAttemptsBlock';
import { CertificatesBlock } from './blocks/CertificatesBlock';
import { InvoicesBlock } from './blocks/InvoicesBlock';
import { ProvinceData } from '@/types/province';
import { useAnalyticsTabsConfig, useTabChartsConfig, ANALYTICS_TABS_REGISTRY } from '@/hooks/useAnalyticsChartsConfig';
import { ProvinceFilterContext } from './filters/AnalyticsFilters';
import { WatermarkContext } from './shared/ChartCard';

interface ProvinceDataVisualizationProps {
  provinces: ProvinceData[];
  selectedProvince?: ProvinceData | null;
  onProvinceFilter?: (provinceName: string | undefined) => void;
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  'title-requests': FileText,
  'parcels-titled': Map,
  'contributions': Database,
  'expertise': Search,
  'mutations': ArrowRightLeft,
  'subdivision': Scissors,
  'disputes': AlertTriangle,
  'boundary': MapPin,
  'ownership': History,
  'fraud': ShieldAlert,
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
  'boundary': BoundaryConflictsBlock,
  'ownership': OwnershipHistoryBlock,
  'fraud': FraudAttemptsBlock,
  'certificates': CertificatesBlock,
  'invoices': InvoicesBlock,
};

const ProvinceDataVisualization: React.FC<ProvinceDataVisualizationProps> = ({ onProvinceFilter }) => {
  const { visibleTabs, isLoading: tabsLoading } = useAnalyticsTabsConfig();
  const [activeTab, setActiveTab] = useState('');
  const { data: analytics, isLoading, error } = useLandDataAnalytics();

  // Load global watermark config
  const globalDefaults = ANALYTICS_TABS_REGISTRY['_global']
    ? [...ANALYTICS_TABS_REGISTRY['_global'].kpis, ...ANALYTICS_TABS_REGISTRY['_global'].charts]
    : [];
  const { getChartConfig: getGlobalConfig } = useTabChartsConfig('_global', globalDefaults);
  const watermarkText = getGlobalConfig('global-watermark')?.custom_title || 'BIC - Tous droits réservés';

  // Set default active tab once visible tabs are loaded
  React.useEffect(() => {
    if (visibleTabs.length > 0 && (!activeTab || !visibleTabs.find(t => t.key === activeTab))) {
      setActiveTab(visibleTabs[0].key);
    }
  }, [visibleTabs, activeTab]);

  if (isLoading || tabsLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="ml-2 text-xs text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="text-center p-3 text-muted-foreground text-xs">
        Impossible de charger les données foncières.
      </div>
    );
  }

  const BlockComponent = BLOCK_MAP[activeTab];

  return (
    <div className="flex flex-row lg:flex-col h-full w-full min-h-0 overflow-hidden">
      {/* Tabs - vertical on mobile (fixed left), horizontal on desktop (fixed top) */}
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

      {/* Content - scrolls independently */}
      <div className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden p-1 lg:p-0 lg:mt-1.5">
        <WatermarkContext.Provider value={watermarkText}>
          <ProvinceFilterContext.Provider value={onProvinceFilter || null}>
            {BlockComponent ? <BlockComponent data={analytics} /> : null}
          </ProvinceFilterContext.Provider>
        </WatermarkContext.Provider>
      </div>
    </div>
  );
};

export default memo(ProvinceDataVisualization);
