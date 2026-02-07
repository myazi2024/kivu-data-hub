import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePropertyTaxCalculator, TaxCalculationInput, TaxCalculationResult } from '@/hooks/usePropertyTaxCalculator';
import IRLQuestionsStep from './tax-calculator/IRLQuestionsStep';
import IRLSummaryStep from './tax-calculator/IRLSummaryStep';
import { TenantEntry, createEmptyTenant, calculateTotalRentalIncome } from './tax-calculator/IRLTenantsList';
import { toast } from 'sonner';

interface IRLCalculatorProps {
  parcelNumber: string;
  parcelId?: string;
  parcelData?: any;
}

type CalcStep = 'questions' | 'summary';

const IRLCalculator: React.FC<IRLCalculatorProps> = ({
  parcelNumber, parcelId, parcelData
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
  const [tenants, setTenants] = useState<TenantEntry[]>([createEmptyTenant()]);

  const defaultZone = parcelData?.parcel_type === 'rural' ? 'rural' : 'urban';
  const defaultUsage = parcelData?.declared_usage === 'Commercial' ? 'commercial'
    : parcelData?.declared_usage === 'Industriel' ? 'industrial'
    : parcelData?.declared_usage === 'Agricole' ? 'agricultural'
    : 'residential';

  const [input, setInput] = useState<TaxCalculationInput>({
    zoneType: (defaultZone as any) || 'urban',
    usageType: (defaultUsage as any) || 'residential',
    constructionType: null,
    areaSqm: parcelData?.area_sqm || 0,
    fiscalYear: currentYear,
    province: parcelData?.province || 'Nord-Kivu',
    ville: parcelData?.ville || '',
    constructionYear: null,
    numberOfFloors: 1,
    roofingType: '',
    selectedExemptions: [],
    redevableIsDifferent: false,
    redevableNom: '',
    redevableNif: '',
    redevableQualite: '',
    isRented: true,
    monthlyRentUsd: 0,
    occupancyMonths: 12,
    applyDeduction30: true,
    monthsLate: 0,
  });

  const handleCalculate = () => {
    if (!ownerName.trim()) {
      toast.error('Veuillez renseigner le nom du propriétaire');
      return;
    }
    if (hasNif === true && !nif.trim()) {
      toast.error('Veuillez renseigner votre Numéro d\'Impôt (NIF)');
      return;
    }

    // Compute total from tenants
    const validTenants = tenants.filter(t => t.monthlyRentUsd > 0);
    if (validTenants.length === 0) {
      toast.error('Veuillez renseigner au moins un locataire avec un loyer');
      return;
    }

    const { totalIncome } = calculateTotalRentalIncome(tenants, input.fiscalYear);

    // Feed total into calculator via monthlyRentUsd=totalIncome, occupancyMonths=1
    const adjustedInput: TaxCalculationInput = {
      ...input,
      monthlyRentUsd: totalIncome,
      occupancyMonths: 1,
    };

    const res = calculate(adjustedInput);
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
      <IRLSummaryStep
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
    <IRLQuestionsStep
      parcelNumber={parcelNumber}
      input={input}
      setInput={setInput}
      nif={nif}
      setNif={setNif}
      ownerName={ownerName}
      setOwnerName={setOwnerName}
      idDocumentFile={idDocumentFile}
      setIdDocumentFile={setIdDocumentFile}
      hasNif={hasNif}
      setHasNif={setHasNif}
      tenants={tenants}
      setTenants={setTenants}
      onCalculate={handleCalculate}
    />
  );
};

export default IRLCalculator;
