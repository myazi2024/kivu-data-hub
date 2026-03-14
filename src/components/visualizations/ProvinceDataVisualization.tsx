import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard,
  Map,
  FileText,
  Building,
  Users,
  DollarSign,
  AlertTriangle,
  ScrollText,
  TrendingUp,
  Loader2,
  Info,
} from 'lucide-react';
import { useLandDataAnalytics } from '@/hooks/useLandDataAnalytics';
import { OverviewDashboardViz } from './real/OverviewDashboardViz';
import { ParcelAnalyticsViz } from './real/ParcelAnalyticsViz';
import { PropertyOwnershipViz } from './real/PropertyOwnershipViz';
import { ConstructionAnalyticsViz } from './real/ConstructionAnalyticsViz';
import { ContributionAnalyticsViz } from './real/ContributionAnalyticsViz';
import { FinancialAnalyticsViz } from './real/FinancialAnalyticsViz';
import { DisputesMortgagesViz } from './real/DisputesMortgagesViz';
import { RequestsAnalyticsViz } from './real/RequestsAnalyticsViz';
import { TemporalTrendsViz } from './real/TemporalTrendsViz';

import { ProvinceData } from '@/types/province';

interface ProvinceDataVisualizationProps {
  provinces: ProvinceData[];
  selectedProvince?: ProvinceData | null;
}

const indicators = [
  { id: 'overview', name: 'Vue d\'ensemble', icon: LayoutDashboard, desc: 'KPIs globaux : parcelles, contributions, revenus, litiges, hypothèques, permis' },
  { id: 'parcels', name: 'Parcelles', icon: Map, desc: 'Distribution des parcelles par province, type SU/SR et couverture GPS' },
  { id: 'ownership', name: 'Propriété', icon: FileText, desc: 'Types de titres, statut juridique, genre des propriétaires, types de bail' },
  { id: 'construction', name: 'Construction', icon: Building, desc: 'Qualité, types de bâtiments et usage déclaré des parcelles' },
  { id: 'contributions', name: 'Contributions', icon: Users, desc: 'Contributions citoyennes CCC : statut, tendances, codes générés' },
  { id: 'finances', name: 'Finances', icon: DollarSign, desc: 'Factures, revenus, fiscalité foncière et revenus mensuels' },
  { id: 'disputes', name: 'Litiges & Hyp.', icon: AlertTriangle, desc: 'Litiges fonciers par type/statut et hypothèques' },
  { id: 'requests', name: 'Demandes', icon: ScrollText, desc: 'Demandes de titres fonciers, permis de construire' },
  { id: 'trends', name: 'Tendances', icon: TrendingUp, desc: 'Évolution temporelle : enregistrements, contributions, revenus' },
];

const ProvinceDataVisualization: React.FC<ProvinceDataVisualizationProps> = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { data: analytics, isLoading, error } = useLandDataAnalytics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Chargement des données foncières...</span>
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

  const renderViz = () => {
    switch (activeTab) {
      case 'overview': return <OverviewDashboardViz data={analytics} />;
      case 'parcels': return <ParcelAnalyticsViz data={analytics} />;
      case 'ownership': return <PropertyOwnershipViz data={analytics} />;
      case 'construction': return <ConstructionAnalyticsViz data={analytics} />;
      case 'contributions': return <ContributionAnalyticsViz data={analytics} />;
      case 'finances': return <FinancialAnalyticsViz data={analytics} />;
      case 'disputes': return <DisputesMortgagesViz data={analytics} />;
      case 'requests': return <RequestsAnalyticsViz data={analytics} />;
      case 'trends': return <TemporalTrendsViz data={analytics} />;
      default: return <OverviewDashboardViz data={analytics} />;
    }
  };

  const active = indicators.find(i => i.id === activeTab) || indicators[0];

  return (
    <TooltipProvider delayDuration={150} disableHoverableContent>
      <div className="space-y-3 sm:space-y-4">
        <Card className="border-0 shadow-none bg-background/50">
          <CardContent className="px-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex justify-center">
                <TabsList className="inline-flex items-center gap-0.5 h-auto p-1 bg-background border border-border/50 rounded-xl shadow-sm flex-wrap">
                  {indicators.map((ind) => (
                    <Tooltip key={ind.id}>
                      <TooltipTrigger asChild>
                        <TabsTrigger
                          value={ind.id}
                          className="flex flex-col items-center gap-1 p-2 min-w-[48px] h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-muted/50 transition-all duration-200 rounded-lg border border-transparent data-[state=active]:border-primary/20 data-[state=active]:shadow-sm"
                        >
                          <ind.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs bg-popover border border-border/50 shadow-md z-50">
                        <p className="text-sm font-medium">{ind.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{ind.desc}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </TabsList>
              </div>

              {indicators.map((ind) => (
                <TabsContent key={ind.id} value={ind.id} className="mt-2 sm:mt-3">
                  <div className="space-y-2 sm:space-y-3">
                    <div className="bg-primary/5 p-3 sm:p-4 rounded border-l-2 border-primary">
                      <h3 className="font-medium text-sm text-foreground flex items-center gap-2">
                        <ind.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        {ind.name}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="ml-auto inline-flex items-center justify-center rounded-full p-1 text-muted-foreground hover:text-foreground">
                              <Info className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs">
                            <p className="text-xs">{ind.desc}</p>
                          </TooltipContent>
                        </Tooltip>
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 hidden md:block">{ind.desc}</p>
                    </div>
                    <div className="bg-card rounded border-border/30 border relative">
                      <ScrollArea className="h-[420px] w-full">
                        <div className="w-full overflow-visible p-4">
                          {renderViz()}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};

export default ProvinceDataVisualization;
