import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  onBack: () => void;
  label?: string;
}

/** Generic overlay back button used in sub-layer maps (commune/quartier/territoire) */
export const MapZoomBackButton: React.FC<Props> = ({ onBack, label = 'Retour' }) => (
  <Button
    variant="outline"
    size="icon"
    onClick={onBack}
    aria-label={label}
    title={label}
    className="absolute top-2 right-2 z-20 h-11 w-11 rounded-full bg-background/85 backdrop-blur-sm border-border/50 shadow-sm"
  >
    <ArrowLeft className="h-4 w-4 text-muted-foreground" />
  </Button>
);

export default MapZoomBackButton;
