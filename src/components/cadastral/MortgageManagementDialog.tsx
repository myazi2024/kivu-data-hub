import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Landmark, Plus, FileX2 } from 'lucide-react';
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
  const [showIntro, setShowIntro] = useState(true);
  const [activeTab, setActiveTab] = useState<MortgageTab>('add');

  // Keys to force remount sub-dialogs on tab switch (fixes #4: state not reset)
  const [addKey, setAddKey] = useState(0);
  const [removeKey, setRemoveKey] = useState(0);
  
  // Ref to track if user clicked "Continue" vs dismissed the intro
  const introCompletedRef = useRef(false);

  // Reset ref when dialog opens
  useEffect(() => {
    if (open) {
      introCompletedRef.current = false;
    }
  }, [open]);

  const handleIntroComplete = () => {
    introCompletedRef.current = true;
    setShowIntro(false);
  };

  const handleClose = useCallback(() => {
    setShowIntro(true);
    setActiveTab('add');
    introCompletedRef.current = false;
    // Increment keys to force fresh state on next open
    setAddKey(k => k + 1);
    setRemoveKey(k => k + 1);
    onOpenChange(false);
  }, [onOpenChange]);

  // Fix #4: Reset sub-form state when switching tabs
  const handleTabChange = useCallback((tab: MortgageTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    // Force remount of the other tab's component
    if (tab === 'add') setAddKey(k => k + 1);
    else setRemoveKey(k => k + 1);
  }, [activeTab]);

  // Show intro first
  if (open && showIntro) {
    return (
      <FormIntroDialog
        open={true}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            if (introCompletedRef.current) {
              introCompletedRef.current = false;
            } else {
              handleClose();
            }
          }
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
        <div className="px-4 pt-5 pb-2 flex-shrink-0">
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
              onClick={() => handleTabChange('add')}
              className="flex-1 h-9 rounded-xl text-xs font-semibold gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Enregistrer
            </Button>
            <Button
              variant={activeTab === 'remove' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => handleTabChange('remove')}
              className="flex-1 h-9 rounded-xl text-xs font-semibold gap-1.5"
            >
              <FileX2 className="h-3.5 w-3.5" />
              Radiation
            </Button>
          </div>
        </div>

        {/* Render the selected form inline — no double scroll */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === 'add' ? (
            <MortgageFormDialog
              key={`add-${addKey}`}
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
              key={`remove-${removeKey}`}
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
