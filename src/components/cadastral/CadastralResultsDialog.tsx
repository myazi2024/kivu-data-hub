import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CadastralSearchResult } from '@/hooks/useCadastralSearch';
import CadastralResultCard from './CadastralResultCard';

interface CadastralResultsDialogProps {
  result: CadastralSearchResult;
  isOpen: boolean;
  onClose: () => void;
  selectedServices?: string[];
}

const CadastralResultsDialog: React.FC<CadastralResultsDialogProps> = ({ 
  result, 
  isOpen, 
  onClose,
  selectedServices = [] 
}) => {
  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
  };

  // Empêcher la fermeture par clic sur overlay - uniquement via le bouton
  const handleOverlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={handleOverlayClick}
    >
      <Card className="w-full h-full max-h-screen overflow-hidden bg-background border shadow-2xl flex flex-col">
        {/* Header fixe avec bouton fermer */}
        <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur shrink-0">
          <div>
            <h2 className="text-xl font-semibold">Résultats de la recherche cadastrale</h2>
            <p className="text-sm text-muted-foreground">
              Parcelle: <span className="font-mono">{result.parcel.parcel_number}</span>
            </p>
          </div>
          <Button 
            variant="outline"
            onClick={handleClose}
            className="shrink-0 gap-2"
          >
            <X className="h-4 w-4" />
            Fermer cette page
          </Button>
        </div>
        
        {/* Contenu scrollable */}
        <div className="flex-1 overflow-auto p-4">
          <CadastralResultCard 
            result={result}
            onClose={handleClose}
            selectedServices={selectedServices}
          />
        </div>
      </Card>
    </div>
  );
};

export default CadastralResultsDialog;