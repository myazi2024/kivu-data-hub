import React, { useState, memo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FileText, Map, Search, ArrowRightLeft, Scissors, AlertTriangle, ShieldCheck, Loader2, Database, MapPin, History, ShieldAlert, Award, Receipt } from 'lucide-react';
import { useLandDataAnalytics } from '@/hooks/useLandDataAnalytics';
import { TitleRequestsBlock } from './blocks/TitleRequestsBlock';
import { ParcelsWithTitleBlock } from './blocks/ParcelsWithTitleBlock';
import { ContributionsBlock } from './blocks/ContributionsBlock';
import { ExpertiseBlock } from './blocks/ExpertiseBlock';
import { MutationBlock } from './blocks/MutationBlock';
import { SubdivisionBlock } from './blocks/SubdivisionBlock';
import { DisputesBlock } from './blocks/DisputesBlock';
import { DisputeLiftingBlock } from './blocks/DisputeLiftingBlock';
import { BoundaryConflictsBlock } from './blocks/BoundaryConflictsBlock';
import { OwnershipHistoryBlock } from './blocks/OwnershipHistoryBlock';
import { FraudAttemptsBlock } from './blocks/FraudAttemptsBlock';
import { CertificatesBlock } from './blocks/CertificatesBlock';
import { InvoicesBlock } from './blocks/InvoicesBlock';
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
  { id: 'boundary', name: 'Conflits limites', icon: MapPin },
  { id: 'ownership', name: 'Historique prop.', icon: History },
  { id: 'fraud', name: 'Fraude', icon: ShieldAlert },
  { id: 'certificates', name: 'Certificats', icon: Award },
  { id: 'invoices', name: 'Factures', icon: Receipt },
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

  const renderContent = () => {
    switch (activeTab) {
      case 'title-requests': return <TitleRequestsBlock data={analytics} />;
      case 'parcels-titled': return <ParcelsWithTitleBlock data={analytics} />;
      case 'contributions': return <ContributionsBlock data={analytics} />;
      case 'expertise': return <ExpertiseBlock data={analytics} />;
      case 'mutations': return <MutationBlock data={analytics} />;
      case 'subdivision': return <SubdivisionBlock data={analytics} />;
      case 'disputes': return <DisputesBlock data={analytics} />;
      case 'lifting': return <DisputeLiftingBlock data={analytics} />;
      case 'boundary': return <BoundaryConflictsBlock data={analytics} />;
      case 'ownership': return <OwnershipHistoryBlock data={analytics} />;
      case 'fraud': return <FraudAttemptsBlock data={analytics} />;
      case 'certificates': return <CertificatesBlock data={analytics} />;
      case 'invoices': return <InvoicesBlock data={analytics} />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-row lg:flex-col h-full w-full">
      {/* Tabs - vertical on mobile, horizontal on desktop */}
      <div className="w-10 sm:w-12 lg:w-full shrink-0 overflow-y-auto overflow-x-hidden lg:overflow-y-hidden lg:overflow-x-auto scrollbar-hide border-r lg:border-r-0 lg:border-b border-border/40 bg-muted/30">
        <div className="flex flex-col lg:flex-row lg:items-center gap-0.5 p-0.5 lg:w-max">
          {blocks.map((block) => {
            const isActive = activeTab === block.id;
            return (
              <button
                key={block.id}
                onClick={() => setActiveTab(block.id)}
                className={`flex items-center justify-center lg:justify-start gap-1 px-1 py-1.5 lg:px-2 lg:py-1.5 text-[9px] sm:text-[10px] whitespace-nowrap rounded-md transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                }`}
                title={block.name}
              >
                <block.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                <span className="hidden lg:inline">{block.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 overflow-auto p-1 lg:p-0 lg:mt-1.5">
        {renderContent()}
      </div>
    </div>
  );
};

export default memo(ProvinceDataVisualization);
