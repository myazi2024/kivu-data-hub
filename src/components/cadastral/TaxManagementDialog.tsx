import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Receipt, Calculator, Plus } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import FormIntroDialog, { FORM_INTRO_CONFIGS } from './FormIntroDialog';
import TaxFormDialog from './TaxFormDialog';
import PropertyTaxCalculator from './PropertyTaxCalculator';
import WhatsAppFloatingButton from './WhatsAppFloatingButton';

interface TaxManagementDialogProps {
  parcelNumber: string;
  parcelId?: string;
  parcelData?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TaxManagementDialog: React.FC<TaxManagementDialogProps> = ({
  parcelNumber,
  parcelId,
  parcelData,
  open,
  onOpenChange
}) => {
  const isMobile = useIsMobile();
  const [showIntro, setShowIntro] = useState(true);
  const [activeTab, setActiveTab] = useState<'add' | 'declare'>('declare');

  useEffect(() => {
    if (open) {
      setShowIntro(true);
      setActiveTab('declare');
    }
  }, [open]);

  if (showIntro && open) {
    return (
      <FormIntroDialog
        open={open}
        onOpenChange={onOpenChange}
        onContinue={() => setShowIntro(false)}
        config={{
          ...FORM_INTRO_CONFIGS.tax,
          title: 'Taxe foncière',
          aboutService: 'Ce service vous permet de calculer et déclarer vos impôts fonciers. Utilisez le calculateur intégré pour estimer le montant de votre taxe en fonction des caractéristiques de votre parcelle, ou enregistrez une taxe déjà payée.',
          requiredInfo: [
            'Caractéristiques de la parcelle (zone, usage, superficie)',
            'Année fiscale concernée',
            'Reçu de paiement (si taxe déjà payée)',
          ],
          buttonLabel: 'Accéder au service',
        }}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isMobile ? 'max-w-[95vw]' : 'max-w-md'} rounded-2xl p-0 gap-0 max-h-[90vh] flex flex-col overflow-hidden z-[1200]`}>
        <DialogHeader className="p-4 pb-2 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5 text-purple-600" />
            Taxe foncière
          </DialogTitle>
          <DialogDescription className="text-xs">
            Parcelle: {parcelNumber}
          </DialogDescription>

          {/* Tab buttons */}
          <div className="flex gap-2 mt-3">
            <Button
              variant={activeTab === 'declare' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('declare')}
              className={`flex-1 h-9 rounded-xl text-xs gap-1.5 ${activeTab === 'declare' ? 'bg-primary text-primary-foreground' : ''}`}
            >
              <Calculator className="h-3.5 w-3.5" />
              Déclarer une taxe
            </Button>
            <Button
              variant={activeTab === 'add' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('add')}
              className={`flex-1 h-9 rounded-xl text-xs gap-1.5 ${activeTab === 'add' ? 'bg-primary text-primary-foreground' : ''}`}
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter une taxe
            </Button>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 min-h-0" style={{ maxHeight: 'calc(85vh - 160px)' }}>
          {activeTab === 'declare' ? (
            <PropertyTaxCalculator
              parcelNumber={parcelNumber}
              parcelId={parcelId}
              parcelData={parcelData}
            />
          ) : (
            <TaxFormDialog
              parcelNumber={parcelNumber}
              parcelId={parcelId}
              open={true}
              onOpenChange={onOpenChange}
              embedded
            />
          )}
        </div>
      </DialogContent>
      {open && <WhatsAppFloatingButton message="Bonjour, j'ai besoin d'aide avec la taxe foncière." />}
    </Dialog>
  );
};

export default TaxManagementDialog;
