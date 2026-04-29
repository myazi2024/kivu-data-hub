import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import WhatsAppFloatingButton from './WhatsAppFloatingButton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { usePaymentConfig } from '@/hooks/usePaymentConfig';
import { usePaymentProviders } from '@/hooks/usePaymentProviders';
import { useTestMode } from '@/hooks/useTestMode';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { Building2 } from 'lucide-react';
import { pollTransactionStatus } from '@/utils/pollTransactionStatus';
import FormIntroDialog, { FORM_INTRO_CONFIGS } from './FormIntroDialog';
import { usePermitRequestForm } from './building-permit-request/usePermitRequestForm';
import { PermitStep } from './building-permit-request/types';
import PermitFormStep from './building-permit-request/PermitFormStep';
import PermitPreviewStep from './building-permit-request/PermitPreviewStep';
import PermitPaymentStep from './building-permit-request/PermitPaymentStep';
import PermitConfirmationStep from './building-permit-request/PermitConfirmationStep';

interface BuildingPermitRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcelNumber: string;
  hasExistingConstruction?: boolean;
  parcelData?: any;
}

const BuildingPermitRequestDialog: React.FC<BuildingPermitRequestDialogProps> = ({
  open, onOpenChange, parcelNumber, hasExistingConstruction = false, parcelData,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { isPaymentRequired } = usePaymentConfig();
  const { providers: availableProviders } = usePaymentProviders();
  const { isTestModeActive } = useTestMode();
  const abortControllerRef = useRef<AbortController | null>(null);

  const [showIntro, setShowIntro] = useState(true);
  const [step, setStep] = useState<PermitStep>('form');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [savedContributionId, setSavedContributionId] = useState<string | null>(null);
  const [savedTransactionId, setSavedTransactionId] = useState<string | null>(null);
  // Fix #16: Confirm before close with unsaved data
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Payment UI state
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'bank_card'>('mobile_money');
  const [isTestSimulation, setIsTestSimulation] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');

  const form = usePermitRequestForm({ parcelNumber, hasExistingConstruction, parcelData });

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => { abortControllerRef.current?.abort(); };
  }, []);

  const requestTypeLabel = form.requestType === 'new' ? 'Autorisation de bâtir' : 'Autorisation de régularisation';

  // Check if form has meaningful data (for close confirmation)
  const hasUnsavedData = useCallback(() => {
    if (step === 'confirmation') return false;
    const fd = form.formData;
    return !!(fd.constructionType || fd.constructionNature || fd.declaredUsage ||
      fd.plannedArea || fd.applicantName || fd.projectDescription ||
      fd.nif || fd.complianceIssues || fd.regularizationReason);
  }, [form.formData, step]);

  // ========== FILE UPLOAD ==========
  const uploadAttachments = async (): Promise<Record<string, string>> => {
    if (!user) throw new Error('Non authentifié');
    const uploadedUrls: Record<string, string> = {};
    for (const [key, attachment] of Object.entries(form.attachments)) {
      if (!attachment) continue;
      const fileExt = attachment.file.name.split('.').pop();
      // Project standard: use crypto.randomUUID() for secure unique filenames
      const fileName = `permit_req_${Date.now()}_${crypto.randomUUID()}.${fileExt}`;
      const filePath = `permit-requests/${user.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('cadastral-documents').upload(filePath, attachment.file);
      if (uploadError) throw new Error(`Échec upload ${attachment.label}: ${uploadError.message}`);
      const { data } = supabase.storage.from('cadastral-documents').getPublicUrl(filePath);
      uploadedUrls[key] = data.publicUrl;
    }
    return uploadedUrls;
  };

  const cleanupUploadedFiles = async (uploadedUrls: Record<string, string>) => {
    for (const url of Object.values(uploadedUrls)) {
      try {
        const match = url.match(/cadastral-documents\/(.+)$/);
        if (match) await supabase.storage.from('cadastral-documents').remove([match[1]]);
      } catch (err) { console.warn('Failed to cleanup orphaned file:', err); }
    }
  };

  // ========== DB SAVE ==========
  const savePermitRequest = async (uploadedUrls: Record<string, string>, transactionId?: string) => {
    if (!user) throw new Error('Non authentifié');
    const fd = form.formData;

    // Determine if user is operating on the "main" construction.
    // Only main updates the parcel-root construction columns to avoid
    // overwriting CCC truth on multi-building parcels.
    const isMain = !fd.constructionRef || fd.constructionRef === 'main';

    const permitRequestData = {
      requestType: form.requestType === 'new' ? 'construction' : 'regularization',
      constructionRef: fd.constructionRef || 'main',
      constructionType: fd.constructionType, constructionNature: fd.constructionNature,
      declaredUsage: fd.declaredUsage, plannedArea: parseFloat(fd.plannedArea),
      numberOfFloors: parseInt(fd.numberOfFloors) || 1,
      estimatedCost: fd.estimatedCost ? parseFloat(fd.estimatedCost) : null,
      applicantName: fd.applicantName, applicantPhone: fd.applicantPhone,
      applicantEmail: fd.applicantEmail, applicantAddress: fd.applicantAddress,
      nif: fd.nif || null,
      projectDescription: fd.projectDescription,
      startDate: fd.startDate || null, estimatedDuration: fd.estimatedDuration || null,
      constructionDate: fd.constructionDate || null, currentState: fd.currentState || null,
      complianceIssues: fd.complianceIssues || null,
      regularizationReason: fd.regularizationReason || null,
      originalPermitNumber: fd.originalPermitNumber || null,
      architectName: fd.architectName || null, architectLicense: fd.architectLicense || null,
      // Tax-specific metadata kept inside permit_request_data only (not promoted to root columns)
      roofingType: fd.roofingType || null, numberOfRooms: fd.numberOfRooms || null,
      waterSupply: fd.waterSupply || null, electricitySupply: fd.electricitySupply || null,
      attachments: uploadedUrls,
      totalFeePaid: form.totalFeeUSD, feeBreakdown: form.feeBreakdown,
      feesSource: form.feesSource, transactionId: transactionId || null,
    };

    // Build root insert payload — guard root construction_* columns when not main
    const insertPayload: any = {
      parcel_number: parcelNumber,
      user_id: user.id,
      contribution_type: 'permit_request',
      status: 'pending',
      permit_request_data: permitRequestData,
    };
    if (isMain) {
      insertPayload.construction_type = fd.constructionType;
      insertPayload.construction_nature = fd.constructionNature;
      insertPayload.declared_usage = fd.declaredUsage;
      insertPayload.area_sqm = parseFloat(fd.plannedArea) || null;
      insertPayload.construction_year = fd.constructionDate ? new Date(fd.constructionDate).getFullYear() : null;
      insertPayload.previous_permit_number = fd.originalPermitNumber || null;
    }

    const { data, error } = await supabase
      .from('cadastral_contributions')
      .insert(insertPayload)
      .select('id')
      .single();

    if (error) throw error;

    // Also write to permit_payments for admin tracking
    if (transactionId) {
      try {
        await supabase.from('permit_payments').insert({
          contribution_id: data.id,
          user_id: user.id,
          permit_type: form.requestType === 'new' ? 'construction' : 'regularization',
          fee_items: form.feeBreakdown.map(f => ({ fee_name: f.label, amount_usd: f.amount })),
          total_amount_usd: form.totalFeeUSD,
          payment_method: paymentMethod,
          payment_provider: paymentProvider || null,
          phone_number: paymentPhone || null,
          transaction_id: transactionId,
          status: 'completed',
          paid_at: new Date().toISOString(),
        });
      } catch (pmErr) { console.warn('permit_payments insert failed (non-blocking):', pmErr); }
    }

    // Non-blocking notification
    try {
      await supabase.from('notifications').insert({
        user_id: user.id, type: 'success',
        title: 'Demande d\'autorisation soumise',
        message: `Votre demande d'${form.requestType === 'new' ? 'autorisation de bâtir' : 'autorisation de régularisation'} pour la parcelle ${parcelNumber} a été soumise. Référence: ${data.id.slice(0, 8).toUpperCase()}. Délai de traitement: 15-30 jours.`,
        action_url: '/user-dashboard?tab=building-permits',
      });
    } catch (notifErr) { console.warn('Notification insert failed:', notifErr); }

    return data.id;
  };

  // ========== PAYMENT HANDLER ==========
  const handlePayment = async () => {
    if (!user) {
      toast({ title: 'Authentification requise', description: 'Veuillez vous connecter.', variant: 'destructive' });
      return;
    }

    // Fix #3: Check payment method BEFORE uploading files
    if (paymentMethod === 'bank_card') {
      toast({ title: 'Carte bancaire', description: 'Le paiement par carte bancaire sera bientôt disponible.' });
      return;
    }

    if (paymentMethod === 'mobile_money' && (!paymentProvider || !paymentPhone)) {
      toast({ title: 'Champs requis', description: 'Sélectionnez un opérateur et entrez votre numéro.', variant: 'destructive' });
      return;
    }

    setProcessingPayment(true);
    let uploadedUrls: Record<string, string> = {};

    try {
      // Step 1: Upload files
      uploadedUrls = await uploadAttachments();
    } catch (err: any) {
      toast({ title: 'Erreur d\'upload', description: err.message || 'Échec du téléchargement', variant: 'destructive' });
      setProcessingPayment(false);
      return;
    }

    // Step 2: If no payment required, save directly
    if (!isPaymentRequired()) {
      try {
        const contributionId = await savePermitRequest(uploadedUrls);
        setSavedContributionId(contributionId);
        form.clearDraft();
        setStep('confirmation');
        toast({ title: "Demande enregistrée", description: "Votre demande a été enregistrée avec succès" });
      } catch (err: any) {
        await cleanupUploadedFiles(uploadedUrls);
        toast({ title: 'Erreur', description: err.message || 'Impossible d\'enregistrer la demande', variant: 'destructive' });
      } finally {
        setProcessingPayment(false);
      }
      return;
    }

    // Step 2b: Test mode — simulate payment
    if (isTestModeActive && isTestSimulation) {
      try {
        // Create a test transaction
        const { data: txn } = await supabase
          .from('payment_transactions')
          .insert({
            user_id: user.id,
            payment_method: 'TEST',
            provider: 'TEST_SIMULATION',
            amount_usd: form.totalFeeUSD,
            currency_code: 'USD',
            status: 'completed',
            transaction_reference: `TEST-PERMIT-${Date.now()}`,
          })
          .select('id')
          .single();

        const contributionId = await savePermitRequest(uploadedUrls, txn?.id);
        setSavedContributionId(contributionId);
        setSavedTransactionId(txn?.id || null);
        form.clearDraft();
        setStep('confirmation');
        toast({ title: "Paiement test simulé", description: "Demande enregistrée (mode test)" });
      } catch (err: any) {
        await cleanupUploadedFiles(uploadedUrls);
        toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
      } finally {
        setProcessingPayment(false);
      }
      return;
    }

    // Step 3: Process Mobile Money payment
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const { data: paymentResult, error: paymentError } = await supabase.functions.invoke(
        'process-mobile-money-payment',
        { body: { payment_provider: paymentProvider, phone_number: paymentPhone, amount_usd: form.totalFeeUSD, payment_type: 'permit_request' } }
      );
      if (paymentError) throw paymentError;
      if (!paymentResult?.success) throw new Error(paymentResult?.error || 'Payment failed');

      setSavedTransactionId(paymentResult.transaction_id);

      const pollResult = await pollTransactionStatus(paymentResult.transaction_id, 25, 2000, controller.signal);
      if (pollResult === 'failed') throw new Error('Le paiement a échoué');
      if (pollResult === 'timeout') throw new Error('Délai de paiement dépassé. Veuillez réessayer.');
      if (pollResult === 'aborted') throw new Error('Paiement annulé');

      // Step 4: Save to DB
      try {
        const contributionId = await savePermitRequest(uploadedUrls, paymentResult.transaction_id);
        setSavedContributionId(contributionId);
        form.clearDraft();
      } catch (dbError: any) {
        // Fix #4: Cleanup files on DB failure after successful payment
        console.error('DB save failed after payment:', dbError);
        await cleanupUploadedFiles(uploadedUrls);
        toast({
          title: 'Paiement confirmé — Erreur d\'enregistrement',
          description: `Votre paiement (ID: ${paymentResult.transaction_id}) est confirmé. Contactez le support pour finaliser l'enregistrement.`,
          variant: 'destructive',
        });
        setStep('confirmation');
        setProcessingPayment(false);
        return;
      }

      toast({ title: "Demande enregistrée", description: "Votre demande a été soumise avec succès" });
      setStep('confirmation');
    } catch (err: any) {
      if (err.message !== 'Paiement annulé') {
        console.error('Payment error:', err);
      }
      await cleanupUploadedFiles(uploadedUrls);
      if (err.message !== 'Paiement annulé') {
        toast({ title: 'Erreur de paiement', description: err?.message || "Une erreur s'est produite", variant: 'destructive' });
      }
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePreview = async () => {
    if (!form.isFormValid()) {
      toast({ title: "Formulaire incomplet", description: "Veuillez remplir tous les champs obligatoires et joindre les documents requis.", variant: "destructive" });
      return;
    }
    const isDuplicate = await form.checkDuplicateRequest();
    if (isDuplicate) return;
    setStep('preview');
  };

  // Fix #9: Skip payment step when payment not required
  const handleProceedFromPreview = () => {
    if (!isPaymentRequired()) {
      // Directly submit without going through payment UI
      handlePayment();
    } else {
      setStep('payment');
    }
  };

  // Fix #16: Intercept close to confirm if data exists
  const attemptClose = () => {
    if (processingPayment) return; // Don't close during payment
    if (hasUnsavedData()) {
      setShowCloseConfirm(true);
    } else {
      doClose();
    }
  };

  const doClose = () => {
    abortControllerRef.current?.abort();
    setStep('form');
    setShowIntro(true);
    setSavedContributionId(null);
    setSavedTransactionId(null);
    setShowCloseConfirm(false);
    form.resetForm();
    setPaymentProvider('');
    setPaymentPhone('');
    setPaymentMethod('mobile_money');
    setIsTestSimulation(false);
    onOpenChange(false);
  };

  const getStepTitle = () => {
    switch (step) {
      case 'preview': return 'Aperçu de la demande';
      case 'payment': return 'Paiement';
      case 'confirmation': return 'Confirmation';
      default: return requestTypeLabel;
    }
  };

  useEffect(() => {
    if (open) setShowIntro(true);
  }, [open]);

  if (showIntro && open) {
    return (
      <FormIntroDialog
        open={open}
        onOpenChange={onOpenChange}
        onContinue={() => setShowIntro(false)}
        config={FORM_INTRO_CONFIGS.permit_request}
      />
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={attemptClose}>
        <DialogContent className={`${isMobile ? 'w-[92vw] max-w-[360px] max-h-[88vh] rounded-2xl' : 'max-w-md rounded-2xl'} p-4 overflow-hidden`}>
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              {getStepTitle()}
            </DialogTitle>
            {step === 'form' && (
              <DialogDescription className="text-sm text-muted-foreground">Parcelle {parcelNumber}</DialogDescription>
            )}
          </DialogHeader>

          {step === 'form' && (
            <PermitFormStep
              parcelNumber={parcelNumber}
              requestType={form.requestType} setRequestType={form.setRequestType}
              formData={form.formData} handleInputChange={form.handleInputChange}
              attachments={form.attachments} setAttachments={form.setAttachments}
              feesLoading={form.feesLoading} feesSource={form.feesSource}
              feeBreakdown={form.feeBreakdown} totalFeeUSD={form.totalFeeUSD}
              isFormValid={form.isFormValid} requiresOriginalPermit={form.requiresOriginalPermit}
              onPreview={handlePreview}
              isDraftRestored={form.isDraftRestored}
              parcelData={parcelData}
            />
          )}
          {step === 'preview' && (
            <PermitPreviewStep
              parcelNumber={parcelNumber} requestType={form.requestType}
              requestTypeLabel={requestTypeLabel} formData={form.formData}
              attachments={form.attachments} feeBreakdown={form.feeBreakdown}
              totalFeeUSD={form.totalFeeUSD}
              onBack={() => setStep('form')} onPay={handleProceedFromPreview}
              isPaymentRequired={isPaymentRequired()}
              processingPayment={processingPayment}
            />
          )}
          {step === 'payment' && (
            <PermitPaymentStep
              totalFeeUSD={form.totalFeeUSD} requestTypeLabel={requestTypeLabel}
              parcelNumber={parcelNumber} processingPayment={processingPayment}
              paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
              paymentProvider={paymentProvider} setPaymentProvider={setPaymentProvider}
              paymentPhone={paymentPhone} setPaymentPhone={setPaymentPhone}
              availableProviders={availableProviders}
              onPay={handlePayment} onBack={() => setStep('preview')}
              onCancelPayment={() => { abortControllerRef.current?.abort(); setProcessingPayment(false); }}
              isTestModeActive={isTestModeActive}
              onTestPay={() => { setIsTestSimulation(true); setTimeout(() => handlePayment(), 0); }}
            />
          )}
          {step === 'confirmation' && (
            <PermitConfirmationStep
              parcelNumber={parcelNumber} requestTypeLabel={requestTypeLabel}
              totalFeeUSD={form.totalFeeUSD}
              savedContributionId={savedContributionId} savedTransactionId={savedTransactionId}
              onClose={doClose}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Fix #21: WhatsApp button outside Dialog to avoid z-index/portal issues */}
      {open && <WhatsAppFloatingButton message="Bonjour, j'ai besoin d'aide avec la demande d'autorisation de bâtir." />}

      {/* Fix #16: Close confirmation dialog */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent className="z-[1300]">
          <AlertDialogHeader>
            <AlertDialogTitle>Quitter le formulaire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Votre brouillon est sauvegardé automatiquement. Vous pourrez reprendre là où vous en étiez en rouvrant ce service.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuer</AlertDialogCancel>
            <AlertDialogAction onClick={doClose}>Quitter</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BuildingPermitRequestDialog;
