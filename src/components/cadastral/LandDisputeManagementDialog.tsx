import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
}

type DisputeTab = 'report' | 'lifting';

const LandDisputeManagementDialog: React.FC<LandDisputeManagementDialogProps> = ({
  parcelNumber,
  parcelId,
  parcelData,
  open,
  onOpenChange
}) => {
  const isMobile = useIsMobile();
  const [showIntro, setShowIntro] = useState(true);
  const [activeTab, setActiveTab] = useState<DisputeTab>('report');

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  const handleClose = () => {
    setShowIntro(true);
    setActiveTab('report');
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
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-w-[380px] max-h-[85vh] p-0 rounded-2xl z-[1200] flex flex-col overflow-hidden w-[calc(100vw-2rem)]">
        <div className="px-3 pt-4 pb-2 flex-shrink-0">
          <DialogHeader className="space-y-1">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Scale className="h-4 w-4 text-orange-600" />
              </div>
            </div>
            <DialogTitle className="text-sm font-bold text-center">
              Litige foncier
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground text-center">
              Parcelle : <span className="font-mono font-semibold text-foreground">{parcelNumber}</span>
            </DialogDescription>
          </DialogHeader>

          {/* Tab buttons */}
          <div className="flex gap-1.5 mt-2">
            <Button
              variant={activeTab === 'report' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('report')}
              className="flex-1 h-8 rounded-xl text-[11px] font-semibold gap-1"
            >
              <AlertTriangle className="h-3 w-3" />
              Signaler
            </Button>
            <Button
              variant={activeTab === 'lifting' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('lifting')}
              className="flex-1 h-8 rounded-xl text-[11px] font-semibold gap-1"
            >
              <FileX2 className="h-3 w-3" />
              Levée
            </Button>
          </div>
        </div>

        {/* Render the selected form inline */}
        <div className="overflow-auto flex-1 min-h-0" style={{ maxHeight: 'calc(85vh - 130px)' }}>
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
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LandDisputeManagementDialog;
