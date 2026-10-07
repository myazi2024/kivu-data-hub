import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createLongLivedSignedUrl } from '@/utils/storageSignedUrl';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import WhatsAppFloatingButton from './WhatsAppFloatingButton';
import { FileEdit } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMutationRequest } from '@/hooks/useMutationRequest';
import type { MutationRequest } from '@/types/mutation';
import { pollTransactionStatus } from '@/utils/pollTransactionStatus';
import { isValidDrcMobileNumber } from '@/utils/expertisePaymentHelper';
import { usePaymentConfig } from '@/hooks/usePaymentConfig';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { differenceInDays, addMonths } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import RealEstateExpertiseRequestDialog from './RealEstateExpertiseRequestDialog';
import FormIntroDialog, { FORM_INTRO_CONFIGS } from './FormIntroDialog';
import {
  MUTATION_TYPES,
  isTransferMutation as checkIsTransfer,
  requiresExpertiseCertificate,
  computeMutationDuties,
  computeLateFees,
  hasLateFees as checkHasLateFees,
} from './mutation/MutationConstants';
import FormStep from './mutation-request/FormStep';
import PreviewStep from './mutation-request/PreviewStep';
import PaymentStep from './mutation-request/PaymentStep';
import ConfirmationStep from './mutation-request/ConfirmationStep';
import type { Step, RequiredDocument } from './mutation-request/types';

interface MutationRequestDialogProps {
  parcelNumber: string;
  parcelId?: string;
  parcelData?: {
    province?: string;
    ville?: string;
    commune?: string;
    quartier?: string;
    current_owner_name?: string;
    title_issue_date?: string;
    owner_acquisition_date?: string;
    is_title_in_current_owner_name?: boolean;
  };
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}


