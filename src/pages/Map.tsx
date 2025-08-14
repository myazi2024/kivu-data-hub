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
        <div className="max-w-7xl mx-auto">
          <Tabs defaultValue="drc-map" className="min-h-[calc(100vh-64px)]">
            <div className="bg-muted/30 border-b">
              <div className="px-2 sm:px-4">
                <TabsList className="grid w-full max-w-xs sm:max-w-md grid-cols-2 h-10 sm:h-12 mx-auto">
                  <TabsTrigger value="drc-map" className="text-xs sm:text-sm px-2 sm:px-4">
                    <span className="hidden sm:inline">Carte RDC</span>
                    <span className="sm:hidden">RDC</span>
                  </TabsTrigger>
                  <TabsTrigger value="territorial-map" className="text-xs sm:text-sm px-2 sm:px-4">
                    <span className="hidden sm:inline">Cartographie Territoriale</span>
                    <span className="sm:hidden">Territorial</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
            
            <TabsContent value="drc-map" className="h-full m-0 data-[state=active]:h-full">
              <div className="container mx-auto p-2 sm:p-4">
                <DRCInteractiveMap />
              </div>
            </TabsContent>
            
            <TabsContent value="territorial-map" className="h-full m-0 data-[state=active]:h-full">
              <div className="container mx-auto p-2 sm:p-4">
                <TerritorialMap />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Map;