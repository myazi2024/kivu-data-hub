import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileEdit, CreditCard, CheckCircle2, AlertTriangle, MapPin, Clock, Hash, Upload, X, FileText, Image } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMutationRequest, MutationFee, MutationRequest } from '@/hooks/useMutationRequest';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

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

type Step = 'form' | 'payment' | 'confirmation';

// Types de mutation alignés avec le formulaire CCC
const MUTATION_TYPES = [
  { value: 'vente', label: 'Vente' },
  { value: 'donation', label: 'Donation' },
  { value: 'succession', label: 'Succession' },
  { value: 'expropriation', label: 'Expropriation' },
  { value: 'echange', label: 'Échange' },
  { value: 'correction', label: 'Correction d\'erreur' },
  { value: 'mise_a_jour', label: 'Mise à jour des données' }
];

// Statut juridique aligné avec le formulaire CCC
const LEGAL_STATUS_OPTIONS = [
  { value: 'personne_physique', label: 'Personne physique' },
  { value: 'personne_morale', label: 'Personne morale' }
];

const REQUESTER_TYPES = [
  { value: 'proprietaire', label: 'Propriétaire actuel' },
  { value: 'mandataire', label: 'Mandataire/Représentant' },
  { value: 'tiers', label: 'Tiers' }
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
  const [requesterLegalStatus, setRequesterLegalStatus] = useState('personne_physique');
  const [requesterLastName, setRequesterLastName] = useState('');
  const [requesterFirstName, setRequesterFirstName] = useState('');
  const [requesterMiddleName, setRequesterMiddleName] = useState('');
  const [requesterPhone, setRequesterPhone] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  
  // Bénéficiaire (nouveau propriétaire pour transferts)
  const [beneficiaryLegalStatus, setBeneficiaryLegalStatus] = useState('personne_physique');
  const [beneficiaryLastName, setBeneficiaryLastName] = useState('');
  const [beneficiaryFirstName, setBeneficiaryFirstName] = useState('');
  const [beneficiaryMiddleName, setBeneficiaryMiddleName] = useState('');
  const [beneficiaryPhone, setBeneficiaryPhone] = useState('');
  
  const [proposedChanges, setProposedChanges] = useState('');
  const [justification, setJustification] = useState('');
  const [selectedFees, setSelectedFees] = useState<string[]>([]);
  
  // Pièces jointes
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadedFileUrls, setUploadedFileUrls] = useState<string[]>([]);
  
  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'bank_card'>('mobile_money');
  const [paymentProvider, setPaymentProvider] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  // Vérifier si c'est un type de mutation avec transfert
  const isTransferMutation = ['vente', 'donation', 'succession', 'expropriation', 'echange'].includes(mutationType);

  // Initialize form with user data
  useEffect(() => {
    if (profile) {
      const nameParts = (profile.full_name || '').split(' ');
      if (nameParts.length >= 2) {
        setRequesterLastName(nameParts[0]);
        setRequesterFirstName(nameParts.slice(1).join(' '));
      } else if (nameParts.length === 1) {
        setRequesterLastName(nameParts[0]);
      }
      setRequesterEmail(profile.email || '');
    }
    // Select mandatory fees by default
    const mandatoryFeeIds = fees.filter(f => f.is_mandatory).map(f => f.id);
    setSelectedFees(mandatoryFeeIds);
  }, [profile, fees]);

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

  const handleSubmitForm = async () => {
    if (!requesterLastName.trim() || !requesterFirstName.trim()) {
      toast.error('Veuillez renseigner votre nom et prénom');
      return;
    }

    if (!proposedChanges.trim()) {
      toast.error('Veuillez décrire les modifications souhaitées');
      return;
    }

    if (isTransferMutation && (!beneficiaryLastName.trim() || !beneficiaryFirstName.trim())) {
      toast.error('Veuillez renseigner le nom du nouveau propriétaire');
      return;
    }

    // Upload des fichiers avant création
    let documentUrls: string[] = [];
    if (attachedFiles.length > 0) {
      documentUrls = await uploadFiles();
      if (documentUrls.length === 0 && attachedFiles.length > 0) {
        return; // Upload failed
      }
    }

    const fullRequesterName = requesterLegalStatus === 'personne_morale' 
      ? requesterLastName 
      : [requesterLastName, requesterMiddleName, requesterFirstName].filter(Boolean).join(' ');
    
    const fullBeneficiaryName = beneficiaryLegalStatus === 'personne_morale'
      ? beneficiaryLastName
      : [beneficiaryLastName, beneficiaryMiddleName, beneficiaryFirstName].filter(Boolean).join(' ');

    const request = await createMutationRequest({
      parcel_number: parcelNumber,
      parcel_id: parcelId,
      mutation_type: mutationType as any,
      requester_type: requesterType as any,
      requester_name: fullRequesterName,
      requester_phone: requesterPhone,
      requester_email: requesterEmail,
      beneficiary_name: isTransferMutation ? fullBeneficiaryName : undefined,
      beneficiary_phone: isTransferMutation ? beneficiaryPhone : undefined,
      proposed_changes: { 
        description: proposedChanges,
        requester_legal_status: requesterLegalStatus,
        beneficiary_legal_status: isTransferMutation ? beneficiaryLegalStatus : undefined,
        supporting_documents: documentUrls
      },
      justification,
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
    setProposedChanges('');
    setJustification('');
    setAttachedFiles([]);
    setUploadedFileUrls([]);
    onOpenChange(false);
  };

  const renderFormStep = () => (
    <ScrollArea className={isMobile ? 'h-[65vh]' : 'h-[70vh]'}>
      <div className="space-y-3 pr-2">
        {/* Info parcelle - compact */}
        <Card className="bg-muted/50 border-0">
          <CardContent className="p-2">
            <div className="flex items-center gap-2 text-xs">
              <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              <span className="font-mono font-bold text-sm">{parcelNumber}</span>
              {parcelData?.province && (
                <span className="text-muted-foreground truncate">
                  - {parcelData.province} {parcelData.ville}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Type de mutation - aligné CCC */}
        <div className="space-y-1">
          <Label className="text-xs font-medium">Type de mutation *</Label>
          <Select value={mutationType} onValueChange={setMutationType}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MUTATION_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value} className="text-xs">
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Type de demandeur */}
        <div className="space-y-1">
          <Label className="text-xs font-medium">Vous êtes</Label>
          <Select value={requesterType} onValueChange={setRequesterType}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REQUESTER_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value} className="text-xs">
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator className="my-2" />

        {/* Informations du demandeur - structure alignée CCC */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Vos informations</h4>
          
          {/* Statut juridique */}
          <div className="space-y-1">
            <Label className="text-xs">Statut juridique</Label>
            <Select value={requesterLegalStatus} onValueChange={setRequesterLegalStatus}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEGAL_STATUS_OPTIONS.map(status => (
                  <SelectItem key={status.value} value={status.value} className="text-xs">
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {requesterLegalStatus === 'personne_physique' ? (
            <div className="grid grid-cols-3 gap-1.5">
              <div className="space-y-0.5">
                <Label className="text-[10px]">Nom *</Label>
                <Input
                  value={requesterLastName}
                  onChange={(e) => setRequesterLastName(e.target.value)}
                  placeholder="Nom"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px]">Post-nom</Label>
                <Input
                  value={requesterMiddleName}
                  onChange={(e) => setRequesterMiddleName(e.target.value)}
                  placeholder="Post-nom"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px]">Prénom *</Label>
                <Input
                  value={requesterFirstName}
                  onChange={(e) => setRequesterFirstName(e.target.value)}
                  placeholder="Prénom"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              <Label className="text-[10px]">Dénomination sociale *</Label>
              <Input
                value={requesterLastName}
                onChange={(e) => setRequesterLastName(e.target.value)}
                placeholder="Nom de l'entreprise"
                className="h-8 text-xs"
              />
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-1.5">
            <div className="space-y-0.5">
              <Label className="text-[10px]">Téléphone</Label>
              <Input
                value={requesterPhone}
                onChange={(e) => setRequesterPhone(e.target.value)}
                placeholder="+243..."
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px]">Email</Label>
              <Input
                type="email"
                value={requesterEmail}
                onChange={(e) => setRequesterEmail(e.target.value)}
                placeholder="email@exemple.com"
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Bénéficiaire (nouveau propriétaire) - pour mutations de transfert */}
        {isTransferMutation && (
          <>
            <Separator className="my-2" />
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                Nouveau propriétaire
              </h4>
              
              <div className="space-y-1">
                <Label className="text-xs">Statut juridique</Label>
                <Select value={beneficiaryLegalStatus} onValueChange={setBeneficiaryLegalStatus}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEGAL_STATUS_OPTIONS.map(status => (
                      <SelectItem key={status.value} value={status.value} className="text-xs">
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {beneficiaryLegalStatus === 'personne_physique' ? (
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="space-y-0.5">
                    <Label className="text-[10px]">Nom *</Label>
                    <Input
                      value={beneficiaryLastName}
                      onChange={(e) => setBeneficiaryLastName(e.target.value)}
                      placeholder="Nom"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[10px]">Post-nom</Label>
                    <Input
                      value={beneficiaryMiddleName}
                      onChange={(e) => setBeneficiaryMiddleName(e.target.value)}
                      placeholder="Post-nom"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[10px]">Prénom *</Label>
                    <Input
                      value={beneficiaryFirstName}
                      onChange={(e) => setBeneficiaryFirstName(e.target.value)}
                      placeholder="Prénom"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <Label className="text-[10px]">Dénomination sociale *</Label>
                  <Input
                    value={beneficiaryLastName}
                    onChange={(e) => setBeneficiaryLastName(e.target.value)}
                    placeholder="Nom de l'entreprise"
                    className="h-8 text-xs"
                  />
                </div>
              )}
              
              <div className="space-y-0.5">
                <Label className="text-[10px]">Téléphone bénéficiaire</Label>
                <Input
                  value={beneficiaryPhone}
                  onChange={(e) => setBeneficiaryPhone(e.target.value)}
                  placeholder="+243..."
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </>
        )}

        <Separator className="my-2" />

        {/* Modifications souhaitées */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Modifications demandées</h4>
          
          <div className="space-y-0.5">
            <Label className="text-[10px]">Description des modifications *</Label>
            <Textarea
              value={proposedChanges}
              onChange={(e) => setProposedChanges(e.target.value)}
              placeholder="Décrivez les modifications que vous souhaitez apporter..."
              className="min-h-[60px] text-xs resize-none"
            />
          </div>

          <div className="space-y-0.5">
            <Label className="text-[10px]">Justification (optionnel)</Label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Motifs de votre demande..."
              className="min-h-[50px] text-xs resize-none"
            />
          </div>
        </div>

        <Separator className="my-2" />

        {/* Pièces jointes */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">
            Documents justificatifs
          </h4>
          <p className="text-[10px] text-muted-foreground">
            Joignez les documents prouvant l'authenticité de la demande (acte de vente, certificat d'héritage, etc.)
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
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-8 text-xs"
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Ajouter des fichiers
          </Button>
          
          {attachedFiles.length > 0 && (
            <div className="space-y-1">
              {attachedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 p-1.5 bg-muted/50 rounded text-xs">
                  {file.type.startsWith('image/') ? (
                    <Image className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  ) : (
                    <FileText className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  )}
                  <span className="flex-1 truncate">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                    className="h-5 w-5"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator className="my-2" />

        {/* Frais - compact */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Frais de mutation</h4>
          
          <div className="space-y-1.5">
            {fees.map((fee) => (
              <div 
                key={fee.id}
                className="flex items-start gap-2 p-2 border rounded bg-background"
              >
                <Checkbox
                  id={fee.id}
                  checked={selectedFees.includes(fee.id)}
                  onCheckedChange={() => handleFeeToggle(fee.id, fee.is_mandatory)}
                  disabled={fee.is_mandatory}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <label htmlFor={fee.id} className="text-xs font-medium cursor-pointer">
                      {fee.fee_name}
                      {fee.is_mandatory && (
                        <span className="ml-1 text-[9px] text-muted-foreground">(obligatoire)</span>
                      )}
                    </label>
                    <span className="text-xs font-bold text-primary">${fee.amount_usd}</span>
                  </div>
                  {fee.description && (
                    <p className="text-[10px] text-muted-foreground">{fee.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between p-2 bg-primary/10 rounded">
            <span className="font-semibold text-xs">Total à payer</span>
            <span className="text-lg font-bold text-primary">${getTotalAmount()}</span>
          </div>
        </div>

        <Alert className="py-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          <AlertDescription className="text-[10px]">
            Le paiement est requis avant la soumission. Délai de traitement: 14 jours ouvrables.
          </AlertDescription>
        </Alert>

        <Button 
          onClick={handleSubmitForm} 
          className="w-full h-9 text-xs"
          disabled={loading || selectedFees.length === 0 || uploadingFiles}
        >
          {loading || uploadingFiles ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              {uploadingFiles ? 'Téléchargement...' : 'Création...'}
            </>
          ) : (
            <>
              <CreditCard className="h-3.5 w-3.5 mr-1.5" />
              Passer au paiement (${getTotalAmount()})
            </>
          )}
        </Button>
      </div>
    </ScrollArea>
  );

  const renderPaymentStep = () => (
    <div className="space-y-3">
      <Card className="bg-muted/50 border-0">
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
            className="h-8 text-xs"
          >
            Mobile Money
          </Button>
          <Button
            variant={paymentMethod === 'bank_card' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPaymentMethod('bank_card')}
            className="h-8 text-xs"
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
              <SelectTrigger className="h-8 text-xs">
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
              className="h-8 text-xs"
            />
          </div>
        </div>
      )}

      <div className="flex gap-1.5 pt-2">
        <Button 
          variant="outline" 
          onClick={() => setStep('form')}
          disabled={processingPayment}
          className="flex-1 h-8 text-xs"
        >
          Retour
        </Button>
        <Button 
          onClick={handlePayment}
          disabled={processingPayment}
          className="flex-1 h-8 text-xs"
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

      <Card className="bg-muted/50 border-0 text-left">
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

      <Alert className="text-left py-2">
        <AlertDescription className="text-[10px]">
          Conservez votre numéro de référence. Vous recevrez une notification lors du traitement.
        </AlertDescription>
      </Alert>

      <Button onClick={handleClose} className="w-full h-8 text-xs">
        Fermer
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogPortal>
        <DialogOverlay className="z-[1100]" />
        <DialogContent className={`z-[1100] ${isMobile ? 'max-w-[95vw] max-h-[85vh] m-2' : 'max-w-md'} p-3`}>
          <DialogHeader className="pb-1">
            <DialogTitle className="flex items-center gap-1.5 text-sm">
              <FileEdit className="h-4 w-4 text-primary" />
              {step === 'confirmation' ? 'Confirmation' : 'Demande de mutation'}
            </DialogTitle>
            {step === 'form' && (
              <DialogDescription className="text-[10px]">
                Remplissez le formulaire pour demander une mise à jour cadastrale
              </DialogDescription>
            )}
          </DialogHeader>

          {step === 'form' && renderFormStep()}
          {step === 'payment' && renderPaymentStep()}
          {step === 'confirmation' && renderConfirmationStep()}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default MutationRequestDialog;
