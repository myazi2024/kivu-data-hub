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
      <DialogContent className="max-w-[380px] max-h-[85vh] p-0 rounded-2xl z-[1200] flex flex-col overflow-hidden">
        <div className="px-4 pt-3 pb-1.5 flex-shrink-0">
          <DialogHeader className="space-y-0.5">
            <div className="flex items-center justify-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Landmark className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <DialogTitle className="text-sm font-bold">
                Gestion Hypothèque
              </DialogTitle>
            </div>
            <DialogDescription className="text-[11px] text-muted-foreground text-center">
              Parcelle: <span className="font-mono font-semibold text-foreground">{parcelNumber}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-1.5 mt-2">
            <Button
              variant={activeTab === 'add' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('add')}
              className="flex-1 h-7 rounded-lg text-[11px] font-semibold gap-1"
            >
              <Plus className="h-3 w-3" />
              Enregistrer
            </Button>
            <Button
              variant={activeTab === 'remove' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('remove')}
              className="flex-1 h-7 rounded-lg text-[11px] font-semibold gap-1"
            >
              <FileX2 className="h-3 w-3" />
              Radiation
            </Button>
          </div>
        </div>

        {/* Render the selected form inline */}
        <div className="overflow-auto flex-1 min-h-0" style={{ maxHeight: 'calc(85vh - 140px)' }}>
          {activeTab === 'add' ? (
            <MortgageFormDialog
              parcelNumber={parcelNumber}
              parcelId={parcelId}
              open={true}
              onOpenChange={(isOpen) => {
                if (!isOpen) handleClose();
              }}
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
              embedded
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MortgageManagementDialog;
