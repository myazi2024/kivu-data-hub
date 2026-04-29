import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePropertyTaxCalculator, TaxCalculationInput, TaxCalculationResult } from '@/hooks/usePropertyTaxCalculator';
import PropertyTaxQuestionsStep from './tax-calculator/PropertyTaxQuestionsStep';
import PropertyTaxSummaryStep from './tax-calculator/PropertyTaxSummaryStep';
import TaxConfirmationStep from './tax-calculator/TaxConfirmationStep';
import TaxHistorySection from './tax-calculator/TaxHistorySection';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { detectZoneType, isZoneAutoDetected, detectUsageType, detectConstructionType, checkDuplicateTaxSubmission } from './tax-calculator/taxSharedUtils';
import { validateNIF, NIF_FORMAT_ERROR } from './tax-calculator/taxFormConstants'; // #18 fix: use centralized validateNIF
import type { TaxKnownBuilding } from './tax-calculator/taxBuildings';
import { toCccConstructionNature, toLegacyConstructionType, toCccDeclaredUsage } from './tax-calculator/taxBuildings';
import type { SharedTaxpayer } from './tax-calculator/useSharedTaxpayer';

interface PropertyTaxCalculatorProps {
  parcelNumber: string;
  parcelId?: string;
  parcelData?: any;
  onOpenServiceCatalog?: () => void;
  /** Multi-construction: ref of the building this declaration targets */
  constructionRef?: string;
  /** Pre-filled data for the targeted building */
  targetBuilding?: TaxKnownBuilding | null;
  /** Shared taxpayer state from parent dialog (overrides local state when provided) */
  taxpayer?: SharedTaxpayer;
}

