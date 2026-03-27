import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  fromMap?: boolean;
}

const CadastralResultsDialog: React.FC<CadastralResultsDialogProps> = ({ 
  result, 
  isOpen, 
  onClose,
  selectedServices = [],
  onPaymentSuccess,
  fromMap = false
}) => {
  const navigate = useNavigate();
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
  
  const handleBackToMap = () => {
    navigate('/cadastral-map');
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
      className="fixed inset-0 z-[1500] bg-black/60 backdrop-blur-sm"
      data-results-dialog
      onClick={handleOverlayClick}
    >
      <Card className="relative w-full h-full overflow-hidden bg-background flex flex-col md:m-4 md:max-w-4xl md:mx-auto md:max-h-[90vh] md:rounded-2xl md:shadow-2xl">
        {/* Bouton fermer unique en haut à droite */}
        <button
          type="button"
          aria-label="Fermer"
          onClick={handleClose}
          className="absolute inline-flex items-center justify-center h-8 w-8 rounded-xl border bg-background/95 backdrop-blur-sm text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring z-[1501] top-3 right-3"
        >
          <X className="h-4 w-4" />
        </button>
        
        {/* Header compact */}
        <div className="sticky top-0 z-[1501] flex items-center gap-2 px-3 py-2.5 border-b bg-background/95 backdrop-blur-sm shrink-0">
          {fromMap && (
            <Button 
              variant="ghost"
              size="sm"
              onClick={handleBackToMap}
              className="h-8 w-8 p-0 rounded-xl"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex-1 min-w-0 pr-8" data-service-catalog>
            <h2 className="text-sm font-semibold truncate">
              Catalogue de services
            </h2>
            <p className="text-xs text-muted-foreground truncate">
              Parcelle <span className="font-mono">{result.parcel.parcel_number}</span>
            </p>
          </div>
        </div>
        
        {/* Contenu scrollable optimisé mobile */}
        <div className="flex-1 overflow-auto p-2.5 sm:p-3" data-results-scroll>
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