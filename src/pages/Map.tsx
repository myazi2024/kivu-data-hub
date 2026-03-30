import React, { useState } from 'react';
import Navigation from '@/components/ui/navigation';
import DRCInteractiveMap from '@/components/DRCInteractiveMap';

const Map = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      {!isFullscreen && <Navigation />}
      
      <main className="flex-1 min-h-0 bg-background overflow-hidden">
        <DRCInteractiveMap onFullscreenChange={setIsFullscreen} />
      </main>
    </div>
  );
};

export default Map;