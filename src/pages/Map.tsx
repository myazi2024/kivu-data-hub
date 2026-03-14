import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import TerritorialMap from '@/components/TerritorialMap';
import DRCInteractiveMap from '@/components/DRCInteractiveMap';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const Map = () => {
  const navigate = useNavigate();

  return (
    <div className="h-dvh flex flex-col">
      <Navigation />
      
      {/* Bouton Retour mobile */}
      <div className="lg:hidden px-4 py-2 bg-background border-b">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
      </div>
      
      <main className="flex-1 bg-background overflow-hidden">
        <div className="h-full">
          <DRCInteractiveMap />
        </div>
      </main>
    </div>
  );
};

export default Map;