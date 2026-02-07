import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import WhatsAppFloatingButton from './WhatsAppFloatingButton';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Landmark, FileX2, Plus, Minus } from 'lucide-react';
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

type MortgageMode = 'add' | 'remove';

const MortgageManagementDialog: React.FC<MortgageManagementDialogProps> = ({
  parcelNumber,
  parcelId,
  open,
  onOpenChange
}) => {
  const isMobile = useIsMobile();
  const [showIntro, setShowIntro] = useState(true);
  const [mode, setMode] = useState<MortgageMode>('add');

  // Ouvrir le sous-dialogue correspondant
  const [showSubDialog, setShowSubDialog] = useState(false);

  useEffect(() => {
    if (open) {
      setShowIntro(true);
      setShowSubDialog(false);
    }
  }, [open]);

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  const handleModeSelect = (selectedMode: MortgageMode) => {
    setMode(selectedMode);
  };

  const handleContinue = () => {
    // Fermer ce dialogue et ouvrir le sous-dialogue
    setShowSubDialog(true);
  };

  const handleSubDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      setShowSubDialog(false);
      onOpenChange(false);
    }
  };

  // Merged intro config
  const mergedIntroConfig = {
    title: 'Gestion d\'hypothèque',
    subtitle: 'Constitution ou radiation de garantie hypothécaire',
    aboutService: 'Ce service vous permet de gérer les hypothèques inscrites sur votre bien immobilier. Vous pouvez enregistrer une nouvelle hypothèque (constitution de garantie au profit d\'un créancier) ou demander la radiation d\'une hypothèque existante (suppression de l\'inscription après remboursement intégral ou accord amiable).',
    estimatedTime: '1 à 3 minutes',
    processingTime: '3 à 14 jours ouvrables selon l\'opération',
    requiredInfo: [
      'Pour l\'ajout : montant, identité du créancier, date du contrat, justificatif',
      'Pour la radiation : numéro de référence de l\'hypothèque, motif, accord du créancier',
      'Documents justificatifs (contrat notarié, attestation de remboursement, etc.)',
      'Identité complète du demandeur et qualité juridique'
    ],
    userResponsibility: 'En soumettant cette demande, vous certifiez être le propriétaire légitime du bien ou disposer d\'une procuration valide. Vous attestez que les informations fournies sont exactes et conformes aux documents contractuels. Toute déclaration mensongère engage votre responsabilité civile et pénale.',
    helpInfo: [
      'Des bulles d\'information contextuelle vous guident à chaque étape',
      'Le système vérifie automatiquement la cohérence des informations saisies',
      'Notre équipe d\'assistance est disponible 24h/24 via WhatsApp'
    ],
    buttonLabel: 'Continuer'
  };

  if (showIntro && open) {
    return (
      <FormIntroDialog
        open={open}
        onOpenChange={onOpenChange}
        onContinue={handleIntroComplete}
        config={mergedIntroConfig}
      />
    );
  }

  // If sub-dialog is open, render it instead
  if (showSubDialog) {
    if (mode === 'add') {
      return (
        <MortgageFormDialog
          parcelNumber={parcelNumber}
          parcelId={parcelId}
          open={true}
          onOpenChange={handleSubDialogClose}
          skipIntro
        />
      );
    }
    return (
      <MortgageCancellationDialog
        parcelNumber={parcelNumber}
        parcelId={parcelId}
        open={true}
        onOpenChange={handleSubDialogClose}
        skipIntro
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isMobile ? 'max-w-[95vw]' : 'max-w-md'} rounded-2xl p-0 gap-0 max-h-[90vh] overflow-hidden z-[1200]`}>
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Landmark className="h-5 w-5 text-amber-600" />
            Gestion Hypothèque
          </DialogTitle>
          <DialogDescription className="text-xs">
            Parcelle: {parcelNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Choisissez l'opération souhaitée :
          </p>

          {/* Toggle buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={mode === 'add' ? 'default' : 'outline'}
              onClick={() => handleModeSelect('add')}
              className={`h-auto py-4 px-3 rounded-xl flex flex-col items-center gap-2 transition-all ${
                mode === 'add'
                  ? 'bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg scale-[1.02]'
                  : 'border-2 hover:border-amber-300'
              }`}
            >
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                mode === 'add' ? 'bg-white/20' : 'bg-amber-500/10'
              }`}>
                <Plus className={`h-5 w-5 ${mode === 'add' ? 'text-white' : 'text-amber-600'}`} />
              </div>
              <div className="text-center">
                <span className="text-sm font-semibold block">Ajouter</span>
                <span className={`text-[10px] ${mode === 'add' ? 'text-white/80' : 'text-muted-foreground'}`}>
                  Enregistrer une hypothèque
                </span>
              </div>
            </Button>

            <Button
              variant={mode === 'remove' ? 'default' : 'outline'}
              onClick={() => handleModeSelect('remove')}
              className={`h-auto py-4 px-3 rounded-xl flex flex-col items-center gap-2 transition-all ${
                mode === 'remove'
                  ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg scale-[1.02]'
                  : 'border-2 hover:border-red-300'
              }`}
            >
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                mode === 'remove' ? 'bg-white/20' : 'bg-red-500/10'
              }`}>
                <Minus className={`h-5 w-5 ${mode === 'remove' ? 'text-white' : 'text-red-600'}`} />
              </div>
              <div className="text-center">
                <span className="text-sm font-semibold block">Retirer</span>
                <span className={`text-[10px] ${mode === 'remove' ? 'text-white/80' : 'text-muted-foreground'}`}>
                  Demander une radiation
                </span>
              </div>
            </Button>
          </div>

          {/* Description contextuelle */}
          <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
            {mode === 'add' ? (
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Ajout d'hypothèque :</strong> Enregistrez une garantie hypothécaire active sur cette parcelle au profit d'un créancier (banque, microfinance, particulier).
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Radiation d'hypothèque :</strong> Demandez la suppression officielle d'une inscription hypothécaire après remboursement intégral ou accord amiable avec le créancier.
              </p>
            )}
          </div>

          <Button
            onClick={handleContinue}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80"
          >
            Continuer
          </Button>
        </div>
      </DialogContent>
      {open && <WhatsAppFloatingButton message="Bonjour, j'ai besoin d'aide avec la gestion d'hypothèque." />}
    </Dialog>
  );
};

export default MortgageManagementDialog;
