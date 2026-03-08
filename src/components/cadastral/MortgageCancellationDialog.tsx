import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import WhatsAppFloatingButton from './WhatsAppFloatingButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, FileX2, CheckCircle2, Upload, X, Info, ArrowLeft, FileText, AlertTriangle, Calendar, DollarSign, Award, CreditCard, Phone, Hash, Image, MapPin, User, Building, FileCheck, ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { QuickAuthDialog } from './QuickAuthDialog';


interface MortgageCancellationDialogProps {
  parcelNumber: string;
  parcelId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  embedded?: boolean;
}

type Step = 'form' | 'review' | 'payment' | 'confirmation';

interface CancellationFee {
  id: string;
  name: string;
  amount_usd: number;
  is_mandatory: boolean;
  description?: string;
}

interface ParcelData {
  id: string;
  parcel_number: string;
  current_owner_name: string;
  current_owner_legal_status?: string;
  property_title_type?: string;
  title_reference_number?: string;
  province?: string;
  ville?: string;
  commune?: string;
  quartier?: string;
  avenue?: string;
  area_sqm?: number;
}

interface MortgageData {
  id: string;
  reference_number: string;
  creditor_name: string;
  creditor_type: string;
  mortgage_amount_usd: number;
  contract_date: string;
  duration_months: number;
  mortgage_status: string;
}

interface CancellationRequest {
  mortgageReferenceNumber: string;
  reason: string;
  cancellationDate: string;
  settlementAmount: string;
  requesterName: string;
  requesterPhone: string;
  requesterEmail: string;
  requesterIdNumber: string;
  requesterQuality: string;
  creditorAccord: boolean;
  supportingDocuments: File[];
  comments: string;
}

// Frais de radiation selon la législation RDC
const CANCELLATION_FEES: CancellationFee[] = [
  { id: 'dossier', name: 'Frais d\'ouverture de dossier', amount_usd: 50, is_mandatory: true, description: 'Frais administratifs de constitution du dossier' },
  { id: 'radiation', name: 'Droit de radiation', amount_usd: 100, is_mandatory: true, description: 'Droit de radiation au registre des titres fonciers' },
  { id: 'certificat', name: 'Certificat de radiation', amount_usd: 35, is_mandatory: true, description: 'Délivrance du certificat officiel de mainlevée' },
  { id: 'timbre', name: 'Droit de timbre', amount_usd: 15, is_mandatory: true, description: 'Timbre fiscal légal' },
  { id: 'conservation', name: 'Frais de conservation', amount_usd: 25, is_mandatory: true, description: 'Mise à jour du livre foncier' },
  { id: 'verification', name: 'Vérification complémentaire', amount_usd: 20, is_mandatory: false, description: 'Vérification approfondie des documents' }
];

const CANCELLATION_REASONS = [
  { value: 'remboursement_integral', label: 'Remboursement intégral du prêt', description: 'La dette hypothécaire a été entièrement remboursée' },
  { value: 'refinancement', label: 'Refinancement', description: 'Transfert de la dette vers un autre créancier' },
  { value: 'accord_amiable', label: 'Accord amiable', description: 'Accord négocié avec le créancier' },
  { value: 'prescription', label: 'Prescription extinctive', description: 'L\'hypothèque est prescrite (30 ans)' },
  { value: 'renonciation', label: 'Renonciation du créancier', description: 'Le créancier renonce à son droit' },
  { value: 'autre', label: 'Autre motif', description: 'Précisez dans les commentaires' }
];

const REQUESTER_QUALITIES = [
  { value: 'proprietaire', label: 'Propriétaire du bien' },
  { value: 'debiteur', label: 'Débiteur' },
  { value: 'mandataire', label: 'Mandataire/Représentant légal' },
  { value: 'heritier', label: 'Héritier' },
  { value: 'notaire', label: 'Notaire' }
];

