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
      <main className="pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Cartographie Interactive
            </h1>
            <p className="text-muted-foreground text-lg">
              Explorez les données immobilières de Goma et de la RDC à travers notre cartographie interactive
            </p>
          </div>
          
          <Tabs defaultValue="drc-map" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="drc-map">Carte RDC</TabsTrigger>
              <TabsTrigger value="territorial-map">Cartographie Territoriale</TabsTrigger>
            </TabsList>
            
            <TabsContent value="drc-map">
              <DRCInteractiveMap />
            </TabsContent>
            
            <TabsContent value="territorial-map">
              <TerritorialMap />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Map;