import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  { id: 'title-requests', name: 'Titres fonciers', icon: FileText },
  { id: 'parcels-titled', name: 'Parcelles titrées', icon: Map },
  { id: 'expertise', name: 'Expertise', icon: Search },
  { id: 'mutations', name: 'Mutations', icon: ArrowRightLeft },
  { id: 'subdivision', name: 'Lotissement', icon: Scissors },
  { id: 'disputes', name: 'Litiges', icon: AlertTriangle },
  { id: 'lifting', name: 'Levée litige', icon: ShieldCheck },
];

const ProvinceDataVisualization: React.FC<ProvinceDataVisualizationProps> = () => {
  const [activeTab, setActiveTab] = useState('title-requests');
  const { data: analytics, isLoading, error } = useLandDataAnalytics();

  if (isLoading) {
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

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="overflow-x-auto pb-1">
        <TabsList className="inline-flex items-center gap-0.5 h-auto p-1 bg-muted/50 border border-border/40 rounded-lg w-max min-w-full">
          {blocks.map((block) => (
            <TabsTrigger
              key={block.id}
              value={block.id}
              className="flex items-center gap-1 px-2 py-1.5 text-[10px] whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-muted/80 transition-all rounded-md"
            >
              <block.icon className="h-3 w-3" />
              {block.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {blocks.map((block) => (
        <TabsContent key={block.id} value={block.id} className="mt-1.5">
          {renderBlock()}
        </TabsContent>
      ))}
    </Tabs>
  );
};

export default ProvinceDataVisualization;
