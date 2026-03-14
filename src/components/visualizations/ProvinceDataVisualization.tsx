import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Map, Search, ArrowRightLeft, Scissors, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import { useLandDataAnalytics } from '@/hooks/useLandDataAnalytics';
import { TitleRequestsBlock } from './blocks/TitleRequestsBlock';
import { ParcelsWithTitleBlock } from './blocks/ParcelsWithTitleBlock';
import { ExpertiseBlock } from './blocks/ExpertiseBlock';
import { MutationBlock } from './blocks/MutationBlock';
import { SubdivisionBlock } from './blocks/SubdivisionBlock';
import { DisputesBlock } from './blocks/DisputesBlock';
import { DisputeLiftingBlock } from './blocks/DisputeLiftingBlock';

import { ProvinceData } from '@/types/province';

interface ProvinceDataVisualizationProps {
  provinces: ProvinceData[];
  selectedProvince?: ProvinceData | null;
}

const blocks = [
  { id: 'title-requests', name: 'Demandes titres fonciers', icon: FileText, desc: 'Demandes introduites pour terrains non couverts par des titres fonciers' },
  { id: 'parcels-titled', name: 'Parcelles titrées', icon: Map, desc: 'Parcelles délivrées ayant un titre foncier (données CCC)' },
  { id: 'expertise', name: 'Expertise immobilière', icon: Search, desc: 'Demandes d\'expertise immobilière' },
  { id: 'mutations', name: 'Demande de mutation', icon: ArrowRightLeft, desc: 'Demandes de mutation foncière' },
  { id: 'subdivision', name: 'Demande de lotissement', icon: Scissors, desc: 'Demandes de lotissement' },
  { id: 'disputes', name: 'Litiges fonciers', icon: AlertTriangle, desc: 'Litiges fonciers en cours et résolus' },
  { id: 'lifting', name: 'Levée de litige', icon: ShieldCheck, desc: 'Demandes de levée de litige' },
];

const ProvinceDataVisualization: React.FC<ProvinceDataVisualizationProps> = () => {
  const [activeTab, setActiveTab] = useState('title-requests');
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

  const renderBlock = () => {
    switch (activeTab) {
      case 'title-requests': return <TitleRequestsBlock data={analytics} />;
      case 'parcels-titled': return <ParcelsWithTitleBlock data={analytics} />;
      case 'expertise': return <ExpertiseBlock data={analytics} />;
      case 'mutations': return <MutationBlock data={analytics} />;
      case 'subdivision': return <SubdivisionBlock data={analytics} />;
      case 'disputes': return <DisputesBlock data={analytics} />;
      case 'lifting': return <DisputeLiftingBlock data={analytics} />;
      default: return <TitleRequestsBlock data={analytics} />;
    }
  };

  const active = blocks.find(b => b.id === activeTab) || blocks[0];

  return (
    <div className="space-y-3">
      <Card className="border-0 shadow-none bg-background/50">
        <CardContent className="px-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <ScrollArea className="w-full">
              <TabsList className="inline-flex items-center gap-1 h-auto p-1.5 bg-background border border-border/50 rounded-xl shadow-sm w-full justify-start overflow-x-auto">
                {blocks.map((block) => (
                  <TabsTrigger
                    key={block.id}
                    value={block.id}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-muted/50 transition-all duration-200 rounded-lg"
                  >
                    <block.icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{block.name}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollArea>

            {blocks.map((block) => (
              <TabsContent key={block.id} value={block.id} className="mt-3">
                <div className="space-y-3">
                  <div className="bg-primary/5 p-3 rounded border-l-2 border-primary">
                    <h3 className="font-medium text-sm text-foreground flex items-center gap-2">
                      <block.icon className="h-4 w-4 text-primary" />
                      {block.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">{block.desc}</p>
                  </div>
                  <div className="bg-card rounded border-border/30 border p-4">
                    {renderBlock()}
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProvinceDataVisualization;