type CalcStep = 'questions' | 'summary' | 'confirmation'; // #3 fix: add confirmation step

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
  const [submitting, setSubmitting] = useState(false);

  const defaultZone = detectZoneType(parcelNumber, parcelData);
  const zoneAutoDetected = isZoneAutoDetected(parcelNumber);
  const defaultUsage = detectUsageType(parcelData);
  const defaultConstruction = detectConstructionType(parcelData);

  const [input, setInput] = useState<TaxCalculationInput>({
    zoneType: defaultZone,
    usageType: defaultUsage,
    constructionType: defaultConstruction,
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

  const [hasNoConstruction, setHasNoConstruction] = useState(defaultConstruction === null && parcelData?.construction_type === 'Terrain nu');

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
    // #18 fix: Use centralized validateNIF instead of inline regex
    if (hasNif === true && nif.trim() && !validateNIF(nif)) {
      toast.error(NIF_FORMAT_ERROR);
      return;
    }
    if (input.redevableIsDifferent && !input.redevableNom.trim()) {
      toast.error('Veuillez renseigner le nom du redevable');
      return;
    }
    const effectiveArea = input.areaSqm || Number(parcelData?.area_sqm) || 0;
    if (effectiveArea <= 0) {
      toast.error('Veuillez renseigner la superficie de la parcelle');
      return;
    }
    const adjustedInput = { ...input, areaSqm: effectiveArea };
    const res = calculate(adjustedInput);
    setResult(res);
    setCalcStep('summary');
  };

  // #15 fix: Reset form after successful submission
  const resetForm = () => {
    setNif('');
    setHasNif(null);
    setIdDocumentFile(null);
    setExemptionCertificateFile(null);
    setInput(prev => ({
      ...prev,
      fiscalYear: currentYear,
      selectedExemptions: [],
      redevableIsDifferent: false,
      redevableNom: '',
      redevableNif: '',
      redevableQualite: '',
    }));
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
        supabase, parcelNumber, user.id, 'Impôt foncier annuel', input.fiscalYear
      );
      if (isDuplicate) {
        toast.error(`Une déclaration "Impôt foncier annuel" pour l'exercice ${input.fiscalYear} existe déjà pour cette parcelle.`);
        return;
      }

      // Upload ID document if present
      let idDocUrl: string | null = null;
      let uploadedIdPath: string | null = null;
      if (idDocumentFile) {
        const ext = idDocumentFile.name.split('.').pop();
        const path = `tax-documents/${user.id}/id_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('cadastral-documents').upload(path, idDocumentFile);
        if (upErr) throw upErr;
        uploadedIdPath = path;
        idDocUrl = supabase.storage.from('cadastral-documents').getPublicUrl(path).data.publicUrl;
      }

      // Upload exemption certificate if present
      let exemptionDocUrl: string | null = null;
      let uploadedExemptionPath: string | null = null;
      if (exemptionCertificateFile) {
        const ext = exemptionCertificateFile.name.split('.').pop();
        const path = `tax-documents/${user.id}/exemption_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('cadastral-documents').upload(path, exemptionCertificateFile);
        if (upErr) throw upErr;
        uploadedExemptionPath = path;
        exemptionDocUrl = supabase.storage.from('cadastral-documents').getPublicUrl(path).data.publicUrl;
      }

      const { error } = await supabase.from('cadastral_contributions').insert({
        parcel_number: parcelNumber,
        original_parcel_id: parcelId || null,
        user_id: user.id,
        contribution_type: 'update',
        status: 'pending',
        province: input.province,
        ville: input.ville,
        area_sqm: input.areaSqm,
        construction_type: input.constructionType ? (
          input.constructionType === 'en_dur' ? 'En dur'
          : input.constructionType === 'semi_dur' ? 'Semi-dur'
          : 'En paille'
        ) : null,
        declared_usage: input.usageType === 'commercial' ? 'Commercial'
          : input.usageType === 'industrial' ? 'Industriel'
          : input.usageType === 'agricultural' ? 'Agricole'
          : 'Résidentiel',
        construction_year: input.constructionYear,
        current_owner_name: ownerName || null,
        owner_document_url: idDocUrl,
        tax_history: [{
          tax_type: 'Impôt foncier annuel',
          tax_year: input.fiscalYear,
          amount_usd: result.grandTotal,
          base_tax_usd: result.totalPropertyTax,
          penalty_amount_usd: result.totalPenalties,
          fees_usd: result.totalFees,
          fiscal_zone: result.fiscalZoneCategory,
          is_exempt: result.isExempt,
          exemptions: result.appliedExemptions,
          exemption_certificate_url: exemptionDocUrl,
          nif: hasNif ? nif : null,
          payment_status: 'En attente',
        }],
      });

      if (error) {
        // Cleanup orphaned files
        const toRemove = [uploadedIdPath, uploadedExemptionPath].filter(Boolean) as string[];
        if (toRemove.length > 0) {
          await supabase.storage.from('cadastral-documents').remove(toRemove);
        }
        throw error;
      }

      // Fire-and-forget notification with error logging
      supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Déclaration impôt foncier',
        message: `Déclaration impôt foncier pour ${parcelNumber} (exercice ${input.fiscalYear}). Montant: ${result.grandTotal.toFixed(2)} USD.`,
        type: 'info',
        action_url: '/mon-compte',
      }).then(({ error: e }) => { if (e) console.warn('Notification failed:', e.message); });

      toast.success('Déclaration soumise avec succès');
      // #3 fix: Show confirmation step instead of going back to questions
      setCalcStep('confirmation');
    } catch (error: any) {
      console.error('PropertyTax submit error:', error);
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

  // #3 fix: Confirmation screen
  if (calcStep === 'confirmation' && result) {
    return (
      <TaxConfirmationStep
        parcelNumber={parcelNumber}
        fiscalYear={input.fiscalYear}
        taxType="Impôt foncier annuel"
        totalAmount={result.grandTotal}
        accentClass="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
        onClose={() => {
          resetForm();
          setCalcStep('questions');
        }}
      />
    );
  }

  if (calcStep === 'summary' && result) {
    return (
      <PropertyTaxSummaryStep
        parcelNumber={parcelNumber}
        nif={nif}
        ownerName={ownerName}
        input={input}
        result={result}
        onBack={() => setCalcStep('questions')}
        onSubmit={handleSubmit}
        loading={submitting}
      />
    );
  }

  return (
    <div>
      {/* #12 fix: Show tax history for this parcel */}
      <div className="px-4 pt-3">
        <TaxHistorySection parcelNumber={parcelNumber} taxTypeFilter="Impôt foncier annuel" />
      </div>
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
    </div>
  );
};

export default PropertyTaxCalculator;
