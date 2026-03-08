import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Building2, FileCheck } from 'lucide-react';
import FormIntroDialog, { FORM_INTRO_CONFIGS } from './FormIntroDialog';
import BuildingPermitFormDialog from './BuildingPermitFormDialog';

interface BuildingPermitManagementDialogProps {
  parcelNumber: string;
  parcelId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PermitTab = 'construction' | 'regularisation';

const BuildingPermitManagementDialog: React.FC<BuildingPermitManagementDialogProps> = ({
  parcelNumber,
  parcelId,
  open,
  onOpenChange
}) => {
  const [showIntro, setShowIntro] = useState(true);
  const [activeTab, setActiveTab] = useState<PermitTab>('construction');

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  const handleClose = () => {
    setShowIntro(true);
    setActiveTab('construction');
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
        config={FORM_INTRO_CONFIGS.permit_add}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-w-[380px] max-h-[85vh] p-0 rounded-2xl z-[1200] flex flex-col overflow-hidden">
        <div className="px-4 pt-5 pb-2 flex-shrink-0">
          <DialogHeader className="space-y-1">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Building2 className="h-4.5 w-4.5 text-blue-600" />
              </div>
            </div>
            <DialogTitle className="text-base font-bold text-center">
              Ajouter une autorisation
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground text-center">
              Parcelle: <span className="font-mono font-semibold text-foreground">{parcelNumber}</span>
            </DialogDescription>
          </DialogHeader>

          {/* Tab buttons */}
          <div className="flex gap-2 mt-3">
            <Button
              variant={activeTab === 'construction' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('construction')}
              className="flex-1 h-9 rounded-xl text-xs font-semibold gap-1.5"
            >
              <Building2 className="h-3.5 w-3.5" />
              Bâtir
            </Button>
            <Button
              variant={activeTab === 'regularisation' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('regularisation')}
              className="flex-1 h-9 rounded-xl text-xs font-semibold gap-1.5"
            >
              <FileCheck className="h-3.5 w-3.5" />
              Régularisation
            </Button>
          </div>
        </div>

        {/* Render only the active tab form (lazy) - key forces remount on tab switch */}
        <div className="overflow-y-auto flex-1 min-h-0" style={{ maxHeight: 'calc(85vh - 140px)' }}>
          <BuildingPermitFormDialog
            key={activeTab}
            parcelNumber={parcelNumber}
            parcelId={parcelId}
            permitType={activeTab}
            open={true}
            onOpenChange={(isOpen) => {
              if (!isOpen) handleClose();
            }}
            embedded
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BuildingPermitManagementDialog;
