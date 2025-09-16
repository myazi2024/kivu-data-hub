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
      <Card className="relative w-full h-full overflow-hidden bg-background flex flex-col md:m-4 md:max-w-6xl md:mx-auto md:max-h-[90vh] md:rounded-lg md:shadow-2xl">
        <button
          type="button"
          aria-label="Fermer"
          onClick={handleClose}
          className="absolute inline-flex items-center justify-center h-10 w-10 rounded-md border bg-background text-foreground shadow hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 z-50 top-[calc(env(safe-area-inset-top)+0.5rem)] right-[calc(env(safe-area-inset-right)+0.5rem)]"
        >
          <X className="h-4 w-4" />
        </button>
        {/* Header fixe avec bouton fermer - Mobile optimized */}
        <div className="sticky top-0 z-40 flex items-center justify-between px-3 pb-3 md:p-4 border-b bg-background/95 backdrop-blur shrink-0 pt-[calc(env(safe-area-inset-top)+0.25rem)] pr-[calc(env(safe-area-inset-right)+0.25rem)]">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg md:text-xl font-semibold truncate">
              Résultats cadastraux
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground truncate">
              <span className="font-mono">{result.parcel.parcel_number}</span>
            </p>
          </div>
          <Button 
            variant="outline"
            onClick={handleClose}
            className="shrink-0 ml-2 h-9 w-9 p-0 md:w-auto md:px-3 md:gap-2 border-2"
          >
            <X className="h-4 w-4" />
            <span className="hidden md:inline">Fermer</span>
          </Button>
        </div>
        
        {/* Contenu scrollable - Mobile optimized */}
        <div className="flex-1 overflow-auto p-3 md:p-4">
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Confirmer la fermeture</AlertDialogTitle>
            <AlertDialogDescription>
              Attention ! Pensez à télécharger ou imprimer votre rapport cadastral avant de fermer. 
              Une fois fermé, vous devrez faire une nouvelle requête pour y accéder à nouveau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelClose}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmClose}>
              Fermer quand même
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CadastralResultsDialog;