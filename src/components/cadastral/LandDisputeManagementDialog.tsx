import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Scale, AlertTriangle, FileX2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import FormIntroDialog, { FORM_INTRO_CONFIGS } from './FormIntroDialog';
import LandDisputeReportForm from './LandDisputeReportForm';
import LandDisputeLiftingForm from './LandDisputeLiftingForm';

interface LandDisputeManagementDialogProps {
  parcelNumber: string;
  parcelId?: string;
  parcelData?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenServiceCatalog?: () => void;
}

type DisputeTab = 'report' | 'lifting';

const LandDisputeManagementDialog: React.FC<LandDisputeManagementDialogProps> = ({
  parcelNumber,
  parcelId,
  parcelData,
  open,
  onOpenChange,
  onOpenServiceCatalog
}) => {
  const isMobile = useIsMobile();
  const [showIntro, setShowIntro] = useState(true);
  const [activeTab, setActiveTab] = useState<DisputeTab>('report');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showTabSwitchConfirm, setShowTabSwitchConfirm] = useState(false);
  const [pendingTab, setPendingTab] = useState<DisputeTab | null>(null);

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  const checkUnsavedChanges = (): boolean => {
    const eventName = activeTab === 'report' 
      ? 'check-dispute-report-changes' 
      : 'check-dispute-lifting-changes';
    const detail = { hasChanges: false };
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
    return detail.hasChanges;
  };

  const handleAttemptClose = () => {
    if (checkUnsavedChanges()) {
      setShowExitConfirm(true);
    } else {
      handleClose();
    }
  };

  const handleTabSwitch = (tab: DisputeTab) => {
    if (tab === activeTab) return;
    if (checkUnsavedChanges()) {
      setPendingTab(tab);
      setShowTabSwitchConfirm(true);
    } else {
      setActiveTab(tab);
    }
  };

  const confirmTabSwitch = () => {
    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
    setShowTabSwitchConfirm(false);
  };

  const handleClose = () => {
    setShowIntro(true);
    setActiveTab('report');
    setShowExitConfirm(false);
    onOpenChange(false);
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
        config={FORM_INTRO_CONFIGS.land_dispute}
      />
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleAttemptClose(); }}>
        <DialogContent className="max-w-[400px] max-h-[90vh] p-0 rounded-2xl z-[1200] flex flex-col overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex-shrink-0">
            <DialogHeader className="space-y-1">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="h-9 w-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Scale className="h-4.5 w-4.5 text-orange-600" />
                </div>
              </div>
              <DialogTitle className="text-base font-bold text-center">
                Litige foncier
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground text-center">
                Parcelle : <span className="font-mono font-semibold text-foreground">{parcelNumber}</span>
              </DialogDescription>
            </DialogHeader>

            {/* Tab buttons */}
            <div className="flex gap-2 mt-3">
              <Button
                variant={activeTab === 'report' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleTabSwitch('report')}
                className="flex-1 h-10 rounded-xl text-sm font-semibold gap-1.5"
              >
                <AlertTriangle className="h-4 w-4" />
                Signaler
              </Button>
              <Button
                variant={activeTab === 'lifting' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleTabSwitch('lifting')}
                className="flex-1 h-10 rounded-xl text-sm font-semibold gap-1.5"
              >
                <FileX2 className="h-4 w-4" />
                Levée
              </Button>
            </div>
          </div>

          {/* Render the selected form inline */}
          <div className="flex-1 min-h-0 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 140px)' }}>
            {activeTab === 'report' ? (
              <LandDisputeReportForm
                parcelNumber={parcelNumber}
                parcelId={parcelId}
                open={true}
                onOpenChange={(isOpen) => {
                  if (!isOpen) handleClose();
                }}
                embedded
              />
            ) : (
              <LandDisputeLiftingForm
                parcelNumber={parcelNumber}
                parcelId={parcelId}
                open={true}
                onOpenChange={(isOpen) => {
                  if (!isOpen) handleClose();
                }}
                embedded
                onOpenServiceCatalog={onOpenServiceCatalog}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Exit confirmation dialog */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent className="rounded-2xl z-[1300]">
          <AlertDialogHeader>
            <AlertDialogTitle>Quitter le formulaire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous avez des modifications non enregistrées. Vos données saisies seront conservées en brouillon, mais les fichiers joints seront perdus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Continuer la saisie</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Quitter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LandDisputeManagementDialog;
