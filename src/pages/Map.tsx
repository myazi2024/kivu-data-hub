import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import Navigation from '@/components/ui/navigation';
import DRCInteractiveMap from '@/components/DRCInteractiveMap';
import { MapProjectionProvider } from '@/components/map/context/MapProjectionContext';

const Map = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      <Helmet>
        <title>Données Foncières — Carte Interactive de la RDC</title>
        <meta name="description" content="Visualisez les données foncières cadastrales de la République Démocratique du Congo : parcelles, titres, contributions, litiges et analyses par province." />
      </Helmet>
      {!isFullscreen && <Navigation />}
      
      <main className="flex-1 min-h-0 bg-background overflow-hidden">
        <MapProjectionProvider>
          <DRCInteractiveMap onFullscreenChange={setIsFullscreen} />
        </MapProjectionProvider>
      </main>
    </div>
  );
};

export default Map;