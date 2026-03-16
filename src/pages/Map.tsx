import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/ui/navigation';
import DRCInteractiveMap from '@/components/DRCInteractiveMap';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const Map = () => {
  const navigate = useNavigate();

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