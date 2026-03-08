import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePropertyTaxCalculator, TaxCalculationInput, TaxCalculationResult } from '@/hooks/usePropertyTaxCalculator';
import IRLQuestionsStep from './tax-calculator/IRLQuestionsStep';
import IRLSummaryStep from './tax-calculator/IRLSummaryStep';
import { TenantEntry, createEmptyTenant, calculateTotalRentalIncome } from './tax-calculator/IRLTenantsList';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { detectZoneType, isZoneAutoDetected, detectUsageType, checkDuplicateTaxSubmission } from './tax-calculator/taxSharedUtils';

interface IRLCalculatorProps {
  parcelNumber: string;
  parcelId?: string;
  parcelData?: any;
  onOpenServiceCatalog?: () => void;
}

type CalcStep = 'questions' | 'summary';

const IRLCalculator: React.FC<IRLCalculatorProps> = ({
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
  const [tenants, setTenants] = useState<TenantEntry[]>([createEmptyTenant()]);
  const [submitting, setSubmitting] = useState(false);

  const defaultZone = detectZoneType(parcelNumber, parcelData);
  const zoneAutoDetected = isZoneAutoDetected(parcelNumber);
  const defaultUsage = detectUsageType(parcelData);

  const [input, setInput] = useState<TaxCalculationInput>({
    zoneType: defaultZone,
    usageType: defaultUsage,
    constructionType: null,
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
    isRented: true,
    monthlyRentUsd: 0,
    occupancyMonths: 12,
    applyDeduction30: true,
    monthsLate: 0,
  });

  // Sync areaSqm and ownerName when parcelData loads asynchronously
  useEffect(() => {
    const area = Number(parcelData?.area_sqm);
    if (area > 0) {
      setInput(prev => ({ ...prev, areaSqm: area }));
    }
  }, [parcelData?.area_sqm]);

  useEffect(() => {
    if (parcelData?.current_owner_name && !ownerName) {
      setOwnerName(parcelData.current_owner_name);
    }
  }, [parcelData?.current_owner_name]);

  const handleCalculate = () => {
    if (hasNif === true && !nif.trim()) {
      toast.error('Veuillez renseigner votre Numéro d\'Impôt (NIF)');
      return;
    }
    if (hasNif === true && nif.trim() && !/^[A-Za-z0-9]{6,15}$/.test(nif.trim())) {
      toast.error('Format NIF invalide. Le NIF doit contenir entre 6 et 15 caractères alphanumériques (ex: A0123456B)');
      return;
    }
    if (input.redevableIsDifferent && !input.redevableNom.trim()) {
      toast.error('Veuillez renseigner le nom du redevable');
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

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Vous devez être connecté pour soumettre la déclaration');
      return;
    }
    if (!result) return;

    setSubmitting(true);
    try {
      // Duplicate check
      const isDuplicate = await checkDuplicateTaxSubmission(
        supabase, parcelNumber, user.id, 'Impôt sur le revenu locatif', input.fiscalYear
      );
      if (isDuplicate) {
        toast.error(`Une déclaration IRL pour l'exercice ${input.fiscalYear} existe déjà pour cette parcelle.`);
        return;
      }

      // Upload ID document if present
      let idDocUrl: string | null = null;
      let uploadedIdPath: string | null = null;
      if (idDocumentFile) {
        const ext = idDocumentFile.name.split('.').pop();
        const path = `tax-documents/${user.id}/id_irl_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('cadastral-documents').upload(path, idDocumentFile);
        if (upErr) throw upErr;
        uploadedIdPath = path;
        idDocUrl = supabase.storage.from('cadastral-documents').getPublicUrl(path).data.publicUrl;
      }

      // Prepare tenant data for storage (sanitized)
      const tenantData = tenants
        .filter(t => t.monthlyRentUsd > 0)
        .map(t => ({
          name: t.tenantName,
          unit: t.unitName,
          monthlyRent: t.monthlyRentUsd,
          arrival: t.arrivalDate,
          departure: t.hasDepartureDate ? t.departureDate : null,
        }));

      const { error } = await supabase.from('cadastral_contributions').insert({
        parcel_number: parcelNumber,
        original_parcel_id: parcelId || null,
        user_id: user.id,
        contribution_type: 'update',
        status: 'pending',
        province: input.province,
        ville: input.ville,
        area_sqm: input.areaSqm,
        owner_document_url: idDocUrl,
        tax_history: [{
          tax_type: 'Impôt sur le revenu locatif',
          tax_year: input.fiscalYear,
          amount_usd: result.grandTotal,
          irl_amount_usd: result.irlAmount,
          annual_rental_income: result.annualRentalIncome,
          taxable_rental_income: result.taxableRentalIncome,
          deduction_30_applied: input.applyDeduction30,
          penalty_amount_usd: result.totalPenalties,
          fees_usd: result.totalFees,
          tenants: tenantData,
          nif: hasNif ? nif : null,
          payment_status: 'En attente',
        }],
      });

      if (error) {
        // Cleanup orphaned file
        if (uploadedIdPath) {
          await supabase.storage.from('cadastral-documents').remove([uploadedIdPath]);
        }
        throw error;
      }

      // Fire-and-forget notification
      supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Déclaration IRL',
        message: `Déclaration IRL pour ${parcelNumber} (exercice ${input.fiscalYear}). Montant: ${result.grandTotal.toFixed(2)} USD.`,
        type: 'info',
        action_url: '/user-dashboard',
      }).then(() => {});

      toast.success('Déclaration IRL soumise avec succès');
      setCalcStep('questions');
    } catch (error: any) {
      console.error('IRL submit error:', error);
      toast.error('Erreur lors de la soumission de la déclaration');
    } finally {
      setSubmitting(false);
    }
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
        loading={submitting}
      />
    );
  }

  return (
    <IRLQuestionsStep
      parcelNumber={parcelNumber}
      parcelData={parcelData}
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
      zoneAutoDetected={zoneAutoDetected}
      onCalculate={handleCalculate}
      onOpenServiceCatalog={onOpenServiceCatalog}
    />
  );
};

export default IRLCalculator;
