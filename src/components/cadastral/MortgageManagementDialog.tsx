import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Landmark, Plus, FileX2, AlertTriangle, Loader2 } from 'lucide-react';
import FormIntroDialog, { FORM_INTRO_CONFIGS } from './FormIntroDialog';
import MortgageFormDialog from './MortgageFormDialog';
import MortgageCancellationDialog from './MortgageCancellationDialog';
import WhatsAppFloatingButton from './WhatsAppFloatingButton';
import { supabase } from '@/integrations/supabase/client';

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
  const [addKey, setAddKey] = useState(0);
  const [removeKey, setRemoveKey] = useState(0);
  const introCompletedRef = useRef(false);

  // Fix #15: Check if parcel has active mortgages for the radiation tab
  const [hasActiveMortgage, setHasActiveMortgage] = useState<boolean | null>(null);
  const [checkingMortgage, setCheckingMortgage] = useState(false);

  useEffect(() => {
    if (open) {
      introCompletedRef.current = false;
    }
  }, [open]);

  // Check for active mortgages when dialog opens or parcelId changes
  useEffect(() => {
    const checkActiveMortgages = async () => {
      if (!open || !parcelId) {
        setHasActiveMortgage(null);
        return;
      }
      setCheckingMortgage(true);
      try {
        const { data, error } = await supabase
          .from('cadastral_mortgages')
          .select('id')
          .eq('parcel_id', parcelId)
          .eq('mortgage_status', 'active')
          .limit(1);
        if (!error) {
          setHasActiveMortgage((data?.length ?? 0) > 0);
        }
      } catch {
        setHasActiveMortgage(null);
      } finally {
        setCheckingMortgage(false);
      }
    };
    checkActiveMortgages();
  }, [open, parcelId]);

  const handleIntroComplete = () => {
    introCompletedRef.current = true;
    setShowIntro(false);
  };

  const handleClose = useCallback(() => {
    setShowIntro(true);
    setActiveTab('add');
    introCompletedRef.current = false;
    setAddKey(k => k + 1);
    setRemoveKey(k => k + 1);
    onOpenChange(false);
  }, [onOpenChange]);

  // Fix #24: Reset the tab being LEFT (not the one being entered)
  const handleTabChange = useCallback((tab: MortgageTab) => {
    if (tab === activeTab) return;
    // Reset the component being left
    if (activeTab === 'add') setAddKey(k => k + 1);
    else setRemoveKey(k => k + 1);
    setActiveTab(tab);
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

        {/* Render the selected form inline */}
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
            <>
              {/* Fix #15: Show warning if no active mortgage found */}
              {checkingMortgage && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
              {!checkingMortgage && hasActiveMortgage === false && (
                <div className="px-4 py-3">
                  <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 rounded-xl">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
                      <strong>Aucune hypothèque active détectée</strong> sur cette parcelle.
                      La radiation nécessite un numéro de référence d'hypothèque active.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
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
            </>
          )}
        </div>

        {/* Fix #19: WhatsApp centralized in parent dialog */}
        {open && <WhatsAppFloatingButton message="Bonjour, j'ai besoin d'aide avec la gestion d'hypothèque." />}
      </DialogContent>
    </Dialog>
  );
};

export default MortgageManagementDialog;
