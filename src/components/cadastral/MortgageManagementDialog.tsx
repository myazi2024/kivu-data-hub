import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Landmark, Plus, FileX2, ArrowRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import FormIntroDialog, { FORM_INTRO_CONFIGS } from './FormIntroDialog';
import MortgageFormDialog from './MortgageFormDialog';
import MortgageCancellationDialog from './MortgageCancellationDialog';

interface MortgageManagementDialogProps {
  parcelNumber: string;
  parcelId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type MortgageOperation = null | 'add' | 'remove';

const MortgageManagementDialog: React.FC<MortgageManagementDialogProps> = ({
  parcelNumber,
  parcelId,
  open,
  onOpenChange
}) => {
  const isMobile = useIsMobile();
  const [showIntro, setShowIntro] = useState(true);
  const [selectedOperation, setSelectedOperation] = useState<MortgageOperation>(null);

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  const handleSelectOperation = (op: MortgageOperation) => {
    setSelectedOperation(op);
  };

  const handleClose = () => {
    setShowIntro(true);
    setSelectedOperation(null);
    onOpenChange(false);
  };

  const handleSubDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedOperation(null);
    }
  };

  // Show intro first
  if (open && showIntro) {
    return (
      <FormIntroDialog
        open={true}
        onOpenChange={(isOpen) => {
          if (!isOpen) handleClose();
        }}
        onContinue={handleIntroComplete}
        config={FORM_INTRO_CONFIGS.mortgage_management}
      />
    );
  }

  // Show sub-dialogs if operation is selected
  if (selectedOperation === 'add') {
    return (
      <MortgageFormDialog
        parcelNumber={parcelNumber}
        parcelId={parcelId}
        open={true}
        onOpenChange={(isOpen) => {
          if (!isOpen) handleClose();
        }}
        skipIntro
      />
    );
  }

  if (selectedOperation === 'remove') {
    return (
      <MortgageCancellationDialog
        parcelNumber={parcelNumber}
        parcelId={parcelId}
        open={true}
        onOpenChange={(isOpen) => {
          if (!isOpen) handleClose();
        }}
        skipIntro
      />
    );
  }

  // Show operation choice
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-w-[380px] max-h-[85vh] p-0 rounded-2xl z-[1200]">
        <div className="px-4 pt-6 pb-2">
          <DialogHeader className="space-y-1">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Landmark className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <DialogTitle className="text-lg font-bold text-center">
              Gestion Hypothèque
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground text-center">
              Parcelle: <span className="font-mono font-semibold text-foreground">{parcelNumber}</span>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-4 pb-4 space-y-3">
          <p className="text-sm text-muted-foreground text-center">
            Quelle opération souhaitez-vous effectuer ?
          </p>

          {/* Option: Ajouter une hypothèque */}
          <Card
            className="rounded-2xl shadow-md border-border/50 cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-amber-500/30 hover:scale-[1.01] active:scale-[0.99]"
            onClick={() => handleSelectOperation('add')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Plus className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold">Enregistrer une hypothèque</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Inscrire une nouvelle garantie hypothécaire sur cette parcelle
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          {/* Option: Retirer une hypothèque */}
          <Card
            className="rounded-2xl shadow-md border-border/50 cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-red-500/30 hover:scale-[1.01] active:scale-[0.99]"
            onClick={() => handleSelectOperation('remove')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <FileX2 className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold">Demander une radiation</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Supprimer une hypothèque existante après remboursement
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Button
            variant="outline"
            onClick={handleClose}
            className="w-full h-10 rounded-xl text-sm"
          >
            Annuler
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MortgageManagementDialog;
