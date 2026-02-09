import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield, Calculator, DollarSign } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import ExemptionPropertyTaxForm from './exemption/ExemptionPropertyTaxForm';
import ExemptionIRLForm from './exemption/ExemptionIRLForm';
import ExemptionSummaryPage from './exemption/ExemptionSummaryPage';

export interface ExemptionFormData {
  // Common
  ownerName: string;
  nif: string;
  parcelNumber: string;
  province: string;
  ville: string;
  commune: string;
  quartier: string;
  fiscalYear: number;
  // Property tax specific
  selectedExemptions: string[];
  constructionType: string;
  constructionYear: number | null;
  areaSqm: number;
  usageType: string;
  zoneType: string;
  justification: string;
  supportingDocuments: File[];
  // IRL specific
  irlExemptionType: string;
  irlJustification: string;
  irlSupportingDocuments: File[];
  tenantCount: number;
  monthlyRentUsd: number;
  occupancyStartDate: string;
}

const createEmptyFormData = (parcelNumber: string, parcelData?: any): ExemptionFormData => ({
  ownerName: parcelData?.current_owner_name || '',
  nif: '',
  parcelNumber,
  province: parcelData?.province || '',
  ville: parcelData?.ville || '',
  commune: parcelData?.commune || '',
  quartier: parcelData?.quartier || '',
  fiscalYear: new Date().getFullYear(),
  selectedExemptions: [],
  constructionType: parcelData?.construction_type || '',
  constructionYear: parcelData?.construction_year || null,
  areaSqm: parcelData?.area_sqm || 0,
  usageType: parcelData?.declared_usage || '',
  zoneType: parcelData?.parcel_type || 'urban',
  justification: '',
  supportingDocuments: [],
  irlExemptionType: '',
  irlJustification: '',
  irlSupportingDocuments: [],
  tenantCount: 0,
  monthlyRentUsd: 0,
  occupancyStartDate: '',
});

interface ExemptionRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcelNumber: string;
  parcelData?: any;
}

type ActiveTab = 'property' | 'irl';
type FormStep = 'form' | 'summary';

const ExemptionRequestDialog: React.FC<ExemptionRequestDialogProps> = ({
  open, onOpenChange, parcelNumber, parcelData
}) => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<ActiveTab>('property');
  const [formStep, setFormStep] = useState<FormStep>('form');
  const [formData, setFormData] = useState<ExemptionFormData>(() => createEmptyFormData(parcelNumber, parcelData));

  const handleReset = () => {
    setFormData(createEmptyFormData(parcelNumber, parcelData));
    setFormStep('form');
    setActiveTab('property');
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(handleReset, 300);
  };

  const taxTypeLabel = activeTab === 'property' ? 'Impôt Foncier' : 'Impôt sur le Revenu Locatif (IRL)';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={`${isMobile ? 'max-w-[95vw]' : 'max-w-md'} rounded-2xl p-0 gap-0 max-h-[90vh] flex flex-col overflow-hidden z-[1300]`}>
        <DialogHeader className="p-4 pb-2 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-purple-600" />
            Demande d'exonération fiscale
          </DialogTitle>
          <DialogDescription className="text-xs">
            Parcelle: {parcelNumber}
          </DialogDescription>

          {formStep === 'form' && (
            <div className="flex gap-1.5 mt-3">
              <Button
                variant={activeTab === 'property' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('property')}
                className={`flex-1 h-9 rounded-xl text-[11px] gap-1 px-2 ${activeTab === 'property' ? 'bg-primary text-primary-foreground' : ''}`}
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
            </div>
          )}
        </DialogHeader>

        <div className="overflow-y-auto flex-1 min-h-0" style={{ maxHeight: 'calc(85vh - 180px)' }}>
          {formStep === 'summary' ? (
            <ExemptionSummaryPage
              formData={formData}
              taxType={activeTab}
              taxTypeLabel={taxTypeLabel}
              onBack={() => setFormStep('form')}
              onClose={handleClose}
            />
          ) : activeTab === 'property' ? (
            <ExemptionPropertyTaxForm
              formData={formData}
              setFormData={setFormData}
              parcelData={parcelData}
              onSubmit={() => setFormStep('summary')}
            />
          ) : (
            <ExemptionIRLForm
              formData={formData}
              setFormData={setFormData}
              parcelData={parcelData}
              onSubmit={() => setFormStep('summary')}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExemptionRequestDialog;
