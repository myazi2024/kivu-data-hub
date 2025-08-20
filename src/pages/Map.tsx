import React from 'react';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import TerritorialMap from '@/components/TerritorialMap';
import DRCInteractiveMap from '@/components/DRCInteractiveMap';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Map = () => {
  return (
    <div className="h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 bg-background overflow-hidden">
        <div className="h-full">
          <DRCInteractiveMap />
        </div>
      </main>
    </div>
  );
};

export default Map;