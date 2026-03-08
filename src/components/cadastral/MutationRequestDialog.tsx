import React, { useState, useEffect, useRef } from 'react';
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
import { Loader2, FileEdit, CreditCard, CheckCircle2, AlertTriangle, MapPin, Clock, Hash, Upload, X, FileText, Image, Eye, ArrowLeft, AlertCircle, FileSearch, ExternalLink, Calendar, DollarSign, Award, HelpCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMutationRequest } from '@/hooks/useMutationRequest';
import type { MutationFee, MutationRequest } from '@/types/mutation';
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

interface MutationRequestDialogProps {
  parcelNumber: string;
  parcelId?: string;
  parcelData?: {
    province?: string;
    ville?: string;
    commune?: string;
    quartier?: string;
    current_owner_name?: string;
    title_issue_date?: string; // Date de délivrance du titre foncier depuis CCC
    owner_acquisition_date?: string; // Date d'acquisition par le propriétaire actuel
    is_title_in_current_owner_name?: boolean; // Le titre est-il au nom du propriétaire actuel?
  };
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type Step = 'form' | 'preview' | 'payment' | 'confirmation';

// Types de mutation alignés avec le formulaire CCC
const MUTATION_TYPES = [
  { value: 'vente', label: 'Vente', description: 'Transfert de propriété suite à une vente' },
  { value: 'donation', label: 'Donation', description: 'Transfert gratuit de propriété' },
  { value: 'succession', label: 'Succession', description: 'Transfert suite à un héritage' },
  { value: 'expropriation', label: 'Expropriation', description: 'Transfert par décision administrative' },
  { value: 'echange', label: 'Échange', description: 'Échange de propriétés' },
  { value: 'correction', label: 'Correction d\'erreur', description: 'Correction des données existantes' },
  { value: 'mise_a_jour', label: 'Mise à jour', description: 'Actualisation des informations' }
];

// Statut juridique aligné avec le formulaire CCC
const LEGAL_STATUS_OPTIONS = [
  { value: 'personne_physique', label: 'Personne physique' },
  { value: 'personne_morale', label: 'Personne morale' }
];

const REQUESTER_TYPES = [
  { value: 'proprietaire', label: 'Propriétaire actuel' },
  { value: 'mandataire', label: 'Mandataire/Représentant' }
];

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
  const { loading, fees, createMutationRequest, updatePaymentStatus } = useMutationRequest();
  const { availableMethods } = usePaymentConfig();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showIntro, setShowIntro] = useState(true);
  const [step, setStep] = useState<Step>('form');
  const [createdRequest, setCreatedRequest] = useState<MutationRequest | null>(null);
  
  // Form state - aligné avec CCC
  const [mutationType, setMutationType] = useState('vente');
  const [requesterType, setRequesterType] = useState('proprietaire');
  
  // Bénéficiaire (nouveau propriétaire pour transferts)
  const [beneficiaryLegalStatus, setBeneficiaryLegalStatus] = useState('personne_physique');
  const [beneficiaryLastName, setBeneficiaryLastName] = useState('');
  const [beneficiaryFirstName, setBeneficiaryFirstName] = useState('');
  const [beneficiaryMiddleName, setBeneficiaryMiddleName] = useState('');
  const [beneficiaryPhone, setBeneficiaryPhone] = useState('');
  
  const [selectedFees, setSelectedFees] = useState<string[]>([]);
  
  // Pièces jointes
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadedFileUrls, setUploadedFileUrls] = useState<string[]>([]);
  
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

  // Récupérer automatiquement la date du titre depuis les données CCC
  useEffect(() => {
    const fetchTitleIssueDate = async () => {
      // Si la date est déjà fournie dans les props
      if (parcelData?.title_issue_date) {
        setTitleIssueDateFromCCC(parcelData.title_issue_date);
        calculateTitleAgeFromDate(parcelData.title_issue_date);
        return;
      }

      // Sinon, chercher dans les contributions CCC validées ou la table des parcelles
      try {
        // D'abord chercher dans les contributions validées
        const { data: contribution } = await supabase
          .from('cadastral_contributions')
          .select('title_issue_date')
          .eq('parcel_number', parcelNumber)
          .eq('status', 'approved')
          .not('title_issue_date', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (contribution?.title_issue_date) {
          setTitleIssueDateFromCCC(contribution.title_issue_date);
          calculateTitleAgeFromDate(contribution.title_issue_date);
          return;
        }

        // Sinon chercher dans la table des parcelles
        const { data: parcel } = await supabase
          .from('cadastral_parcels')
          .select('title_issue_date')
          .eq('parcel_number', parcelNumber)
          .not('title_issue_date', 'is', null)
          .limit(1)
          .single();

        if (parcel?.title_issue_date) {
          setTitleIssueDateFromCCC(parcel.title_issue_date);
          calculateTitleAgeFromDate(parcel.title_issue_date);
        }
      } catch (error) {
        // Pas de date trouvée, l'utilisateur devra la saisir manuellement
        console.log('Aucune date de délivrance du titre trouvée');
      }
    };

    if (open && parcelNumber) {
      fetchTitleIssueDate();
    }
  }, [open, parcelNumber, parcelData?.title_issue_date]);

  // Vérifier si c'est un type de mutation avec transfert (déclaré avant utilisation)
  const isTransferMutation = ['vente', 'donation', 'succession', 'expropriation', 'echange'].includes(mutationType);

  // Récupérer automatiquement la date d'acquisition du propriétaire depuis CCC
  useEffect(() => {
    const fetchOwnerAcquisitionDate = async () => {
      // Si la date est déjà fournie dans les props
      if (parcelData?.owner_acquisition_date) {
        setOwnerAcquisitionDate(parcelData.owner_acquisition_date);
        setOwnerAcquisitionDateAutoDetected(true);
        return;
      }

      // Chercher dans les contributions CCC validées
      try {
        const { data: contribution } = await supabase
          .from('cadastral_contributions')
          .select('current_owner_since')
          .eq('parcel_number', parcelNumber)
          .eq('status', 'approved')
          .not('current_owner_since', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (contribution?.current_owner_since) {
          setOwnerAcquisitionDate(contribution.current_owner_since);
          setOwnerAcquisitionDateAutoDetected(true);
          return;
        }

        // Sinon chercher dans la table des parcelles
        const { data: parcel } = await supabase
          .from('cadastral_parcels')
          .select('current_owner_since')
          .eq('parcel_number', parcelNumber)
          .not('current_owner_since', 'is', null)
          .limit(1)
          .single();

        if (parcel?.current_owner_since) {
          setOwnerAcquisitionDate(parcel.current_owner_since);
          setOwnerAcquisitionDateAutoDetected(true);
        }
      } catch (error) {
        console.log('Aucune date d\'acquisition du propriétaire trouvée');
      }
    };

    if (open && parcelNumber && isTransferMutation) {
      fetchOwnerAcquisitionDate();
    }
  }, [open, parcelNumber, parcelData?.owner_acquisition_date, isTransferMutation]);

  // Calculer l'âge du titre à partir de sa date de délivrance
  const calculateTitleAgeFromDate = (dateString: string) => {
    const issueDate = new Date(dateString);
    const today = new Date();
    const yearsElapsed = differenceInDays(today, issueDate) / 365;
    
    if (yearsElapsed >= 10) {
      setTitleAge('10_or_more');
    } else {
      setTitleAge('less_than_10');
    }
    setTitleAgeAutoDetected(true);
  };

  // Calculer les frais de retard de mutation
  // Selon la Note circulaire n°1.441/SG/AFF.F/003/2016 du 07 décembre 2016, le délai légal est de 20 jours
  const calculateLateFees = () => {
    const dateToUse = ownerAcquisitionDate || manualAcquisitionDate;
    if (!dateToUse) return { days: 0, fee: 0, applicable: false, capped: false };
    
    const acquisitionDate = new Date(dateToUse);
    const today = new Date();
    const totalDaysElapsed = differenceInDays(today, acquisitionDate);
    
    const daysAfterGracePeriod = Math.max(0, totalDaysElapsed - LEGAL_GRACE_PERIOD_DAYS);
    
    const rawFee = daysAfterGracePeriod * DAILY_LATE_FEE_USD;
    // Plafond légal
    const cappedFee = Math.min(rawFee, LATE_FEE_CAP_USD);
    
    return {
      days: daysAfterGracePeriod,
      fee: Math.round(cappedFee * 100) / 100,
      applicable: daysAfterGracePeriod > 0,
      capped: rawFee > LATE_FEE_CAP_USD
    };
  };

  const lateFeesCalculation = calculateLateFees();

  // Get current mutation type details
  const getMutationTypeDetails = () => {
    return MUTATION_TYPES.find(t => t.value === mutationType);
  };

  // Vérifier la validité du certificat d'expertise (6 mois)
  const checkCertificateValidity = () => {
    if (!expertiseCertificateDate) return { isValid: false, daysRemaining: 0, isExpired: false };
    
    const issueDate = new Date(expertiseCertificateDate);
    const expiryDate = addMonths(issueDate, 6);
    const today = new Date();
    const daysRemaining = differenceInDays(expiryDate, today);
    
    return {
      isValid: daysRemaining > 0,
      daysRemaining: Math.max(0, daysRemaining),
      isExpired: daysRemaining <= 0
    };
  };

  const certificateValidity = checkCertificateValidity();

  // Calcul des frais de mutation basés sur la valeur vénale
  // Circulaire n° 005/CAB/MIN/AFF.FONC/2013 et n°0076/2023
  const calculateMutationFees = () => {
    const value = parseFloat(marketValueUsd) || 0;
    const BANK_FEE_PERCENTAGE = 0.005; // 0.5% frais bancaires estimés
    
    // Frais applicables uniquement si valeur >= 10000 USD
    if (value < 10000) {
      return { mutationFee: 0, bankFee: 0, total: 0, applicable: false, percentage: 0 };
    }
    
    // 3% si titre < 10 ans, 1.5% si titre >= 10 ans
    const percentage = titleAge === '10_or_more' ? 0.015 : 0.03;
    const mutationFee = value * percentage;
    const bankFee = titleAge === '10_or_more' ? 0 : value * BANK_FEE_PERCENTAGE;
    
    return {
      mutationFee: Math.round(mutationFee * 100) / 100,
      bankFee: Math.round(bankFee * 100) / 100,
      total: Math.round((mutationFee + bankFee) * 100) / 100,
      applicable: true,
      percentage: percentage * 100
    };
  };

  const mutationFeesCalculation = calculateMutationFees();

  // Initialize form with mandatory fees
  useEffect(() => {
    const mandatoryFeeIds = fees.filter(f => f.is_mandatory).map(f => f.id);
    setSelectedFees(mandatoryFeeIds);
  }, [fees]);

  const handleFeeToggle = (feeId: string, isMandatory: boolean) => {
    if (isMandatory) return;
    setSelectedFees(prev => 
      prev.includes(feeId) 
        ? prev.filter(id => id !== feeId)
        : [...prev, feeId]
    );
  };

  const getSelectedFeesDetails = () => {
    return fees.filter(f => selectedFees.includes(f.id));
  };

  const getTotalAmount = () => {
    const baseFees = getSelectedFeesDetails().reduce((sum, fee) => sum + fee.amount_usd, 0);
    // Ajouter les frais de mutation calculés si applicables
    const mutationFees = mutationFeesCalculation.applicable ? mutationFeesCalculation.total : 0;
    // Ajouter les frais de retard si applicables
    const lateFees = lateFeesCalculation.applicable ? lateFeesCalculation.fee : 0;
    return baseFees + mutationFees + lateFees;
  };

  // Gestion du fichier certificat d'expertise
  const handleExpertiseCertificateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const isValid = file.type.startsWith('image/') || file.type === 'application/pdf';
    const isValidSize = file.size <= 10 * 1024 * 1024;
    
    if (!isValid) {
      toast.error('Format non supporté (images ou PDF uniquement)');
      return;
    }
    if (!isValidSize) {
      toast.error('Fichier trop volumineux (max 10MB)');
      return;
    }
    
    setExpertiseCertificateFile(file);
    if (expertiseCertificateInputRef.current) expertiseCertificateInputRef.current.value = '';
  };

  // Gestion des fichiers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newFiles = Array.from(files);
    const validFiles = newFiles.filter(file => {
      const isValid = file.type.startsWith('image/') || file.type === 'application/pdf';
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB max
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
        const fileName = `mutation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `mutation-documents/${user?.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('cadastral-documents')
          .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
        const { data } = supabase.storage.from('cadastral-documents').getPublicUrl(filePath);
        urls.push(data.publicUrl);
      }
      
      setUploadedFileUrls(urls);
      return urls;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Erreur lors du téléchargement des fichiers');
      return [];
    } finally {
      setUploadingFiles(false);
    }
  };

  const validateForm = (): boolean => {
    if (isTransferMutation && (!beneficiaryLastName.trim() || (beneficiaryLegalStatus === 'personne_physique' && !beneficiaryFirstName.trim()))) {
      toast.error('Veuillez renseigner le nom du nouveau propriétaire');
      return false;
    }
    
    // Bug #9: Valider le certificat d'expertise pour les mutations avec transfert
    if (isTransferMutation) {
      if (!hasExpertiseCertificate) {
        toast.error('Veuillez indiquer si vous avez un certificat d\'expertise immobilière');
        return false;
      }
      if (hasExpertiseCertificate === 'yes') {
        if (!expertiseCertificateFile) {
          toast.error('Veuillez joindre votre certificat d\'expertise immobilière');
          return false;
        }
        if (!expertiseCertificateDate) {
          toast.error('Veuillez renseigner la date de délivrance du certificat');
          return false;
        }
        if (certificateValidity.isExpired) {
          toast.error('Le certificat d\'expertise est expiré (valide 6 mois). Veuillez en demander un nouveau.');
          return false;
        }
        if (!marketValueUsd || parseFloat(marketValueUsd) <= 0) {
          toast.error('Veuillez renseigner la valeur vénale du bien');
          return false;
        }
        if (parseFloat(marketValueUsd) >= 10000 && !titleAge) {
          toast.error('Veuillez indiquer l\'ancienneté du titre foncier');
          return false;
        }
      }
      if (hasExpertiseCertificate === 'no') {
        toast.error('Un certificat d\'expertise immobilière est requis pour procéder à la mutation. Veuillez d\'abord en demander un.');
        return false;
      }
    }
    
    return true;
  };

  const handlePreview = () => {
    if (!validateForm()) return;
    setStep('preview');
  };

  // Bug #18: Upload du certificat d'expertise vers Supabase Storage
  const uploadExpertiseCertificate = async (): Promise<string | null> => {
    if (!expertiseCertificateFile || !user) return null;
    
    try {
      const fileExt = expertiseCertificateFile.name.split('.').pop();
      const fileName = `expertise_cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `mutation-documents/${user.id}/certificates/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('cadastral-documents')
        .upload(filePath, expertiseCertificateFile);
      
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage.from('cadastral-documents').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error: any) {
      console.error('Expertise certificate upload error:', error);
      toast.error('Erreur lors de l\'envoi du certificat d\'expertise');
      return null;
    }
  };

  const handleSubmitForm = async () => {
    // Upload des fichiers avant création
    let documentUrls: string[] = [];
    if (attachedFiles.length > 0) {
      documentUrls = await uploadFiles();
      if (documentUrls.length === 0 && attachedFiles.length > 0) {
        return; // Upload failed
      }
    }

    // Bug #18: Upload du certificat d'expertise
    let expertiseCertificateUrl: string | null = null;
    if (isTransferMutation && expertiseCertificateFile) {
      expertiseCertificateUrl = await uploadExpertiseCertificate();
      if (!expertiseCertificateUrl) {
        return; // Upload failed
      }
    }

    const fullBeneficiaryName = beneficiaryLegalStatus === 'personne_morale'
      ? beneficiaryLastName
      : [beneficiaryLastName, beneficiaryMiddleName, beneficiaryFirstName].filter(Boolean).join(' ');

    // Récupérer automatiquement les infos du profil utilisateur connecté
    const requesterName = profile?.full_name || user?.email || 'Utilisateur';
    const requesterEmail = profile?.email || user?.email || '';

    // Description auto-générée basée sur le type de mutation
    const mutationDetails = getMutationTypeDetails();
    const autoDescription = isTransferMutation 
      ? `${mutationDetails?.label} - Transfert à ${fullBeneficiaryName}`
      : `${mutationDetails?.label} - ${mutationDetails?.description}`;

    // Bug #1: Passer le total calculé complet (base + mutation + retard)
    const totalCalculated = getTotalAmount();

    const request = await createMutationRequest({
      parcel_number: parcelNumber,
      parcel_id: parcelId,
      mutation_type: mutationType,
      requester_type: requesterType,
      requester_name: requesterName,
      requester_phone: '',
      requester_email: requesterEmail,
      beneficiary_name: isTransferMutation ? fullBeneficiaryName : undefined,
      beneficiary_phone: isTransferMutation ? beneficiaryPhone : undefined,
      proposed_changes: { 
        description: autoDescription,
        beneficiary_legal_status: isTransferMutation ? beneficiaryLegalStatus : undefined,
        supporting_documents: documentUrls,
        expertise_certificate_url: expertiseCertificateUrl,
        expertise_certificate_date: expertiseCertificateDate || undefined,
        market_value_usd: marketValueUsd ? parseFloat(marketValueUsd) : undefined,
        title_age: titleAge,
        mutation_fees: mutationFeesCalculation.applicable ? {
          percentage: mutationFeesCalculation.percentage,
          mutation_fee: mutationFeesCalculation.mutationFee,
          bank_fee: mutationFeesCalculation.bankFee,
          total: mutationFeesCalculation.total
        } : undefined,
        late_fees: lateFeesCalculation.applicable ? {
          days: lateFeesCalculation.days,
          fee: lateFeesCalculation.fee
        } : undefined
      },
      justification: '',
      selected_fees: getSelectedFeesDetails(),
      total_amount_override: totalCalculated
    });

    if (request) {
      setCreatedRequest(request);
      setStep('payment');
    }
  };

  // Validation du numéro de téléphone congolais (Bug #5)
  const validatePhoneNumber = (phone: string): boolean => {
    const regex = /^(\+?243|0)(8[1-9]|9[0-9])\d{7}$/;
    return regex.test(phone.replace(/\s/g, ''));
  };

  const handlePayment = async () => {
    if (!createdRequest) return;
    
    setProcessingPayment(true);
    
    try {
      if (paymentMethod === 'mobile_money') {
        if (!paymentProvider) {
          toast.error('Veuillez sélectionner un opérateur');
          setProcessingPayment(false);
          return;
        }
        if (!paymentPhone) {
          toast.error('Veuillez entrer votre numéro de téléphone');
          setProcessingPayment(false);
          return;
        }
        if (!validatePhoneNumber(paymentPhone)) {
          toast.error('Numéro invalide. Format attendu : +243XXXXXXXXX ou 0XXXXXXXXX');
          setProcessingPayment(false);
          return;
        }

        // Appel réel à l'Edge Function Mobile Money
        const { data: paymentResult, error: paymentError } = await supabase.functions.invoke(
          'process-mobile-money-payment',
          {
            body: {
              payment_provider: paymentProvider,
              phone_number: paymentPhone.replace(/\s/g, ''),
              amount_usd: createdRequest.total_amount_usd,
              payment_type: 'mutation_request',
              invoice_id: createdRequest.id,
            },
          }
        );

        if (paymentError) throw paymentError;

        const txId = paymentResult?.transaction_id;
        if (txId) {
          const result = await pollTransactionStatus(txId);
          if (result === 'failed') throw new Error('Le paiement a échoué');
          if (result === 'timeout') throw new Error('Délai de paiement dépassé. Vérifiez votre transaction.');
        }

        const success = await updatePaymentStatus(createdRequest.id, 'paid', txId || 'TXN-' + Date.now());
        if (success) {
          setStep('confirmation');
          toast.success('Paiement effectué avec succès');
        } else {
          toast.error('Erreur lors de la mise à jour du paiement');
        }
      } else {
        // Stripe - redirection vers la page de paiement
        const { data: stripeSession, error: stripeError } = await supabase.functions.invoke('create-payment', {
          body: {
            invoice_id: createdRequest.id,
            payment_type: 'mutation_request',
            amount_usd: createdRequest.total_amount_usd,
          },
        });

        if (stripeError) throw stripeError;

        if (stripeSession?.url) {
          window.location.href = stripeSession.url;
          return; // Redirection en cours
        }

        throw new Error('Session de paiement invalide');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Erreur lors du paiement');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setCreatedRequest(null);
    setMutationType('vente');
    setRequesterType('proprietaire');
    setBeneficiaryLegalStatus('personne_physique'); // Bug #6: reset
    setBeneficiaryLastName('');
    setBeneficiaryFirstName('');
    setBeneficiaryMiddleName('');
    setBeneficiaryPhone('');
    setAttachedFiles([]);
    setUploadedFileUrls([]);
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

  // Get beneficiary full name for display
  const getBeneficiaryFullName = () => {
    if (beneficiaryLegalStatus === 'personne_morale') {
      return beneficiaryLastName;
    }
    return [beneficiaryLastName, beneficiaryMiddleName, beneficiaryFirstName].filter(Boolean).join(' ');
  };

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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Type de mutation */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-2">
            Type de mutation *
            <SectionHelpPopover
              title="Type de mutation"
              description="Choisissez le type d'opération juridique : vente, donation, succession, etc. Ce choix détermine les documents requis et les frais applicables."
            />
          </Label>
          <Select value={mutationType} onValueChange={setMutationType}>
            <SelectTrigger className="h-11 text-sm rounded-xl border-2 focus:border-primary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {MUTATION_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value} className="text-sm py-2">
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {getMutationTypeDetails()?.description}
          </p>
        </div>

        {/* Documents justificatifs - déplacé ici pour cohérence */}
        <Card className="border rounded-xl">
          <CardContent className="p-3 space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Upload className="h-4 w-4 text-muted-foreground" />
              Documents justificatifs
              <SectionHelpPopover
                title="Documents justificatifs"
                description="Joignez les pièces justificatives nécessaires : acte de vente notarié, certificat d'héritage, attestation de donation, etc. Max 10MB par fichier."
              />
            </h4>
            <p className="text-xs text-muted-foreground">
              Acte de vente, certificat, attestation... (max 10MB/fichier)
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-11 text-sm rounded-xl border-2 border-dashed hover:border-primary hover:bg-primary/5"
            >
              <Upload className="h-4 w-4 mr-2" />
              Ajouter des documents
            </Button>
            
            {attachedFiles.length > 0 && (
              <div className="space-y-2">
                {attachedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-xl">
                    {file.type.startsWith('image/') ? (
                      <Image className="h-4 w-4 text-primary flex-shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                    <span className="flex-1 truncate text-sm">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(index)}
                      className="h-7 w-7 rounded-lg hover:bg-destructive/10"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Type de demandeur */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-2">
            Vous êtes
            <SectionHelpPopover
              title="Type de demandeur"
              description="Indiquez si vous êtes le propriétaire actuel de la parcelle ou un mandataire agissant en son nom (avocat, notaire, représentant légal)."
            />
          </Label>
          <Select value={requesterType} onValueChange={setRequesterType}>
            <SelectTrigger className="h-11 text-sm rounded-xl border-2 focus:border-primary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {REQUESTER_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value} className="text-sm py-2">
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Bénéficiaire (nouveau propriétaire) */}
        {isTransferMutation && (
          <Card className="border-2 border-dashed rounded-xl">
            <CardContent className="p-3 space-y-3">
              <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Nouveau propriétaire
                <SectionHelpPopover
                  title="Nouveau propriétaire"
                  description="Renseignez l'identité complète du futur propriétaire. Pour une personne morale, indiquez la dénomination sociale. Ces informations figureront sur le nouveau titre."
                />
              </h4>
              
              <div className="space-y-2">
                <Label className="text-sm">Statut juridique</Label>
                <Select value={beneficiaryLegalStatus} onValueChange={setBeneficiaryLegalStatus}>
                  <SelectTrigger className="h-11 text-sm rounded-xl border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {LEGAL_STATUS_OPTIONS.map(status => (
                      <SelectItem key={status.value} value={status.value} className="text-sm py-2">
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {beneficiaryLegalStatus === 'personne_physique' ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Nom de famille *</Label>
                    <Input
                      value={beneficiaryLastName}
                      onChange={(e) => setBeneficiaryLastName(e.target.value)}
                      placeholder="Entrez le nom"
                      className="h-11 text-sm rounded-xl border-2"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Post-nom</Label>
                      <Input
                        value={beneficiaryMiddleName}
                        onChange={(e) => setBeneficiaryMiddleName(e.target.value)}
                        placeholder="Post-nom"
                        className="h-11 text-sm rounded-xl border-2"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Prénom *</Label>
                      <Input
                        value={beneficiaryFirstName}
                        onChange={(e) => setBeneficiaryFirstName(e.target.value)}
                        placeholder="Prénom"
                        className="h-11 text-sm rounded-xl border-2"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-sm">Dénomination sociale *</Label>
                  <Input
                    value={beneficiaryLastName}
                    onChange={(e) => setBeneficiaryLastName(e.target.value)}
                    placeholder="Nom de l'entreprise"
                    className="h-11 text-sm rounded-xl border-2"
                  />
                </div>
              )}
              
              <div className="space-y-1.5">
                <Label className="text-sm">Téléphone (optionnel)</Label>
                <Input
                  value={beneficiaryPhone}
                  onChange={(e) => setBeneficiaryPhone(e.target.value)}
                  placeholder="+243 XXX XXX XXX"
                  className="h-11 text-sm rounded-xl border-2"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Certificat d'expertise immobilière */}
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
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Information importante
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Un certificat d'expertise immobilière est requis pour les mutations. 
                        Ce certificat est valable <strong>6 mois</strong> après sa date de délivrance.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Avez-vous déjà un certificat d'expertise immobilière ?</Label>
                <RadioGroup 
                  value={hasExpertiseCertificate || ''} 
                  onValueChange={(value) => setHasExpertiseCertificate(value as 'yes' | 'no')}
                  className="flex gap-4"
                >
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
                  {/* Upload du certificat */}
                  <div className="space-y-1.5">
                    <Label className="text-sm">Certificat d'expertise *</Label>
                    <input
                      ref={expertiseCertificateInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleExpertiseCertificateSelect}
                      className="hidden"
                    />
                    
                    {expertiseCertificateFile ? (
                      <div className="flex items-center gap-2 p-2 bg-white dark:bg-card rounded-xl border-2 border-green-500/30">
                        {expertiseCertificateFile.type.startsWith('image/') ? (
                          <Image className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-green-600 flex-shrink-0" />
                        )}
                        <span className="flex-1 truncate text-sm">{expertiseCertificateFile.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setExpertiseCertificateFile(null)}
                          className="h-7 w-7 rounded-lg hover:bg-destructive/10"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => expertiseCertificateInputRef.current?.click()}
                        className="w-full h-11 text-sm rounded-xl border-2 border-dashed hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Ajouter le certificat (PDF ou image)
                      </Button>
                    )}
                  </div>

                  {/* Date de délivrance */}
                  <div className="space-y-1.5">
                    <Label className="text-sm flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      Date de délivrance *
                    </Label>
                    <Input
                      type="date"
                      value={expertiseCertificateDate}
                      onChange={(e) => setExpertiseCertificateDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="h-11 text-sm rounded-xl border-2"
                    />
                    
                    {expertiseCertificateDate && (
                      certificateValidity.isExpired ? (
                        <Alert className="bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800 rounded-lg mt-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-xs text-red-700 dark:text-red-400">
                            Ce certificat a expiré. Veuillez demander un nouveau certificat d'expertise.
                          </AlertDescription>
                        </Alert>
                      ) : certificateValidity.daysRemaining <= 30 ? (
                        <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 rounded-lg mt-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <AlertDescription className="text-xs text-amber-700 dark:text-amber-400">
                            Ce certificat expire dans {certificateValidity.daysRemaining} jours.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Certificat valide ({certificateValidity.daysRemaining} jours restants)
                        </p>
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
                      Un certificat d'expertise immobilière est nécessaire pour procéder à la mutation.
                      Vous pouvez en demander un en cliquant sur le bouton ci-dessous. Puis revenir plus tard sur ce formulaire pour finir votre demande de mutation.
                    </AlertDescription>
                  </Alert>
                  
                  <Button
                    type="button"
                    variant="seloger"
                    onClick={() => setShowExpertiseDialog(true)}
                    className="w-full h-11 text-sm rounded-xl"
                  >
                    <FileSearch className="h-4 w-4 mr-2" />
                    Demander un certificat
                    <ExternalLink className="h-3.5 w-3.5 ml-2" />
                  </Button>
                </div>
              )}

              {/* Valeur vénale - affiché dès que certificat confirmé */}
              {hasExpertiseCertificate === 'yes' && (
                <div className="space-y-3 pt-2 border-t border-amber-200 dark:border-amber-800">
                  {/* Valeur vénale */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5" />
                      Valeur vénale du bien (USD) *
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Cette valeur doit correspondre à celle indiquée dans le certificat d'expertise.
                    </p>
                    <Input
                      type="number"
                      value={marketValueUsd}
                      onChange={(e) => setMarketValueUsd(e.target.value)}
                      placeholder="Ex: 50000"
                      className="h-11 text-sm rounded-xl border-2"
                      min="0"
                    />
                  </div>

                  {/* Ancienneté du titre foncier */}
                  {parseFloat(marketValueUsd) >= 10000 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Ancienneté du titre foncier *</Label>
                        {titleAgeAutoDetected && titleIssueDateFromCCC && (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Auto-détecté
                          </span>
                        )}
                      </div>
                      
                      {titleAgeAutoDetected && titleIssueDateFromCCC && (
                        <Alert className="bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800 rounded-lg">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-xs text-green-700 dark:text-green-400">
                            Date de délivrance du titre : <strong>{format(new Date(titleIssueDateFromCCC), 'dd MMMM yyyy', { locale: fr })}</strong>
                            <br />
                            Le taux a été automatiquement déterminé selon les données CCC de la parcelle.
                          </AlertDescription>
                        </Alert>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Le taux des frais de mutation dépend de l'ancienneté du titre (Circulaire n° 005/CAB/MIN/AFF.FONC/2013).
                      </p>
                      <RadioGroup 
                        value={titleAge || ''} 
                        onValueChange={(value) => {
                          setTitleAge(value as 'less_than_10' | '10_or_more');
                          setTitleAgeAutoDetected(false); // L'utilisateur a manuellement changé
                        }}
                        className="flex flex-col gap-2"
                      >
                        <div className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50 ${titleAge === 'less_than_10' ? 'bg-primary/5 border border-primary/30' : ''}`}>
                          <RadioGroupItem value="less_than_10" id="title-less-10" />
                          <Label htmlFor="title-less-10" className="text-sm cursor-pointer flex-1">
                            Moins de 10 ans
                            <span className="block text-xs text-muted-foreground">Taux: 3% + frais bancaires</span>
                          </Label>
                        </div>
                        <div className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50 ${titleAge === '10_or_more' ? 'bg-primary/5 border border-primary/30' : ''}`}>
                          <RadioGroupItem value="10_or_more" id="title-10-more" />
                          <Label htmlFor="title-10-more" className="text-sm cursor-pointer flex-1">
                            10 ans ou plus
                            <span className="block text-xs text-muted-foreground">Taux: 1.5% (sans frais bancaires)</span>
                          </Label>
                        </div>
                      </RadioGroup>

                      {/* Affichage des frais calculés */}
                      {titleAge && mutationFeesCalculation.applicable && (
                        <Alert className="bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800 rounded-lg mt-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-xs text-green-700 dark:text-green-400">
                            <strong>Frais de mutation calculés:</strong>
                            <div className="mt-1 space-y-0.5">
                              <div className="flex justify-between">
                                <span>Frais de mutation ({mutationFeesCalculation.percentage}%)</span>
                                <span className="font-mono">${mutationFeesCalculation.mutationFee}</span>
                              </div>
                              {mutationFeesCalculation.bankFee > 0 && (
                                <div className="flex justify-between">
                                  <span>Frais bancaires (0.5%)</span>
                                  <span className="font-mono">${mutationFeesCalculation.bankFee}</span>
                                </div>
                              )}
                              <div className="flex justify-between font-bold pt-1 border-t border-green-300 dark:border-green-700">
                                <span>Total frais de mutation</span>
                                <span className="font-mono">${mutationFeesCalculation.total}</span>
                              </div>
                            </div>
                            <p className="mt-2 text-[10px] text-green-600 dark:text-green-500">
                              Réf: n°0076 CAB/MIN.AFF.FONC/ASM/TMM/2023 et 010/CAB/MIN.FINANCES/2023
                            </p>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  {/* Message si valeur < 10000 USD */}
                  {parseFloat(marketValueUsd) > 0 && parseFloat(marketValueUsd) < 10000 && (
                    <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-xs text-blue-700 dark:text-blue-400">
                        Les frais de mutation ne s'appliquent qu'aux biens d'une valeur vénale ≥ 10,000 USD.
                        <p className="mt-1 text-[10px]">
                          Réf: n°0076 CAB/MIN.AFF.FONC/ASM/TMM/2023 et 010/CAB/MIN.FINANCES/2023 du 08 Mai 2023
                        </p>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tout le contenu suivant ne s'affiche que si hasExpertiseCertificate === 'yes' pour les mutations avec transfert */}
        {isTransferMutation && hasExpertiseCertificate === 'yes' && (
          <>
            {/* Frais liés au certificat d'expertise */}
            <Card className="border-2 border-amber-200 dark:border-amber-700 rounded-xl">
              <CardContent className="p-3 space-y-3">
                <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Frais liés à l'expertise immobilière
                </h4>
                
                <div className="space-y-2">
                  {/* Frais obligatoires */}
                  {fees.filter(f => f.is_mandatory).map((fee) => (
                    <div 
                      key={fee.id}
                      className="flex items-start gap-3 p-3 rounded-xl transition-colors bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-700"
                    >
                      <Checkbox
                        id={fee.id}
                        checked={true}
                        disabled={true}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <label htmlFor={fee.id} className="text-sm font-medium cursor-pointer">
                            {fee.fee_name}
                            <span className="ml-1.5 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">
                              obligatoire
                            </span>
                          </label>
                          <span className="text-sm font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">${fee.amount_usd}</span>
                        </div>
                        {fee.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{fee.description}</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Frais optionnels */}
                  {fees.filter(f => !f.is_mandatory).map((fee) => (
                    <div 
                      key={fee.id}
                      className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
                        selectedFees.includes(fee.id) ? 'bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-700' : 'bg-muted/30 border-2 border-transparent'
                      }`}
                    >
                      <Checkbox
                        id={fee.id}
                        checked={selectedFees.includes(fee.id)}
                        onCheckedChange={() => handleFeeToggle(fee.id, false)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <label htmlFor={fee.id} className="text-sm font-medium cursor-pointer">
                            {fee.fee_name}
                          </label>
                          <span className="text-sm font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">${fee.amount_usd}</span>
                        </div>
                        {fee.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{fee.description}</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Frais de mutation calculés */}
                  {mutationFeesCalculation.applicable && titleAge && (
                    <>
                      <div 
                        className="flex items-start gap-3 p-3 rounded-xl transition-colors bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-700"
                      >
                        <div className="p-1.5 bg-amber-100 dark:bg-amber-900/50 rounded-lg mt-0.5">
                          <DollarSign className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">
                              Frais de mutation ({mutationFeesCalculation.percentage}%)
                              <span className="ml-1.5 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">
                                calculé
                              </span>
                            </span>
                            <span className="text-sm font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                              ${mutationFeesCalculation.mutationFee.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Basé sur la valeur vénale de ${parseFloat(marketValueUsd).toLocaleString()} USD
                          </p>
                        </div>
                      </div>

                      {mutationFeesCalculation.bankFee > 0 && (
                        <div 
                          className="flex items-start gap-3 p-3 rounded-xl transition-colors bg-amber-50/50 dark:bg-amber-950/20 border-2 border-amber-100 dark:border-amber-800"
                        >
                          <div className="p-1.5 bg-amber-100/50 dark:bg-amber-900/30 rounded-lg mt-0.5">
                            <CreditCard className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium">Frais bancaires (0.5%)</span>
                              <span className="text-sm font-bold text-amber-600 dark:text-amber-500 whitespace-nowrap">
                                ${mutationFeesCalculation.bankFee.toFixed(2)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Commission bancaire estimée
                            </p>
                          </div>
                        </div>
                      )}

                      <p className="text-[10px] text-muted-foreground px-1">
                        Circulaire n° 005/CAB/MIN/AFF.FONC/2013 • n°0076/2023 et 010/CAB/MIN.FINANCES/2023
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Frais de retard de mutation hors délai légal */}
            <Card className="border-2 border-orange-200 dark:border-orange-700 rounded-xl">
              <CardContent className="p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-400 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Traitement de mutation hors délai légal
                  </h4>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-100">
                        <HelpCircle className="h-3.5 w-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 bg-background border shadow-lg" align="start" sideOffset={5}>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-orange-700 dark:text-orange-400 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Frais de retard de mutation
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Le non-respect du délai légal de mutation immobilière (20 jours) entraîne des frais supplémentaires pour faire aboutir la mutation.
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium">Référence :</span> Note circulaire n°1.441/SG/AFF.F/003/2016 du 07 décembre 2016
                        </p>
                        <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                          Tarif : 0,45 USD par jour à partir du 21ème jour après l'acquisition.
                        </p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-3">
                  {/* Date d'acquisition du propriétaire */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-2">
                      Date d'acquisition par le propriétaire actuel
                      {ownerAcquisitionDateAutoDetected && (
                        <span className="text-[10px] text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-1.5 py-0.5 rounded">
                          détectée automatiquement
                        </span>
                      )}
                    </Label>
                    {ownerAcquisitionDate ? (
                      <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-lg">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {format(new Date(ownerAcquisitionDate), 'd MMMM yyyy', { locale: fr })}
                        </span>
                      </div>
                    ) : (
                      <Input
                        type="date"
                        max={new Date().toISOString().split('T')[0]}
                        value={manualAcquisitionDate}
                        onChange={(e) => setManualAcquisitionDate(e.target.value)}
                        className="h-9 text-sm"
                        placeholder="Sélectionnez la date d'acquisition"
                      />
                    )}
                  </div>

                  {/* Calcul des frais de retard */}
                  {lateFeesCalculation.applicable && (
                    <div className="flex items-start gap-3 p-3 rounded-xl transition-colors bg-orange-50 dark:bg-orange-950/30 border-2 border-orange-200 dark:border-orange-700">
                      <div className="p-1.5 bg-orange-100 dark:bg-orange-900/50 rounded-lg mt-0.5">
                        <Clock className="h-4 w-4 text-orange-700 dark:text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">
                            Frais de retard ({lateFeesCalculation.days} jours)
                            <span className="ml-1.5 text-[10px] text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/50 px-1.5 py-0.5 rounded">
                              calculé
                            </span>
                          </span>
                          <span className="text-sm font-bold text-orange-700 dark:text-orange-400 whitespace-nowrap">
                            ${lateFeesCalculation.fee.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {lateFeesCalculation.days} jours × {DAILY_LATE_FEE_USD} USD/jour
                          {lateFeesCalculation.capped && (
                            <span className="block text-orange-600 font-medium mt-0.5">
                              ⚠ Plafonné à ${LATE_FEE_CAP_USD} USD (plafond légal)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Total à payer */}
            <Card className="border rounded-xl">
              <CardContent className="p-3">
                <div className="flex items-center justify-between p-3 bg-primary/10 rounded-xl">
                  <span className="font-semibold text-sm">Total à payer</span>
                  <span className="text-xl font-bold text-primary">${getTotalAmount().toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={handlePreview} 
              className="w-full h-12 text-sm font-semibold rounded-xl shadow-lg"
              disabled={selectedFees.length === 0}
            >
              <Eye className="h-4 w-4 mr-2" />
              Aperçu avant soumission
            </Button>
          </>
        )}

        {/* Pour les mutations non-transfert, afficher directement le bouton preview */}
        {!isTransferMutation && (
          <>
            {/* Total à payer */}
            <Card className="border rounded-xl">
              <CardContent className="p-3">
                <div className="flex items-center justify-between p-3 bg-primary/10 rounded-xl">
                  <span className="font-semibold text-sm">Total à payer</span>
                  <span className="text-xl font-bold text-primary">${getTotalAmount().toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={handlePreview} 
              className="w-full h-12 text-sm font-semibold rounded-xl shadow-lg"
            >
              <Eye className="h-4 w-4 mr-2" />
              Aperçu avant soumission
            </Button>
          </>
        )}
      </div>
    </ScrollArea>
  );

  const renderPreviewStep = () => (
    <ScrollArea className="h-[65vh] sm:h-[70vh]">
      <div className="space-y-4 pr-2">
        {/* Avertissement important */}
        <Alert className="border-destructive bg-destructive/10 rounded-xl">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-sm text-destructive font-medium leading-relaxed">
            Vérifiez attentivement les informations. Une fois soumise, cette demande ne pourra plus être modifiée.
          </AlertDescription>
        </Alert>

        {/* Récapitulatif */}
        <Card className="border-2 rounded-xl shadow-sm">
          <CardContent className="p-4 space-y-3">
            {/* Parcelle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Parcelle</span>
              <span className="font-mono font-bold text-sm">{parcelNumber}</span>
            </div>
            
            {parcelData?.province && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Localisation</span>
                <span className="text-sm text-right max-w-[60%]">
                  {[parcelData.province, parcelData.ville, parcelData.commune].filter(Boolean).join(', ')}
                </span>
              </div>
            )}

            <Separator />
            
            {/* Type de mutation */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Type de mutation</span>
              <span className="text-sm font-semibold">{getMutationTypeDetails()?.label}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Demandeur</span>
              <span className="text-sm">
                {REQUESTER_TYPES.find(t => t.value === requesterType)?.label}
              </span>
            </div>

            {/* Nouveau propriétaire si transfert */}
            {isTransferMutation && (
              <>
                <Separator />
                <div className="space-y-2 bg-primary/5 p-3 rounded-xl -mx-1">
                  <span className="text-xs font-semibold text-primary uppercase tracking-wide">Nouveau propriétaire</span>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Nom complet</span>
                    <span className="text-sm font-medium max-w-[60%] text-right">{getBeneficiaryFullName()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Statut</span>
                    <span className="text-sm">
                      {LEGAL_STATUS_OPTIONS.find(s => s.value === beneficiaryLegalStatus)?.label}
                    </span>
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

            {/* Documents */}
            {attachedFiles.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Documents joints</span>
                  <div className="space-y-1.5">
                    {attachedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        {file.type.startsWith('image/') ? (
                          <Image className="h-4 w-4 text-primary" />
                        ) : (
                          <FileText className="h-4 w-4 text-primary" />
                        )}
                        <span className="truncate">{file.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Frais */}
            <Separator />
            <div className="space-y-2">
              {getSelectedFeesDetails().length > 0 && (
                <>
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Frais liés à l'expertise</span>
                  {getSelectedFeesDetails().map(fee => (
                    <div key={fee.id} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{fee.fee_name}</span>
                      <span className="text-sm font-medium">${fee.amount_usd.toFixed(2)}</span>
                    </div>
                  ))}
                </>
              )}
              
              {/* Frais de mutation si applicables */}
              {mutationFeesCalculation.applicable && titleAge && (
                <>
                  {getSelectedFeesDetails().length > 0 && <Separator className="my-1" />}
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Frais de mutation</span>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Frais ({mutationFeesCalculation.percentage}% de ${marketValueUsd})</span>
                    <span className="text-sm font-medium">${mutationFeesCalculation.mutationFee.toFixed(2)}</span>
                  </div>
                  {mutationFeesCalculation.bankFee > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Frais bancaires (0.5%)</span>
                      <span className="text-sm font-medium">${mutationFeesCalculation.bankFee.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}

              {/* Bug #21: Frais de retard dans le récapitulatif */}
              {lateFeesCalculation.applicable && (
                <>
                  <Separator className="my-1" />
                  <span className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide">Frais de retard</span>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Retard ({lateFeesCalculation.days} jours × 0,45$/j)</span>
                    <span className="text-sm font-medium">${lateFeesCalculation.fee.toFixed(2)}</span>
                  </div>
                </>
              )}
              
              <div className="flex items-center justify-between pt-2 border-t-2">
                <span className="text-sm font-bold">Total</span>
                <span className="text-lg font-bold text-primary">${getTotalAmount().toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Alert className="rounded-xl bg-muted/50">
          <Clock className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Délai de traitement estimé: <strong>14 jours ouvrables</strong> après paiement.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setStep('form')} 
            className="flex-1 h-12 text-sm font-semibold rounded-xl"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Modifier
          </Button>
          <Button 
            onClick={handleSubmitForm} 
            className="flex-1 h-12 text-sm font-semibold rounded-xl shadow-lg"
            disabled={loading || uploadingFiles}
          >
            {loading || uploadingFiles ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {uploadingFiles ? 'Envoi...' : 'Création...'}
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Payer ${getTotalAmount().toFixed(2)}
              </>
            )}
          </Button>
        </div>
      </div>
    </ScrollArea>
  );

  const renderPaymentStep = () => (
    <div className="space-y-3">
      <Card className="bg-muted/50 border-0 rounded-lg">
        <CardContent className="p-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground">Référence</p>
              <p className="font-mono font-bold text-sm">{createdRequest?.reference_number}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Montant</p>
              <p className="text-lg font-bold text-primary">${createdRequest?.total_amount_usd.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label className="text-xs font-medium">Mode de paiement</Label>
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            variant={paymentMethod === 'mobile_money' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPaymentMethod('mobile_money')}
            className="h-8 text-xs rounded-lg"
          >
            Mobile Money
          </Button>
          <Button
            variant={paymentMethod === 'bank_card' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPaymentMethod('bank_card')}
            className="h-8 text-xs rounded-lg"
          >
            Carte bancaire
          </Button>
        </div>
      </div>

      {paymentMethod === 'mobile_money' && (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-[10px]">Opérateur</Label>
            <Select value={paymentProvider} onValueChange={setPaymentProvider}>
              <SelectTrigger className="h-8 text-xs rounded-lg">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="airtel" className="text-xs">Airtel Money</SelectItem>
                <SelectItem value="orange" className="text-xs">Orange Money</SelectItem>
                <SelectItem value="mpesa" className="text-xs">M-Pesa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Numéro de téléphone</Label>
            <Input
              value={paymentPhone}
              onChange={(e) => setPaymentPhone(e.target.value)}
              placeholder="+243..."
              className="h-8 text-xs rounded-lg"
            />
          </div>
        </div>
      )}

      <div className="flex gap-1.5 pt-2">
        <Button 
          variant="outline" 
          onClick={() => setStep('preview')}
          disabled={processingPayment}
          className="flex-1 h-8 text-xs rounded-lg"
        >
          Retour
        </Button>
        <Button 
          onClick={handlePayment}
          disabled={processingPayment}
          className="flex-1 h-8 text-xs rounded-lg"
        >
          {processingPayment ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              Paiement...
            </>
          ) : (
            'Payer'
          )}
        </Button>
      </div>
    </div>
  );

  const renderConfirmationStep = () => (
    <div className="space-y-3 text-center py-2">
      <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
        <CheckCircle2 className="h-6 w-6 text-green-600" />
      </div>
      
      <div>
        <h3 className="font-semibold text-sm">Demande soumise avec succès</h3>
        <p className="text-[10px] text-muted-foreground mt-1">
          Votre demande sera traitée dans les 14 jours ouvrables
        </p>
      </div>

      <Card className="bg-muted/50 border-0 text-left rounded-lg">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Hash className="h-3 w-3" />
              Référence
            </div>
            <span className="font-mono font-bold text-xs">{createdRequest?.reference_number}</span>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              Parcelle
            </div>
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
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Délai estimé
            </div>
            <span className="text-xs">{createdRequest?.estimated_processing_days || 14} jours</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Montant payé</span>
            <span className="font-bold text-primary text-sm">${createdRequest?.total_amount_usd}</span>
          </div>
        </CardContent>
      </Card>

      <Alert className="text-left py-2 rounded-lg">
        <AlertDescription className="text-[10px]">
          Conservez votre numéro de référence. Vous recevrez une notification lors du traitement.
        </AlertDescription>
      </Alert>

      <Button onClick={handleClose} className="w-full h-8 text-xs rounded-lg">
        Fermer
      </Button>
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

  // Reset showIntro when dialog opens
  useEffect(() => {
    if (open) {
      setShowIntro(true);
    }
  }, [open]);

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  if (showIntro && open) {
    return (
      <FormIntroDialog
        open={open}
        onOpenChange={onOpenChange}
        onContinue={handleIntroComplete}
        config={FORM_INTRO_CONFIGS.mutation}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={`z-[1200] ${isMobile ? 'w-[92vw] max-w-[360px] max-h-[88vh] rounded-2xl' : 'max-w-md rounded-2xl'} p-4 overflow-hidden`}>
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <FileEdit className="h-4 w-4 text-primary" />
              </div>
              {getStepTitle()}
            </DialogTitle>
            {step === 'form' && (
              <DialogDescription className="text-sm text-muted-foreground">
                Remplissez le formulaire pour demander une mise à jour cadastrale
              </DialogDescription>
            )}
          </DialogHeader>

          {step === 'form' && renderFormStep()}
          {step === 'preview' && renderPreviewStep()}
          {step === 'payment' && renderPaymentStep()}
          {step === 'confirmation' && renderConfirmationStep()}
        </DialogContent>

      {open && <WhatsAppFloatingButton message="Bonjour, j'ai besoin d'aide avec le formulaire de mutation." />}

      {/* Dialog pour demande d'expertise immobilière */}
      <RealEstateExpertiseRequestDialog
        parcelNumber={parcelNumber}
        parcelId={parcelId}
        parcelData={parcelData}
        open={showExpertiseDialog}
        onOpenChange={setShowExpertiseDialog}
        onSuccess={() => {
          toast.success('Demande d\'expertise soumise ! Vous serez notifié une fois le certificat disponible.');
        }}
      />
    </Dialog>
  );
};

export default MutationRequestDialog;
