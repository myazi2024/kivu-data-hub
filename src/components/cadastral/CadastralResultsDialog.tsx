import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CadastralSearchResult } from '@/hooks/useCadastralSearch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import CadastralResultCard from './CadastralResultCard';

interface CadastralResultsDialogProps {
  result: CadastralSearchResult;
  isOpen: boolean;
  onClose: () => void;
  selectedServices?: string[];
  onPaymentSuccess?: (services: string[]) => void;
}

const CadastralResultsDialog: React.FC<CadastralResultsDialogProps> = ({ 
  result, 
  isOpen, 
  onClose,
  selectedServices = [],
  onPaymentSuccess
}) => {
  const [paidServices, setPaidServices] = React.useState<string[]>(selectedServices);
  const [showCloseConfirm, setShowCloseConfirm] = React.useState(false);

  // Protection contre l'actualisation accidentelle de la page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Vous allez perdre vos résultats de recherche cadastrale. Êtes-vous sûr de vouloir quitter cette page ?';
      return 'Vous allez perdre vos résultats de recherche cadastrale. Êtes-vous sûr de vouloir quitter cette page ?';
    };

    if (isOpen) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [isOpen]);
  
  if (!isOpen) return null;

  const handleClose = () => {
    setShowCloseConfirm(true);
  };

  const confirmClose = () => {
    setShowCloseConfirm(false);
    onClose();
  };

  const cancelClose = () => {
    setShowCloseConfirm(false);
  };

  const handlePaymentSuccess = (services: string[]) => {
    setPaidServices(services);
    if (onPaymentSuccess) {
      onPaymentSuccess(services);
    }
  };

  // Empêcher la fermeture par clic sur overlay - uniquement via le bouton
  const handleOverlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <Card className="relative w-full h-[100dvh] md:h-auto overflow-hidden bg-background flex flex-col md:m-4 md:max-w-6xl md:mx-auto md:max-h-[92vh] md:rounded-xl md:shadow-2xl">
        {/* Header fixe - Mobile optimized */}
        <div className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b bg-background/95 backdrop-blur shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold truncate">
              Résultats cadastraux
            </h2>
            <p className="text-[10px] xs:text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
              <span className="font-mono">{result.parcel.parcel_number}</span>
            </p>
          </div>
          <Button 
            variant="outline"
            onClick={handleClose}
            className="shrink-0 ml-2 h-8 w-8 sm:h-9 sm:w-9 p-0 md:w-auto md:px-3 md:gap-2 rounded-xl"
          >
            <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden md:inline">Fermer</span>
          </Button>
        </div>
        
        {/* Contenu scrollable - Mobile optimized */}
        <div className="flex-1 overflow-auto px-3 py-4 md:p-6">
          <CadastralResultCard 
            result={result}
            onClose={handleClose}
            selectedServices={paidServices}
            onPaymentSuccess={handlePaymentSuccess}
          />
        </div>
      </Card>

      {/* Dialog de confirmation de fermeture */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent className="rounded-xl max-w-[calc(100vw-2rem)] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">⚠️ Confirmer la fermeture</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              Attention ! Pensez à télécharger ou imprimer votre rapport cadastral avant de fermer. 
              Une fois fermé, vous devrez faire une nouvelle requête pour y accéder à nouveau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={cancelClose} className="rounded-xl m-0">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmClose} className="rounded-xl m-0">
              Fermer quand même
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CadastralResultsDialog;