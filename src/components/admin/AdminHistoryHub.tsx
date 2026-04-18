import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ParcelTimelineView } from './history/ParcelTimelineView';
import { DisputeMortgageOverlapsPanel } from './history/DisputeMortgageOverlapsPanel';

const AdminHistoryHub = () => {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Hub Historiques & Litiges</h1>
        <p className="text-xs text-muted-foreground">
          Vue transversale par parcelle (propriété, bornage, fiscal, hypothèques, litiges) et alertes croisées
        </p>
      </div>

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline parcelle</TabsTrigger>
          <TabsTrigger value="overlaps">Alertes croisées</TabsTrigger>
        </TabsList>
        <TabsContent value="timeline" className="mt-3">
          <ParcelTimelineView />
        </TabsContent>
        <TabsContent value="overlaps" className="mt-3">
          <DisputeMortgageOverlapsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminHistoryHub;
