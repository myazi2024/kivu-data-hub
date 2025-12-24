import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
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
import { Loader2, FileEdit, CreditCard, CheckCircle2, AlertTriangle, MapPin, Clock, Hash, Upload, X, FileText, Image, Eye, ArrowLeft, AlertCircle, FileSearch, ExternalLink, Calendar, DollarSign, Award } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMutationRequest, MutationFee, MutationRequest } from '@/hooks/useMutationRequest';
import { useRealEstateExpertise } from '@/hooks/useRealEstateExpertise';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { format, differenceInDays, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import RealEstateExpertiseRequestDialog from './RealEstateExpertiseRequestDialog';

interface MutationRequestDialogProps {
  parcelNumber: string;
  parcelId?: string;
  parcelData?: {
    province?: string;
    ville?: string;
    commune?: string;
    quartier?: string;
    current_owner_name?: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
  const expertiseCertificateInputRef = useRef<HTMLInputElement>(null);
  
  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'bank_card'>('mobile_money');
  const [paymentProvider, setPaymentProvider] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  // Vérifier si c'est un type de mutation avec transfert
  const isTransferMutation = ['vente', 'donation', 'succession', 'expropriation', 'echange'].includes(mutationType);

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
    return getSelectedFeesDetails().reduce((sum, fee) => sum + fee.amount_usd, 0);
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
    return true;
  };

  const handlePreview = () => {
    if (!validateForm()) return;
    setStep('preview');
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

    const request = await createMutationRequest({
      parcel_number: parcelNumber,
      parcel_id: parcelId,
      mutation_type: mutationType as any,
      requester_type: requesterType as any,
      requester_name: requesterName,
      requester_phone: '',
      requester_email: requesterEmail,
      beneficiary_name: isTransferMutation ? fullBeneficiaryName : undefined,
      beneficiary_phone: isTransferMutation ? beneficiaryPhone : undefined,
      proposed_changes: { 
        description: autoDescription,
        beneficiary_legal_status: isTransferMutation ? beneficiaryLegalStatus : undefined,
        supporting_documents: documentUrls
      },
      justification: '',
      selected_fees: getSelectedFeesDetails()
    });

    if (request) {
      setCreatedRequest(request);
      setStep('payment');
    }
  };

  const handlePayment = async () => {
    if (!createdRequest) return;
    
    if (paymentMethod === 'mobile_money' && (!paymentProvider || !paymentPhone)) {
      toast.error('Veuillez sélectionner un opérateur et entrer votre numéro');
      return;
    }

    setProcessingPayment(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const success = await updatePaymentStatus(createdRequest.id, 'paid', 'PAY-' + Date.now());
      
      if (success) {
        setStep('confirmation');
        toast.success('Paiement effectué avec succès');
      } else {
        toast.error('Erreur lors de la mise à jour du paiement');
      }
    } catch (error) {
      toast.error('Erreur lors du paiement');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setCreatedRequest(null);
    setMutationType('vente');
    setRequesterType('proprietaire');
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
          <Label className="text-sm font-semibold">Type de mutation *</Label>
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

        {/* Type de demandeur */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Vous êtes</Label>
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
              <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <Award className="h-4 w-4" />
                Certificat d'expertise immobilière
              </h4>
              
              <p className="text-xs text-muted-foreground">
                Un certificat d'expertise immobilière est requis pour les mutations. 
                Ce certificat est valable <strong>6 mois</strong> après sa date de délivrance.
              </p>

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
                      Vous pouvez en demander un en cliquant sur le bouton ci-dessous.
                    </AlertDescription>
                  </Alert>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowExpertiseDialog(true)}
                    className="w-full h-11 text-sm rounded-xl border-2 border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:border-blue-700 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 dark:text-blue-400"
                  >
                    <FileSearch className="h-4 w-4 mr-2" />
                    Demander un certificat d'expertise immobilière
                    <ExternalLink className="h-3.5 w-3.5 ml-2" />
                  </Button>
                </div>
              )}

              {/* Valeur vénale - affiché si certificat présent ou "oui" sélectionné */}
              {(hasExpertiseCertificate === 'yes' && expertiseCertificateFile && expertiseCertificateDate && !certificateValidity.isExpired) && (
                <div className="space-y-1.5 pt-2 border-t border-amber-200 dark:border-amber-800">
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
              )}
            </CardContent>
          </Card>
        )}

        {/* Pièces jointes */}
        <Card className="border rounded-xl">
          <CardContent className="p-3 space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Upload className="h-4 w-4 text-muted-foreground" />
              Documents justificatifs
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
              Ajouter des fichiers
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

        {/* Frais */}
        <Card className="border rounded-xl">
          <CardContent className="p-3 space-y-3">
            <h4 className="text-sm font-semibold">Frais de mutation</h4>
            
            <div className="space-y-2">
              {fees.map((fee) => (
                <div 
                  key={fee.id}
                  className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
                    selectedFees.includes(fee.id) ? 'bg-primary/5 border-2 border-primary/30' : 'bg-muted/30 border-2 border-transparent'
                  }`}
                >
                  <Checkbox
                    id={fee.id}
                    checked={selectedFees.includes(fee.id)}
                    onCheckedChange={() => handleFeeToggle(fee.id, fee.is_mandatory)}
                    disabled={fee.is_mandatory}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor={fee.id} className="text-sm font-medium cursor-pointer">
                        {fee.fee_name}
                        {fee.is_mandatory && (
                          <span className="ml-1.5 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            obligatoire
                          </span>
                        )}
                      </label>
                      <span className="text-sm font-bold text-primary whitespace-nowrap">${fee.amount_usd}</span>
                    </div>
                    {fee.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{fee.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-xl">
              <span className="font-semibold text-sm">Total à payer</span>
              <span className="text-xl font-bold text-primary">${getTotalAmount()}</span>
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
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Frais sélectionnés</span>
              {getSelectedFeesDetails().map(fee => (
                <div key={fee.id} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{fee.fee_name}</span>
                  <span className="text-sm font-medium">${fee.amount_usd}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t-2">
                <span className="text-sm font-bold">Total</span>
                <span className="text-lg font-bold text-primary">${getTotalAmount()}</span>
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
                Payer ${getTotalAmount()}
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
              <p className="text-lg font-bold text-primary">${createdRequest?.total_amount_usd}</p>
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogPortal>
        <DialogOverlay className="z-[1100]" />
        <DialogContent className={`z-[1100] ${isMobile ? 'w-[92vw] max-w-[360px] max-h-[88vh] rounded-2xl' : 'max-w-md rounded-2xl'} p-4 overflow-hidden`}>
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
      </DialogPortal>

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
