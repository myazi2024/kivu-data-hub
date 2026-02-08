import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePropertyTaxCalculator, TaxCalculationInput, TaxCalculationResult } from '@/hooks/usePropertyTaxCalculator';
import PropertyTaxQuestionsStep from './tax-calculator/PropertyTaxQuestionsStep';
import PropertyTaxSummaryStep from './tax-calculator/PropertyTaxSummaryStep';
import { toast } from 'sonner';

interface PropertyTaxCalculatorProps {
  parcelNumber: string;
  parcelId?: string;
  parcelData?: any;
  onOpenServiceCatalog?: () => void;
}

type CalcStep = 'questions' | 'summary';

const PropertyTaxCalculator: React.FC<PropertyTaxCalculatorProps> = ({
  parcelNumber, parcelId, parcelData, onOpenServiceCatalog
}) => {
  const { user } = useAuth();
  const { calculate, loading: configLoading } = usePropertyTaxCalculator();

  const currentYear = new Date().getFullYear();
  const [calcStep, setCalcStep] = useState<CalcStep>('questions');
  const [result, setResult] = useState<TaxCalculationResult | null>(null);
  const [nif, setNif] = useState('');
  const [ownerName, setOwnerName] = useState(parcelData?.current_owner_name || '');
  const [idDocumentFile, setIdDocumentFile] = useState<File | null>(null);
  const [hasNif, setHasNif] = useState<boolean | null>(null);
  const [exemptionCertificateFile, setExemptionCertificateFile] = useState<File | null>(null);

  const defaultZone = parcelNumber?.startsWith('SR') ? 'rural' : parcelNumber?.startsWith('SU') ? 'urban' : (parcelData?.parcel_type === 'rural' ? 'rural' : 'urban');
  const zoneAutoDetected = parcelNumber?.startsWith('SR') || parcelNumber?.startsWith('SU');
  const defaultUsage = parcelData?.declared_usage === 'Commercial' ? 'commercial'
    : parcelData?.declared_usage === 'Industriel' ? 'industrial'
    : parcelData?.declared_usage === 'Agricole' ? 'agricultural'
    : 'residential';
  const defaultConstruction = parcelData?.construction_type === 'En dur' ? 'en_dur'
    : parcelData?.construction_type === 'Semi-dur' ? 'semi_dur'
    : parcelData?.construction_type === 'En paille' ? 'en_paille'
    : parcelData?.construction_type === 'Terrain nu' ? 'none'
    : null;

  const [input, setInput] = useState<TaxCalculationInput>({
    zoneType: (defaultZone as any) || 'urban',
    usageType: (defaultUsage as any) || 'residential',
    constructionType: defaultConstruction === 'none' ? null : (defaultConstruction as any),
    areaSqm: parcelData?.area_sqm || 0,
    fiscalYear: currentYear,
    province: parcelData?.province || 'Nord-Kivu',
    ville: parcelData?.ville || '',
    constructionYear: parcelData?.construction_year || null,
    numberOfFloors: 1,
    roofingType: '',
    selectedExemptions: [],
    redevableIsDifferent: false,
    redevableNom: '',
    redevableNif: '',
    redevableQualite: '',
    isRented: false,
    monthlyRentUsd: 0,
    occupancyMonths: 12,
    applyDeduction30: false,
    monthsLate: 0,
  });

  const [hasNoConstruction, setHasNoConstruction] = useState(defaultConstruction === 'none');

  // Sync areaSqm when parcelData loads asynchronously
  useEffect(() => {
    const area = Number(parcelData?.area_sqm);
    if (area > 0) {
      setInput(prev => ({ ...prev, areaSqm: area }));
    }
  }, [parcelData?.area_sqm]);

  const handleCalculate = () => {
    if (hasNif === true && !nif.trim()) {
      toast.error('Veuillez renseigner votre Numéro d\'Impôt (NIF)');
      return;
    }
    if (!input.areaSqm || input.areaSqm <= 0) {
      toast.error('Veuillez renseigner la superficie de la parcelle');
      return;
    }
    const res = calculate(input);
    setResult(res);
    setCalcStep('summary');
  };

  const handleSubmit = () => {
    if (!user) {
      toast.error('Vous devez être connecté pour soumettre la déclaration');
      return;
    }
    toast.info('La soumission des déclarations sera disponible prochainement');
  };

  if (configLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (calcStep === 'summary' && result) {
    return (
      <PropertyTaxSummaryStep
        parcelNumber={parcelNumber}
        nif={nif}
        input={input}
        result={result}
        onBack={() => setCalcStep('questions')}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <PropertyTaxQuestionsStep
      parcelNumber={parcelNumber}
      parcelData={parcelData}
      input={input}
      setInput={setInput}
      hasNoConstruction={hasNoConstruction}
      setHasNoConstruction={setHasNoConstruction}
      nif={nif}
      setNif={setNif}
      ownerName={ownerName}
      setOwnerName={setOwnerName}
      idDocumentFile={idDocumentFile}
      setIdDocumentFile={setIdDocumentFile}
      hasNif={hasNif}
      setHasNif={setHasNif}
      exemptionCertificateFile={exemptionCertificateFile}
      setExemptionCertificateFile={setExemptionCertificateFile}
      zoneAutoDetected={zoneAutoDetected}
      onCalculate={handleCalculate}
      onOpenServiceCatalog={onOpenServiceCatalog}
    />
  );
};

export default PropertyTaxCalculator;
