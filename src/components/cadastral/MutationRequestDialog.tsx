import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import WhatsAppFloatingButton from './WhatsAppFloatingButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, FileEdit, CreditCard, CheckCircle2, AlertTriangle, MapPin, Clock, Hash, Upload, X, FileText, Image, Eye, ArrowLeft, AlertCircle, FileSearch, ExternalLink, Calendar, DollarSign, Award, HelpCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMutationRequest } from '@/hooks/useMutationRequest';
import type { MutationFee, MutationRequest } from '@/types/mutation';
import { MutationRequestWithProfile } from '@/types/mutation';
import { LATE_FEE_CAP_USD, DAILY_LATE_FEE_USD, LEGAL_GRACE_PERIOD_DAYS } from '@/types/mutation';
import { pollTransactionStatus } from '@/utils/pollTransactionStatus';
import { usePaymentConfig } from '@/hooks/usePaymentConfig';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { format, differenceInDays, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import RealEstateExpertiseRequestDialog from './RealEstateExpertiseRequestDialog';
import FormIntroDialog, { FORM_INTRO_CONFIGS } from './FormIntroDialog';
import SectionHelpPopover from './SectionHelpPopover';
import MutationLateFeeSection from './mutation/MutationLateFeeSection';
import {
  MUTATION_TYPES,
  LEGAL_STATUS_OPTIONS,
  REQUESTER_TYPES,
  PROVIDER_LABELS,
  BANK_FEE_PERCENTAGE,
  isTransferMutation as checkIsTransfer,
  hasLateFees as checkHasLateFees,
} from './mutation/MutationConstants';

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

type Step = 'form' | 'preview' | 'payment' | 'confirmation';

type RequiredDocument = {
  key: string;
  label: string;
  required: boolean;
  handledByExpertiseCertificate?: boolean;
};

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
  const { loading, fees, createMutationRequest, updatePaymentStatus, checkExistingPendingRequest } = useMutationRequest();
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

  const mutationTypeDetails = useMemo(() => MUTATION_TYPES.find(t => t.value === mutationType), [mutationType]);

  // Récupérer automatiquement les données CCC
  useEffect(() => {
    const fetchParcelDates = async () => {
      const hasTitleDate = !!parcelData?.title_issue_date;
      const hasAcquisitionDate = !!parcelData?.owner_acquisition_date;

      if (hasTitleDate) {
        setTitleIssueDateFromCCC(parcelData!.title_issue_date!);
        calculateTitleAgeFromDate(parcelData!.title_issue_date!);
      }
      if (hasAcquisitionDate) {
        setOwnerAcquisitionDate(parcelData!.owner_acquisition_date!);
        setOwnerAcquisitionDateAutoDetected(true);
      }

      if (hasTitleDate && hasAcquisitionDate) return;

      try {
        const { data: contribution } = await supabase
          .from('cadastral_contributions')
          .select('title_issue_date, current_owner_since')
          .eq('parcel_number', parcelNumber)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!hasTitleDate && contribution?.title_issue_date) {
          setTitleIssueDateFromCCC(contribution.title_issue_date);
          calculateTitleAgeFromDate(contribution.title_issue_date);
        }
        if (!hasAcquisitionDate && contribution?.current_owner_since) {
          setOwnerAcquisitionDate(contribution.current_owner_since);
          setOwnerAcquisitionDateAutoDetected(true);
        }

        const needTitle = !hasTitleDate && !contribution?.title_issue_date;
        const needAcquisition = !hasAcquisitionDate && !contribution?.current_owner_since;

        if (needTitle || needAcquisition) {
          const { data: parcel } = await supabase
            .from('cadastral_parcels')
            .select('title_issue_date, current_owner_since')
            .eq('parcel_number', parcelNumber)
            .limit(1)
            .single();

          if (needTitle && parcel?.title_issue_date) {
            setTitleIssueDateFromCCC(parcel.title_issue_date);
            calculateTitleAgeFromDate(parcel.title_issue_date);
          }
          if (needAcquisition && parcel?.current_owner_since) {
            setOwnerAcquisitionDate(parcel.current_owner_since);
            setOwnerAcquisitionDateAutoDetected(true);
          }
        }
      } catch (error) {
        console.log('Aucune donnée de date trouvée dans le CCC');
      }
    };

    if (open && parcelNumber) {
      fetchParcelDates();
    }
  }, [open, parcelNumber, parcelData?.title_issue_date, parcelData?.owner_acquisition_date]);

  const calculateTitleAgeFromDate = (dateString: string) => {
    const issueDate = new Date(dateString);
    const today = new Date();
    const yearsElapsed = differenceInDays(today, issueDate) / 365;
    setTitleAge(yearsElapsed >= 10 ? '10_or_more' : 'less_than_10');
    setTitleAgeAutoDetected(true);
  };

  // Memoized: late fee calculation
  const lateFeesCalculation = useMemo(() => {
    if (!showLateFees) return { days: 0, fee: 0, applicable: false, capped: false };
    const dateToUse = ownerAcquisitionDate || manualAcquisitionDate;
    if (!dateToUse) return { days: 0, fee: 0, applicable: false, capped: false };
    
    const acquisitionDate = new Date(dateToUse);
    const today = new Date();
    const totalDaysElapsed = differenceInDays(today, acquisitionDate);
    const daysAfterGracePeriod = Math.max(0, totalDaysElapsed - LEGAL_GRACE_PERIOD_DAYS);
    const rawFee = daysAfterGracePeriod * DAILY_LATE_FEE_USD;
    const cappedFee = Math.min(rawFee, LATE_FEE_CAP_USD);
    
    return {
      days: daysAfterGracePeriod,
      fee: Math.round(cappedFee * 100) / 100,
      applicable: daysAfterGracePeriod > 0,
      capped: rawFee > LATE_FEE_CAP_USD
    };
  }, [showLateFees, ownerAcquisitionDate, manualAcquisitionDate]);

  const certificateValidity = useMemo(() => {
    if (hasExpertiseCertificate !== 'yes' || !expertiseCertificateDate) return { isValid: false, daysRemaining: 0, isExpired: false };
    const issueDate = new Date(expertiseCertificateDate);
    const expiryDate = addMonths(issueDate, 6);
    const today = new Date();
    const daysRemaining = differenceInDays(expiryDate, today);
    return { isValid: daysRemaining > 0, daysRemaining: Math.max(0, daysRemaining), isExpired: daysRemaining <= 0 };
  }, [hasExpertiseCertificate, expertiseCertificateDate]);

  // Memoized: mutation fees calculation (uses BANK_FEE_PERCENTAGE from constants)
  const mutationFeesCalculation = useMemo(() => {
    const value = parseFloat(marketValueUsd) || 0;
    
    if (value < 10000) {
      return { mutationFee: 0, bankFee: 0, total: 0, applicable: false, percentage: 0 };
    }
    
    const percentage = titleAge === '10_or_more' ? 0.015 : 0.03;
    const mutationFee = value * percentage;
    // Titres de 10+ ans : frais bancaires exemptés (circulaire n°0076/2023)
    const bankFee = titleAge === '10_or_more' ? 0 : value * BANK_FEE_PERCENTAGE;
    
    return {
      mutationFee: Math.round(mutationFee * 100) / 100,
      bankFee: Math.round(bankFee * 100) / 100,
      total: Math.round((mutationFee + bankFee) * 100) / 100,
      applicable: true,
      percentage: percentage * 100
    };
  }, [marketValueUsd, titleAge]);

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
    const mutationFees = isTransferMutation && mutationFeesCalculation.applicable ? mutationFeesCalculation.total : 0;
    const lateFees = showLateFees && lateFeesCalculation.applicable ? lateFeesCalculation.fee : 0;
    return baseFees + mutationFees + lateFees;
  }, [selectedFeesDetails, isTransferMutation, mutationFeesCalculation, showLateFees, lateFeesCalculation]);

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

  const uploadFiles = async (): Promise<string[]> => {
    if (attachedFiles.length === 0) return [];
    setUploadingFiles(true);
    const urls: string[] = [];
    try {
      for (const file of attachedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `mutation_${Date.now()}_${crypto.randomUUID()}.${fileExt}`;
        const filePath = `mutation-documents/${user?.id}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('cadastral-documents').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('cadastral-documents').getPublicUrl(filePath);
        urls.push(data.publicUrl);
      }
      return urls;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Erreur lors du téléchargement des fichiers');
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
    
    if (isTransferMutation) {
      if (!hasExpertiseCertificate) {
        toast.error('Veuillez indiquer si vous avez un certificat d\'expertise immobilière');
        return false;
      }
      if (hasExpertiseCertificate === 'yes') {
        if (!expertiseCertificateFile) { toast.error('Veuillez joindre votre certificat d\'expertise immobilière'); return false; }
        if (!expertiseCertificateDate) { toast.error('Veuillez renseigner la date de délivrance du certificat'); return false; }
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
      const fileName = `expertise_cert_${Date.now()}_${crypto.randomUUID()}.${fileExt}`;
      const filePath = `mutation-documents/${user.id}/certificates/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('cadastral-documents').upload(filePath, expertiseCertificateFile);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('cadastral-documents').getPublicUrl(filePath);
      return data.publicUrl;
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
    if (isTransferMutation && expertiseCertificateFile) {
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
      },
      justification: justification.trim() || undefined,
      selected_fees: selectedFeesDetails,
      total_amount_override: totalAmount,
      // Dedicated columns
      supporting_documents: documentUrls.length > 0 ? documentUrls : undefined,
      expertise_certificate_url: expertiseCertificateUrl || undefined,
      expertise_certificate_date: expertiseCertificateDate || undefined,
      market_value_usd: marketValueUsd ? parseFloat(marketValueUsd) : undefined,
      title_age: titleAge || undefined,
      mutation_fee_amount: isTransferMutation && mutationFeesCalculation.applicable ? mutationFeesCalculation.mutationFee : undefined,
      bank_fee_amount: isTransferMutation && mutationFeesCalculation.applicable ? mutationFeesCalculation.bankFee : undefined,
      late_fee_amount: showLateFees && lateFeesCalculation.applicable ? lateFeesCalculation.fee : undefined,
      late_fee_days: showLateFees && lateFeesCalculation.applicable ? lateFeesCalculation.days : undefined,
    });

    setIsSubmitting(false);

    if (request) {
      setCreatedRequest(request);
      setStep('payment');
    }
  };

  // Phone validation — accepts international formats with country code
  const validatePhoneNumber = (phone: string): boolean => {
    const cleaned = phone.replace(/[\s\-()]/g, '');
    // Must start with + and country code (1-3 digits), followed by 7-12 digits
    // Or start with 0 for local DRC numbers (9 digits after 0)
    const internationalRegex = /^\+[1-9]\d{0,2}\d{7,12}$/;
    const localRegex = /^0\d{9}$/;
    return internationalRegex.test(cleaned) || localRegex.test(cleaned);
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
        if (!validatePhoneNumber(paymentPhone)) { toast.error('Numéro invalide. Entrez un numéro valide avec indicatif pays.'); setProcessingPayment(false); return; }

        const { data: paymentResult, error: paymentError } = await supabase.functions.invoke('process-mobile-money-payment', {
          body: { payment_provider: paymentProvider, phone_number: paymentPhone.replace(/\s/g, ''), amount_usd: createdRequest.total_amount_usd, payment_type: 'mutation_request', invoice_id: createdRequest.id },
        });
        if (paymentError) throw paymentError;

        const txId = paymentResult?.transaction_id;
        if (txId) {
          const result = await pollTransactionStatus(txId);
          if (result === 'failed') throw new Error('Le paiement a échoué');
          if (result === 'timeout') throw new Error('Délai de paiement dépassé. Vérifiez votre transaction.');
        }

        const success = await updatePaymentStatus(createdRequest.id, 'paid', txId || 'TXN-' + Date.now());
        if (success) { setStep('confirmation'); toast.success('Paiement effectué avec succès'); }
        else { toast.error('Erreur lors de la mise à jour du paiement'); }
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

  // =============== SHARED FEE SECTION ===============
  const renderAdminFeesSection = () => (
    <Card className="border-2 border-amber-200 dark:border-amber-700 rounded-xl">
      <CardContent className="p-3 space-y-3">
        <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Frais administratifs de mutation
        </h4>
        <div className="space-y-2">
          {fees.length > 0 ? (
            fees.map((fee) => {
              const isSelected = selectedFees.includes(fee.id);
              return (
                <div
                  key={fee.id}
                  className={`flex items-start gap-3 p-3 rounded-xl transition-colors cursor-pointer ${isSelected ? 'bg-primary/5 border-2 border-primary/30' : 'bg-muted/30 border-2 border-transparent hover:border-muted'}`}
                  onClick={() => handleFeeToggle(fee.id, fee.is_mandatory)}
                >
                  <Checkbox checked={isSelected} disabled={fee.is_mandatory} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{fee.fee_name}</span>
                      <span className="text-sm font-bold text-primary whitespace-nowrap">${fee.amount_usd.toFixed(2)}</span>
                    </div>
                    {fee.description && <p className="text-xs text-muted-foreground mt-0.5">{fee.description}</p>}
                    {fee.is_mandatory && <span className="text-[10px] text-muted-foreground italic">Obligatoire</span>}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-muted-foreground">Aucun frais actif configuré.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // =============== FORM STEP ===============
  const renderFormStep = () => (
    <ScrollArea className="h-[65vh] sm:h-[70vh]">
      <div className="space-y-4 pr-2">
        {/* Info parcelle */}
        <Card className="bg-primary/5 border-primary/20 rounded-xl shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono font-bold text-sm truncate">{parcelNumber}</p>
                {parcelData?.province && (
                  <p className="text-xs text-muted-foreground truncate">
                    {parcelData.province} {parcelData.ville && `• ${parcelData.ville}`}
                  </p>
                )}
                {parcelData?.current_owner_name && (
                  <p className="text-xs text-muted-foreground truncate">
                    Propriétaire : <span className="font-medium text-foreground">{parcelData.current_owner_name}</span>
                  </p>
                )}
              </div>
            </div>
            {parcelData?.is_title_in_current_owner_name === false && (
              <Alert className="mt-2 border-orange-300 bg-orange-50 dark:bg-orange-950/20">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-xs text-orange-700 dark:text-orange-400">
                  Le titre foncier n'est pas au nom du propriétaire actuel. Cette situation peut complexifier la procédure de mutation.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Type de mutation */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-2">
            Type de mutation *
            <SectionHelpPopover title="Type de mutation" description="Choisissez le type d'opération juridique : vente, donation, succession, etc. Ce choix détermine les documents requis et les frais applicables." />
          </Label>
          <Select value={mutationType} onValueChange={setMutationType}>
            <SelectTrigger className="h-11 text-sm rounded-xl border-2 focus:border-primary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {MUTATION_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value} className="text-sm py-2">{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground leading-relaxed">{mutationTypeDetails?.description}</p>
        </div>

        {/* Documents justificatifs */}
        <Card className="border rounded-xl">
          <CardContent className="p-3 space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Upload className="h-4 w-4 text-muted-foreground" />
              Documents justificatifs
              <SectionHelpPopover title="Documents justificatifs" description="Joignez les pièces justificatives nécessaires selon le type de mutation. Max 10MB par fichier." />
            </h4>
            <div className="space-y-2">
              {allRequiredDocuments.map((doc) => {
                const isCheckable = doc.required && !doc.handledByExpertiseCertificate;
                return (
                  <div key={doc.key} className="rounded-lg border p-2">
                    <p className={`text-xs flex items-center gap-1 ${doc.required ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`}>
                      {doc.required ? <AlertCircle className="h-3 w-3 flex-shrink-0" /> : <FileText className="h-3 w-3 flex-shrink-0" />}
                      {doc.label} {doc.required && '*'}
                      {doc.handledByExpertiseCertificate && (
                        <span className="text-[10px] ml-1 text-green-600 dark:text-green-400">(section expertise ci-dessous)</span>
                      )}
                    </p>
                    {isCheckable && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <Checkbox
                          id={`doc-check-${doc.key}`}
                          checked={!!requiredDocumentChecks[doc.key]}
                          onCheckedChange={(checked) => setRequiredDocumentChecks((prev) => ({ ...prev, [doc.key]: !!checked }))}
                        />
                        <Label htmlFor={`doc-check-${doc.key}`} className="text-[10px] text-muted-foreground cursor-pointer">
                          Je confirme disposer de ce document
                        </Label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" multiple onChange={handleFileSelect} className="hidden" />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full h-11 text-sm rounded-xl border-2 border-dashed hover:border-primary hover:bg-primary/5">
              <Upload className="h-4 w-4 mr-2" />
              Ajouter des documents
            </Button>
            {attachedFiles.length > 0 && (
              <div className="space-y-2">
                {attachedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-xl">
                    {file.type.startsWith('image/') ? <Image className="h-4 w-4 text-primary flex-shrink-0" /> : <FileText className="h-4 w-4 text-primary flex-shrink-0" />}
                    <span className="flex-1 truncate text-sm">{file.name}</span>
                    <Button variant="ghost" size="icon" onClick={() => removeFile(index)} className="h-7 w-7 rounded-lg hover:bg-destructive/10">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Qualité du demandeur */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-2">
            Qualité du demandeur
            <SectionHelpPopover title="Qualité du demandeur" description="Indiquez si vous êtes le propriétaire actuel ou si vous agissez en tant que mandataire/représentant." />
          </Label>
          <Select value={requesterType} onValueChange={setRequesterType}>
            <SelectTrigger className="h-11 text-sm rounded-xl border-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {REQUESTER_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value} className="text-sm py-2">{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Nouveau propriétaire (transfert uniquement) */}
        {isTransferMutation && (
          <Card className="border-2 border-primary/20 rounded-xl">
            <CardContent className="p-3 space-y-3">
              <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                <FileEdit className="h-4 w-4" />
                Nouveau propriétaire
              </h4>
              <div className="space-y-2">
                <Label className="text-sm">Statut juridique</Label>
                <Select value={beneficiaryLegalStatus} onValueChange={setBeneficiaryLegalStatus}>
                  <SelectTrigger className="h-11 text-sm rounded-xl border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {LEGAL_STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value} className="text-sm">{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {beneficiaryLegalStatus === 'personne_physique' ? (
                <div className="space-y-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Nom de famille *</Label>
                    <Input value={beneficiaryLastName} onChange={(e) => setBeneficiaryLastName(e.target.value)} placeholder="Nom de famille" className="h-11 text-sm rounded-xl border-2" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Post-nom</Label>
                    <Input value={beneficiaryMiddleName} onChange={(e) => setBeneficiaryMiddleName(e.target.value)} placeholder="Post-nom (optionnel)" className="h-11 text-sm rounded-xl border-2" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Prénom *</Label>
                    <Input value={beneficiaryFirstName} onChange={(e) => setBeneficiaryFirstName(e.target.value)} placeholder="Prénom" className="h-11 text-sm rounded-xl border-2" />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-sm">Dénomination sociale *</Label>
                  <Input value={beneficiaryLastName} onChange={(e) => setBeneficiaryLastName(e.target.value)} placeholder="Nom de l'entreprise" className="h-11 text-sm rounded-xl border-2" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-sm">Téléphone (optionnel)</Label>
                <Input value={beneficiaryPhone} onChange={(e) => setBeneficiaryPhone(e.target.value)} placeholder="+243 XXX XXX XXX" className="h-11 text-sm rounded-xl border-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Certificat d'expertise immobilière (transfert uniquement) */}
        {isTransferMutation && (
          <Card className="border-2 border-amber-200 dark:border-amber-800 rounded-xl bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Certificat d'expertise immobilière
                </h4>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50">
                      <HelpCircle className="h-3.5 w-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 bg-background border shadow-lg" align="start" sideOffset={5}>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2"><Award className="h-4 w-4" /> Information importante</p>
                      <p className="text-xs text-muted-foreground">Un certificat d'expertise immobilière est requis pour les mutations. Ce certificat est valable <strong>6 mois</strong> après sa date de délivrance.</p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Avez-vous déjà un certificat d'expertise immobilière ?</Label>
                <RadioGroup value={hasExpertiseCertificate || ''} onValueChange={(value) => setHasExpertiseCertificate(value as 'yes' | 'no')} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="cert-yes" />
                    <Label htmlFor="cert-yes" className="text-sm cursor-pointer">Oui</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="cert-no" />
                    <Label htmlFor="cert-no" className="text-sm cursor-pointer">Non</Label>
                  </div>
                </RadioGroup>
              </div>

              {hasExpertiseCertificate === 'yes' && (
                <div className="space-y-3 pt-2 border-t border-amber-200 dark:border-amber-800">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Certificat d'expertise *</Label>
                    <input ref={expertiseCertificateInputRef} type="file" accept="image/*,.pdf" onChange={handleExpertiseCertificateSelect} className="hidden" />
                    {expertiseCertificateFile ? (
                      <div className="flex items-center gap-2 p-2 bg-background rounded-xl border-2 border-green-500/30">
                        {expertiseCertificateFile.type.startsWith('image/') ? <Image className="h-4 w-4 text-green-600 flex-shrink-0" /> : <FileText className="h-4 w-4 text-green-600 flex-shrink-0" />}
                        <span className="flex-1 truncate text-sm">{expertiseCertificateFile.name}</span>
                        <Button variant="ghost" size="icon" onClick={() => setExpertiseCertificateFile(null)} className="h-7 w-7 rounded-lg hover:bg-destructive/10"><X className="h-3.5 w-3.5" /></Button>
                      </div>
                    ) : (
                      <Button type="button" variant="outline" onClick={() => expertiseCertificateInputRef.current?.click()} className="w-full h-11 text-sm rounded-xl border-2 border-dashed hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30">
                        <Upload className="h-4 w-4 mr-2" />
                        Ajouter le certificat (PDF ou image)
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Date de délivrance *</Label>
                    <Input type="date" value={expertiseCertificateDate} onChange={(e) => setExpertiseCertificateDate(e.target.value)} max={new Date().toISOString().split('T')[0]} className="h-11 text-sm rounded-xl border-2" />
                    {expertiseCertificateDate && (
                      certificateValidity.isExpired ? (
                        <Alert className="bg-destructive/10 border-destructive/20 rounded-lg mt-2">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <AlertDescription className="text-xs text-destructive">Ce certificat a expiré. Veuillez demander un nouveau certificat d'expertise.</AlertDescription>
                        </Alert>
                      ) : certificateValidity.daysRemaining <= 30 ? (
                        <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 rounded-lg mt-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <AlertDescription className="text-xs text-amber-700 dark:text-amber-400">Ce certificat expire dans {certificateValidity.daysRemaining} jours.</AlertDescription>
                        </Alert>
                      ) : (
                        <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><CheckCircle2 className="h-3 w-3" /> Certificat valide ({certificateValidity.daysRemaining} jours restants)</p>
                      )
                    )}
                  </div>
                </div>
              )}

              {hasExpertiseCertificate === 'no' && (
                <div className="space-y-3 pt-2 border-t border-amber-200 dark:border-amber-800">
                  <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 rounded-lg">
                    <FileSearch className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-xs text-blue-700 dark:text-blue-400">
                      Un certificat d'expertise immobilière est nécessaire pour procéder à la mutation. Vous pouvez en demander un en cliquant ci-dessous.
                    </AlertDescription>
                  </Alert>
                  <Button type="button" variant="seloger" onClick={() => setShowExpertiseDialog(true)} className="w-full h-11 text-sm rounded-xl">
                    <FileSearch className="h-4 w-4 mr-2" />
                    Demander un certificat
                    <ExternalLink className="h-3.5 w-3.5 ml-2" />
                  </Button>
                </div>
              )}

              {/* Valeur vénale */}
              {hasExpertiseCertificate === 'yes' && (
                <div className="space-y-3 pt-2 border-t border-amber-200 dark:border-amber-800">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Valeur vénale du bien (USD) *</Label>
                    <p className="text-xs text-muted-foreground">Cette valeur doit correspondre à celle indiquée dans le certificat d'expertise.</p>
                    <Input type="number" value={marketValueUsd} onChange={(e) => setMarketValueUsd(e.target.value)} placeholder="Ex: 50000" className="h-11 text-sm rounded-xl border-2" min="0" />
                  </div>

                  {parseFloat(marketValueUsd) >= 10000 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Ancienneté du titre foncier *</Label>
                        {titleAgeAutoDetected && titleIssueDateFromCCC && (
                          <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Auto-détecté</span>
                        )}
                      </div>
                      {titleAgeAutoDetected && titleIssueDateFromCCC && (
                        <Alert className="bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800 rounded-lg">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-xs text-green-700 dark:text-green-400">
                            Date de délivrance du titre : <strong>{format(new Date(titleIssueDateFromCCC), 'dd MMMM yyyy', { locale: fr })}</strong><br />Le taux a été automatiquement déterminé selon les données CCC de la parcelle.
                          </AlertDescription>
                        </Alert>
                      )}
                      <RadioGroup value={titleAge || ''} onValueChange={(v) => { setTitleAge(v as 'less_than_10' | '10_or_more'); setTitleAgeAutoDetected(false); }} className="space-y-2">
                        <div className={`flex items-center space-x-3 p-3 rounded-xl border-2 transition-colors ${titleAge === 'less_than_10' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                          <RadioGroupItem value="less_than_10" id="age-lt10" />
                          <div>
                            <Label htmlFor="age-lt10" className="text-sm font-medium cursor-pointer">Moins de 10 ans</Label>
                            <p className="text-xs text-muted-foreground">Taux de mutation : 3%</p>
                          </div>
                        </div>
                        <div className={`flex items-center space-x-3 p-3 rounded-xl border-2 transition-colors ${titleAge === '10_or_more' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                          <RadioGroupItem value="10_or_more" id="age-gte10" />
                          <div>
                            <Label htmlFor="age-gte10" className="text-sm font-medium cursor-pointer">10 ans ou plus</Label>
                            <p className="text-xs text-muted-foreground">Taux de mutation : 1.5% (sans frais bancaires)</p>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ===== Fees section ===== */}
        {renderAdminFeesSection()}

        {/* Mutation fees (transfer types only) */}
        {isTransferMutation && mutationFeesCalculation.applicable && (
          <Card className="border-2 border-primary/20 rounded-xl">
            <CardContent className="p-3 space-y-3">
              <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Frais de mutation calculés
              </h4>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border-2 border-primary/20">
                <div className="p-1.5 bg-primary/10 rounded-lg mt-0.5"><DollarSign className="h-4 w-4 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">Frais de mutation ({mutationFeesCalculation.percentage}%)</span>
                    <span className="text-sm font-bold text-primary whitespace-nowrap">${mutationFeesCalculation.mutationFee.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Basé sur la valeur vénale de ${parseFloat(marketValueUsd).toLocaleString()} USD</p>
                </div>
              </div>
              {mutationFeesCalculation.bankFee > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border-2 border-amber-100 dark:border-amber-800">
                  <div className="p-1.5 bg-amber-100/50 dark:bg-amber-900/30 rounded-lg mt-0.5"><CreditCard className="h-4 w-4 text-amber-600 dark:text-amber-500" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">Frais bancaires (0.5%)</span>
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-500 whitespace-nowrap">${mutationFeesCalculation.bankFee.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Commission bancaire estimée</p>
                  </div>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground px-1">Circulaire n° 005/CAB/MIN/AFF.FONC/2013 • n°0076/2023 et 010/CAB/MIN.FINANCES/2023</p>
            </CardContent>
          </Card>
        )}

        {/* Late fees section */}
        {showLateFees && (
          <MutationLateFeeSection
            ownerAcquisitionDate={ownerAcquisitionDate}
            ownerAcquisitionDateAutoDetected={ownerAcquisitionDateAutoDetected}
            manualAcquisitionDate={manualAcquisitionDate}
            onManualAcquisitionDateChange={setManualAcquisitionDate}
            lateFeesCalculation={lateFeesCalculation}
          />
        )}

        {/* Justification / notes utilisateur */}
        <Card className="border rounded-xl">
          <CardContent className="p-3 space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Notes / Justification (optionnel)
              <SectionHelpPopover title="Justification" description="Ajoutez des informations ou explications complémentaires pour accompagner votre demande de mutation." />
            </Label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Ajoutez une justification ou des notes complémentaires..."
              className="min-h-[60px] text-sm rounded-xl border-2 resize-none"
              maxLength={1000}
            />
            <p className="text-[10px] text-muted-foreground text-right">{justification.length}/1000</p>
          </CardContent>
        </Card>

        {/* Total à payer */}
        <Card className="border rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-xl">
              <span className="font-semibold text-sm">Total à payer</span>
              <span className="text-xl font-bold text-primary">${totalAmount.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Button 
          onClick={handlePreview} 
          className="w-full h-12 text-sm font-semibold rounded-xl shadow-lg"
          disabled={fees.length > 0 && selectedFees.length === 0}
        >
          <Eye className="h-4 w-4 mr-2" />
          Aperçu avant soumission
        </Button>
      </div>
    </ScrollArea>
  );

  // =============== PREVIEW STEP ===============
  const renderPreviewStep = () => (
    <ScrollArea className="h-[65vh] sm:h-[70vh]">
      <div className="space-y-4 pr-2">
        <Alert className="border-destructive bg-destructive/10 rounded-xl">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-sm text-destructive font-medium leading-relaxed">
            Vérifiez attentivement les informations. Une fois soumise, cette demande ne pourra plus être modifiée.
          </AlertDescription>
        </Alert>

        <Card className="border-2 rounded-xl shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Parcelle</span>
              <span className="font-mono font-bold text-sm">{parcelNumber}</span>
            </div>
            {parcelData?.province && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Localisation</span>
                <span className="text-sm text-right max-w-[60%]">{[parcelData.province, parcelData.ville, parcelData.commune].filter(Boolean).join(', ')}</span>
              </div>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Type de mutation</span>
              <span className="text-sm font-semibold">{mutationTypeDetails?.label}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Demandeur</span>
              <span className="text-sm">{REQUESTER_TYPES.find(t => t.value === requesterType)?.label}</span>
            </div>

            {isTransferMutation && (
              <>
                <Separator />
                <div className="space-y-2 bg-primary/5 p-3 rounded-xl -mx-1">
                  <span className="text-xs font-semibold text-primary uppercase tracking-wide">Nouveau propriétaire</span>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Nom complet</span>
                    <span className="text-sm font-medium max-w-[60%] text-right">{beneficiaryFullName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Statut</span>
                    <span className="text-sm">{LEGAL_STATUS_OPTIONS.find(s => s.value === beneficiaryLegalStatus)?.label}</span>
                  </div>
                  {beneficiaryPhone && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Téléphone</span>
                      <span className="text-sm">{beneficiaryPhone}</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Justification in preview */}
            {justification.trim() && (
              <>
                <Separator />
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Justification</span>
                  <p className="text-sm text-foreground">{justification}</p>
                </div>
              </>
            )}

            {attachedFiles.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Documents joints</span>
                  <div className="space-y-1.5">
                    {attachedFiles.map((file, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded-xl">
                        {file.type.startsWith('image/') ? <Image className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-primary" />}
                        <span className="text-xs truncate">{file.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Frais détaillés */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Détail des frais</span>
              {selectedFeesDetails.map((fee) => (
                <div key={fee.id} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{fee.fee_name}</span>
                  <span className="text-sm font-mono font-semibold">${fee.amount_usd.toFixed(2)}</span>
                </div>
              ))}
              {isTransferMutation && mutationFeesCalculation.applicable && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Frais de mutation ({mutationFeesCalculation.percentage}%)</span>
                    <span className="text-sm font-mono font-semibold">${mutationFeesCalculation.mutationFee.toFixed(2)}</span>
                  </div>
                  {mutationFeesCalculation.bankFee > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Frais bancaires (0.5%)</span>
                      <span className="text-sm font-mono font-semibold">${mutationFeesCalculation.bankFee.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}
              {showLateFees && lateFeesCalculation.applicable && (
                <div className="flex items-center justify-between text-orange-600">
                  <span className="text-sm">Frais de retard ({lateFeesCalculation.days}j)</span>
                  <span className="text-sm font-mono font-semibold">${lateFeesCalculation.fee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t-2">
                <span className="text-sm font-bold">Total</span>
                <span className="text-lg font-bold text-primary">${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Alert className="rounded-xl bg-muted/50">
          <Clock className="h-4 w-4" />
          <AlertDescription className="text-sm">Délai de traitement estimé: <strong>14 jours ouvrables</strong> après paiement.</AlertDescription>
        </Alert>

        <div className="flex gap-2">
          {createdRequest ? (
            /* Request already created — only allow going to payment */
            <Button onClick={() => setStep('payment')} className="flex-1 h-12 text-sm font-semibold rounded-xl shadow-lg">
              <CreditCard className="h-4 w-4 mr-2" /> Procéder au paiement ${totalAmount.toFixed(2)}
            </Button>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={() => setStep('form')} 
                className="flex-1 h-12 text-sm font-semibold rounded-xl"
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Modifier
              </Button>
              <Button onClick={handleSubmitForm} className="flex-1 h-12 text-sm font-semibold rounded-xl shadow-lg" disabled={loading || uploadingFiles || isSubmitting}>
                {loading || uploadingFiles || isSubmitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />{uploadingFiles ? 'Envoi...' : 'Création...'}</>
                ) : (
                  <><CreditCard className="h-4 w-4 mr-2" /> Payer ${totalAmount.toFixed(2)}</>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </ScrollArea>
  );

  // =============== PAYMENT STEP ===============
  const renderPaymentStep = () => (
    <div className="space-y-3">
      <Card className="bg-muted/50 border-0 rounded-lg">
        <CardContent className="p-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground">Référence</p>
              <p className="font-mono font-bold text-sm">{createdRequest?.reference_number || 'Référence en cours'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Montant</p>
              <p className="text-lg font-bold text-primary">${Number(createdRequest?.total_amount_usd || 0).toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label className="text-xs font-medium">Mode de paiement</Label>
        {!hasAnyPaymentMethod ? (
          <Alert className="rounded-lg border-destructive/20 bg-destructive/10">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-xs text-destructive">Aucun moyen de paiement actif n'est disponible pour le moment.</AlertDescription>
          </Alert>
        ) : (
          <div className={`grid ${availableMethods.hasMobileMoney && availableMethods.hasBankCard ? 'grid-cols-2' : 'grid-cols-1'} gap-1.5`}>
            {availableMethods.hasMobileMoney && (
              <Button variant={paymentMethod === 'mobile_money' ? 'default' : 'outline'} size="sm" onClick={() => setPaymentMethod('mobile_money')} className="h-8 text-xs rounded-lg">Mobile Money</Button>
            )}
            {availableMethods.hasBankCard && (
              <Button variant={paymentMethod === 'bank_card' ? 'default' : 'outline'} size="sm" onClick={() => setPaymentMethod('bank_card')} className="h-8 text-xs rounded-lg">Carte bancaire</Button>
            )}
          </div>
        )}
      </div>

      {paymentMethod === 'mobile_money' && availableMethods.hasMobileMoney && (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-[10px]">Opérateur</Label>
            <Select value={paymentProvider} onValueChange={setPaymentProvider}>
              <SelectTrigger className="h-8 text-xs rounded-lg"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                {enabledMobileProviders.map(provider => (
                  <SelectItem key={provider} value={provider} className="text-xs">{PROVIDER_LABELS[provider] || provider}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Numéro de téléphone</Label>
            <Input value={paymentPhone} onChange={(e) => setPaymentPhone(e.target.value)} placeholder="+243..." className="h-8 text-xs rounded-lg" />
          </div>
        </div>
      )}

      <div className="flex gap-1.5 pt-2">
        <Button variant="outline" onClick={() => setStep('preview')} disabled={processingPayment} className="flex-1 h-8 text-xs rounded-lg">Retour</Button>
        <Button onClick={handlePayment} disabled={processingPayment || !hasAnyPaymentMethod} className="flex-1 h-8 text-xs rounded-lg">
          {processingPayment ? (<><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Paiement...</>) : (`Payer $${Number(createdRequest?.total_amount_usd || 0).toFixed(2)}`)}
        </Button>
      </div>
    </div>
  );

  // =============== CONFIRMATION STEP ===============
  const renderConfirmationStep = () => (
    <div className="space-y-3 text-center py-2">
      <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
        <CheckCircle2 className="h-6 w-6 text-green-600" />
      </div>
      <div>
        <h3 className="font-semibold text-sm">Demande soumise avec succès</h3>
        <p className="text-[10px] text-muted-foreground mt-1">Votre demande sera traitée dans les 14 jours ouvrables</p>
      </div>
      <Card className="bg-muted/50 border-0 text-left rounded-lg">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Hash className="h-3 w-3" /> Référence</div>
            <span className="font-mono font-bold text-xs">{createdRequest?.reference_number}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> Parcelle</div>
            <span className="font-mono text-xs">{parcelNumber}</span>
          </div>
          {parcelData?.province && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Localisation</span>
              <span className="text-xs">{parcelData.province}, {parcelData.ville}</span>
            </div>
          )}
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> Délai estimé</div>
            <span className="text-xs">{createdRequest?.estimated_processing_days || 14} jours</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Montant payé</span>
            <span className="font-bold text-primary text-sm">${Number(createdRequest?.total_amount_usd || 0).toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>
      <Alert className="text-left py-2 rounded-lg">
        <AlertDescription className="text-[10px]">Conservez votre numéro de référence. Vous recevrez une notification lors du traitement.</AlertDescription>
      </Alert>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => { handleClose(); window.location.href = '/user-dashboard?tab=mutations'; }} className="flex-1 h-8 text-xs rounded-lg">
          Voir mes demandes
        </Button>
        <Button onClick={handleClose} className="flex-1 h-8 text-xs rounded-lg">Fermer</Button>
      </div>
    </div>
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
      <DialogContent className={`z-[1200] ${isMobile ? 'w-[92vw] max-w-[360px] max-h-[88vh] rounded-2xl' : 'max-w-md rounded-2xl'} p-4 overflow-hidden`}>
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
