import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Receipt, Calculator, Plus, DollarSign } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import FormIntroDialog, { FORM_INTRO_CONFIGS } from './FormIntroDialog';
import TaxFormDialog from './TaxFormDialog';
import PropertyTaxCalculator from './PropertyTaxCalculator';
import IRLCalculator from './IRLCalculator';
import WhatsAppFloatingButton from './WhatsAppFloatingButton';

interface TaxManagementDialogProps {
  parcelNumber: string;
  parcelId?: string;
  parcelData?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ActiveTab = 'foncier' | 'irl' | 'add';

const TaxManagementDialog: React.FC<TaxManagementDialogProps> = ({
  parcelNumber, parcelId, parcelData, open, onOpenChange
}) => {
  const isMobile = useIsMobile();
  const [showIntro, setShowIntro] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('foncier');

  useEffect(() => {
    if (open) {
      setShowIntro(true);
      setActiveTab('foncier');
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
          title: 'Déclaration d\'impôts',
          aboutService: 'Ce service vous permet de déclarer vos impôts séparément : l\'Impôt Foncier Annuel (perçu par la DGI) et l\'Impôt sur le Revenu Locatif (perçu par la DGR). Chaque déclaration génère une fiche qui sera transmise à l\'entité administrative compétente accompagnée du paiement.',
          requiredInfo: [
            'Numéro d\'Identification Fiscale (NIF)',
            'Caractéristiques de la parcelle (zone, usage, superficie)',
            'Revenus locatifs (pour l\'IRL)',
            'Année fiscale concernée',
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
            Déclaration d'impôts
          </DialogTitle>
          <DialogDescription className="text-xs">
            Parcelle: {parcelNumber}
          </DialogDescription>

          {/* Tab buttons */}
          <div className="flex gap-1.5 mt-3">
            <Button
              variant={activeTab === 'foncier' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('foncier')}
              className={`flex-1 h-9 rounded-xl text-[11px] gap-1 px-2 ${activeTab === 'foncier' ? 'bg-primary text-primary-foreground' : ''}`}
            >
              <Calculator className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">Impôt foncier</span>
            </Button>
            <Button
              variant={activeTab === 'irl' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('irl')}
              className={`flex-1 h-9 rounded-xl text-[11px] gap-1 px-2 ${activeTab === 'irl' ? 'bg-primary text-primary-foreground' : ''}`}
            >
              <DollarSign className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">Revenu locatif</span>
            </Button>
            <Button
              variant={activeTab === 'add' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('add')}
              className={`flex-1 h-9 rounded-xl text-[11px] gap-1 px-2 ${activeTab === 'add' ? 'bg-primary text-primary-foreground' : ''}`}
            >
              <Plus className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">Ajouter</span>
            </Button>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 min-h-0" style={{ maxHeight: 'calc(85vh - 180px)' }}>
          {activeTab === 'foncier' && (
            <PropertyTaxCalculator
              parcelNumber={parcelNumber}
              parcelId={parcelId}
              parcelData={parcelData}
            />
          )}
          {activeTab === 'irl' && (
            <IRLCalculator
              parcelNumber={parcelNumber}
              parcelId={parcelId}
              parcelData={parcelData}
            />
          )}
          {activeTab === 'add' && (
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
      {open && <WhatsAppFloatingButton message="Bonjour, j'ai besoin d'aide avec la déclaration d'impôts." />}
    </Dialog>
  );
};

export default TaxManagementDialog;
