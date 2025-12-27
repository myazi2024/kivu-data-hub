import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, FileX2, CheckCircle2, Upload, X, Plus, Info, ArrowLeft, FileText, AlertTriangle, Landmark, Calendar, DollarSign, Clock, Award, CreditCard, Phone, HelpCircle, Hash, Image } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MortgageCancellationDialogProps {
  parcelNumber: string;
  parcelId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'form' | 'review' | 'payment' | 'confirmation';

interface CancellationFee {
  id: string;
  name: string;
  amount_usd: number;
  is_mandatory: boolean;
  description?: string;
}

interface CancellationRequest {
  mortgageReferenceNumber: string;
  reason: string;
  cancellationDate: string;
  settlementAmount: string;
  requesterName: string;
  requesterPhone: string;
  requesterEmail: string;
  supportingDocuments: File[];
  comments: string;
}

const CANCELLATION_FEES: CancellationFee[] = [
  { id: 'dossier', name: 'Frais de dossier', amount_usd: 50, is_mandatory: true, description: 'Frais administratifs de traitement' },
  { id: 'radiation', name: 'Frais de radiation', amount_usd: 75, is_mandatory: true, description: 'Frais de radiation au registre foncier' },
  { id: 'certificat', name: 'Certificat de radiation', amount_usd: 25, is_mandatory: true, description: 'Délivrance du certificat officiel' },
  { id: 'verification', name: 'Frais de vérification', amount_usd: 15, is_mandatory: false, description: 'Vérification complémentaire des documents' }
];

const MortgageCancellationDialog: React.FC<MortgageCancellationDialogProps> = ({
  parcelNumber,
  parcelId,
  open,
  onOpenChange
}) => {
  const isMobile = useIsMobile();
  const { user, profile } = useAuth();
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [validatingReference, setValidatingReference] = useState(false);
  const [referenceValid, setReferenceValid] = useState<boolean | null>(null);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [requestReferenceNumber, setRequestReferenceNumber] = useState('');
  const [selectedFees, setSelectedFees] = useState<string[]>([]);
  
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
    supportingDocuments: [],
    comments: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const CANCELLATION_REASONS = [
    { value: 'remboursement_integral', label: 'Remboursement intégral du prêt' },
    { value: 'refinancement', label: 'Refinancement auprès d\'un autre créancier' },
    { value: 'accord_amiable', label: 'Accord amiable avec le créancier' },
    { value: 'prescription', label: 'Prescription de la dette' },
    { value: 'autre', label: 'Autre motif' }
  ];

  // Générer le numéro de référence de la demande
  useEffect(() => {
    if (open) {
      const ref = `RAD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      setRequestReferenceNumber(ref);
      
      // Initialiser les frais obligatoires
      const mandatoryFeeIds = CANCELLATION_FEES.filter(f => f.is_mandatory).map(f => f.id);
      setSelectedFees(mandatoryFeeIds);
    }
  }, [open]);

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

  // Validation du numéro de référence de l'hypothèque
  const validateMortgageReference = async (refNumber: string) => {
    if (!refNumber.trim()) {
      setReferenceValid(null);
      setReferenceError(null);
      return;
    }

    setValidatingReference(true);
    setReferenceError(null);

    try {
      // Vérifier si le numéro de référence existe dans cadastral_mortgages pour cette parcelle
      const { data, error } = await supabase
        .from('cadastral_mortgages')
        .select('id, reference_number, mortgage_status, creditor_name, mortgage_amount_usd')
        .eq('parcel_id', parcelId)
        .eq('reference_number', refNumber.trim().toUpperCase())
        .in('mortgage_status', ['active', 'Active', 'En cours'])
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setReferenceValid(true);
        setReferenceError(null);
      } else {
        setReferenceValid(false);
        setReferenceError('Ce numéro de référence n\'est pas valide ou ne correspond pas à une hypothèque active sur cette parcelle.');
      }
    } catch (error) {
      console.error('Error validating reference:', error);
      setReferenceValid(false);
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

  const getSelectedFeesDetails = () => {
    return CANCELLATION_FEES.filter(f => selectedFees.includes(f.id));
  };

  const getTotalAmount = () => {
    return getSelectedFeesDetails().reduce((sum, fee) => sum + fee.amount_usd, 0);
  };

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
    if (!formData.cancellationDate) {
      toast.error('Veuillez indiquer la date de radiation');
      return false;
    }
    if (formData.supportingDocuments.length === 0) {
      toast.error('Veuillez joindre au moins un document justificatif');
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
    // Simulation du paiement - en production, intégrer avec le système de paiement réel
    setProcessingPayment(true);
    
    try {
      // Simuler un délai de traitement
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

    // Traiter le paiement d'abord
    const paymentSuccess = await processPayment();
    if (!paymentSuccess) return;

    setLoading(true);
    try {
      // Upload des documents
      const documentUrls = await uploadDocuments();

      // Créer la demande de radiation via une contribution
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
            cancellation_reason: formData.reason,
            cancellation_date: formData.cancellationDate,
            settlement_amount: formData.settlementAmount ? parseFloat(formData.settlementAmount) : null,
            requester_name: formData.requesterName,
            requester_phone: formData.requesterPhone,
            requester_email: formData.requesterEmail,
            supporting_documents: documentUrls,
            fees_paid: getSelectedFeesDetails(),
            total_amount_paid: getTotalAmount(),
            payment_method: paymentMethod,
            payment_provider: paymentProvider,
            submitted_at: new Date().toISOString()
          }] as any
        });

      if (error) throw error;

      // Créer une notification
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
    setFormData({
      mortgageReferenceNumber: '',
      reason: 'remboursement_integral',
      cancellationDate: new Date().toISOString().split('T')[0],
      settlementAmount: '',
      requesterName: profile?.full_name || '',
      requesterPhone: '',
      requesterEmail: profile?.email || '',
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
                    est affiché dans le résultat cadastral, onglet "Obligations" → "Hypothèques". 
                    Vous devez d'abord accéder au résultat cadastral pour obtenir cette information.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {referenceValid === true && (
              <Alert className="bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800 rounded-xl">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-xs text-green-700 dark:text-green-300">
                  Numéro de référence validé. Cette hypothèque est active sur cette parcelle.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>Le numéro de référence est disponible dans le résultat cadastral (onglet Obligations → Hypothèques).</span>
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
            <SelectContent className="rounded-xl bg-popover">
              {CANCELLATION_REASONS.map(reason => (
                <SelectItem key={reason.value} value={reason.value}>
                  {reason.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Documents justificatifs */}
      <Card className="rounded-2xl shadow-md border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">Documents justificatifs *</Label>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Joignez l'attestation de remboursement, mainlevée du créancier, ou tout autre document justifiant la radiation.
          </p>
          
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

      {/* Informations du demandeur */}
      <Card className="rounded-2xl shadow-md border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">Informations du demandeur</Label>
          </div>

          <div className="grid grid-cols-1 gap-3">
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
                <Label className="text-xs">Téléphone</Label>
                <Input
                  value={formData.requesterPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, requesterPhone: e.target.value }))}
                  placeholder="+243..."
                  className="h-10 text-sm rounded-xl"
                />
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
              <Label className="text-xs">Date souhaitée de radiation</Label>
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

  const renderReviewStep = () => (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center gap-2 mb-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setStep('form')}
          className="h-8 w-8 rounded-xl"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h3 className="font-semibold">Révision de la demande</h3>
          <p className="text-xs text-muted-foreground">Vérifiez les informations avant de procéder au paiement</p>
        </div>
      </div>

      {/* Récapitulatif */}
      <Card className="rounded-2xl shadow-md border-border/50">
        <CardContent className="p-4 space-y-4">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <FileX2 className="h-4 w-4 text-red-600" />
            Demande de radiation
          </h4>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-muted">
              <span className="text-muted-foreground">N° de référence demande</span>
              <span className="font-mono font-medium">{requestReferenceNumber}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-muted">
              <span className="text-muted-foreground">Parcelle</span>
              <span className="font-mono">{parcelNumber}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-muted">
              <span className="text-muted-foreground">Réf. hypothèque</span>
              <span className="font-mono">{formData.mortgageReferenceNumber}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-muted">
              <span className="text-muted-foreground">Motif</span>
              <span>{CANCELLATION_REASONS.find(r => r.value === formData.reason)?.label}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-muted">
              <span className="text-muted-foreground">Demandeur</span>
              <span>{formData.requesterName}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-muted">
              <span className="text-muted-foreground">Documents joints</span>
              <span>{formData.supportingDocuments.length} fichier(s)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Frais */}
      <Card className="rounded-2xl shadow-md border-amber-200 dark:border-amber-800">
        <CardContent className="p-4 space-y-3">
          <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Frais à payer
          </h4>

          <div className="space-y-2">
            {getSelectedFeesDetails().map((fee) => (
              <div key={fee.id} className="flex justify-between text-sm py-1.5">
                <span className="text-muted-foreground">{fee.name}</span>
                <span className="font-medium">${fee.amount_usd}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-amber-200 dark:border-amber-700">
            <span className="font-semibold">Total</span>
            <span className="text-xl font-bold text-amber-700 dark:text-amber-400">
              {formatCurrency(getTotalAmount())}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Boutons d'action */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setStep('form')}
          className="flex-1 h-11 rounded-xl"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Modifier
        </Button>
        <Button
          onClick={handleGoToPayment}
          className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700"
        >
          Payer {formatCurrency(getTotalAmount())}
        </Button>
      </div>
    </div>
  );

  const renderPaymentStep = () => (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center gap-2 mb-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setStep('review')}
          className="h-8 w-8 rounded-xl"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h3 className="font-semibold">Paiement</h3>
          <p className="text-xs text-muted-foreground">Choisissez votre mode de paiement</p>
        </div>
      </div>

      {/* Montant */}
      <Card className="rounded-2xl border-primary/30 bg-primary/5">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">Montant à payer</p>
          <p className="text-3xl font-bold text-primary">{formatCurrency(getTotalAmount())}</p>
        </CardContent>
      </Card>

      {/* Mode de paiement */}
      <Card className="rounded-2xl shadow-md">
        <CardContent className="p-4 space-y-4">
          <Label className="text-sm font-semibold">Mode de paiement</Label>
          
          <RadioGroup 
            value={paymentMethod} 
            onValueChange={(value) => setPaymentMethod(value as 'mobile_money' | 'bank_card')}
            className="space-y-2"
          >
            <div className={`flex items-center space-x-3 p-3 rounded-xl border-2 transition-colors ${
              paymentMethod === 'mobile_money' ? 'border-primary bg-primary/5' : 'border-muted'
            }`}>
              <RadioGroupItem value="mobile_money" id="mobile_money" />
              <Label htmlFor="mobile_money" className="flex-1 cursor-pointer flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Mobile Money
              </Label>
            </div>
            <div className={`flex items-center space-x-3 p-3 rounded-xl border-2 transition-colors ${
              paymentMethod === 'bank_card' ? 'border-primary bg-primary/5' : 'border-muted'
            }`}>
              <RadioGroupItem value="bank_card" id="bank_card" />
              <Label htmlFor="bank_card" className="flex-1 cursor-pointer flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Carte bancaire
              </Label>
            </div>
          </RadioGroup>

          {paymentMethod === 'mobile_money' && (
            <div className="space-y-3 pt-3 border-t">
              <div className="space-y-1.5">
                <Label className="text-xs">Opérateur</Label>
                <Select value={paymentProvider} onValueChange={setPaymentProvider}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Choisir un opérateur" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="mpesa">M-Pesa</SelectItem>
                    <SelectItem value="airtel_money">Airtel Money</SelectItem>
                    <SelectItem value="orange_money">Orange Money</SelectItem>
                    <SelectItem value="afrimoney">Afrimoney</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs">Numéro de téléphone</Label>
                <Input
                  value={paymentPhone}
                  onChange={(e) => setPaymentPhone(e.target.value)}
                  placeholder="+243..."
                  className="h-10 rounded-xl"
                />
              </div>
            </div>
          )}

          {paymentMethod === 'bank_card' && (
            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 rounded-xl">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-xs text-blue-700 dark:text-blue-300">
                Vous serez redirigé vers une page de paiement sécurisée.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Bouton de paiement */}
      <Button
        onClick={handleSubmit}
        disabled={loading || processingPayment || (paymentMethod === 'mobile_money' && (!paymentProvider || !paymentPhone))}
        className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700"
      >
        {loading || processingPayment ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Traitement en cours...
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4 mr-2" />
            Payer et soumettre la demande
          </>
        )}
      </Button>
    </div>
  );

  const renderConfirmationStep = () => (
    <div className="space-y-6 text-center py-6">
      <div className="mx-auto h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
        <CheckCircle2 className="h-8 w-8 text-green-600" />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-green-700 dark:text-green-300">Demande soumise avec succès</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Votre demande de radiation d'hypothèque a été enregistrée et sera traitée dans les plus brefs délais.
        </p>
      </div>

      <Card className="rounded-2xl bg-muted/50">
        <CardContent className="p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Référence</span>
            <span className="font-mono font-medium">{requestReferenceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Parcelle</span>
            <span className="font-mono">{parcelNumber}</span>
          </div>
          <div className="flex justify-between">
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
            <li>Vous recevrez une notification pour le suivi</li>
            <li>Le certificat de radiation sera délivré après validation</li>
          </ol>
        </AlertDescription>
      </Alert>

      <Button
        onClick={handleClose}
        className="w-full h-11 rounded-xl"
      >
        Fermer
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isMobile ? 'max-w-[95vw] h-[90vh] p-0' : 'max-w-lg'} rounded-2xl`}>
        <DialogHeader className={`${isMobile ? 'p-4 pb-0' : ''}`}>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileX2 className="h-5 w-5 text-red-600" />
            Radiation d'hypothèque
          </DialogTitle>
          <DialogDescription className="text-xs">
            Parcelle {parcelNumber}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className={`${isMobile ? 'h-[calc(90vh-80px)] px-4 pb-4' : 'max-h-[70vh] px-6 pb-6'}`}>
          {step === 'form' && renderFormStep()}
          {step === 'review' && renderReviewStep()}
          {step === 'payment' && renderPaymentStep()}
          {step === 'confirmation' && renderConfirmationStep()}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default MortgageCancellationDialog;
