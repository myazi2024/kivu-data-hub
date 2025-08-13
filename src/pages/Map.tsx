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
        <Tabs defaultValue="drc-map" className="h-[calc(100vh-64px)]">
          <div className="bg-muted/30 border-b">
            <div className="max-w-7xl mx-auto px-4">
              <TabsList className="grid w-full max-w-md grid-cols-2 h-12">
                <TabsTrigger value="drc-map" className="text-sm">Carte RDC</TabsTrigger>
                <TabsTrigger value="territorial-map" className="text-sm">Cartographie Territoriale</TabsTrigger>
              </TabsList>
            </div>
          </div>
          
          <TabsContent value="drc-map" className="h-full m-0 data-[state=active]:h-full">
            <DRCInteractiveMap />
          </TabsContent>
          
          <TabsContent value="territorial-map" className="h-full m-0 data-[state=active]:h-full">
            <TerritorialMap />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Map;