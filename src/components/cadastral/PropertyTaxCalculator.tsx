import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePropertyTaxCalculator, TaxCalculationInput, TaxCalculationResult } from '@/hooks/usePropertyTaxCalculator';
import TaxQuestionsStep from './tax-calculator/TaxQuestionsStep';
import TaxSummaryStep from './tax-calculator/TaxSummaryStep';
import { toast } from 'sonner';

interface PropertyTaxCalculatorProps {
  parcelNumber: string;
  parcelId?: string;
  parcelData?: any;
}

type CalcStep = 'questions' | 'summary';

const PropertyTaxCalculator: React.FC<PropertyTaxCalculatorProps> = ({
  parcelNumber,
  parcelId,
  parcelData
}) => {
  const { user } = useAuth();
  const { calculate, loading: configLoading } = usePropertyTaxCalculator();

  const currentYear = new Date().getFullYear();
  const [calcStep, setCalcStep] = useState<CalcStep>('questions');
  const [result, setResult] = useState<TaxCalculationResult | null>(null);

  // Pre-fill from parcel data
  const defaultZone = parcelData?.parcel_type === 'rural' ? 'rural' : 'urban';
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
    isRented: false,
    monthlyRentUsd: 0,
    occupancyMonths: 12,
  });

  const [hasNoConstruction, setHasNoConstruction] = useState(defaultConstruction === 'none');

  const handleCalculate = () => {
    if (!input.areaSqm || input.areaSqm <= 0) {
      toast.error('Veuillez renseigner la superficie de la parcelle');
      return;
    }
    if (input.isRented && (!input.monthlyRentUsd || input.monthlyRentUsd <= 0)) {
      toast.error('Veuillez renseigner le loyer mensuel');
      return;
    }
    const res = calculate(input);
    setResult(res);
    setCalcStep('summary');
  };

  const handlePayment = () => {
    if (!user) {
      toast.error('Vous devez être connecté pour effectuer le paiement');
      return;
    }
    toast.info('Le paiement en ligne sera disponible prochainement');
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
      <TaxSummaryStep
        parcelNumber={parcelNumber}
        input={input}
        result={result}
        onBack={() => setCalcStep('questions')}
        onPayment={handlePayment}
      />
    );
  }

  return (
    <TaxQuestionsStep
      parcelNumber={parcelNumber}
      parcelData={parcelData}
      input={input}
      setInput={setInput}
      hasNoConstruction={hasNoConstruction}
      setHasNoConstruction={setHasNoConstruction}
      onCalculate={handleCalculate}
    />
  );
};

export default PropertyTaxCalculator;