const MortgageCancellationDialog: React.FC<MortgageCancellationDialogProps> = ({
  parcelNumber,
  parcelId,
  open,
  onOpenChange,
  embedded = false
}) => {
  const isMobile = useIsMobile();
  const { user, profile } = useAuth();
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [validatingReference, setValidatingReference] = useState(false);
  const [referenceValid, setReferenceValid] = useState<boolean | null>(null);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [requestReferenceNumber, setRequestReferenceNumber] = useState('');
  const [selectedFees, setSelectedFees] = useState<string[]>([]);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const isSubmittingRef = useRef(false);
  
  // Données pré-remplies depuis la base de données
  const [parcelData, setParcelData] = useState<ParcelData | null>(null);
  const [mortgageData, setMortgageData] = useState<MortgageData | null>(null);
  
  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'bank_card'>('mobile_money');
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Charger les données de la parcelle
  const loadParcelData = async () => {
    if (!parcelId) {
      console.warn('loadParcelData: parcelId is undefined, skipping fetch');
      return;
    }
    
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
      }
    } catch (error) {
      console.error('Error loading parcel data:', error);
      toast.error('Erreur lors du chargement des données de la parcelle');
    } finally {
      setLoadingData(false);
    }
  };

  // Générer le numéro de référence et charger les données
  useEffect(() => {
    if (open) {
      const ref = `RAD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      setRequestReferenceNumber(ref);
      
      // Initialiser les frais obligatoires
      const mandatoryFeeIds = CANCELLATION_FEES.filter(f => f.is_mandatory).map(f => f.id);
      setSelectedFees(mandatoryFeeIds);
      
      // Charger les données de la parcelle
      loadParcelData();
    }
  }, [open, parcelId]);

  // Pré-remplir avec le profil utilisateur
  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        requesterName: profile.full_name || '',
        requesterEmail: profile.email || ''
      }));
    }
  }, [profile]);

  // Validation du numéro de référence et récupération des données de l'hypothèque
  const validateMortgageReference = async (refNumber: string) => {
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
        .in('mortgage_status', ['active', 'Active', 'En cours'])
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setReferenceValid(true);
        setReferenceError(null);
        setMortgageData(data);
        // Pré-remplir le montant de règlement avec le montant de l'hypothèque
        setFormData(prev => ({
          ...prev,
          settlementAmount: data.mortgage_amount_usd?.toString() || ''
        }));
      } else {
        setReferenceValid(false);
        setMortgageData(null);
        setReferenceError('Ce numéro de référence n\'est pas valide ou ne correspond pas à une hypothèque active sur cette parcelle.');
      }
    } catch (error) {
      console.error('Error validating reference:', error);
      setReferenceValid(false);
      setMortgageData(null);
      setReferenceError('Erreur lors de la vérification. Veuillez réessayer.');
    } finally {
      setValidatingReference(false);
    }
  };

  // Debounce validation
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
  }, [formData.mortgageReferenceNumber, parcelId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newFiles = Array.from(files);
    const validFiles = newFiles.filter(file => {
      const isValid = file.type.startsWith('image/') || file.type === 'application/pdf';
      const isValidSize = file.size <= 10 * 1024 * 1024;
      if (!isValid) toast.error(`${file.name}: Format non supporté`);
      if (!isValidSize) toast.error(`${file.name}: Fichier trop volumineux (max 10MB)`);
      return isValid && isValidSize;
    });
    
    setFormData(prev => ({
      ...prev,
      supportingDocuments: [...prev.supportingDocuments, ...validFiles]
    }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      supportingDocuments: prev.supportingDocuments.filter((_, i) => i !== index)
    }));
  };

  const handleFeeToggle = (feeId: string, isMandatory: boolean) => {
    if (isMandatory) return;
    setSelectedFees(prev => 
      prev.includes(feeId) 
        ? prev.filter(id => id !== feeId)
        : [...prev, feeId]
    );
  };

  const selectedFeesDetails = useMemo(() => {
    return CANCELLATION_FEES.filter(f => selectedFees.includes(f.id));
  }, [selectedFees]);

  const totalAmount = useMemo(() => {
    return selectedFeesDetails.reduce((sum, fee) => sum + fee.amount_usd, 0);
  }, [selectedFeesDetails]);

  // Keep backward-compatible function names for inline usage
  const getSelectedFeesDetails = () => selectedFeesDetails;
  const getTotalAmount = () => totalAmount;

  const validateForm = (): boolean => {
    if (!formData.mortgageReferenceNumber.trim()) {
      toast.error('Veuillez indiquer le numéro de référence de l\'hypothèque');
      return false;
    }
    if (!referenceValid) {
      toast.error('Le numéro de référence de l\'hypothèque n\'est pas valide');
      return false;
    }
    if (!formData.requesterName.trim()) {
      toast.error('Veuillez indiquer votre nom');
      return false;
    }
    if (!formData.requesterQuality) {
      toast.error('Veuillez indiquer votre qualité');
      return false;
    }
    if (!formData.cancellationDate) {
      toast.error('Veuillez indiquer la date de radiation souhaitée');
      return false;
    }
    if (formData.supportingDocuments.length === 0) {
      toast.error('Veuillez joindre au moins un document justificatif');
      return false;
    }
    if (!formData.creditorAccord) {
      toast.error('Vous devez confirmer avoir l\'accord du créancier');
      return false;
    }
    return true;
  };

  const handleGoToReview = () => {
    if (!validateForm()) return;
    setStep('review');
  };

  const handleGoToPayment = () => {
    setStep('payment');
  };

  const uploadDocuments = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of formData.supportingDocuments) {
      const fileExt = file.name.split('.').pop();
      const fileName = `cancellation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `mortgage-cancellation/${user?.id}/${fileName}`;
      
      const { error } = await supabase.storage
        .from('cadastral-documents')
        .upload(filePath, file);
      
      if (!error) {
        const { data } = supabase.storage.from('cadastral-documents').getPublicUrl(filePath);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  };

  const processPayment = async (): Promise<boolean> => {
    setProcessingPayment(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (paymentMethod === 'mobile_money' && (!paymentProvider || !paymentPhone)) {
        toast.error('Veuillez renseigner tous les champs de paiement');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Erreur lors du paiement');
      return false;
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Vous devez être connecté pour soumettre cette demande');
      return;
    }

    const paymentSuccess = await processPayment();
    if (!paymentSuccess) return;

    setLoading(true);
    try {
      const documentUrls = await uploadDocuments();

      const { error } = await supabase
        .from('cadastral_contributions')
        .insert({
          parcel_number: parcelNumber,
          original_parcel_id: parcelId,
          user_id: user.id,
          contribution_type: 'mortgage_cancellation',
          status: 'pending',
          change_justification: formData.comments || `Demande de radiation d'hypothèque - ${CANCELLATION_REASONS.find(r => r.value === formData.reason)?.label}`,
          mortgage_history: [{
            type: 'cancellation_request',
            request_reference_number: requestReferenceNumber,
            mortgage_reference_number: formData.mortgageReferenceNumber.toUpperCase(),
            mortgage_data: mortgageData,
            parcel_data: parcelData,
            cancellation_reason: formData.reason,
            cancellation_date: formData.cancellationDate,
            settlement_amount: formData.settlementAmount ? parseFloat(formData.settlementAmount) : null,
            requester_name: formData.requesterName,
            requester_phone: formData.requesterPhone,
            requester_email: formData.requesterEmail,
            requester_id_number: formData.requesterIdNumber,
            requester_quality: formData.requesterQuality,
            creditor_accord: formData.creditorAccord,
            supporting_documents: documentUrls,
            fees_paid: getSelectedFeesDetails(),
            total_amount_paid: getTotalAmount(),
            payment_method: paymentMethod,
            payment_provider: paymentProvider,
            submitted_at: new Date().toISOString()
          }] as any
        });

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Demande de radiation soumise',
        message: `Votre demande de radiation d'hypothèque (${requestReferenceNumber}) pour la parcelle ${parcelNumber} a été soumise. Un certificat de radiation sera délivré après validation.`,
        type: 'success',
        action_url: '/user-dashboard'
      });

      setStep('confirmation');
      toast.success('Demande de radiation soumise avec succès');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Erreur lors de la soumission');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setReferenceValid(null);
    setReferenceError(null);
    setMortgageData(null);
    setParcelData(null);
    setFormData({
      mortgageReferenceNumber: '',
      reason: 'remboursement_integral',
      cancellationDate: new Date().toISOString().split('T')[0],
      settlementAmount: '',
      requesterName: profile?.full_name || '',
      requesterPhone: '',
      requesterEmail: profile?.email || '',
      requesterIdNumber: '',
      requesterQuality: 'proprietaire',
      creditorAccord: false,
      supportingDocuments: [],
      comments: ''
    });
    setPaymentMethod('mobile_money');
    setPaymentProvider('');
    setPaymentPhone('');
    onOpenChange(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
    } catch {
      return dateString;
    }
  };

  // Render Form Step
  const renderFormStep = () => (
    <div className="space-y-4">
      {/* En-tête */}
      <Card className="rounded-2xl border-red-200 dark:border-red-800 bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <FileX2 className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-200">Demande de Radiation d'Hypothèque</h3>
              <p className="text-xs text-red-600 dark:text-red-400">Réf: {requestReferenceNumber}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Données de la parcelle (pré-remplies) */}
      {loadingData ? (
        <Card className="rounded-2xl">
          <CardContent className="p-4 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="ml-2 text-sm">Chargement des données...</span>
          </CardContent>
        </Card>
      ) : parcelData && (
        <Card className="rounded-2xl shadow-md border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              <Label className="text-sm font-semibold text-blue-700 dark:text-blue-300">Données de la parcelle</Label>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground">N° Parcelle</span>
                <p className="font-medium">{parcelData.parcel_number}</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">Propriétaire</span>
                <p className="font-medium">{parcelData.current_owner_name}</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">Localisation</span>
                <p className="font-medium">{[parcelData.quartier, parcelData.commune, parcelData.ville].filter(Boolean).join(', ')}</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">N° Titre foncier</span>
                <p className="font-medium">{parcelData.title_reference_number || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Numéro de référence de l'hypothèque */}
      <Card className="rounded-2xl shadow-md border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">Numéro de référence de l'hypothèque *</Label>
          </div>
          
          <div className="space-y-2">
            <div className="relative">
              <Input
                value={formData.mortgageReferenceNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, mortgageReferenceNumber: e.target.value.toUpperCase() }))}
                placeholder="Ex: HYP-202501-A1B2C"
                className={`h-11 text-sm rounded-xl border-2 font-mono uppercase transition-all ${
                  referenceValid === false 
                    ? 'border-red-500 animate-pulse bg-red-50 dark:bg-red-950/30' 
                    : referenceValid === true 
                    ? 'border-green-500 bg-green-50 dark:bg-green-950/30' 
                    : ''
                }`}
              />
              {validatingReference && (
                <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin text-primary" />
              )}
              {referenceValid === true && !validatingReference && (
                <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-green-600" />
              )}
            </div>

            {referenceError && (
              <Alert className="bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800 rounded-xl">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-xs text-red-700 dark:text-red-300">
                  <p className="font-medium">{referenceError}</p>
                  <p className="mt-1.5 text-red-600 dark:text-red-400">
                    <strong>Comment obtenir ce numéro ?</strong> Le numéro de référence de l'hypothèque (format: HYP-XXXXXX-XXXXX) 
                    est affiché dans le résultat cadastral, onglet "Obligations" → "Hypothèques actives". 
                    Vous devez d'abord accéder au résultat cadastral pour obtenir cette information.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {referenceValid === true && mortgageData && (
              <Alert className="bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800 rounded-xl">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-xs text-green-700 dark:text-green-300">
                  <p className="font-medium mb-2">Hypothèque identifiée et validée</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Créancier:</span>
                      <p className="font-medium">{mortgageData.creditor_name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Montant:</span>
                      <p className="font-medium">{formatCurrency(mortgageData.mortgage_amount_usd)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date contrat:</span>
                      <p className="font-medium">{formatDate(mortgageData.contract_date)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Durée:</span>
                      <p className="font-medium">{mortgageData.duration_months} mois</p>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>
              Chaque hypothèque active possède un numéro de référence unique qui permet de l'identifier dans notre base de données. 
              Pour l'obtenir, fermez ce formulaire, puis cliquez sur le bouton "Données". Ensuite, dans le catalogue de services, 
              sélectionnez uniquement le service "Obligations fiscales et Hypothèque", puis procédez au paiement pour accéder au résultat cadastral. 
              Le numéro de référence est disponible dans le résultat cadastral (onglet Obligations → Hypothèques). 
              Une fois que vous l'avez obtenu, revenez sur ce formulaire, ajoutez-le et finalisez votre demande de radiation.
            </span>
          </p>
        </CardContent>
      </Card>

      {/* Motif de la radiation */}
      <Card className="rounded-2xl shadow-md border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">Motif de la radiation *</Label>
          </div>
          
          <Select
            value={formData.reason}
            onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
          >
            <SelectTrigger className="h-11 text-sm rounded-xl border-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-popover z-[1200]">
              {CANCELLATION_REASONS.map(reason => (
                <SelectItem key={reason.value} value={reason.value} className="rounded-lg">
                  <div>
                    <div className="font-medium">{reason.label}</div>
                    <div className="text-xs text-muted-foreground">{reason.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Informations du demandeur */}
      <Card className="rounded-2xl shadow-md border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">Informations du demandeur</Label>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Qualité du demandeur *</Label>
              <Select
                value={formData.requesterQuality}
                onValueChange={(value) => setFormData(prev => ({ ...prev, requesterQuality: value }))}
              >
                <SelectTrigger className="h-10 text-sm rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-popover z-[1200]">
                  {REQUESTER_QUALITIES.map(q => (
                    <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs">Nom complet *</Label>
              <Input
                value={formData.requesterName}
                onChange={(e) => setFormData(prev => ({ ...prev, requesterName: e.target.value }))}
                placeholder="Votre nom complet"
                className="h-10 text-sm rounded-xl"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">N° Pièce d'identité</Label>
                <Input
                  value={formData.requesterIdNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, requesterIdNumber: e.target.value }))}
                  placeholder="CNI, Passeport..."
                  className="h-10 text-sm rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Téléphone</Label>
                <Input
                  value={formData.requesterPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, requesterPhone: e.target.value }))}
                  placeholder="+243..."
                  className="h-10 text-sm rounded-xl"
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={formData.requesterEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, requesterEmail: e.target.value }))}
                placeholder="email@exemple.com"
                className="h-10 text-sm rounded-xl"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informations complémentaires */}
      <Card className="rounded-2xl shadow-md border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">Informations complémentaires</Label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Date souhaitée de radiation *</Label>
              <Input
                type="date"
                value={formData.cancellationDate}
                onChange={(e) => setFormData(prev => ({ ...prev, cancellationDate: e.target.value }))}
                className="h-10 text-sm rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Montant de règlement (USD)</Label>
              <Input
                type="number"
                value={formData.settlementAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, settlementAmount: e.target.value }))}
                placeholder="Montant final payé"
                className="h-10 text-sm rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Commentaires additionnels</Label>
            <Textarea
              value={formData.comments}
              onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
              placeholder="Informations supplémentaires..."
              className="text-sm rounded-xl resize-none"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Documents justificatifs */}
      <Card className="rounded-2xl shadow-md border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">Documents justificatifs *</Label>
          </div>
          
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 rounded-xl">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Documents requis en RDC:</strong>
              <ul className="mt-1 list-disc list-inside space-y-0.5">
                <li>Attestation de remboursement du créancier</li>
                <li>Mainlevée signée par le créancier</li>
                <li>Copie de la pièce d'identité du demandeur</li>
                <li>Copie du certificat d'enregistrement</li>
              </ul>
            </AlertDescription>
          </Alert>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            multiple
            onChange={handleFileChange}
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
          
          {formData.supportingDocuments.length > 0 && (
            <div className="space-y-2">
              {formData.supportingDocuments.map((file, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-xl">
                  {file.type.startsWith('image/') ? (
                    <Image className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  ) : (
                    <FileText className="h-4 w-4 text-red-600 flex-shrink-0" />
                  )}
                  <span className="flex-1 text-xs truncate">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                    className="h-6 w-6 rounded-lg hover:bg-destructive/10"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accord du créancier */}
      <Card className="rounded-2xl shadow-md border-amber-200 dark:border-amber-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="creditorAccord"
              checked={formData.creditorAccord}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, creditorAccord: checked as boolean }))}
              className="mt-0.5"
            />
            <label htmlFor="creditorAccord" className="text-xs cursor-pointer">
              <span className="font-medium text-amber-700 dark:text-amber-300">Je certifie disposer de l'accord du créancier *</span>
              <p className="mt-1 text-muted-foreground">
                Je confirme que le créancier (banque, institution financière ou particulier) a donné son accord 
                pour la radiation de l'hypothèque, conformément à l'article 229 du Code foncier de la RDC.
              </p>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Frais de radiation */}
      <Card className="rounded-2xl shadow-md border-amber-200 dark:border-amber-800">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-amber-600" />
            <Label className="text-sm font-semibold text-amber-700 dark:text-amber-300">Frais de radiation (RDC)</Label>
          </div>

          <div className="space-y-2">
            {CANCELLATION_FEES.map((fee) => (
              <div 
                key={fee.id}
                className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
                  selectedFees.includes(fee.id) 
                    ? 'bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-700' 
                    : 'bg-muted/30 border-2 border-transparent'
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
                      {fee.name}
                      {fee.is_mandatory && (
                        <span className="ml-1.5 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">
                          obligatoire
                        </span>
                      )}
                    </label>
                    <span className="text-sm font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                      ${fee.amount_usd}
                    </span>
                  </div>
                  {fee.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{fee.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-amber-200 dark:border-amber-700">
            <span className="text-sm font-semibold">Total à payer</span>
            <span className="text-lg font-bold text-amber-700 dark:text-amber-400">
              {formatCurrency(getTotalAmount())}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Boutons d'action */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={handleClose}
          className="flex-1 h-11 rounded-xl"
        >
          Annuler
        </Button>
        <Button
          onClick={handleGoToReview}
          disabled={!referenceValid}
          className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700"
        >
          Continuer
        </Button>
      </div>
    </div>
  );

  // Render Review Step
  const renderReviewStep = () => (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setStep('form')}
        className="flex items-center gap-1 text-xs mb-2"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Modifier
      </Button>

      <Card className="rounded-2xl border-red-200 dark:border-red-800 bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <FileCheck className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-200">Révision de la demande</h3>
              <p className="text-xs text-red-600 dark:text-red-400">Réf: {requestReferenceNumber}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Récapitulatif parcelle */}
      {parcelData && (
        <Card className="rounded-2xl">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MapPin className="h-4 w-4 text-primary" />
              Parcelle concernée
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">N° Parcelle:</span>
                <p className="font-medium">{parcelData.parcel_number}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Propriétaire:</span>
                <p className="font-medium">{parcelData.current_owner_name}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Récapitulatif hypothèque */}
      {mortgageData && (
        <Card className="rounded-2xl">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Building className="h-4 w-4 text-primary" />
              Hypothèque à radier
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Référence:</span>
                <p className="font-medium font-mono">{mortgageData.reference_number}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Créancier:</span>
                <p className="font-medium">{mortgageData.creditor_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Montant initial:</span>
                <p className="font-medium">{formatCurrency(mortgageData.mortgage_amount_usd)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Date contrat:</span>
                <p className="font-medium">{formatDate(mortgageData.contract_date)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Récapitulatif demandeur */}
      <Card className="rounded-2xl">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <User className="h-4 w-4 text-primary" />
            Demandeur
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Nom:</span>
              <p className="font-medium">{formData.requesterName}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Qualité:</span>
              <p className="font-medium">{REQUESTER_QUALITIES.find(q => q.value === formData.requesterQuality)?.label}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Téléphone:</span>
              <p className="font-medium">{formData.requesterPhone || 'N/A'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Email:</span>
              <p className="font-medium">{formData.requesterEmail || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Récapitulatif motif */}
      <Card className="rounded-2xl">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4 text-primary" />
            Motif de radiation
          </div>
          <p className="text-sm">{CANCELLATION_REASONS.find(r => r.value === formData.reason)?.label}</p>
          {formData.settlementAmount && (
            <p className="text-xs text-muted-foreground">Montant de règlement: {formatCurrency(parseFloat(formData.settlementAmount))}</p>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      <Card className="rounded-2xl">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Upload className="h-4 w-4 text-primary" />
            Documents joints ({formData.supportingDocuments.length})
          </div>
          <div className="space-y-1">
            {formData.supportingDocuments.map((file, index) => (
              <p key={index} className="text-xs text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {file.name}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Frais */}
      <Card className="rounded-2xl border-amber-200 dark:border-amber-800">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
            <DollarSign className="h-4 w-4" />
            Frais à payer
          </div>
          <div className="space-y-1">
            {getSelectedFeesDetails().map(fee => (
              <div key={fee.id} className="flex justify-between text-xs">
                <span>{fee.name}</span>
                <span className="font-medium">{formatCurrency(fee.amount_usd)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between pt-2 border-t border-amber-200 dark:border-amber-700">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-amber-700 dark:text-amber-400">{formatCurrency(getTotalAmount())}</span>
          </div>
        </CardContent>
      </Card>

      {/* Boutons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setStep('form')}
          className="flex-1 h-11 rounded-xl"
        >
          Modifier
        </Button>
        <Button
          onClick={handleGoToPayment}
          className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700"
        >
          Procéder au paiement
        </Button>
      </div>
    </div>
  );

  // Render Payment Step
  const renderPaymentStep = () => (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setStep('review')}
        className="flex items-center gap-1 text-xs mb-2"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Retour
      </Button>

      <Card className="rounded-2xl border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="h-6 w-6 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-800 dark:text-green-200">Paiement des frais</h3>
                <p className="text-xs text-green-600 dark:text-green-400">Réf: {requestReferenceNumber}</p>
              </div>
            </div>
            <span className="text-xl font-bold text-green-700 dark:text-green-400">
              {formatCurrency(getTotalAmount())}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Mode de paiement */}
      <Card className="rounded-2xl">
        <CardContent className="p-4 space-y-4">
          <Label className="text-sm font-semibold">Mode de paiement</Label>
          
          <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
            <div className="flex items-center space-x-3 p-3 rounded-xl border-2 hover:border-primary cursor-pointer">
              <RadioGroupItem value="mobile_money" id="mobile_money" />
              <label htmlFor="mobile_money" className="flex items-center gap-2 cursor-pointer flex-1">
                <Phone className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Mobile Money</p>
                  <p className="text-xs text-muted-foreground">M-Pesa, Airtel Money, Orange Money</p>
                </div>
              </label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-xl border-2 hover:border-primary cursor-pointer">
              <RadioGroupItem value="bank_card" id="bank_card" />
              <label htmlFor="bank_card" className="flex items-center gap-2 cursor-pointer flex-1">
                <CreditCard className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Carte bancaire</p>
                  <p className="text-xs text-muted-foreground">Visa, Mastercard</p>
                </div>
              </label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {paymentMethod === 'mobile_money' && (
        <Card className="rounded-2xl">
          <CardContent className="p-4 space-y-4">
            <Label className="text-sm font-semibold">Opérateur</Label>
            <Select value={paymentProvider} onValueChange={setPaymentProvider}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Sélectionnez un opérateur" />
              </SelectTrigger>
              <SelectContent className="rounded-xl bg-popover z-[1200]">
                <SelectItem value="mpesa">M-Pesa (Vodacom)</SelectItem>
                <SelectItem value="airtel">Airtel Money</SelectItem>
                <SelectItem value="orange">Orange Money</SelectItem>
              </SelectContent>
            </Select>

            <div className="space-y-1.5">
              <Label className="text-xs">Numéro de téléphone</Label>
              <Input
                value={paymentPhone}
                onChange={(e) => setPaymentPhone(e.target.value)}
                placeholder="+243..."
                className="h-10 rounded-xl"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bouton de paiement */}
      <Button
        onClick={handleSubmit}
        disabled={loading || processingPayment}
        className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700"
      >
        {(loading || processingPayment) ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Traitement en cours...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Payer {formatCurrency(getTotalAmount())} et soumettre
          </>
        )}
      </Button>
    </div>
  );

  // Render Confirmation Step
  const renderConfirmationStep = () => (
    <div className="space-y-4 text-center">
      <div className="flex justify-center">
        <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-green-700 dark:text-green-300">Demande soumise avec succès!</h3>
        <p className="text-sm text-muted-foreground mt-1">Votre demande de radiation d'hypothèque a été enregistrée.</p>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-4 space-y-2 text-left">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Référence demande</span>
            <span className="font-mono font-medium">{requestReferenceNumber}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Référence hypothèque</span>
            <span className="font-mono font-medium">{formData.mortgageReferenceNumber}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Parcelle</span>
            <span className="font-medium">{parcelNumber}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Montant payé</span>
            <span className="font-medium text-green-600">{formatCurrency(getTotalAmount())}</span>
          </div>
        </CardContent>
      </Card>

      <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 rounded-xl text-left">
        <Award className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-xs text-blue-700 dark:text-blue-300">
          <strong>Prochaines étapes:</strong>
          <ol className="mt-1.5 list-decimal list-inside space-y-1">
            <li>Votre demande sera examinée par un officier hypothécaire</li>
            <li>Vous recevrez une notification de suivi</li>
            <li>Le certificat de radiation sera délivré après validation</li>
          </ol>
        </AlertDescription>
      </Alert>

      <Button onClick={handleClose} className="w-full h-11 rounded-xl">
        Fermer
      </Button>
    </div>
  );

  if (embedded) {
    return (
      <div className="overflow-y-auto h-full px-4 pb-4">
        {step === 'form' && renderFormStep()}
        {step === 'review' && renderReviewStep()}
        {step === 'payment' && renderPaymentStep()}
        {step === 'confirmation' && renderConfirmationStep()}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={`z-[1200] ${isMobile ? 'w-[92vw] max-w-[380px] max-h-[88vh]' : 'max-w-lg max-h-[85vh]'} rounded-2xl p-0 overflow-hidden`}>
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <div className="p-1.5 bg-red-500/10 rounded-lg">
                <FileX2 className="h-4 w-4 text-red-600" />
              </div>
              Radiation d'hypothèque
            </DialogTitle>
            <DialogDescription className="text-xs">
              Parcelle {parcelNumber}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className={`${isMobile ? 'h-[calc(88vh-80px)]' : 'max-h-[calc(85vh-80px)]'} px-4 pb-4`}>
            {step === 'form' && renderFormStep()}
            {step === 'review' && renderReviewStep()}
            {step === 'payment' && renderPaymentStep()}
            {step === 'confirmation' && renderConfirmationStep()}
          </ScrollArea>
        </DialogContent>
      {open && <WhatsAppFloatingButton message="Bonjour, j'ai besoin d'aide avec la radiation d'hypothèque." />}
    </Dialog>
  );
};

export default MortgageCancellationDialog;
