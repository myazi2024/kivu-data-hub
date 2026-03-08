import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import WhatsAppFloatingButton from './WhatsAppFloatingButton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { usePaymentConfig } from '@/hooks/usePaymentConfig';
import { usePaymentProviders } from '@/hooks/usePaymentProviders';
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
}

const BuildingPermitRequestDialog: React.FC<BuildingPermitRequestDialogProps> = ({
  open, onOpenChange, parcelNumber, hasExistingConstruction = false,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { isPaymentRequired } = usePaymentConfig();
  const { providers: availableProviders } = usePaymentProviders();
  const abortControllerRef = useRef<AbortController | null>(null);

  const [showIntro, setShowIntro] = useState(true);
  const [step, setStep] = useState<PermitStep>('form');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [savedContributionId, setSavedContributionId] = useState<string | null>(null);
  const [savedTransactionId, setSavedTransactionId] = useState<string | null>(null);

  // Payment UI state
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'bank_card'>('mobile_money');
  const [paymentProvider, setPaymentProvider] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');

  const form = usePermitRequestForm({ parcelNumber, hasExistingConstruction });

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => { abortControllerRef.current?.abort(); };
  }, []);

  const requestTypeLabel = form.requestType === 'new' ? 'Autorisation de bâtir' : 'Autorisation de régularisation';

  // ========== FILE UPLOAD ==========
  const uploadAttachments = async (): Promise<Record<string, string>> => {
    if (!user) throw new Error('Non authentifié');
    const uploadedUrls: Record<string, string> = {};
    for (const [key, attachment] of Object.entries(form.attachments)) {
      if (!attachment) continue;
      const fileExt = attachment.file.name.split('.').pop();
      const fileName = `permit_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
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

    const permitRequestData = {
      requestType: form.requestType === 'new' ? 'construction' : 'regularization',
      constructionType: fd.constructionType, constructionNature: fd.constructionNature,
      declaredUsage: fd.declaredUsage, plannedArea: parseFloat(fd.plannedArea),
      numberOfFloors: parseInt(fd.numberOfFloors) || 1,
      estimatedCost: fd.estimatedCost ? parseFloat(fd.estimatedCost) : null,
      applicantName: fd.applicantName, applicantPhone: fd.applicantPhone,
      applicantEmail: fd.applicantEmail, applicantAddress: fd.applicantAddress,
      projectDescription: fd.projectDescription,
      startDate: fd.startDate || null, estimatedDuration: fd.estimatedDuration || null,
      constructionDate: fd.constructionDate || null, currentState: fd.currentState || null,
      complianceIssues: fd.complianceIssues || null,
      regularizationReason: fd.regularizationReason || null,
      originalPermitNumber: fd.originalPermitNumber || null,
      architectName: fd.architectName || null, architectLicense: fd.architectLicense || null,
      roofingType: fd.roofingType || null, numberOfRooms: fd.numberOfRooms || null,
      waterSupply: fd.waterSupply || null, electricitySupply: fd.electricitySupply || null,
      attachments: uploadedUrls,
      totalFeePaid: form.totalFeeUSD, feeBreakdown: form.feeBreakdown,
      feesSource: form.feesSource, transactionId: transactionId || null,
    };

    const { data, error } = await supabase
      .from('cadastral_contributions')
      .insert({
        parcel_number: parcelNumber, user_id: user.id,
        contribution_type: 'permit_request', status: 'pending',
        permit_request_data: permitRequestData,
        construction_type: fd.constructionType, construction_nature: fd.constructionNature,
        declared_usage: fd.declaredUsage,
        area_sqm: parseFloat(fd.plannedArea) || null,
        construction_year: fd.constructionDate ? new Date(fd.constructionDate).getFullYear() : null,
        previous_permit_number: fd.originalPermitNumber || null,
      })
      .select('id')
      .single();

    if (error) throw error;

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

    // Step 3: Process Mobile Money payment — NO test_mode from client (#7)
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

      // Use shared polling utility (#17)
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
        console.error('DB save failed after payment:', dbError);
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
        await cleanupUploadedFiles(uploadedUrls);
        toast({ title: 'Erreur de paiement', description: err?.message || "Une erreur s'est produite", variant: 'destructive' });
      } else {
        await cleanupUploadedFiles(uploadedUrls);
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

  const handleClose = () => {
    abortControllerRef.current?.abort();
    setStep('form');
    setShowIntro(true);
    setSavedContributionId(null);
    setSavedTransactionId(null);
    form.resetForm();
    setPaymentProvider('');
    setPaymentPhone('');
    setPaymentMethod('mobile_money');
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={`z-[1200] ${isMobile ? 'w-[92vw] max-w-[360px] max-h-[88vh] rounded-2xl' : 'max-w-md rounded-2xl'} p-4 overflow-hidden`}>
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
          />
        )}
        {step === 'preview' && (
          <PermitPreviewStep
            parcelNumber={parcelNumber} requestType={form.requestType}
            requestTypeLabel={requestTypeLabel} formData={form.formData}
            attachments={form.attachments} feeBreakdown={form.feeBreakdown}
            totalFeeUSD={form.totalFeeUSD}
            onBack={() => setStep('form')} onPay={() => setStep('payment')}
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
          />
        )}
        {step === 'confirmation' && (
          <PermitConfirmationStep
            parcelNumber={parcelNumber} requestTypeLabel={requestTypeLabel}
            totalFeeUSD={form.totalFeeUSD}
            savedContributionId={savedContributionId} savedTransactionId={savedTransactionId}
            onClose={handleClose}
          />
        )}
      </DialogContent>
      {open && <WhatsAppFloatingButton message="Bonjour, j'ai besoin d'aide avec la demande d'autorisation de bâtir." />}
    </Dialog>
  );
};

export default BuildingPermitRequestDialog;
