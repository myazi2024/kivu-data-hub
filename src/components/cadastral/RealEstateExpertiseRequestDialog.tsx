import React, { useState, useRef, useEffect, useReducer, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import WhatsAppFloatingButton from './WhatsAppFloatingButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2, FileSearch, ArrowLeft, DollarSign, CheckCircle2, CreditCard,
  Smartphone, FileText, Info
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRealEstateExpertise } from '@/hooks/useRealEstateExpertise';
import { usePaymentProviders } from '@/hooks/usePaymentProviders';
import { useExpertiseDraft } from '@/hooks/useExpertiseDraft';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import FormIntroDialog, { FORM_INTRO_CONFIGS } from './FormIntroDialog';
import type { ExpertiseFee } from '@/types/expertise';
import { formReducer, INITIAL_FORM_STATE, buildFormSubmissionData } from './expertise-request/types';
import type { ParcelData } from './expertise-request/types';
import ExpertiseFormStep from './expertise-request/ExpertiseFormStep';
import ExpertiseSummaryStep from './expertise-request/ExpertiseSummaryStep';
import ExpertisePaymentStep from './expertise-request/ExpertisePaymentStep';
import ExpertiseConfirmationStep from './expertise-request/ExpertiseConfirmationStep';

interface RealEstateExpertiseRequestDialogProps {
  parcelNumber: string;
  parcelId?: string;
  parcelData?: ParcelData;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

const RealEstateExpertiseRequestDialog: React.FC<RealEstateExpertiseRequestDialogProps> = ({
  parcelNumber, parcelId, parcelData, trigger,
  open: controlledOpen, onOpenChange: controlledOnOpenChange, onSuccess
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const onOpenChange = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const { user, profile } = useAuth();
  const { createExpertiseRequest, loading, checkExistingValidCertificate, checkCertificateValidity } = useRealEstateExpertise();

  const [formState, dispatch] = useReducer(formReducer, INITIAL_FORM_STATE);
  const [showIntro, setShowIntro] = useState(true);
  const [step, setStep] = useState<'form' | 'summary' | 'payment' | 'confirmation'>('form');
  const [activeTab, setActiveTabRaw] = useState('general');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [createdRequest, setCreatedRequest] = useState<any>(null);

  // Documents (kept as state since File objects can't be in reducer)
  const [parcelDocuments, setParcelDocuments] = useState<File[]>([]);
  const [constructionImages, setConstructionImages] = useState<File[]>([]);
  const [constructionImageUrls, setConstructionImageUrls] = useState<string[]>([]);
  const constructionImageUrlsRef = useRef<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Certificate state
  const [checkingCertificate, setCheckingCertificate] = useState(false);
  const [existingCertificate, setExistingCertificate] = useState<any>(null);
  const [certificateChecked, setCertificateChecked] = useState(false);
  const [showCertificatePayment, setShowCertificatePayment] = useState(false);
  const [certPaymentMethod, setCertPaymentMethod] = useState<'mobile_money' | 'bank_card'>('mobile_money');
  const [certPaymentProvider, setCertPaymentProvider] = useState('');
  const [certPaymentPhone, setCertPaymentPhone] = useState('');
  const [processingCertPayment, setProcessingCertPayment] = useState(false);
  const [certificateAccessFee, setCertificateAccessFee] = useState<number>(0);
  const [hasCertificateAccess, setHasCertificateAccess] = useState(false);
  const [checkingCertificateAccess, setCheckingCertificateAccess] = useState(false);

  // Payment state
  const [fees, setFees] = useState<ExpertiseFee[]>([]);
  const [loadingFees, setLoadingFees] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'bank_card'>('mobile_money');
  const [paymentProvider, setPaymentProvider] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  const setActiveTab = useCallback((tab: string) => {
    setActiveTabRaw(tab);
    setTimeout(() => {
      const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) viewport.scrollTop = 0;
    }, 50);
  }, []);

  const getTotalAmount = useCallback(() => {
    return Math.max(fees.filter(fee => fee.is_mandatory).reduce((sum, fee) => sum + fee.amount_usd, 0), 0);
  }, [fees]);

  const isPaymentValid = useCallback(() => fees.length > 0 && getTotalAmount() > 0, [fees, getTotalAmount]);

  // Fetch fees
  useEffect(() => {
    if (!open) return;
    const fetchFees = async () => {
      setLoadingFees(true);
      try {
        const { data, error } = await supabase.from('expertise_fees_config').select('*').eq('is_active', true).order('display_order');
        if (error) throw error;
        setFees(data || []);
        const accessFee = (data || []).find((f: any) => f.fee_name?.toLowerCase().includes('accès') || f.fee_name?.toLowerCase().includes('certificat'));
        if (accessFee) {
          setCertificateAccessFee(accessFee.amount_usd);
        } else {
          const total = (data || []).reduce((s: number, f: any) => s + f.amount_usd, 0);
          setCertificateAccessFee(total > 0 ? Math.round(total * 0.2 * 100) / 100 : 5);
        }
      } catch (error) {
        console.error('Error fetching expertise fees:', error);
      } finally {
        setLoadingFees(false);
      }
    };
    fetchFees();
  }, [open]);

  // Check for existing valid certificate
  useEffect(() => {
    if (!open || showIntro || !parcelNumber || certificateChecked) return;
    const checkCert = async () => {
      setCheckingCertificate(true);
      try {
        const existing = await checkExistingValidCertificate(parcelNumber);
        setExistingCertificate(existing);
      } catch (e) {
        console.error('Certificate check error:', e);
      } finally {
        setCheckingCertificate(false);
        setCertificateChecked(true);
      }
    };
    checkCert();
  }, [open, showIntro, parcelNumber, certificateChecked, checkExistingValidCertificate]);

  // Check certificate access
  useEffect(() => {
    if (!open || showIntro || !user || !existingCertificate?.id) return;
    let cancelled = false;
    setCheckingCertificateAccess(true);
    const checkAccess = async () => {
      try {
        const { data, error } = await supabase
          .from('expertise_payments')
          .select('id')
          .eq('expertise_request_id', existingCertificate.id)
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .limit(1)
          .maybeSingle();
        if (error && error.code !== 'PGRST116') throw error;
        if (cancelled) return;
        const hasAccess = Boolean(data);
        setHasCertificateAccess(hasAccess);
        if (hasAccess) setShowCertificatePayment(false);
      } catch (error) {
        console.error('Certificate access check error:', error);
        if (!cancelled) setHasCertificateAccess(false);
      } finally {
        if (!cancelled) setCheckingCertificateAccess(false);
      }
    };
    checkAccess();
    return () => { cancelled = true; };
  }, [open, showIntro, user?.id, existingCertificate?.id]);

  // Sync image URLs ref for cleanup
  useEffect(() => { constructionImageUrlsRef.current = constructionImageUrls; }, [constructionImageUrls]);
  useEffect(() => { return () => { constructionImageUrlsRef.current.forEach(url => URL.revokeObjectURL(url)); }; }, []);

  // Reset showIntro on open
  useEffect(() => { if (open) setShowIntro(true); }, [open]);

  const uploadFiles = async (): Promise<{ parcelDocs: string[], constructionImages: string[] }> => {
    const result = { parcelDocs: [] as string[], constructionImages: [] as string[] };
    setUploadingFiles(true);
    try {
      for (const file of parcelDocuments) {
        const fileExt = file.name.split('.').pop();
        const fileName = `parcel_doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `expertise-documents/${user?.id}/parcels/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('cadastral-documents').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('cadastral-documents').getPublicUrl(filePath);
        result.parcelDocs.push(data.publicUrl);
      }
      for (const file of constructionImages) {
        const fileExt = file.name.split('.').pop();
        const fileName = `construction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `expertise-documents/${user?.id}/constructions/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('cadastral-documents').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('cadastral-documents').getPublicUrl(filePath);
        result.constructionImages.push(data.publicUrl);
      }
      return result;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Erreur lors du téléchargement des fichiers');
      throw error;
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleProceedToSummary = async () => {
    if (!user) { toast.error('Vous devez être connecté'); return; }
    try {
      const { data: existingPending } = await supabase
        .from('real_estate_expertise_requests')
        .select('id, reference_number')
        .eq('parcel_number', parcelNumber)
        .eq('user_id', user.id)
        .in('status', ['pending', 'assigned', 'in_progress'])
        .limit(1)
        .maybeSingle();
      if (existingPending) {
        toast.error(`Une demande est déjà en cours pour cette parcelle (Réf: ${existingPending.reference_number}).`);
        return;
      }
    } catch (e) {
      console.error('Duplicate check error:', e);
    }
    setStep('summary');
  };

  const handleProceedToPayment = () => {
    if (!user) { toast.error('Vous devez être connecté'); return; }
    setStep('payment');
  };

  const handlePayment = async () => {
    if (!user || processingPayment) return;
    if (paymentMethod === 'mobile_money') {
      if (!paymentProvider || !paymentPhone) {
        toast.error('Veuillez sélectionner un opérateur et entrer votre numéro');
        return;
      }
      const phoneRegex = /^(\+?243|0)(8[1-9]|9[0-9])\d{7}$/;
      if (!phoneRegex.test(paymentPhone.replace(/\s/g, ''))) {
        toast.error('Numéro de téléphone invalide. Format attendu: +243XXXXXXXXX ou 0XXXXXXXXX');
        return;
      }
    }
    setProcessingPayment(true);
    try {
      const uploadedFiles = await uploadFiles();
      const allDocUrls = [...uploadedFiles.parcelDocs, ...uploadedFiles.constructionImages];
      const submissionData = buildFormSubmissionData(formState, parcelNumber, parcelId, profile, user.email);
      const request = await createExpertiseRequest({
        ...submissionData,
        supporting_documents: allDocUrls,
      });
      if (!request) throw new Error('Erreur lors de la création de la demande');

      const feeItems = fees.map(fee => ({ fee_id: fee.id, fee_name: fee.fee_name, amount_usd: fee.amount_usd }));
      const { data: paymentRecord, error: paymentError } = await supabase
        .from('expertise_payments')
        .insert({
          expertise_request_id: request.id,
          user_id: user.id,
          fee_items: feeItems,
          total_amount_usd: getTotalAmount(),
          payment_method: paymentMethod,
          payment_provider: paymentMethod === 'mobile_money' ? paymentProvider : 'stripe',
          phone_number: paymentMethod === 'mobile_money' ? paymentPhone : null,
          status: 'pending'
        })
        .select()
        .single();
      if (paymentError) throw paymentError;

      if (paymentMethod === 'mobile_money') {
        const { processExpertiseMobileMoneyPayment } = await import('@/utils/expertisePaymentHelper');
        await processExpertiseMobileMoneyPayment({
          provider: paymentProvider,
          phone: paymentPhone,
          amountUsd: getTotalAmount(),
          paymentType: 'expertise_fee',
          paymentRecordId: paymentRecord.id,
        });
        await supabase.from('real_estate_expertise_requests').update({ payment_status: 'paid' }).eq('id', request.id);
      } else if (paymentMethod === 'bank_card') {
        const { processExpertiseStripePayment } = await import('@/utils/expertisePaymentHelper');
        const redirected = await processExpertiseStripePayment({
          paymentRecordId: paymentRecord.id,
          paymentType: 'expertise_fee',
          amountUsd: getTotalAmount(),
        });
        if (redirected) return;
      }

      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'success',
        title: 'Demande d\'expertise soumise',
        message: `Votre demande d'expertise immobilière pour la parcelle ${parcelNumber} a été enregistrée.`,
        action_url: '/user-dashboard'
      });

      setCreatedRequest(request);
      setStep('confirmation');
      toast.success('Paiement réussi ! Votre demande a été enregistrée.');
      onSuccess?.();
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Erreur lors du paiement');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleCertificateAccessPayment = async () => {
    if (!user || !existingCertificate) return;
    if (certPaymentMethod === 'mobile_money') {
      if (!certPaymentProvider || !certPaymentPhone) {
        toast.error('Veuillez sélectionner un opérateur et entrer votre numéro');
        return;
      }
      const phoneRegex = /^(\+?243|0)(8[1-9]|9[0-9])\d{7}$/;
      if (!phoneRegex.test(certPaymentPhone.replace(/\s/g, ''))) {
        toast.error('Numéro de téléphone invalide.');
        return;
      }
    }
    setProcessingCertPayment(true);
    try {
      const { data: paymentRecord, error: paymentError } = await supabase
        .from('expertise_payments')
        .insert({
          expertise_request_id: existingCertificate.id,
          user_id: user.id,
          fee_items: [{ fee_name: 'Accès au certificat d\'expertise immobilière', amount_usd: certificateAccessFee }],
          total_amount_usd: certificateAccessFee,
          payment_method: certPaymentMethod,
          payment_provider: certPaymentMethod === 'mobile_money' ? certPaymentProvider : 'stripe',
          phone_number: certPaymentMethod === 'mobile_money' ? certPaymentPhone : null,
          status: 'pending'
        })
        .select()
        .single();
      if (paymentError) throw paymentError;

      if (certPaymentMethod === 'mobile_money') {
        const { processExpertiseMobileMoneyPayment } = await import('@/utils/expertisePaymentHelper');
        await processExpertiseMobileMoneyPayment({
          provider: certPaymentProvider,
          phone: certPaymentPhone,
          amountUsd: certificateAccessFee,
          paymentType: 'certificate_access',
          paymentRecordId: paymentRecord.id,
        });
      } else {
        const { processExpertiseStripePayment } = await import('@/utils/expertisePaymentHelper');
        const redirected = await processExpertiseStripePayment({
          paymentRecordId: paymentRecord.id,
          paymentType: 'certificate_access',
          amountUsd: certificateAccessFee,
        });
        if (redirected) return;
      }

      setHasCertificateAccess(true);
      if (existingCertificate.certificate_url) {
        window.open(existingCertificate.certificate_url, '_blank', 'noopener,noreferrer');
        toast.success('Paiement réussi ! Vous pouvez accéder au certificat.');
      } else {
        toast.success('Paiement réussi ! Le certificat sera disponible dès sa publication.');
      }
      handleClose();
    } catch (error: any) {
      console.error('Certificate access payment error:', error);
      toast.error(error.message || 'Erreur lors du paiement');
    } finally {
      setProcessingCertPayment(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setActiveTab('general');
    setShowIntro(true);
    setCreatedRequest(null);
    dispatch({ type: 'RESET' });

    // Documents
    constructionImageUrls.forEach(url => URL.revokeObjectURL(url));
    setParcelDocuments([]);
    setConstructionImages([]);
    setConstructionImageUrls([]);

    // Payment
    setPaymentMethod('mobile_money');
    setPaymentProvider('');
    setPaymentPhone('');

    // Certificate
    setExistingCertificate(null);
    setCertificateChecked(false);
    setShowCertificatePayment(false);
    setCertPaymentMethod('mobile_money');
    setCertPaymentProvider('');
    setCertPaymentPhone('');
    setHasCertificateAccess(false);
    setCheckingCertificateAccess(false);
    setCertificateAccessFee(0);

    onOpenChange(false);
  };

  const handleEditTab = (tab: string) => {
    setActiveTab(tab);
    setStep('form');
  };

  // Intro screen
  if (showIntro && open) {
    return (
      <FormIntroDialog
        open={open}
        onOpenChange={onOpenChange}
        onContinue={() => setShowIntro(false)}
        config={FORM_INTRO_CONFIGS.expertise}
      />
    );
  }

  // Certificate block
  const renderExistingCertificateBlock = () => {
    if (checkingCertificate) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Vérification en cours...</span>
        </div>
      );
    }
    if (!certificateChecked) return null;
    if (!existingCertificate) return null;

    const validity = checkCertificateValidity(existingCertificate.certificate_issue_date);
    const issueDate = existingCertificate.certificate_issue_date
      ? new Date(existingCertificate.certificate_issue_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'N/A';

    if (!showCertificatePayment) {
      return (
        <div className="space-y-4">
          <Alert className="rounded-xl border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <AlertDescription className="text-sm space-y-2">
              <p className="font-semibold text-green-800 dark:text-green-300">Certificat d'expertise immobilière valide</p>
              <p className="text-green-700 dark:text-green-400">
                Un certificat est en cours de validité, délivré le <strong>{issueDate}</strong>.
              </p>
              <p className="text-xs text-green-600 dark:text-green-500">
                Référence : <span className="font-mono">{existingCertificate.reference_number}</span> — Expire dans {validity.daysRemaining} jour{validity.daysRemaining > 1 ? 's' : ''}
              </p>
            </AlertDescription>
          </Alert>

          {existingCertificate.market_value_usd && (
            <Card className="rounded-xl border-primary/20">
              <CardContent className="p-3 flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Valeur vénale estimée</p>
                  <p className="font-bold text-lg">${existingCertificate.market_value_usd.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {checkingCertificateAccess ? (
            <div className="flex items-center justify-center py-3 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />Vérification de vos droits d'accès...
            </div>
          ) : hasCertificateAccess ? (
            <>
              <Button variant="seloger" onClick={() => {
                if (existingCertificate.certificate_url) {
                  window.open(existingCertificate.certificate_url, '_blank', 'noopener,noreferrer');
                  toast.success('Certificat ouvert avec succès.');
                } else {
                  toast.info('Le certificat sera disponible dès sa publication.');
                }
              }} className="w-full h-11 rounded-2xl text-sm font-semibold">
                <FileText className="h-4 w-4 mr-2" />Ouvrir le certificat
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">Accès déjà autorisé pour votre compte.</p>
            </>
          ) : (
            <>
              <Button variant="seloger" onClick={() => setShowCertificatePayment(true)} className="w-full h-11 rounded-2xl text-sm font-semibold">
                <FileText className="h-4 w-4 mr-2" />Accéder au certificat — ${certificateAccessFee}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">Un paiement est requis pour consulter le certificat complet.</p>
            </>
          )}
        </div>
      );
    }

    // Certificate access payment form
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={() => setShowCertificatePayment(false)} className="h-8 gap-1 text-xs rounded-xl">
          <ArrowLeft className="h-3.5 w-3.5" /> Retour
        </Button>
        <Card className="rounded-xl border-primary/20">
          <CardContent className="p-3 space-y-1">
            <p className="text-sm font-semibold">Accès au certificat d'expertise immobilière</p>
            <p className="text-xs text-muted-foreground">Parcelle {parcelNumber}</p>
            <Separator className="my-2" />
            <div className="flex justify-between text-sm">
              <span>Accès au certificat</span>
              <span className="font-bold">${certificateAccessFee}</span>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-2">
          <Label className="text-xs font-medium">Mode de paiement</Label>
          <RadioGroup value={certPaymentMethod} onValueChange={(v) => setCertPaymentMethod(v as any)} className="flex gap-3">
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="mobile_money" id="cert-mm" />
              <Label htmlFor="cert-mm" className="text-xs cursor-pointer flex items-center gap-1"><Smartphone className="h-3.5 w-3.5" /> Mobile Money</Label>
            </div>
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="bank_card" id="cert-bc" />
              <Label htmlFor="cert-bc" className="text-xs cursor-pointer flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" /> Carte bancaire</Label>
            </div>
          </RadioGroup>
        </div>
        {certPaymentMethod === 'mobile_money' && (
          <div className="space-y-2">
            <Select value={certPaymentProvider} onValueChange={setCertPaymentProvider}>
              <SelectTrigger className="h-9 rounded-xl text-sm"><SelectValue placeholder="Opérateur" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="airtel_money">Airtel Money</SelectItem>
                <SelectItem value="orange_money">Orange Money</SelectItem>
                <SelectItem value="mpesa">M-Pesa</SelectItem>
              </SelectContent>
            </Select>
            <Input value={certPaymentPhone} onChange={(e) => setCertPaymentPhone(e.target.value)} placeholder="+243 ..." className="h-9 rounded-xl text-sm" />
          </div>
        )}
        {certPaymentMethod === 'bank_card' && (
          <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-2xl border">
            <CreditCard className="h-4 w-4 text-primary flex-shrink-0" />
            <p className="text-xs text-muted-foreground">Redirection vers Stripe pour un paiement sécurisé.</p>
          </div>
        )}
        <Button variant="seloger" onClick={handleCertificateAccessPayment}
          disabled={processingCertPayment || (certPaymentMethod === 'mobile_money' && (!certPaymentProvider || !certPaymentPhone))}
          className="w-full h-10 rounded-2xl text-sm font-semibold">
          {processingCertPayment ? (<><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Traitement...</>) : (<><CheckCircle2 className="h-4 w-4 mr-1.5" /> Payer ${certificateAccessFee}</>)}
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) { handleClose(); } else { onOpenChange(true); } }}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-[95vw] sm:max-w-[420px] max-h-[90vh] p-4 rounded-2xl z-[1200]">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-primary" />
            {existingCertificate && step === 'form' ? 'Certificat existant' : (
              <>
                {step === 'form' && 'Expertise immobilière'}
                {step === 'summary' && 'Récapitulatif'}
                {step === 'payment' && 'Paiement'}
                {step === 'confirmation' && 'Confirmation'}
              </>
            )}
          </DialogTitle>
          {step === 'form' && !existingCertificate && (
            <DialogDescription className="text-xs">
              Renseignez les détails pour obtenir un certificat de valeur vénale
            </DialogDescription>
          )}
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-120px)]" ref={scrollAreaRef}>
          {step === 'form' && existingCertificate ? renderExistingCertificateBlock() : (
            <>
              {step === 'form' && (
                <ExpertiseFormStep
                  state={formState}
                  dispatch={dispatch}
                  parcelNumber={parcelNumber}
                  parcelData={parcelData}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  parcelDocuments={parcelDocuments}
                  setParcelDocuments={setParcelDocuments}
                  constructionImages={constructionImages}
                  setConstructionImages={setConstructionImages}
                  constructionImageUrls={constructionImageUrls}
                  setConstructionImageUrls={setConstructionImageUrls}
                  loading={loading}
                  loadingFees={loadingFees}
                  uploadingFiles={uploadingFiles}
                  onProceedToSummary={handleProceedToSummary}
                  certificateChecked={certificateChecked}
                  checkingCertificate={checkingCertificate}
                  existingCertificate={existingCertificate}
                  scrollAreaRef={scrollAreaRef}
                />
              )}
              {step === 'summary' && (
                <ExpertiseSummaryStep
                  state={formState}
                  parcelNumber={parcelNumber}
                  parcelData={parcelData}
                  constructionImages={constructionImages}
                  parcelDocuments={parcelDocuments}
                  additionalNotes={formState.additionalNotes}
                  getTotalAmount={getTotalAmount}
                  loadingFees={loadingFees}
                  isPaymentValid={isPaymentValid}
                  onBack={() => setStep('form')}
                  onProceedToPayment={handleProceedToPayment}
                  onEditTab={handleEditTab}
                />
              )}
              {step === 'payment' && (
                <ExpertisePaymentStep
                  parcelNumber={parcelNumber}
                  fees={fees}
                  getTotalAmount={getTotalAmount}
                  isPaymentValid={isPaymentValid}
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                  paymentProvider={paymentProvider}
                  setPaymentProvider={setPaymentProvider}
                  paymentPhone={paymentPhone}
                  setPaymentPhone={setPaymentPhone}
                  processingPayment={processingPayment}
                  onBack={() => setStep('summary')}
                  onPay={handlePayment}
                />
              )}
              {step === 'confirmation' && (
                <ExpertiseConfirmationStep
                  createdRequest={createdRequest}
                  parcelNumber={parcelNumber}
                  onClose={handleClose}
                />
              )}
            </>
          )}
        </ScrollArea>
      </DialogContent>
      {open && <WhatsAppFloatingButton message="Bonjour, j'ai besoin d'aide avec la demande d'expertise immobilière." />}
    </Dialog>
  );
};

export default RealEstateExpertiseRequestDialog;
