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
      
      {/* Bouton Retour mobile */}
      <div className="lg:hidden px-3 py-1.5 bg-background border-b flex-shrink-0">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground h-7 text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour
        </Button>
      </div>
      
      <main className="flex-1 min-h-0 bg-background overflow-hidden">
        <DRCInteractiveMap />
      </main>
    </div>
  );
};

export default Map;