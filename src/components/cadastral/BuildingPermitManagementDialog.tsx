import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-4.5 w-4.5 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-base font-bold text-center">
              Ajouter un permis
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground text-center">
              Parcelle: <span className="font-mono font-semibold text-foreground">{parcelNumber}</span>
            </DialogDescription>
          </DialogHeader>

          {/* Tab buttons */}
          <div className="grid grid-cols-2 gap-1.5 mt-3">
            <button
              onClick={() => setActiveTab('construction')}
              className={`flex items-center justify-center gap-1 h-8 rounded-lg text-[11px] font-semibold transition-all ${
                activeTab === 'construction'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Building2 className="h-3 w-3" />
              Construire
            </button>
            <button
              onClick={() => setActiveTab('regularisation')}
              className={`flex items-center justify-center gap-1 h-8 rounded-lg text-[11px] font-semibold transition-all ${
                activeTab === 'regularisation'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <FileCheck className="h-3 w-3" />
              Régularisation
            </button>
          </div>
        </div>

        {/* Render the selected form inline */}
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
