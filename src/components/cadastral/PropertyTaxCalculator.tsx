import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePropertyTaxCalculator, TaxCalculationInput, TaxCalculationResult } from '@/hooks/usePropertyTaxCalculator';
import PropertyTaxQuestionsStep from './tax-calculator/PropertyTaxQuestionsStep';
import PropertyTaxSummaryStep from './tax-calculator/PropertyTaxSummaryStep';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { detectZoneType, isZoneAutoDetected, detectUsageType, detectConstructionType, checkDuplicateTaxSubmission } from './tax-calculator/taxSharedUtils';

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
    if (hasNif === true && nif.trim() && !/^[A-Za-z0-9]{6,15}$/.test(nif.trim())) {
      toast.error('Format NIF invalide. Le NIF doit contenir entre 6 et 15 caractères alphanumériques (ex: A0123456B)');
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

      // Fire-and-forget notification
      supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Déclaration impôt foncier',
        message: `Déclaration impôt foncier pour ${parcelNumber} (exercice ${input.fiscalYear}). Montant: ${result.grandTotal.toFixed(2)} USD.`,
        type: 'info',
        action_url: '/user-dashboard',
      }).then(() => {});

      toast.success('Déclaration soumise avec succès');
      setCalcStep('questions');
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

  if (calcStep === 'summary' && result) {
    return (
      <PropertyTaxSummaryStep
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
