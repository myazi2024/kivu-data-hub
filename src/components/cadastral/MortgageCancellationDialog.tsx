import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileX2, Save } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { QuickAuthDialog } from './QuickAuthDialog';
import { useMortgageFees } from '@/hooks/useMortgageFees';
import { useMortgageDraft } from '@/hooks/useMortgageDraft';
import { pollTransactionStatus } from '@/utils/pollTransactionStatus';
import MortgageFlowContainer from './MortgageFlowContainer';
import { generateMortgageReference } from '@/utils/mortgageReferences';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

import {
  CancellationFormStep,
  CancellationReviewStep,
  CancellationPaymentStep,
  CancellationConfirmationStep,
} from './mortgage-cancellation';
import type { Step, CancellationRequest, ParcelData, MortgageData } from './mortgage-cancellation/types';
import { CANCELLATION_REASONS, EMAIL_REGEX, PHONE_REGEX_DRC, ACTIVE_MORTGAGE_STATUSES } from './mortgage-cancellation/types';

interface MortgageCancellationDialogProps {
  parcelNumber: string;
  parcelId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  embedded?: boolean;
}

const MortgageCancellationDialog: React.FC<MortgageCancellationDialogProps> = ({
  parcelNumber, parcelId, open, onOpenChange, embedded = false
}) => {
  const isMobile = useIsMobile();
  const { user, profile } = useAuth();
  const { fees, loadingFees } = useMortgageFees();
  const { hasDraft, draftLoaded, loadDraft, clearDraft, autoSave } = useMortgageDraft('cancellation', parcelNumber, open);

  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [validatingReference, setValidatingReference] = useState(false);
  const [referenceValid, setReferenceValid] = useState<boolean | null>(null);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [requestReferenceNumber, setRequestReferenceNumber] = useState('');
  const [selectedFees, setSelectedFees] = useState<string[]>([]);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  // Fix #15: Exit confirmation for unsaved data
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const isSubmittingRef = useRef(false);
  const feesInitializedRef = useRef(false);
  const draftPromptShownRef = useRef(false);

  // Fix #1 & #5: Use ref to track if parcel data was loaded to avoid race conditions
  const parcelDataLoadedRef = useRef(false);
  const [parcelData, setParcelData] = useState<ParcelData | null>(null);
  const [mortgageData, setMortgageData] = useState<MortgageData | null>(null);
  const [paymentProvider, setPaymentProvider] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  const [formData, setFormData] = useState<CancellationRequest>({
    mortgageReferenceNumber: '',
    reason: 'remboursement_integral',
    cancellationDate: new Date().toISOString().split('T')[0],
    settlementAmount: '',
    requesterName: '',
    requesterPhone: '',
    requesterEmail: '',
    requesterIdNumber: '',
    requesterQuality: 'proprietaire',
    creditorAccord: false,
    supportingDocuments: [],
    comments: ''
  });

  // Fix #1: Generate reference once per open, don't reset parcelData if already loaded
  useEffect(() => {
    if (!open) {
      parcelDataLoadedRef.current = false;
      return;
    }
    setRequestReferenceNumber(generateMortgageReference('RAD'));
  }, [open]);

  const loadParcelData = useCallback(async () => {
    if (!parcelId || parcelDataLoadedRef.current) return;
    setLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('cadastral_parcels')
        .select('*')
        .eq('id', parcelId)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setParcelData(data);
        parcelDataLoadedRef.current = true;
      }
    } catch {
      toast.error('Erreur lors du chargement des données de la parcelle');
    } finally {
      setLoadingData(false);
    }
  }, [parcelId]);

  useEffect(() => {
    if (open) {
      loadParcelData();
    }
  }, [open, loadParcelData]);

  useEffect(() => {
    if (open && draftLoaded && hasDraft && !draftPromptShownRef.current) {
      draftPromptShownRef.current = true;
      setShowDraftPrompt(true);
    }
    if (!open) {
      draftPromptShownRef.current = false;
      setShowDraftPrompt(false);
    }
  }, [open, draftLoaded, hasDraft]);

  useEffect(() => {
    if (open && fees.length > 0 && !feesInitializedRef.current) {
      const mandatoryFeeIds = fees.filter(f => f.is_mandatory).map(f => f.id);
      setSelectedFees(mandatoryFeeIds);
      feesInitializedRef.current = true;
    }
    if (!open) feesInitializedRef.current = false;
  }, [open, fees]);

  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        requesterName: profile.full_name || '',
        requesterEmail: profile.email || ''
      }));
    }
  }, [profile]);

  // Auto-save draft on form changes
  useEffect(() => {
    if (open && draftLoaded && step === 'form') {
      autoSave(formData);
    }
  }, [formData, open, draftLoaded, step, autoSave]);

  const handleRestoreDraft = () => {
    const draftData = loadDraft();
    if (draftData) {
      setFormData(prev => ({ ...prev, ...draftData, supportingDocuments: [] }));
    }
    setShowDraftPrompt(false);
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setShowDraftPrompt(false);
  };

  // Validate mortgage reference
  const validateMortgageReference = useCallback(async (refNumber: string) => {
    if (!refNumber.trim()) {
      setReferenceValid(null);
      setReferenceError(null);
      setMortgageData(null);
      return;
    }
    if (!parcelId) {
      setReferenceValid(false);
      setReferenceError('Impossible de valider: identifiant de parcelle manquant.');
      return;
    }
    setValidatingReference(true);
    setReferenceError(null);
    try {
      const { data, error } = await supabase
        .from('cadastral_mortgages')
        .select('*')
        .eq('parcel_id', parcelId)
        .eq('reference_number', refNumber.trim().toUpperCase())
        .in('mortgage_status', ACTIVE_MORTGAGE_STATUSES)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setReferenceValid(true);
        setReferenceError(null);
        setMortgageData(data);
        setFormData(prev => ({ ...prev, settlementAmount: data.mortgage_amount_usd?.toString() || '' }));
      } else {
        setReferenceValid(false);
        setMortgageData(null);
        setReferenceError("Ce numéro de référence n'est pas valide ou ne correspond pas à une hypothèque active sur cette parcelle.");
      }
    } catch {
      setReferenceValid(false);
      setMortgageData(null);
      setReferenceError('Erreur lors de la vérification. Veuillez réessayer.');
    } finally {
      setValidatingReference(false);
    }
  }, [parcelId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.mortgageReferenceNumber.length >= 5) {
        validateMortgageReference(formData.mortgageReferenceNumber);
      } else {
        setReferenceValid(null);
        setReferenceError(null);
        setMortgageData(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.mortgageReferenceNumber, validateMortgageReference]);

  const handleFeeToggle = (feeId: string, isMandatory: boolean) => {
    if (isMandatory) return;
    setSelectedFees(prev => prev.includes(feeId) ? prev.filter(id => id !== feeId) : [...prev, feeId]);
  };

  const selectedFeesDetails = useMemo(() => fees.filter(f => selectedFees.includes(f.id)), [selectedFees, fees]);
  const totalAmount = useMemo(() => selectedFeesDetails.reduce((sum, fee) => sum + fee.amount_usd, 0), [selectedFeesDetails]);

  const validateForm = (): boolean => {
    if (!formData.mortgageReferenceNumber.trim()) { toast.error("Veuillez indiquer le numéro de référence"); return false; }
    if (!referenceValid) { toast.error("Le numéro de référence n'est pas valide"); return false; }
    if (!formData.requesterName.trim()) { toast.error('Veuillez indiquer votre nom'); return false; }
    if (!formData.requesterQuality) { toast.error('Veuillez indiquer votre qualité'); return false; }
    if (!formData.cancellationDate) { toast.error('Veuillez indiquer la date de radiation souhaitée'); return false; }
    if (formData.settlementAmount) {
      const amount = parseFloat(formData.settlementAmount);
      if (isNaN(amount) || amount < 0) { toast.error('Le montant de règlement ne peut pas être négatif'); return false; }
    }
    if (formData.requesterPhone.trim() && !PHONE_REGEX_DRC.test(formData.requesterPhone.replace(/\s/g, ''))) {
      toast.error('Le numéro de téléphone du demandeur est invalide (format RDC attendu)');
      return false;
    }
    if (formData.requesterEmail.trim() && !EMAIL_REGEX.test(formData.requesterEmail.trim())) {
      toast.error("L'email du demandeur est invalide");
      return false;
    }
    if (formData.supportingDocuments.length === 0) { toast.error('Veuillez joindre au moins un document justificatif'); return false; }
    if (!formData.creditorAccord) { toast.error("Vous devez confirmer avoir l'accord du créancier"); return false; }
    if (!parcelId) { toast.error('Identifiant de parcelle manquant.'); return false; }
    return true;
  };

  const handleGoToReview = () => {
    if (!user) { setShowAuthDialog(true); return; }
    if (!validateForm()) return;
    setStep('review');
  };

  const uploadDocuments = async (): Promise<string[]> => {
    const urls: string[] = [];
    const failedFiles: string[] = [];
    for (const file of formData.supportingDocuments) {
      const fileExt = file.name.split('.').pop();
      const fileName = `cancellation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `mortgage-cancellation/${user?.id}/${fileName}`;
      const { error } = await supabase.storage.from('cadastral-documents').upload(filePath, file);
      if (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        failedFiles.push(file.name);
      } else {
        const { data } = supabase.storage.from('cadastral-documents').getPublicUrl(filePath);
        urls.push(data.publicUrl);
      }
    }
    if (failedFiles.length > 0 && urls.length > 0) {
      toast.warning(`${failedFiles.length} fichier(s) n'ont pas pu être téléversés: ${failedFiles.join(', ')}`);
    }
    return urls;
  };

  // Fix #2: Include 'returned' status in check to prevent duplicate submissions
  const checkExistingCancellationRequest = async (): Promise<boolean> => {
    if (!user || !formData.mortgageReferenceNumber) return false;
    const { data } = await supabase
      .from('cadastral_contributions')
      .select('id, mortgage_history')
      .eq('parcel_number', parcelNumber)
      .eq('user_id', user.id)
      .eq('contribution_type', 'mortgage_cancellation')
      .in('status', ['pending', 'returned']);
    return data?.some(c => {
      const history = c.mortgage_history as any[];
      return history?.some(h => h.mortgage_reference_number?.toUpperCase() === formData.mortgageReferenceNumber.toUpperCase());
    }) ?? false;
  };

  const processPayment = async (): Promise<{ success: boolean; transactionId?: string }> => {
    setProcessingPayment(true);
    try {
      if (!paymentProvider) { toast.error('Veuillez sélectionner un opérateur Mobile Money'); return { success: false }; }
      const cleanPhone = paymentPhone.replace(/\s/g, '');
      if (!cleanPhone) { toast.error('Veuillez renseigner votre numéro de téléphone'); return { success: false }; }
      if (!PHONE_REGEX_DRC.test(cleanPhone)) { toast.error('Numéro de téléphone invalide.'); return { success: false }; }
      // Fix #14: Better error handling for Edge Function errors
      const { data, error } = await supabase.functions.invoke('process-mobile-money-payment', {
        body: { payment_provider: paymentProvider, phone_number: cleanPhone, amount_usd: totalAmount, payment_type: 'mortgage_cancellation' }
      });
      if (error) {
        const errMsg = error.message?.includes('404') || error.message?.includes('not found')
          ? 'Le service de paiement est temporairement indisponible. Réessayez plus tard.'
          : (error.message || 'Erreur lors du paiement');
        toast.error(errMsg);
        return { success: false };
      }
      if (!data?.success) { toast.error(data?.error || 'Erreur lors du paiement'); return { success: false }; }
      toast.info('Confirmez le paiement sur votre téléphone...');
      const result = await pollTransactionStatus(data.transaction_id);
      if (result === 'completed') { toast.success('Paiement confirmé'); return { success: true, transactionId: data.transaction_id }; }
      if (result === 'failed') { toast.error('Le paiement a échoué'); return { success: false }; }
      toast.error("Délai d'attente dépassé.");
      return { success: false };
    } catch { toast.error('Erreur lors du paiement'); return { success: false }; }
    finally { setProcessingPayment(false); }
  };

  const handleSubmit = async () => {
    if (!user) { setShowAuthDialog(true); return; }
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    const hasPending = await checkExistingCancellationRequest();
    if (hasPending) { toast.error('Une demande de radiation est déjà en cours pour cette hypothèque.'); isSubmittingRef.current = false; return; }
    setLoading(true);
    try {
      const documentUrls = await uploadDocuments();
      if (documentUrls.length === 0 && formData.supportingDocuments.length > 0) { toast.error('Échec du téléversement des documents.'); isSubmittingRef.current = false; setLoading(false); return; }
      setLoading(false);
      const paymentResult = await processPayment();
      if (!paymentResult.success) { isSubmittingRef.current = false; return; }
      setLoading(true);

      const reasonLabel = CANCELLATION_REASONS.find(r => r.value === formData.reason)?.label || formData.reason;

      // Fix #3: Separate try/catch for DB insert to handle payment rollback
      try {
        const { error } = await supabase.from('cadastral_contributions').insert({
          parcel_number: parcelNumber,
          original_parcel_id: parcelId || null,
          user_id: user.id,
          contribution_type: 'mortgage_cancellation',
          status: 'pending',
          change_justification: formData.comments || null,
          mortgage_history: [{
            type: 'cancellation_request',
            request_reference_number: requestReferenceNumber,
            mortgage_reference_number: formData.mortgageReferenceNumber.toUpperCase(),
            mortgage_data: mortgageData,
            parcel_data: parcelData,
            cancellation_reason: formData.reason,
            cancellation_reason_label: reasonLabel,
            cancellation_date: formData.cancellationDate,
            settlement_amount: formData.settlementAmount ? parseFloat(formData.settlementAmount) : null,
            requester_name: formData.requesterName,
            requester_phone: formData.requesterPhone || null,
            requester_email: formData.requesterEmail || null,
            requester_id_number: formData.requesterIdNumber || null,
            requester_quality: formData.requesterQuality,
            creditor_accord: formData.creditorAccord,
            supporting_documents: documentUrls,
            fees_paid: selectedFeesDetails,
            total_amount_paid: totalAmount,
            payment_method: 'mobile_money',
            payment_provider: paymentProvider,
            payment_transaction_id: paymentResult.transactionId || null,
            submitted_at: new Date().toISOString()
          }] as any
        });
        if (error) throw error;
      } catch (insertErr) {
        console.error('DB insert failed after payment:', insertErr);
        toast.error(
          `Erreur de sauvegarde. Votre paiement (ID: ${paymentResult.transactionId || 'N/A'}) est confirmé. Contactez le support avec cette référence.`,
          { duration: 15000 }
        );
        setLoading(false);
        isSubmittingRef.current = false;
        return;
      }

      // Post-insert actions (non-blocking)
      try {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Demande de radiation soumise',
          message: `Votre demande de radiation d'hypothèque (Réf: ${requestReferenceNumber}) pour la parcelle ${parcelNumber} a été soumise avec succès.`,
          type: 'mortgage',
          action_url: '/user-dashboard',
        });
      } catch { /* Non-blocking */ }

      try {
        await supabase.from('audit_logs').insert({
          action: 'mortgage_cancellation_submitted',
          user_id: user.id,
          record_id: null,
          table_name: 'cadastral_contributions',
          new_values: { request_reference: requestReferenceNumber, parcel_number: parcelNumber } as any,
        });
      } catch { /* Non-blocking audit */ }

      clearDraft();
      setStep('confirmation');
      toast.success('Demande de radiation soumise avec succès');
    } catch {
      toast.error('Erreur lors de la soumission');
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // Fix #15: Check for unsaved data before closing
  const hasFormData = (): boolean => {
    return !!(formData.mortgageReferenceNumber || formData.requesterPhone || formData.requesterIdNumber || formData.comments || formData.supportingDocuments.length > 0);
  };

  const handleClose = () => {
    if (step === 'form' && hasFormData() && !showExitConfirm) {
      setShowExitConfirm(true);
      return;
    }
    performClose();
  };

  // Fix #5: Proper cleanup without race conditions
  const performClose = () => {
    setStep('form');
    setReferenceValid(null);
    setReferenceError(null);
    setMortgageData(null);
    setParcelData(null);
    parcelDataLoadedRef.current = false;
    feesInitializedRef.current = false;
    setRequestReferenceNumber('');
    setShowDraftPrompt(false);
    setShowExitConfirm(false);
    isSubmittingRef.current = false;
    draftPromptShownRef.current = false;
    setFormData({
      mortgageReferenceNumber: '', reason: 'remboursement_integral',
      cancellationDate: new Date().toISOString().split('T')[0], settlementAmount: '',
      requesterName: profile?.full_name || '', requesterPhone: '', requesterEmail: profile?.email || '',
      requesterIdNumber: '', requesterQuality: 'proprietaire', creditorAccord: false,
      supportingDocuments: [], comments: ''
    });
    setPaymentProvider('');
    setPaymentPhone('');
    onOpenChange(false);
  };

  const renderContent = () => (
    <>
      {/* Draft restoration prompt */}
      {showDraftPrompt && step === 'form' && (
        <Alert className="mb-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 rounded-xl">
          <Save className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
            <p className="font-medium mb-2">Un brouillon a été trouvé pour cette parcelle.</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleRestoreDraft} className="h-7 text-xs rounded-lg">Restaurer</Button>
              <Button size="sm" variant="ghost" onClick={handleDiscardDraft} className="h-7 text-xs rounded-lg">Ignorer</Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {step === 'form' && (
        <CancellationFormStep
          formData={formData} setFormData={setFormData}
          parcelData={parcelData} mortgageData={mortgageData}
          loadingData={loadingData} validatingReference={validatingReference}
          referenceValid={referenceValid} referenceError={referenceError}
          requestReferenceNumber={requestReferenceNumber}
          fees={fees} loadingFees={loadingFees}
          selectedFees={selectedFees} onFeeToggle={handleFeeToggle}
          totalAmount={totalAmount} selectedFeesDetails={selectedFeesDetails}
          onContinue={handleGoToReview} onClose={handleClose}
        />
      )}
      {step === 'review' && (
        <CancellationReviewStep
          formData={formData} parcelData={parcelData} mortgageData={mortgageData}
          requestReferenceNumber={requestReferenceNumber}
          selectedFeesDetails={selectedFeesDetails} totalAmount={totalAmount}
          onBack={() => setStep('form')} onProceedToPayment={() => setStep('payment')}
        />
      )}
      {step === 'payment' && (
        <CancellationPaymentStep
          requestReferenceNumber={requestReferenceNumber} totalAmount={totalAmount}
          paymentProvider={paymentProvider} setPaymentProvider={setPaymentProvider}
          paymentPhone={paymentPhone} setPaymentPhone={setPaymentPhone}
          loading={loading} processingPayment={processingPayment}
          onBack={() => setStep('review')} onSubmit={handleSubmit}
        />
      )}
      {step === 'confirmation' && (
        <CancellationConfirmationStep
          requestReferenceNumber={requestReferenceNumber}
          mortgageReferenceNumber={formData.mortgageReferenceNumber}
          parcelNumber={parcelNumber} totalAmount={totalAmount}
          formData={{ reason: formData.reason, requesterName: formData.requesterName, cancellationDate: formData.cancellationDate }}
          parcelData={parcelData} mortgageData={mortgageData}
          selectedFeesDetails={selectedFeesDetails} onClose={performClose}
        />
      )}
    </>
  );

  return (
    <>
      <MortgageFlowContainer
        open={open}
        embedded={embedded}
        isMobile={isMobile}
        onClose={handleClose}
        title={(
          <>
            <div className="p-1.5 bg-destructive/10 rounded-lg"><FileX2 className="h-4 w-4 text-destructive" /></div>
            Radiation d'hypothèque
          </>
        )}
        description={`Parcelle ${parcelNumber}`}
      >
        {renderContent()}
      </MortgageFlowContainer>

      {/* Fix #15: Exit confirmation */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent className="rounded-2xl max-w-[340px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Quitter le formulaire ?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Vous avez des données non sauvegardées. Voulez-vous vraiment quitter ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Rester</AlertDialogCancel>
            <AlertDialogAction onClick={performClose} className="text-xs bg-destructive hover:bg-destructive/90">Quitter</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <QuickAuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} onAuthSuccess={() => setShowAuthDialog(false)} />
    </>
  );
};

export default MortgageCancellationDialog;