const MutationRequestDialog: React.FC<MutationRequestDialogProps> = ({
  parcelNumber,
  parcelId,
  parcelData,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const onOpenChange = isControlled ? controlledOnOpenChange! : setInternalOpen;
  
  const isMobile = useIsMobile();
  const { user, profile } = useAuth();
  const { loading, fees, createMutationRequest, checkExistingPendingRequest } = useMutationRequest();
  const { availableMethods } = usePaymentConfig();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showIntro, setShowIntro] = useState(true);
  const [step, setStep] = useState<Step>('form');
  const [createdRequest, setCreatedRequest] = useState<MutationRequest | null>(null);
  
  // Form state
  const [mutationType, setMutationType] = useState('vente');
  const [requesterType, setRequesterType] = useState('proprietaire');
  
  // Bénéficiaire
  const [beneficiaryLegalStatus, setBeneficiaryLegalStatus] = useState('personne_physique');
  const [beneficiaryLastName, setBeneficiaryLastName] = useState('');
  const [beneficiaryFirstName, setBeneficiaryFirstName] = useState('');
  const [beneficiaryMiddleName, setBeneficiaryMiddleName] = useState('');
  const [beneficiaryPhone, setBeneficiaryPhone] = useState('');
  
  const [selectedFees, setSelectedFees] = useState<string[]>([]);
  const [requiredDocumentChecks, setRequiredDocumentChecks] = useState<Record<string, boolean>>({});
  
  // Justification / notes utilisateur
  const [justification, setJustification] = useState('');
  
  // Pièces jointes
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  
  // Certificat d'expertise immobilière
  const [hasExpertiseCertificate, setHasExpertiseCertificate] = useState<'yes' | 'no' | null>(null);
  const [expertiseCertificateFile, setExpertiseCertificateFile] = useState<File | null>(null);
  const [expertiseCertificateDate, setExpertiseCertificateDate] = useState('');
  const [marketValueUsd, setMarketValueUsd] = useState('');
  const [showExpertiseDialog, setShowExpertiseDialog] = useState(false);
  const [titleAge, setTitleAge] = useState<'less_than_10' | '10_or_more' | null>(null);
  const [titleIssueDateFromCCC, setTitleIssueDateFromCCC] = useState<string | null>(null);
  const [titleAgeAutoDetected, setTitleAgeAutoDetected] = useState(false);
  const expertiseCertificateInputRef = useRef<HTMLInputElement>(null);
  
  // État pour les frais de retard de mutation
  const [ownerAcquisitionDate, setOwnerAcquisitionDate] = useState<string | null>(null);
  const [ownerAcquisitionDateAutoDetected, setOwnerAcquisitionDateAutoDetected] = useState(false);
  const [manualAcquisitionDate, setManualAcquisitionDate] = useState('');
  
  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'bank_card'>('mobile_money');
  const [paymentProvider, setPaymentProvider] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Guard against duplicate submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  const enabledMobileProviders = availableMethods.enabledProviders.mobileMoneyProviders;
  const hasAnyPaymentMethod = availableMethods.hasMobileMoney || availableMethods.hasBankCard;

  // Derived booleans — memoized
  const isTransferMutation = useMemo(() => checkIsTransfer(mutationType), [mutationType]);
  const showLateFees = useMemo(() => checkHasLateFees(mutationType), [mutationType]);
  const requiresCertificate = useMemo(() => requiresExpertiseCertificate(mutationType), [mutationType]);

  const mutationTypeDetails = useMemo(() => MUTATION_TYPES.find(t => t.value === mutationType), [mutationType]);

  // Les dates cadastrales passent par une RPC sécurisée : la table source contient des données protégées.
  useEffect(() => {
    if (!open || !parcelNumber) return;

    let cancelled = false;
    const applyPrefill = (titleDate?: string | null, acquisitionDate?: string | null) => {
      if (cancelled) return;
      if (titleDate) {
        setTitleIssueDateFromCCC(titleDate);
        calculateTitleAgeFromDate(titleDate);
      }
      if (acquisitionDate) {
        setOwnerAcquisitionDate(acquisitionDate);
        setOwnerAcquisitionDateAutoDetected(true);
      }
    };

    const fetchParcelDates = async () => {
      const { data, error } = await (supabase as any).rpc('get_parcel_mutation_prefill', {
        p_parcel_number: parcelNumber,
      });
      if (error) {
        console.error('get_parcel_mutation_prefill error:', error);
        applyPrefill(parcelData?.title_issue_date, parcelData?.owner_acquisition_date);
        return;
      }
      applyPrefill(
        parcelData?.title_issue_date || data?.title_issue_date,
        parcelData?.owner_acquisition_date || data?.current_owner_since,
      );
    };

    void fetchParcelDates();
    return () => { cancelled = true; };
  }, [open, parcelNumber, parcelData?.title_issue_date, parcelData?.owner_acquisition_date]);

  const calculateTitleAgeFromDate = (dateString: string) => {
    const issueDate = new Date(dateString);
    const today = new Date();
    const yearsElapsed = differenceInDays(today, issueDate) / 365;
    setTitleAge(yearsElapsed >= 10 ? '10_or_more' : 'less_than_10');
    setTitleAgeAutoDetected(true);
  };

  // Pénalités de retard (estimation ; le serveur recalcule depuis la parcelle)
  const lateFeesCalculation = useMemo(() => {
    if (!showLateFees) return { days: 0, fee: 0, applicable: false, capped: false };
    return computeLateFees(ownerAcquisitionDate || manualAcquisitionDate || null);
  }, [showLateFees, ownerAcquisitionDate, manualAcquisitionDate]);

  const certificateValidity = useMemo(() => {
    if (hasExpertiseCertificate !== 'yes' || !expertiseCertificateDate) return { isValid: false, daysRemaining: 0, isExpired: false };
    const issueDate = new Date(expertiseCertificateDate);
    const expiryDate = addMonths(issueDate, 6);
    const today = new Date();
    const daysRemaining = differenceInDays(expiryDate, today);
    return { isValid: daysRemaining > 0, daysRemaining: Math.max(0, daysRemaining), isExpired: daysRemaining <= 0 };
  }, [hasExpertiseCertificate, expertiseCertificateDate]);

  // Droits de mutation (estimation ; le serveur recalcule)
  const mutationFeesCalculation = useMemo(() => {
    if (!requiresCertificate) return computeMutationDuties(0, null);
    return computeMutationDuties(parseFloat(marketValueUsd) || 0, titleAge);
  }, [requiresCertificate, marketValueUsd, titleAge]);

  // Initialize mandatory fees
  useEffect(() => {
    const mandatoryFeeIds = fees.filter(f => f.is_mandatory).map(f => f.id);
    setSelectedFees(mandatoryFeeIds);
  }, [fees]);

  useEffect(() => {
    if (step !== 'payment') return;
    if (paymentMethod === 'mobile_money' && !availableMethods.hasMobileMoney && availableMethods.hasBankCard) {
      setPaymentMethod('bank_card');
      return;
    }
    if (paymentMethod === 'bank_card' && !availableMethods.hasBankCard && availableMethods.hasMobileMoney) {
      setPaymentMethod('mobile_money');
      return;
    }
    if (paymentMethod === 'mobile_money' && enabledMobileProviders.length > 0 && !paymentProvider) {
      setPaymentProvider(enabledMobileProviders[0]);
    }
  }, [step, paymentMethod, paymentProvider, availableMethods.hasMobileMoney, availableMethods.hasBankCard, enabledMobileProviders]);

  const handleFeeToggle = (feeId: string, isMandatory: boolean) => {
    if (isMandatory) return;
    setSelectedFees(prev => prev.includes(feeId) ? prev.filter(id => id !== feeId) : [...prev, feeId]);
  };

  // Memoized fee details and total
  const selectedFeesDetails = useMemo(() => {
    return fees.filter(f => selectedFees.includes(f.id));
  }, [fees, selectedFees]);

  const totalAmount = useMemo(() => {
    const baseFees = selectedFeesDetails.reduce((sum, fee) => sum + fee.amount_usd, 0);
    const mutationFees = mutationFeesCalculation.applicable ? mutationFeesCalculation.total : 0;
    const lateFees = showLateFees && lateFeesCalculation.applicable ? lateFeesCalculation.fee : 0;
    return baseFees + mutationFees + lateFees;
  }, [selectedFeesDetails, mutationFeesCalculation, showLateFees, lateFeesCalculation]);

  // File handlers
  const handleExpertiseCertificateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Format non supporté (images ou PDF uniquement)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 10MB)');
      return;
    }
    setExpertiseCertificateFile(file);
    if (expertiseCertificateInputRef.current) expertiseCertificateInputRef.current.value = '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files);
    const validFiles = newFiles.filter(file => {
      const isValid = file.type.startsWith('image/') || file.type === 'application/pdf';
      const isValidSize = file.size <= 10 * 1024 * 1024;
      if (!isValid) toast.error(`${file.name}: Format non supporté (images ou PDF)`);
      if (!isValidSize) toast.error(`${file.name}: Fichier trop volumineux (max 10MB)`);
      return isValid && isValidSize;
    });
    setAttachedFiles(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  /** Envoie les pièces ; en cas d'échec, supprime celles déjà envoyées et nomme le fichier en cause. */
  const uploadFiles = async (): Promise<string[]> => {
    if (attachedFiles.length === 0) return [];
    setUploadingFiles(true);
    const urls: string[] = [];
    const uploadedPaths: string[] = [];
    let current = '';
    try {
      for (const file of attachedFiles) {
        current = file.name;
        const fileExt = file.name.split('.').pop();
        const filePath = `mutation-documents/${user?.id}/mutation_${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('cadastral-documents').upload(filePath, file);
        if (uploadError) throw uploadError;
        uploadedPaths.push(filePath);
        const signed = await createLongLivedSignedUrl(filePath);
        if (!signed) throw new Error('Lien du document indisponible');
        urls.push(signed);
      }
      return urls;
    } catch (error) {
      console.error('Upload error:', error);
      if (uploadedPaths.length) await supabase.storage.from('cadastral-documents').remove(uploadedPaths);
      toast.error(`Échec de l'envoi de « ${current} ». Aucun document n'a été conservé, réessayez.`);
      return [];
    } finally {
      setUploadingFiles(false);
    }
  };

  // Documents requis par type — single useMemo (no intermediate useCallback)
  const allRequiredDocuments = useMemo((): RequiredDocument[] => {
    const base: RequiredDocument[] = [
      { key: 'requester_id', label: 'Pièce d\'identité du demandeur', required: true },
    ];
    switch (mutationType) {
      case 'vente':
        return [...base, { key: 'sale_deed', label: 'Acte de vente notarié', required: true }, { key: 'expertise_certificate', label: 'Certificat d\'expertise immobilière', required: true, handledByExpertiseCertificate: true }];
      case 'donation':
        return [...base, { key: 'donation_deed', label: 'Acte de donation notarié', required: true }, { key: 'expertise_certificate', label: 'Certificat d\'expertise immobilière', required: true, handledByExpertiseCertificate: true }];
      case 'succession':
        return [...base, { key: 'inheritance_certificate', label: 'Certificat d\'héritage / Jugement supplétif', required: true }, { key: 'death_certificate', label: 'Acte de décès', required: true }, { key: 'expertise_certificate', label: 'Certificat d\'expertise immobilière', required: true, handledByExpertiseCertificate: true }];
      case 'expropriation':
        return [...base, { key: 'expropriation_order', label: 'Arrêté d\'expropriation', required: true }, { key: 'compensation_report', label: 'PV d\'indemnisation', required: true }];
      case 'echange':
        return [...base, { key: 'exchange_contract', label: 'Contrat d\'échange notarié', required: true }, { key: 'dual_expertise_certificate', label: 'Certificat d\'expertise des deux biens', required: true, handledByExpertiseCertificate: true }];
      case 'correction':
        return [...base, { key: 'correction_proof', label: 'Document justificatif de la correction', required: true }];
      case 'mise_a_jour':
        return [...base, { key: 'update_proof', label: 'Document attestant la mise à jour', required: true }];
      default:
        return base;
    }
  }, [mutationType]);

  const requiredSupportingDocuments = useMemo(() =>
    allRequiredDocuments.filter(doc => doc.required && !doc.handledByExpertiseCertificate),
    [allRequiredDocuments]
  );

  useEffect(() => {
    setRequiredDocumentChecks((prev) => {
      const next: Record<string, boolean> = {};
      requiredSupportingDocuments.forEach((doc) => { next[doc.key] = prev[doc.key] ?? false; });
      return next;
    });
  }, [requiredSupportingDocuments]);

  const validateForm = (): boolean => {
    if (isTransferMutation && (!beneficiaryLastName.trim() || (beneficiaryLegalStatus === 'personne_physique' && !beneficiaryFirstName.trim()))) {
      toast.error('Veuillez renseigner le nom du nouveau propriétaire');
      return false;
    }
    
    if (requiresCertificate) {
      if (!hasExpertiseCertificate) {
        toast.error('Veuillez indiquer si vous avez un certificat d\'expertise immobilière');
        return false;
      }
      if (hasExpertiseCertificate === 'yes') {
        if (!expertiseCertificateFile) { toast.error('Veuillez joindre votre certificat d\'expertise immobilière'); return false; }
        if (!expertiseCertificateDate) { toast.error('Veuillez renseigner la date de délivrance du certificat'); return false; }
        if (new Date(expertiseCertificateDate) > new Date()) { toast.error('La date du certificat ne peut pas être dans le futur.'); return false; }
        if (certificateValidity.isExpired) { toast.error('Le certificat d\'expertise est expiré (valide 6 mois). Veuillez en demander un nouveau.'); return false; }
        if (!marketValueUsd || parseFloat(marketValueUsd) <= 0) { toast.error('Veuillez renseigner la valeur vénale du bien'); return false; }
        if (parseFloat(marketValueUsd) >= 10000 && !titleAge) { toast.error('Veuillez indiquer l\'ancienneté du titre foncier'); return false; }
      }
      if (hasExpertiseCertificate === 'no') {
        toast.error('Un certificat d\'expertise immobilière est requis pour procéder à la mutation. Veuillez d\'abord en demander un.');
        return false;
      }
    }

    const missingCheckedDocuments = requiredSupportingDocuments.filter(doc => !requiredDocumentChecks[doc.key]);
    if (missingCheckedDocuments.length > 0) {
      toast.error(`Veuillez confirmer les pièces requises : ${missingCheckedDocuments.map(doc => doc.label).join(', ')}`);
      return false;
    }
    if (requiredSupportingDocuments.length > 0 && attachedFiles.length === 0) {
      toast.error('Ajoutez au moins un document justificatif pour ce type de mutation.');
      return false;
    }
    return true;
  };

  const handlePreview = () => {
    if (!validateForm()) return;
    setStep('preview');
  };

  const uploadExpertiseCertificate = async (): Promise<string | null> => {
    if (!expertiseCertificateFile || !user) return null;
    try {
      const fileExt = expertiseCertificateFile.name.split('.').pop();
      const fileName = `expertise_cert_${crypto.randomUUID()}.${fileExt}`;
      const filePath = `mutation-documents/${user.id}/certificates/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('cadastral-documents').upload(filePath, expertiseCertificateFile);
      if (uploadError) throw uploadError;
      return await createLongLivedSignedUrl(filePath);
    } catch (error: any) {
      console.error('Expertise certificate upload error:', error);
      toast.error('Erreur lors de l\'envoi du certificat d\'expertise');
      return null;
    }
  };

  // Derived value — useMemo (not useCallback, since this is a computed string)
  const beneficiaryFullName = useMemo(() => {
    if (beneficiaryLegalStatus === 'personne_morale') return beneficiaryLastName;
    return [beneficiaryLastName, beneficiaryMiddleName, beneficiaryFirstName].filter(Boolean).join(' ');
  }, [beneficiaryLegalStatus, beneficiaryLastName, beneficiaryMiddleName, beneficiaryFirstName]);

  const handleSubmitForm = async () => {
    // Guard: prevent duplicate submissions
    if (isSubmitting || createdRequest) {
      toast.error('La demande a déjà été créée. Veuillez procéder au paiement.');
      setStep('payment');
      return;
    }

    // Check for existing pending request on same parcel
    const hasPending = await checkExistingPendingRequest(parcelNumber);
    if (hasPending) {
      toast.error('Vous avez déjà une demande de mutation en cours pour cette parcelle. Veuillez attendre son traitement avant d\'en soumettre une nouvelle.');
      return;
    }

    setIsSubmitting(true);

    let documentUrls: string[] = [];
    if (attachedFiles.length > 0) {
      documentUrls = await uploadFiles();
      if (documentUrls.length === 0 && attachedFiles.length > 0) { setIsSubmitting(false); return; }
    }

    let expertiseCertificateUrl: string | null = null;
    if (requiresCertificate && expertiseCertificateFile) {
      expertiseCertificateUrl = await uploadExpertiseCertificate();
      if (!expertiseCertificateUrl) { setIsSubmitting(false); return; }
    }

    const fullBeneficiaryName = beneficiaryFullName;
    const requesterName = profile?.full_name || user?.email || 'Utilisateur';
    const requesterEmail = profile?.email || user?.email || '';

    const autoDescription = isTransferMutation 
      ? `${mutationTypeDetails?.label} - Transfert à ${fullBeneficiaryName}`
      : `${mutationTypeDetails?.label} - ${mutationTypeDetails?.description}`;

    const request = await createMutationRequest({
      parcel_number: parcelNumber,
      parcel_id: parcelId,
      mutation_type: mutationType,
      requester_type: requesterType,
      requester_name: requesterName,
      requester_phone: null,
      requester_email: requesterEmail,
      beneficiary_name: isTransferMutation ? fullBeneficiaryName : undefined,
      beneficiary_phone: isTransferMutation && beneficiaryPhone.trim() ? beneficiaryPhone.trim() : undefined,
      proposed_changes: { 
        description: autoDescription,
        beneficiary_legal_status: isTransferMutation ? beneficiaryLegalStatus : undefined,
        // Date déclarée : utilisée par le serveur seulement si la parcelle n'en a pas
        declared_acquisition_date: showLateFees && !ownerAcquisitionDate && manualAcquisitionDate ? manualAcquisitionDate : undefined,
      },
      justification: justification.trim() || undefined,
      selected_fees: selectedFeesDetails,
      total_amount_override: totalAmount,
      // Dedicated columns
      supporting_documents: documentUrls.length > 0 ? documentUrls : undefined,
      expertise_certificate_url: expertiseCertificateUrl || undefined,
      expertise_certificate_date: requiresCertificate ? expertiseCertificateDate || undefined : undefined,
      market_value_usd: requiresCertificate && marketValueUsd ? parseFloat(marketValueUsd) : undefined,
      title_age: requiresCertificate ? titleAge || undefined : undefined,
      mutation_fee_amount: mutationFeesCalculation.applicable ? mutationFeesCalculation.mutationFee : undefined,
      bank_fee_amount: mutationFeesCalculation.applicable ? mutationFeesCalculation.bankFee : undefined,
      late_fee_amount: showLateFees && lateFeesCalculation.applicable ? lateFeesCalculation.fee : undefined,
      late_fee_days: showLateFees && lateFeesCalculation.applicable ? lateFeesCalculation.days : undefined,
    });

    setIsSubmitting(false);

    if (request) {
      // Le montant enregistré est celui calculé par le serveur
      if (Math.abs(Number(request.total_amount_usd) - totalAmount) > 0.01) {
        toast.warning(`Montant ajusté par le serveur : ${Number(request.total_amount_usd).toFixed(2)} $ (estimation : ${totalAmount.toFixed(2)} $).`);
      }
      setCreatedRequest(request);
      setStep('payment');
    }
  };

  const handlePayment = async () => {
    if (!createdRequest) return;
    if (!hasAnyPaymentMethod) {
      toast.error('Aucun moyen de paiement n\'est disponible pour le moment.');
      return;
    }
    
    setProcessingPayment(true);
    try {
      if (paymentMethod === 'mobile_money') {
        if (!availableMethods.hasMobileMoney) throw new Error('Le paiement Mobile Money est indisponible actuellement.');
        if (!enabledMobileProviders.length) throw new Error('Aucun opérateur Mobile Money actif n\'est configuré.');
        if (!paymentProvider) { toast.error('Veuillez sélectionner un opérateur'); setProcessingPayment(false); return; }
        if (!paymentPhone) { toast.error('Veuillez entrer votre numéro de téléphone'); setProcessingPayment(false); return; }
        if (!isValidDrcMobileNumber(paymentPhone)) { toast.error('Numéro Mobile Money RDC invalide (ex. +243 81 234 5678).'); setProcessingPayment(false); return; }

        const { data: paymentResult, error: paymentError } = await supabase.functions.invoke('process-mobile-money-payment', {
          body: { payment_provider: paymentProvider, phone_number: paymentPhone.replace(/\s/g, ''), amount_usd: createdRequest.total_amount_usd, payment_type: 'mutation_request', invoice_id: createdRequest.id },
        });
        if (paymentError) throw paymentError;

        const txId = paymentResult?.transaction_id;
        if (!txId) throw new Error('Transaction de paiement introuvable');

        const result = await pollTransactionStatus(txId);
        if (result === 'failed') throw new Error('Le paiement a échoué');
        if (result === 'timeout') throw new Error('Délai de paiement dépassé. Vérifiez votre transaction.');
        if (result === 'aborted') return;

        let paymentWasSynchronized = false;
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const { data: paidRequest, error: statusError } = await supabase
            .from('mutation_requests')
            .select('payment_status')
            .eq('id', createdRequest.id)
            .single();
          if (statusError) throw statusError;
          if (paidRequest?.payment_status === 'paid') {
            paymentWasSynchronized = true;
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        if (!paymentWasSynchronized) {
          throw new Error('Paiement confirmé, mais la synchronisation serveur est encore en cours. Vérifiez votre tableau de bord dans quelques secondes.');
        }

        setStep('confirmation');
        toast.success('Paiement effectué avec succès');
      } else {
        if (!availableMethods.hasBankCard) throw new Error('Le paiement par carte bancaire est indisponible actuellement.');
        const { data: stripeSession, error: stripeError } = await supabase.functions.invoke('create-payment', {
          body: { invoice_id: createdRequest.id, payment_type: 'mutation_request', amount_usd: createdRequest.total_amount_usd },
        });
        if (stripeError) throw stripeError;
        if (stripeSession?.url) { window.location.href = stripeSession.url; return; }
        throw new Error('Session de paiement invalide');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Erreur lors du paiement');
    } finally {
      setProcessingPayment(false);
    }
  };

  // handleClose properly resets all state
  const handleClose = () => {
    setStep('form');
    setShowIntro(true);
    setCreatedRequest(null);
    setIsSubmitting(false);
    setMutationType('vente');
    setRequesterType('proprietaire');
    setBeneficiaryLegalStatus('personne_physique');
    setBeneficiaryLastName('');
    setBeneficiaryFirstName('');
    setBeneficiaryMiddleName('');
    setBeneficiaryPhone('');
    setAttachedFiles([]);
    setRequiredDocumentChecks({});
    setJustification('');
    setHasExpertiseCertificate(null);
    setExpertiseCertificateFile(null);
    setExpertiseCertificateDate('');
    setMarketValueUsd('');
    setTitleAge(null);
    setTitleIssueDateFromCCC(null);
    setTitleAgeAutoDetected(false);
    setOwnerAcquisitionDate(null);
    setOwnerAcquisitionDateAutoDetected(false);
    setManualAcquisitionDate('');
    setPaymentMethod('mobile_money');
    setPaymentProvider('');
    setPaymentPhone('');
    onOpenChange(false);
  };

  // FIX: FormIntroDialog close should NOT close parent — only dismiss intro
  const handleIntroDismiss = (isOpen: boolean) => {
    if (!isOpen) {
      // User pressed Escape or overlay on intro — close everything
      handleClose();
    }
  };

  // =============== FORM STEP ===============
  const renderFormStep = () => (
    <FormStep
      parcelNumber={parcelNumber}
      parcelData={parcelData}
      mutationType={mutationType}
      setMutationType={setMutationType}
      mutationTypeDetails={mutationTypeDetails}
      allRequiredDocuments={allRequiredDocuments}
      requiredDocumentChecks={requiredDocumentChecks}
      setRequiredDocumentChecks={setRequiredDocumentChecks}
      fileInputRef={fileInputRef}
      handleFileSelect={handleFileSelect}
      attachedFiles={attachedFiles}
      removeFile={removeFile}
      requesterType={requesterType}
      setRequesterType={setRequesterType}
      isTransferMutation={isTransferMutation}
      requiresCertificate={requiresCertificate}
      beneficiaryLegalStatus={beneficiaryLegalStatus}
      setBeneficiaryLegalStatus={setBeneficiaryLegalStatus}
      beneficiaryLastName={beneficiaryLastName}
      setBeneficiaryLastName={setBeneficiaryLastName}
      beneficiaryMiddleName={beneficiaryMiddleName}
      setBeneficiaryMiddleName={setBeneficiaryMiddleName}
      beneficiaryFirstName={beneficiaryFirstName}
      setBeneficiaryFirstName={setBeneficiaryFirstName}
      beneficiaryPhone={beneficiaryPhone}
      setBeneficiaryPhone={setBeneficiaryPhone}
      hasExpertiseCertificate={hasExpertiseCertificate}
      setHasExpertiseCertificate={setHasExpertiseCertificate}
      expertiseCertificateInputRef={expertiseCertificateInputRef}
      handleExpertiseCertificateSelect={handleExpertiseCertificateSelect}
      expertiseCertificateFile={expertiseCertificateFile}
      setExpertiseCertificateFile={setExpertiseCertificateFile}
      expertiseCertificateDate={expertiseCertificateDate}
      setExpertiseCertificateDate={setExpertiseCertificateDate}
      certificateValidity={certificateValidity}
      setShowExpertiseDialog={setShowExpertiseDialog}
      marketValueUsd={marketValueUsd}
      setMarketValueUsd={setMarketValueUsd}
      titleAgeAutoDetected={titleAgeAutoDetected}
      titleIssueDateFromCCC={titleIssueDateFromCCC}
      titleAge={titleAge}
      setTitleAge={setTitleAge}
      setTitleAgeAutoDetected={setTitleAgeAutoDetected}
      fees={fees}
      selectedFees={selectedFees}
      handleFeeToggle={handleFeeToggle}
      mutationFeesCalculation={mutationFeesCalculation}
      showLateFees={showLateFees}
      ownerAcquisitionDate={ownerAcquisitionDate}
      ownerAcquisitionDateAutoDetected={ownerAcquisitionDateAutoDetected}
      manualAcquisitionDate={manualAcquisitionDate}
      setManualAcquisitionDate={setManualAcquisitionDate}
      lateFeesCalculation={lateFeesCalculation}
      justification={justification}
      setJustification={setJustification}
      totalAmount={totalAmount}
      handlePreview={handlePreview}
    />
  );

  // =============== PREVIEW STEP ===============
  const renderPreviewStep = () => (
    <PreviewStep
      parcelNumber={parcelNumber}
      parcelData={parcelData}
      mutationTypeDetails={mutationTypeDetails}
      requesterType={requesterType}
      isTransferMutation={isTransferMutation}
      beneficiaryFullName={beneficiaryFullName}
      beneficiaryLegalStatus={beneficiaryLegalStatus}
      beneficiaryPhone={beneficiaryPhone}
      justification={justification}
      attachedFiles={attachedFiles}
      selectedFeesDetails={selectedFeesDetails}
      mutationFeesCalculation={mutationFeesCalculation}
      showLateFees={showLateFees}
      lateFeesCalculation={lateFeesCalculation}
      totalAmount={totalAmount}
      createdRequest={createdRequest}
      setStep={setStep}
      handleSubmitForm={handleSubmitForm}
      loading={loading}
      uploadingFiles={uploadingFiles}
      isSubmitting={isSubmitting}
    />
  );

  // =============== PAYMENT STEP ===============
  const renderPaymentStep = () => (
    <PaymentStep
      createdRequest={createdRequest}
      hasAnyPaymentMethod={hasAnyPaymentMethod}
      availableMethods={availableMethods}
      paymentMethod={paymentMethod}
      setPaymentMethod={setPaymentMethod}
      paymentProvider={paymentProvider}
      setPaymentProvider={setPaymentProvider}
      enabledMobileProviders={enabledMobileProviders}
      paymentPhone={paymentPhone}
      setPaymentPhone={setPaymentPhone}
      setStep={setStep}
      processingPayment={processingPayment}
      handlePayment={handlePayment}
    />
  );

  // =============== CONFIRMATION STEP ===============
  const renderConfirmationStep = () => (
    <ConfirmationStep
      createdRequest={createdRequest}
      parcelNumber={parcelNumber}
      parcelData={parcelData}
      handleClose={handleClose}
    />
  );

  const getStepTitle = () => {
    switch (step) {
      case 'preview': return 'Aperçu de la demande';
      case 'payment': return 'Paiement';
      case 'confirmation': return 'Confirmation';
      default: return 'Demande de mutation';
    }
  };

  // Note: showIntro is already reset in handleClose, no need for a separate useEffect

  const handleIntroComplete = () => setShowIntro(false);

  if (showIntro && open) {
    return (
      <FormIntroDialog open={open} onOpenChange={handleIntroDismiss} onContinue={handleIntroComplete} config={FORM_INTRO_CONFIGS.mutation} />
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); else onOpenChange(true); }}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={`${isMobile ? 'w-[92vw] max-w-[360px] max-h-[88vh] rounded-2xl' : 'max-w-md rounded-2xl'} p-4 overflow-hidden`}>
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <div className="p-1.5 bg-primary/10 rounded-lg"><FileEdit className="h-4 w-4 text-primary" /></div>
            {getStepTitle()}
          </DialogTitle>
          {step === 'form' && (
            <DialogDescription className="text-sm text-muted-foreground">Remplissez le formulaire pour demander une mise à jour cadastrale</DialogDescription>
          )}
        </DialogHeader>
        {step === 'form' && renderFormStep()}
        {step === 'preview' && renderPreviewStep()}
        {step === 'payment' && renderPaymentStep()}
        {step === 'confirmation' && renderConfirmationStep()}
      </DialogContent>
      {open && step === 'form' && <WhatsAppFloatingButton message="Bonjour, j'ai besoin d'aide avec le formulaire de mutation." />}
      <RealEstateExpertiseRequestDialog
        parcelNumber={parcelNumber}
        parcelId={parcelId}
        parcelData={parcelData}
        open={showExpertiseDialog}
        onOpenChange={setShowExpertiseDialog}
        onSuccess={() => toast.success('Demande d\'expertise soumise ! Vous serez notifié une fois le certificat disponible.')}
      />
    </Dialog>
  );
};

export default MutationRequestDialog;
