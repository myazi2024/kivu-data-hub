import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BarChart3,
  Map,
  Home,
  DollarSign,
  Info,
  Users,
  Building,
  Landmark,
  FileText,
  Activity,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { useLandDataAnalytics } from '@/hooks/useLandDataAnalytics';
import { ParcelDistributionViz } from './real/ParcelDistributionViz';
import { TitleTypesViz } from './real/TitleTypesViz';
import { UsageDistributionViz } from './real/UsageDistributionViz';
import { ConstructionQualityViz } from './real/ConstructionQualityViz';
import { ContributionStatsViz } from './real/ContributionStatsViz';
import { RevenueTrackingViz } from './real/RevenueTrackingViz';
import { TaxHistoryViz } from './real/TaxHistoryViz';
import { ConstructionTypesViz } from './real/ConstructionTypesViz';
import { RegistrationTrendsViz } from './real/RegistrationTrendsViz';
import { AreaDistributionViz } from './real/AreaDistributionViz';

// Keep legacy interface for DRCInteractiveMap compatibility
import { ProvinceData } from '@/types/province';

interface ProvinceDataVisualizationProps {
  provinces: ProvinceData[];
  selectedProvince?: ProvinceData | null;
}

const ProvinceDataVisualization: React.FC<ProvinceDataVisualizationProps> = () => {
  const [activeIndicator, setActiveIndicator] = useState<string>('parcels');
  const { data: analytics, isLoading, error } = useLandDataAnalytics();

  const indicators = [
    { id: 'parcels', name: 'Parcelles enregistrées', icon: Map, description: 'Distribution des parcelles par province et type (SU/SR)' },
    { id: 'title-types', name: 'Types de titres', icon: FileText, description: 'Répartition des types de titres fonciers' },
    { id: 'usage', name: 'Usage des parcelles', icon: Home, description: 'Usage déclaré des parcelles (résidentiel, commercial, etc.)' },
    { id: 'construction', name: 'Qualité construction', icon: Building, description: 'Nature des constructions (durable, semi-durable, précaire)' },
    { id: 'building-types', name: 'Types de bâtiments', icon: Landmark, description: 'Distribution des types de bâtiments' },
    { id: 'contributions', name: 'Contributions', icon: Users, description: 'Activité des contributions citoyennes par statut' },
    { id: 'revenue', name: 'Revenus', icon: DollarSign, description: 'Suivi des factures et revenus collectés' },
    { id: 'taxes', name: 'Fiscalité', icon: BarChart3, description: 'Historique des taxes foncières collectées' },
    { id: 'trends', name: 'Tendances', icon: TrendingUp, description: 'Évolution temporelle des enregistrements' },
    { id: 'areas', name: 'Superficies', icon: Activity, description: 'Distribution des superficies de parcelles' },
  ];

  const renderVisualization = () => {
    if (!analytics) return null;
    switch (activeIndicator) {
      case 'parcels': return <ParcelDistributionViz data={analytics} />;
      case 'title-types': return <TitleTypesViz data={analytics} />;
      case 'usage': return <UsageDistributionViz data={analytics} />;
      case 'construction': return <ConstructionQualityViz data={analytics} />;
      case 'building-types': return <ConstructionTypesViz data={analytics} />;
      case 'contributions': return <ContributionStatsViz data={analytics} />;
      case 'revenue': return <RevenueTrackingViz data={analytics} />;
      case 'taxes': return <TaxHistoryViz data={analytics} />;
      case 'trends': return <RegistrationTrendsViz data={analytics} />;
      case 'areas': return <AreaDistributionViz data={analytics} />;
      default: return <ParcelDistributionViz data={analytics} />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Chargement des données...</span>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="text-center p-6 text-muted-foreground text-sm">
        Impossible de charger les données foncières.
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150} disableHoverableContent>
      <div className="space-y-3 sm:space-y-4">
        <Card className="border-0 shadow-none bg-background/50">
          <CardContent className="px-0">
            <Tabs value={activeIndicator} onValueChange={setActiveIndicator} className="w-full">
              <div className="flex justify-center">
                <TabsList className="inline-flex items-center gap-0.5 h-auto p-1 bg-background border border-border/50 rounded-xl shadow-sm">
                  {indicators.map((indicator) => (
                    <Tooltip key={indicator.id}>
                      <TooltipTrigger asChild>
                        <TabsTrigger
                          value={indicator.id}
                          className="flex flex-col items-center gap-1.5 p-2.5 min-w-[56px] h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-muted/50 transition-all duration-200 rounded-lg border border-transparent data-[state=active]:border-primary/20 data-[state=active]:shadow-sm"
                        >
                          <indicator.icon className="h-5 w-5" />
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs bg-popover border border-border/50 shadow-md z-50">
                        <p className="text-sm font-medium">{indicator.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{indicator.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </TabsList>
              </div>

              {indicators.map((indicator) => (
                <TabsContent key={indicator.id} value={indicator.id} className="mt-2 sm:mt-3">
                  <div className="space-y-2 sm:space-y-3">
                    <div className="bg-primary/5 p-3 sm:p-4 rounded border-l-2 border-primary">
                      <h3 className="font-medium text-sm text-foreground flex items-center gap-2">
                        <indicator.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        {indicator.name}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="ml-auto inline-flex items-center justify-center rounded-full p-1 text-muted-foreground hover:text-foreground" aria-label="Aide">
                              <Info className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs">
                            <p className="text-xs">{indicator.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 hidden md:block">{indicator.description}</p>
                    </div>
                    <div className="bg-card rounded border-border/30 border relative">
                      <ScrollArea className="h-96 w-full">
                        <div className="w-full overflow-visible p-4">
                          {renderVisualization()}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            {/* Real aggregated stats */}
            <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-border/50">
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                <div className="flex gap-2 sm:gap-3 min-w-max pb-2">
                  <StatCard label="Parcelles" value={analytics.totals.totalParcels.toString()} />
                  <StatCard label="Provinces" value={analytics.totals.totalProvinces.toString()} />
                  <StatCard label="Contributions" value={analytics.totals.totalContributions.toString()} />
                  <StatCard label="Factures" value={analytics.totals.totalInvoices.toString()} />
                  <StatCard label="Revenus" value={`$${analytics.totals.totalRevenue.toFixed(0)}`} />
                  <StatCard label="Taxes" value={`$${analytics.totals.totalTaxCollected.toFixed(0)}`} />
                  <StatCard label="Sup. moy." value={`${(analytics.totals.avgArea / 10000).toFixed(2)} ha`} />
                  <StatCard label="Avec GPS" value={analytics.totals.withGps.toString()} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <div className="flex-shrink-0 text-center p-3 sm:p-4 bg-primary/5 rounded border min-w-[80px] sm:min-w-[100px]">
    <div className="text-lg sm:text-xl font-semibold text-foreground">{value}</div>
    <div className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{label}</div>
  </div>
);

export default ProvinceDataVisualization;
