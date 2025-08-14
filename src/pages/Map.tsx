import React from 'react';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import TerritorialMap from '@/components/TerritorialMap';
import DRCInteractiveMap from '@/components/DRCInteractiveMap';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Map = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto h-[calc(100vh-64px)]">
          <Tabs defaultValue="drc-map" className="h-full">
            <TabsContent value="drc-map" className="h-full m-0 p-2 sm:p-4 data-[state=active]:h-full">
              <DRCInteractiveMap />
            </TabsContent>
            
            <TabsContent value="territorial-map" className="h-full m-0 p-2 sm:p-4 data-[state=active]:h-full">
              <TerritorialMap />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Map;