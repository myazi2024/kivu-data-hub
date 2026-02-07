import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Landmark, Plus, FileX2 } from 'lucide-react';
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

type MortgageTab = 'add' | 'remove';

const MortgageManagementDialog: React.FC<MortgageManagementDialogProps> = ({
  parcelNumber,
  parcelId,
  open,
  onOpenChange
}) => {
  const isMobile = useIsMobile();
  const [showIntro, setShowIntro] = useState(true);
  const [activeTab, setActiveTab] = useState<MortgageTab>('add');

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  const handleClose = () => {
    setShowIntro(true);
    setActiveTab('add');
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
        config={FORM_INTRO_CONFIGS.mortgage_management}
      />
    );
  }

  // After intro, show the tabbed form
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-w-[380px] max-h-[85vh] p-0 rounded-2xl z-[1200]">
        <div className="px-4 pt-5 pb-2">
          <DialogHeader className="space-y-1">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Landmark className="h-4.5 w-4.5 text-amber-600" />
              </div>
            </div>
            <DialogTitle className="text-base font-bold text-center">
              Gestion Hypothèque
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground text-center">
              Parcelle: <span className="font-mono font-semibold text-foreground">{parcelNumber}</span>
            </DialogDescription>
          </DialogHeader>

          {/* Tab buttons */}
          <div className="flex gap-2 mt-3">
            <Button
              variant={activeTab === 'add' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('add')}
              className="flex-1 h-9 rounded-xl text-xs font-semibold gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Enregistrer
            </Button>
            <Button
              variant={activeTab === 'remove' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('remove')}
              className="flex-1 h-9 rounded-xl text-xs font-semibold gap-1.5"
            >
              <FileX2 className="h-3.5 w-3.5" />
              Radiation
            </Button>
          </div>
        </div>

        {/* Render the selected form inline */}
        <div className="px-0 pb-0">
          {activeTab === 'add' ? (
            <MortgageFormDialog
              parcelNumber={parcelNumber}
              parcelId={parcelId}
              open={true}
              onOpenChange={(isOpen) => {
                if (!isOpen) handleClose();
              }}
              skipIntro
              embedded
            />
          ) : (
            <MortgageCancellationDialog
              parcelNumber={parcelNumber}
              parcelId={parcelId}
              open={true}
              onOpenChange={(isOpen) => {
                if (!isOpen) handleClose();
              }}
              skipIntro
              embedded
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MortgageManagementDialog;
