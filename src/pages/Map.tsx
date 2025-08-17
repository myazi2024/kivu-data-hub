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
      <main className="pt-16 min-h-screen bg-background">
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
          <div className="h-[85vh]">
            <DRCInteractiveMap />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Map;