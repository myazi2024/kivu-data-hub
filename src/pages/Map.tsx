import React from 'react';
import Navigation from '@/components/ui/navigation';
import DRCInteractiveMap from '@/components/DRCInteractiveMap';

const Map = () => {

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      <Navigation />
      
      <main className="flex-1 min-h-0 bg-background overflow-hidden">
        <DRCInteractiveMap />
      </main>
    </div>
  );
};

export default Map;