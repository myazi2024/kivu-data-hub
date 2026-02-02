import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPortal,
  DialogOverlay,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import PhoneNumberInput from '@/components/ui/phone-number-input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePaymentConfig } from '@/hooks/usePaymentConfig';
import { supabase } from '@/integrations/supabase/client';
import { Building2, CheckCircle2, AlertCircle, ArrowLeft, CalendarIcon, Clock, MapPin, CreditCard, Loader2, Smartphone, Shield } from 'lucide-react';
import { CartItem } from '@/hooks/useCart';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import FormIntroDialog, { FORM_INTRO_CONFIGS } from './FormIntroDialog';

interface BuildingPermitRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcelNumber: string;
  hasExistingConstruction?: boolean;
}

const BuildingPermitRequestDialog: React.FC<BuildingPermitRequestDialogProps> = ({
  open,
  onOpenChange,
  parcelNumber,
  hasExistingConstruction = false
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { paymentMode, availableMethods, isPaymentRequired } = usePaymentConfig();
  
  const [showIntro, setShowIntro] = useState(true);
  const [step, setStep] = useState<'form' | 'preview' | 'payment' | 'confirmation'>('form');
  const [requestType, setRequestType] = useState<'new' | 'regularization'>(
    hasExistingConstruction ? 'regularization' : 'new'
  );
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'bank_card'>('mobile_money');
  const [paymentProvider, setPaymentProvider] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [paymentPin, setPaymentPin] = useState('');
  const [availableProviders, setAvailableProviders] = useState<Array<{ value: string; label: string; prefix: string; color: string }>>([]);

  // Load payment providers
  useEffect(() => {
    const loadProviders = async () => {
      try {
        const { data, error } = await supabase
          .from('payment_methods_config')
          .select('*')
          .eq('config_type', 'mobile_money')
          .eq('is_enabled', true)
          .order('display_order', { ascending: true });

        if (error) throw error;

        const providerMap: Record<string, { prefix: string; color: string }> = {
          airtel_money: { prefix: '+243 97', color: 'from-red-500 to-red-600' },
          orange_money: { prefix: '+243 84', color: 'from-orange-500 to-orange-600' },
          mpesa: { prefix: '+243 99', color: 'from-green-500 to-green-600' },
        };

        const providers = data?.map((p) => ({
          value: p.provider_id,
          label: p.provider_name,
          prefix: providerMap[p.provider_id]?.prefix || '+243 XX',
          color: providerMap[p.provider_id]?.color || 'from-blue-500 to-blue-600',
        })) || [];

        setAvailableProviders(providers);
      } catch (e) {
        console.error('Error loading providers:', e);
        setAvailableProviders([
          { value: 'airtel_money', label: 'Airtel Money', prefix: '+243 97', color: 'from-red-500 to-red-600' },
          { value: 'orange_money', label: 'Orange Money', prefix: '+243 84', color: 'from-orange-500 to-orange-600' },
          { value: 'mpesa', label: 'M-Pesa', prefix: '+243 99', color: 'from-green-500 to-green-600' },
        ]);
      }
    };
    loadProviders();
  }, []);
  
  const [formData, setFormData] = useState({
    constructionType: '',
    constructionNature: '',
    declaredUsage: '',
    plannedArea: '',
    numberOfFloors: '1',
    estimatedCost: '',
    applicantName: '',
    applicantPhone: '',
    applicantEmail: '',
    applicantAddress: '',
    projectDescription: '',
    startDate: '',
    estimatedDuration: '',
    constructionDate: '',
    currentState: '',
    complianceIssues: '',
    regularizationReason: '',
    originalPermitNumber: ''
  });

  const handleInputChange = (field: string, value: string) => {
    if (field === 'constructionDate' && value) {
      const [year, month, day] = value.split('-').map(Number);
      const selectedDate = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate > today) {
        toast({
          title: "Date invalide",
          description: "L'année de construction ne peut pas être dans le futur",
          variant: "destructive"
        });
        return;
      }
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const requiresOriginalPermit = () => {
    const reasonsRequiringPermit = [
      'Modification non autorisée',
      'Extension ou agrandissement',
      'Changement d\'usage sans autorisation'
    ];
    return reasonsRequiringPermit.includes(formData.regularizationReason);
  };

  const isFormValid = () => {
    const baseFields = [
      formData.constructionType,
      formData.constructionNature,
      formData.declaredUsage,
      formData.plannedArea,
      formData.applicantName,
      formData.applicantPhone,
      formData.projectDescription
    ];

    if (requestType === 'regularization') {
      const regularizationFields = [
        formData.constructionDate,
        formData.currentState,
        formData.regularizationReason
      ];
      
      if (requiresOriginalPermit() && !formData.originalPermitNumber) {
        return false;
      }
      
      return baseFields.every(f => f) && regularizationFields.every(f => f);
    }

    return baseFields.every(f => f) && formData.startDate;
  };

  const handlePreview = () => {
    if (!isFormValid()) {
      toast({
        title: "Formulaire incomplet",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }
    setStep('preview');
  };

  const handleSubmitForm = () => {
    setStep('payment');
  };

  const pollTransaction = async (transactionId: string) => {
    let attempts = 0;
    const maxAttempts = 25;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const { data: transaction, error } = await supabase
        .from('payment_transactions')
        .select('status, transaction_reference')
        .eq('id', transactionId)
        .maybeSingle();

      if (error) throw error;
      if (transaction?.status === 'completed') return transaction;
      if (transaction?.status === 'failed') throw new Error('Le paiement a échoué');

      attempts++;
    }

    throw new Error('Délai de paiement dépassé. Veuillez réessayer.');
  };

  const handlePayment = async () => {
    if (!user) {
      toast({
        title: 'Authentification requise',
        description: 'Veuillez vous connecter pour effectuer un paiement.',
        variant: 'destructive',
      });
      return;
    }

    // Mode bypass (dev)
    if (!isPaymentRequired()) {
      setStep('confirmation');
      toast({
        title: "Demande enregistrée",
        description: "Votre demande de permis a été enregistrée avec succès",
      });
      return;
    }

    if (paymentMethod === 'mobile_money') {
      if (!paymentProvider || !paymentPhone || !paymentPin) {
        toast({
          title: 'Champs requis',
          description: 'Veuillez remplir tous les champs de paiement.',
          variant: 'destructive',
        });
        return;
      }

      try {
        setProcessingPayment(true);

        const { data: paymentResult, error: paymentError } = await supabase.functions.invoke(
          'process-mobile-money-payment',
          {
            body: {
              payment_provider: paymentProvider,
              phone_number: paymentPhone,
              amount_usd: servicePrice,
              payment_type: 'permit_request',
              test_mode: paymentMode.test_mode,
            },
          }
        );

        if (paymentError) throw paymentError;
        if (!paymentResult?.success) throw new Error(paymentResult?.error || 'Payment failed');

        await pollTransaction(paymentResult.transaction_id);

        toast({
          title: "Demande enregistrée",
          description: "Votre demande de permis a été enregistrée avec succès",
        });
        setStep('confirmation');
      } catch (err: any) {
        console.error('Payment error:', err);
        toast({
          title: 'Erreur de paiement',
          description: err?.message || "Une erreur s'est produite",
          variant: 'destructive',
        });
      } finally {
        setProcessingPayment(false);
      }
    } else {
      // Bank card payment
      toast({
        title: 'Carte bancaire',
        description: 'Le paiement par carte bancaire sera bientôt disponible.',
      });
    }
  };

  const handleClose = () => {
    setStep('form');
    setFormData({
      constructionType: '',
      constructionNature: '',
      declaredUsage: '',
      plannedArea: '',
      numberOfFloors: '1',
      estimatedCost: '',
      applicantName: '',
      applicantPhone: '',
      applicantEmail: '',
      applicantAddress: '',
      projectDescription: '',
      startDate: '',
      estimatedDuration: '',
      constructionDate: '',
      currentState: '',
      complianceIssues: '',
      regularizationReason: '',
      originalPermitNumber: ''
    });
    setPaymentProvider('');
    setPaymentPhone('');
    setPaymentPin('');
    setPaymentMethod('mobile_money');
    onOpenChange(false);
  };

  const servicePrice = requestType === 'new' ? 150 : 200;
  const cartItem: CartItem = {
    id: 'building-permit-request',
    title: requestType === 'new' ? 'Demande de permis' : 'Demande de permis de régularisation',
    price: servicePrice,
    description: `Parcelle: ${parcelNumber}`
  };

  const getStepTitle = () => {
    switch (step) {
      case 'preview':
        return 'Aperçu de la demande';
      case 'payment':
        return 'Paiement';
      case 'confirmation':
        return 'Confirmation';
      default:
        return requestType === 'new' ? 'Demande de permis' : 'Demande de régularisation';
    }
  };

  const renderFormStep = () => (
    <ScrollArea className="h-[65vh] sm:h-[70vh]">
      <div className="space-y-4 pr-2">
        {/* Informations parcelle */}
        <Card className="bg-muted/50 border-0 rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                Parcelle
              </div>
              <span className="font-mono font-bold text-sm">{parcelNumber}</span>
            </div>
          </CardContent>
        </Card>

        {/* Type de demande */}
        <Card className="border-2 rounded-xl">
          <CardContent className="p-3 space-y-3">
            <h4 className="text-sm font-semibold">Type de demande</h4>
            <RadioGroup 
              value={requestType} 
              onValueChange={(value: 'new' | 'regularization') => setRequestType(value)} 
              className="space-y-2"
            >
              <div className={`flex items-center space-x-3 p-3 rounded-xl border-2 transition-colors cursor-pointer ${requestType === 'new' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                <RadioGroupItem value="new" id="new" />
                <Label htmlFor="new" className="flex-1 cursor-pointer">
                  <div className="font-medium text-sm">Nouveau permis de construire</div>
                  <div className="text-xs text-muted-foreground">Construction à venir</div>
                </Label>
              </div>
              <div className={`flex items-center space-x-3 p-3 rounded-xl border-2 transition-colors cursor-pointer ${requestType === 'regularization' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                <RadioGroupItem value="regularization" id="regularization" />
                <Label htmlFor="regularization" className="flex-1 cursor-pointer">
                  <div className="font-medium text-sm">Permis de régularisation</div>
                  <div className="text-xs text-muted-foreground">Construction existante sans autorisation</div>
                </Label>
              </div>
            </RadioGroup>
            
            {requestType === 'regularization' && (
              <Alert className="bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-900 rounded-xl">
                <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <AlertDescription className="text-xs text-orange-700 dark:text-orange-300">
                  Requis pour les constructions sans autorisation préalable. Frais majorés.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Détails de la construction */}
        <Card className="border-2 rounded-xl">
          <CardContent className="p-3 space-y-3">
            <h4 className="text-sm font-semibold">Détails de la construction</h4>
            
            <div className="space-y-1.5">
              <Label className="text-sm">Type de construction *</Label>
              <Select value={formData.constructionType} onValueChange={(v) => handleInputChange('constructionType', v)}>
                <SelectTrigger className="h-11 text-sm rounded-xl border-2">
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Résidentielle">Résidentielle</SelectItem>
                  <SelectItem value="Commerciale">Commerciale</SelectItem>
                  <SelectItem value="Industrielle">Industrielle</SelectItem>
                  <SelectItem value="Agricole">Agricole</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Nature de construction *</Label>
              <Select value={formData.constructionNature} onValueChange={(v) => handleInputChange('constructionNature', v)}>
                <SelectTrigger className="h-11 text-sm rounded-xl border-2">
                  <SelectValue placeholder="Sélectionner la nature" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Durable">Durable</SelectItem>
                  <SelectItem value="Semi-durable">Semi-durable</SelectItem>
                  <SelectItem value="Précaire">Précaire</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Usage déclaré *</Label>
              <Select value={formData.declaredUsage} onValueChange={(v) => handleInputChange('declaredUsage', v)}>
                <SelectTrigger className="h-11 text-sm rounded-xl border-2">
                  <SelectValue placeholder="Sélectionner l'usage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Habitation">Habitation</SelectItem>
                  <SelectItem value="Commerce">Commerce</SelectItem>
                  <SelectItem value="Bureau">Bureau</SelectItem>
                  <SelectItem value="Entrepôt">Entrepôt</SelectItem>
                  <SelectItem value="Usage mixte">Usage mixte</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-sm">Surface (m²) *</Label>
                <Input
                  type="number"
                  placeholder="150"
                  value={formData.plannedArea}
                  onChange={(e) => handleInputChange('plannedArea', e.target.value)}
                  className="h-11 text-sm rounded-xl border-2"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Nombre d'étages *</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="2"
                  value={formData.numberOfFloors}
                  onChange={(e) => handleInputChange('numberOfFloors', e.target.value)}
                  className="h-11 text-sm rounded-xl border-2"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Coût estimé (USD)</Label>
              <Input
                type="number"
                placeholder="50000"
                value={formData.estimatedCost}
                onChange={(e) => handleInputChange('estimatedCost', e.target.value)}
                className="h-11 text-sm rounded-xl border-2"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Description du projet *</Label>
              <Textarea
                placeholder="Décrivez brièvement votre projet de construction..."
                value={formData.projectDescription}
                onChange={(e) => handleInputChange('projectDescription', e.target.value)}
                rows={3}
                className="resize-none text-sm rounded-xl border-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Champs spécifiques selon le type */}
        {requestType === 'new' ? (
          <Card className="border-2 rounded-xl">
            <CardContent className="p-3 space-y-3">
              <h4 className="text-sm font-semibold">Planification</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-sm">Date de début *</Label>
                  <Input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="h-11 text-sm rounded-xl border-2"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Durée (mois)</Label>
                  <Input
                    type="number"
                    placeholder="12"
                    value={formData.estimatedDuration}
                    onChange={(e) => handleInputChange('estimatedDuration', e.target.value)}
                    className="h-11 text-sm rounded-xl border-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-orange-200 dark:border-orange-800 rounded-xl bg-orange-50/50 dark:bg-orange-950/20">
            <CardContent className="p-3 space-y-3">
              <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-400">Informations de régularisation</h4>
              
              <div className="space-y-1.5">
                <Label className="text-sm">Raison de la régularisation *</Label>
                <Select value={formData.regularizationReason} onValueChange={(v) => handleInputChange('regularizationReason', v)}>
                  <SelectTrigger className="h-11 text-sm rounded-xl border-2">
                    <SelectValue placeholder="Sélectionner la raison" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Construction sans permis initial">Construction sans permis initial</SelectItem>
                    <SelectItem value="Permis périmé">Permis périmé</SelectItem>
                    <SelectItem value="Modification non autorisée">Modification non autorisée</SelectItem>
                    <SelectItem value="Extension ou agrandissement">Extension ou agrandissement</SelectItem>
                    <SelectItem value="Changement d'usage sans autorisation">Changement d'usage sans autorisation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {requiresOriginalPermit() && (
                <div className="space-y-1.5">
                  <Label className="text-sm">Numéro du permis initial *</Label>
                  <Input
                    type="text"
                    placeholder="Ex: PC/2020/001234"
                    value={formData.originalPermitNumber}
                    onChange={(e) => handleInputChange('originalPermitNumber', e.target.value)}
                    className="h-11 text-sm rounded-xl border-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Numéro du permis de la construction existante faisant l'objet de modification
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-sm">Date de construction *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-11 justify-start text-left font-normal rounded-xl border-2",
                        !formData.constructionDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.constructionDate ? (
                        format(new Date(formData.constructionDate), "dd MMMM yyyy", { locale: fr })
                      ) : (
                        <span>Sélectionner une date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.constructionDate ? new Date(formData.constructionDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          handleInputChange('constructionDate', date.toISOString().split('T')[0]);
                        }
                      }}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">État actuel de la construction *</Label>
                <Select value={formData.currentState} onValueChange={(v) => handleInputChange('currentState', v)}>
                  <SelectTrigger className="h-11 text-sm rounded-xl border-2">
                    <SelectValue placeholder="Sélectionner l'état" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="En cours">En cours</SelectItem>
                    <SelectItem value="Terminée">Terminée</SelectItem>
                    <SelectItem value="Partiellement terminée">Partiellement terminée</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Problèmes de conformité (optionnel)</Label>
                <Textarea
                  placeholder="Décrivez les éventuels problèmes de conformité..."
                  value={formData.complianceIssues}
                  onChange={(e) => handleInputChange('complianceIssues', e.target.value)}
                  rows={2}
                  className="resize-none text-sm rounded-xl border-2"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Informations du demandeur */}
        <Card className="border-2 rounded-xl">
          <CardContent className="p-3 space-y-3">
            <h4 className="text-sm font-semibold">Informations du demandeur</h4>
            
            <div className="space-y-1.5">
              <Label className="text-sm">Nom complet *</Label>
              <Input
                type="text"
                placeholder="Jean Dupont"
                value={formData.applicantName}
                onChange={(e) => handleInputChange('applicantName', e.target.value)}
                className="h-11 text-sm rounded-xl border-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-sm">Téléphone *</Label>
                <Input
                  type="tel"
                  placeholder="+243 XXX XXX XXX"
                  value={formData.applicantPhone}
                  onChange={(e) => handleInputChange('applicantPhone', e.target.value)}
                  className="h-11 text-sm rounded-xl border-2"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Email</Label>
                <Input
                  type="email"
                  placeholder="email@exemple.com"
                  value={formData.applicantEmail}
                  onChange={(e) => handleInputChange('applicantEmail', e.target.value)}
                  className="h-11 text-sm rounded-xl border-2"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Adresse</Label>
              <Textarea
                placeholder="Votre adresse complète..."
                value={formData.applicantAddress}
                onChange={(e) => handleInputChange('applicantAddress', e.target.value)}
                rows={2}
                className="resize-none text-sm rounded-xl border-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Récapitulatif des frais */}
        <Card className="bg-primary/5 border-2 border-primary/20 rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Frais de traitement</span>
              <span className="text-lg font-bold text-primary">${servicePrice} USD</span>
            </div>
          </CardContent>
        </Card>

        <Button 
          onClick={handlePreview} 
          className="w-full h-12 text-sm font-semibold rounded-xl shadow-lg"
          disabled={!isFormValid()}
        >
          Aperçu avant soumission
        </Button>
      </div>
    </ScrollArea>
  );

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
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Type de demande</span>
              <span className="text-sm font-semibold">
                {requestType === 'new' ? 'Nouveau permis' : 'Régularisation'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Type de construction</span>
              <span className="text-sm">{formData.constructionType}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Nature</span>
              <span className="text-sm">{formData.constructionNature}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Usage</span>
              <span className="text-sm">{formData.declaredUsage}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Surface</span>
              <span className="text-sm">{formData.plannedArea} m²</span>
            </div>

            <Separator />

            <div className="space-y-2 bg-primary/5 p-3 rounded-xl -mx-1">
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">Demandeur</span>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Nom</span>
                <span className="text-sm font-medium">{formData.applicantName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Téléphone</span>
                <span className="text-sm">{formData.applicantPhone}</span>
              </div>
              {formData.applicantEmail && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="text-sm">{formData.applicantEmail}</span>
                </div>
              )}
            </div>

            <Separator />

            <div className="flex items-center justify-between pt-2 border-t-2">
              <span className="text-sm font-bold">Total à payer</span>
              <span className="text-lg font-bold text-primary">${servicePrice} USD</span>
            </div>
          </CardContent>
        </Card>

        <Alert className="rounded-xl bg-muted/50">
          <Clock className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Délai de traitement estimé: <strong>15 à 30 jours ouvrables</strong> après paiement.
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
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Payer ${servicePrice}
          </Button>
        </div>
      </div>
    </ScrollArea>
  );

  const renderPaymentStep = () => {
    if (processingPayment) {
      return (
        <div className="space-y-4 py-4">
          <Card className="border-primary/20 bg-primary/5 rounded-xl">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-semibold">Validation en cours...</h3>
                  <p className="text-sm text-muted-foreground">Confirmez le paiement sur votre téléphone</p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-left space-y-1">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Étapes à suivre :</p>
                      <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-0.5">
                        <li>• Vérifiez la notification sur votre téléphone</li>
                        <li>• Saisissez votre code PIN</li>
                        <li>• Confirmez la transaction</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {/* Header avec montant */}
        <Card className="bg-muted/50 border-0 rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Service</p>
                <p className="font-medium text-sm truncate">{cartItem.title}</p>
              </div>
              <div className="text-right ml-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Montant</p>
                <p className="text-xl font-bold text-primary">${servicePrice}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mode de paiement */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Mode de paiement</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={paymentMethod === 'mobile_money' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPaymentMethod('mobile_money')}
              className="h-9 text-xs rounded-lg gap-1.5"
            >
              <Smartphone className="h-3.5 w-3.5" />
              Mobile Money
            </Button>
            <Button
              type="button"
              variant={paymentMethod === 'bank_card' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPaymentMethod('bank_card')}
              className="h-9 text-xs rounded-lg gap-1.5"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Carte bancaire
            </Button>
          </div>
        </div>

        {/* Formulaire Mobile Money */}
        {paymentMethod === 'mobile_money' && (
          <div className="space-y-2.5">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Opérateur</Label>
              <Select value={paymentProvider} onValueChange={setPaymentProvider}>
                <SelectTrigger className="h-9 text-xs rounded-lg">
                  <SelectValue placeholder="Sélectionner l'opérateur..." />
                </SelectTrigger>
                <SelectContent>
                  {availableProviders.map((provider) => (
                    <SelectItem key={provider.value} value={provider.value} className="text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${provider.color}`}></div>
                        {provider.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Numéro de téléphone</Label>
              <PhoneNumberInput
                value={paymentPhone}
                onChange={setPaymentPhone}
                placeholder="97 123 4567"
                disabled={!paymentProvider}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Code secret</Label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Votre code PIN"
                  value={paymentPin}
                  onChange={(e) => setPaymentPin(e.target.value.replace(/[^0-9]/g, ''))}
                  className="h-9 pl-9 text-xs rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {/* Info carte bancaire */}
        {paymentMethod === 'bank_card' && (
          <Alert className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <CreditCard className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
              Le paiement par carte bancaire sera bientôt disponible. Veuillez utiliser Mobile Money pour le moment.
            </AlertDescription>
          </Alert>
        )}

        {/* Boutons d'action */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => setStep('preview')}
            disabled={processingPayment}
            className="flex-1 h-10 text-xs rounded-xl"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            Retour
          </Button>
          <Button
            onClick={handlePayment}
            disabled={processingPayment || (paymentMethod === 'mobile_money' && (!paymentProvider || !paymentPhone || !paymentPin))}
            className="flex-1 h-10 text-xs rounded-xl"
          >
            Payer ${servicePrice}
          </Button>
        </div>

        {/* Sécurité */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
          <Shield className="h-3 w-3" />
          <span>Transaction sécurisée SSL</span>
        </div>
      </div>
    );
  };

  const renderConfirmationStep = () => (
    <div className="py-4 space-y-4 text-center">
      <div className="relative inline-flex items-center justify-center p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
        <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full" />
        <CheckCircle2 className="h-8 w-8 text-green-600 relative" />
      </div>
      
      <div>
        <h3 className="font-semibold text-base">Demande soumise avec succès</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Votre demande sera traitée dans les 15 à 30 jours ouvrables
        </p>
      </div>

      <Card className="bg-muted/50 border-0 text-left rounded-lg">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              Parcelle
            </div>
            <span className="font-mono font-bold text-xs">{parcelNumber}</span>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" />
              Type
            </div>
            <span className="text-xs">
              {requestType === 'new' ? 'Nouveau permis' : 'Régularisation'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Délai estimé
            </div>
            <span className="text-xs">15-30 jours</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Montant payé</span>
            <span className="font-bold text-primary text-sm">${servicePrice} USD</span>
          </div>
        </CardContent>
      </Card>

      <Alert className="text-left py-2 rounded-lg">
        <AlertDescription className="text-[10px]">
          Vous recevrez une notification par email et SMS lors du traitement de votre demande.
        </AlertDescription>
      </Alert>

      <Button onClick={handleClose} className="w-full h-10 text-sm rounded-xl">
        Fermer
      </Button>
    </div>
  );

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
        config={FORM_INTRO_CONFIGS.permit_request}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogPortal>
        <DialogOverlay className="z-[1200]" />
        <DialogContent className={`z-[1200] ${isMobile ? 'w-[92vw] max-w-[360px] max-h-[88vh] rounded-2xl' : 'max-w-md rounded-2xl'} p-4 overflow-hidden`}>
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              {getStepTitle()}
            </DialogTitle>
            {step === 'form' && (
              <DialogDescription className="text-sm text-muted-foreground">
                Parcelle {parcelNumber}
              </DialogDescription>
            )}
          </DialogHeader>

          {step === 'form' && renderFormStep()}
          {step === 'preview' && renderPreviewStep()}
          {step === 'payment' && renderPaymentStep()}
          {step === 'confirmation' && renderConfirmationStep()}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default BuildingPermitRequestDialog;
