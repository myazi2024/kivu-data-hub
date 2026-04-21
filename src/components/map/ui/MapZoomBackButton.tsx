import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface Props {
  onClick: () => void;
  label?: string;
}

/** Generic overlay back button to zoom out from a focused entity (commune/quartier/territoire). */
const MapZoomBackButton: React.FC<Props> = ({ onClick, label = 'Retour' }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className="absolute top-2 right-2 z-20 h-6 w-6 rounded-full bg-background/85 backdrop-blur-sm border border-border/50 shadow-sm flex items-center justify-center hover:bg-background transition-colors"
  >
    <ArrowLeft className="h-3 w-3 text-foreground" />
  </button>
);

export default MapZoomBackButton;
