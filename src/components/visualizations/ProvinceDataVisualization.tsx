import React, { useState, memo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FileText, Map, Search, ArrowRightLeft, Scissors, AlertTriangle, ShieldCheck, Loader2, Database } from 'lucide-react';
import { useLandDataAnalytics } from '@/hooks/useLandDataAnalytics';
import { TitleRequestsBlock } from './blocks/TitleRequestsBlock';
import { ParcelsWithTitleBlock } from './blocks/ParcelsWithTitleBlock';
import { ContributionsBlock } from './blocks/ContributionsBlock';
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
  { id: 'contributions', name: 'Contributions', icon: Database },
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

      <TabsContent value="title-requests" className="mt-1.5">
        <TitleRequestsBlock data={analytics} />
      </TabsContent>
      <TabsContent value="parcels-titled" className="mt-1.5">
        <ParcelsWithTitleBlock data={analytics} />
      </TabsContent>
      <TabsContent value="contributions" className="mt-1.5">
        <ContributionsBlock data={analytics} />
      </TabsContent>
      <TabsContent value="expertise" className="mt-1.5">
        <ExpertiseBlock data={analytics} />
      </TabsContent>
      <TabsContent value="mutations" className="mt-1.5">
        <MutationBlock data={analytics} />
      </TabsContent>
      <TabsContent value="subdivision" className="mt-1.5">
        <SubdivisionBlock data={analytics} />
      </TabsContent>
      <TabsContent value="disputes" className="mt-1.5">
        <DisputesBlock data={analytics} />
      </TabsContent>
      <TabsContent value="lifting" className="mt-1.5">
        <DisputeLiftingBlock data={analytics} />
      </TabsContent>
    </Tabs>
  );
};

export default memo(ProvinceDataVisualization);
