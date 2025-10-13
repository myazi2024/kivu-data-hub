import React, { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import MobileMoneyPayment from '@/components/payment/MobileMoneyPayment';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Building2, CheckCircle2, AlertCircle, ArrowLeft, User, FileText, Home, Calendar, DollarSign, ArrowRight } from 'lucide-react';
import { CartItem } from '@/hooks/useCart';
import { cn } from '@/lib/utils';

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
  const isMobile = useIsMobile();
  const [activeStep, setActiveStep] = useState<'form' | 'payment' | 'success'>('form');
  const [currentFormStep, setCurrentFormStep] = useState(1);
  const [requestType, setRequestType] = useState<'new' | 'regularization'>(
    hasExistingConstruction ? 'regularization' : 'new'
  );
  const [loading, setLoading] = useState(false);
  
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
    complianceIssues: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isStep1Valid = () => {
    return true; // requestType is always valid since it has a default value
  };

  const isStep2Valid = () => {
    const baseFields = [
      formData.constructionType,
      formData.constructionNature,
      formData.declaredUsage,
      formData.plannedArea,
      formData.projectDescription
    ];

    if (requestType === 'regularization') {
      return baseFields.every(f => f) && formData.constructionDate && formData.currentState;
    }

    return baseFields.every(f => f) && formData.startDate;
  };

  const isStep3Valid = () => {
    return formData.applicantName && formData.applicantPhone;
  };

  const handleNextStep = () => {
    if (currentFormStep === 1 && !isStep1Valid()) {
      toast({
        title: "Type de demande requis",
        description: "Veuillez sélectionner un type de demande",
        variant: "destructive"
      });
      return;
    }
    
    if (currentFormStep === 2 && !isStep2Valid()) {
      toast({
        title: "Informations incomplètes",
        description: "Veuillez remplir tous les champs obligatoires de la construction",
        variant: "destructive"
      });
      return;
    }

    if (currentFormStep === 3 && !isStep3Valid()) {
      toast({
        title: "Informations du demandeur",
        description: "Veuillez renseigner au moins le nom et le téléphone",
        variant: "destructive"
      });
      return;
    }

    if (currentFormStep < 3) {
      setCurrentFormStep(currentFormStep + 1);
    } else {
      setActiveStep('payment');
    }
  };

  const handlePreviousStep = () => {
    if (currentFormStep > 1) {
      setCurrentFormStep(currentFormStep - 1);
    }
  };

  const handlePaymentSuccess = async () => {
    setLoading(true);
    
    try {
      toast({
        title: "Demande enregistrée",
        description: "Votre demande de permis a été enregistrée avec succès",
      });
      
      setActiveStep('success');
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveStep('form');
    setCurrentFormStep(1);
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
      complianceIssues: ''
    });
    onOpenChange(false);
  };

  const servicePrice = requestType === 'new' ? 150 : 200;
  const cartItem: CartItem = {
    id: 'building-permit-request',
    title: requestType === 'new' ? 'Demande de permis de construire' : 'Demande de permis de régularisation',
    price: servicePrice,
    description: `Parcelle: ${parcelNumber}`
  };

  const SuccessContent = () => (
    <div className="flex flex-col items-center justify-center py-8 px-4 space-y-6">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
        <CheckCircle2 className="h-20 w-20 text-primary relative" />
      </div>
      <div className="text-center space-y-3">
        <h3 className="text-2xl font-semibold">Demande enregistrée !</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Votre demande de {requestType === 'new' ? 'permis de construire' : 'régularisation'} pour la parcelle <strong className="text-foreground">{parcelNumber}</strong> a été enregistrée avec succès.
        </p>
      </div>
      <div className="w-full max-w-sm space-y-3 text-sm p-5 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
          <span>Dossier en cours d'instruction</span>
        </div>
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
          <span>Délai de traitement : 15 à 30 jours</span>
        </div>
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
          <span>Notification par email et SMS</span>
        </div>
      </div>
      <Button onClick={handleClose} className="w-full max-w-sm" size="lg">
        Fermer
      </Button>
    </div>
  );

  if (activeStep === 'success') {
    const Container = isMobile ? Drawer : Dialog;
    const Content = isMobile ? DrawerContent : DialogContent;
    
    return (
      <Container open={open} onOpenChange={handleClose}>
        <Content className={isMobile ? undefined : "sm:max-w-md"}>
          <SuccessContent />
        </Content>
      </Container>
    );
  }

  const PaymentContent = () => (
    <div className="space-y-4 p-4">
      {!isMobile && (
        <>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold">Paiement du service</h3>
              <p className="text-sm text-muted-foreground">Réglez les frais de traitement</p>
            </div>
          </div>
          <Separator />
        </>
      )}
      
      <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Service</span>
          <span className="font-medium text-right max-w-[60%]">{cartItem.title}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Parcelle</span>
          <span className="font-medium">{parcelNumber}</span>
        </div>
        <Separator />
        <div className="flex justify-between items-center">
          <span className="font-semibold">Total</span>
          <span className="text-2xl font-bold text-primary">{servicePrice} USD</span>
        </div>
      </div>

      <MobileMoneyPayment
        item={cartItem}
        currency="USD"
        onPaymentSuccess={handlePaymentSuccess}
      />

      <Button
        variant="outline"
        onClick={() => setActiveStep('form')}
        className="w-full gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Button>
    </div>
  );

  if (activeStep === 'payment') {
    const Container = isMobile ? Drawer : Dialog;
    const Content = isMobile ? DrawerContent : DialogContent;
    const Header = isMobile ? DrawerHeader : DialogHeader;
    const Title = isMobile ? DrawerTitle : DialogTitle;
    const Description = isMobile ? DrawerDescription : DialogDescription;
    
    return (
      <Container open={open} onOpenChange={handleClose}>
        <Content className={isMobile ? undefined : "sm:max-w-md"}>
          {isMobile && (
            <Header>
              <Title>Paiement du service</Title>
              <Description>Réglez les frais de traitement</Description>
            </Header>
          )}
          <PaymentContent />
        </Content>
      </Container>
    );
  }

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 pb-4">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <div className={cn(
            "h-2 w-2 rounded-full transition-all duration-300",
            currentFormStep === step ? "bg-primary w-8" : currentFormStep > step ? "bg-primary/60" : "bg-muted-foreground/30"
          )} />
        </div>
      ))}
    </div>
  );

  const FormStep1 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-2">
          <FileText className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-xl font-semibold">Type de demande</h3>
        <p className="text-sm text-muted-foreground">Sélectionnez le type de permis souhaité</p>
      </div>

      <RadioGroup 
        value={requestType} 
        onValueChange={(value: 'new' | 'regularization') => setRequestType(value)} 
        className="grid gap-3"
      >
        <div className={cn(
          "relative flex items-start space-x-4 p-5 rounded-2xl border-2 transition-all cursor-pointer hover:shadow-md",
          requestType === 'new' 
            ? "border-primary bg-primary/5 shadow-sm" 
            : "border-border bg-card"
        )}>
          <RadioGroupItem value="new" id="new" className="mt-1" />
          <Label htmlFor="new" className="flex-1 cursor-pointer space-y-1">
            <div className="font-semibold text-base">Nouveau permis de construire</div>
            <div className="text-sm text-muted-foreground leading-relaxed">
              Pour une construction à réaliser. Obtention du permis avant le début des travaux.
            </div>
            <div className="text-xs font-medium text-primary pt-2">Prix: 150 USD</div>
          </Label>
        </div>
        <div className={cn(
          "relative flex items-start space-x-4 p-5 rounded-2xl border-2 transition-all cursor-pointer hover:shadow-md",
          requestType === 'regularization' 
            ? "border-primary bg-primary/5 shadow-sm" 
            : "border-border bg-card"
        )}>
          <RadioGroupItem value="regularization" id="regularization" className="mt-1" />
          <Label htmlFor="regularization" className="flex-1 cursor-pointer space-y-1">
            <div className="font-semibold text-base">Permis de régularisation</div>
            <div className="text-sm text-muted-foreground leading-relaxed">
              Pour une construction déjà réalisée sans autorisation préalable.
            </div>
            <div className="text-xs font-medium text-primary pt-2">Prix: 200 USD</div>
          </Label>
        </div>
      </RadioGroup>
      
      {requestType === 'regularization' && (
        <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50 rounded-xl flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-orange-700 dark:text-orange-300">
            La régularisation est obligatoire pour les constructions réalisées sans autorisation.
          </p>
        </div>
      )}
    </div>
  );

  const FormStep2 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-2">
          <Building2 className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-xl font-semibold">Informations sur la construction</h3>
        <p className="text-sm text-muted-foreground">Détails techniques du projet</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="constructionType">Type de construction *</Label>
            <Select value={formData.constructionType} onValueChange={(v) => handleInputChange('constructionType', v)}>
              <SelectTrigger id="constructionType" className="h-11">
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                <SelectItem value="Résidentielle">Résidentielle</SelectItem>
                <SelectItem value="Commerciale">Commerciale</SelectItem>
                <SelectItem value="Industrielle">Industrielle</SelectItem>
                <SelectItem value="Agricole">Agricole</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="constructionNature">Nature *</Label>
            <Select value={formData.constructionNature} onValueChange={(v) => handleInputChange('constructionNature', v)}>
              <SelectTrigger id="constructionNature" className="h-11">
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                <SelectItem value="Durable">Durable</SelectItem>
                <SelectItem value="Semi-durable">Semi-durable</SelectItem>
                <SelectItem value="Précaire">Précaire</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="declaredUsage">Usage déclaré *</Label>
          <Select value={formData.declaredUsage} onValueChange={(v) => handleInputChange('declaredUsage', v)}>
            <SelectTrigger id="declaredUsage" className="h-11">
              <SelectValue placeholder="Sélectionner l'usage" />
            </SelectTrigger>
            <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
              <SelectItem value="Habitation">Habitation</SelectItem>
              <SelectItem value="Commerce">Commerce</SelectItem>
              <SelectItem value="Bureau">Bureau</SelectItem>
              <SelectItem value="Entrepôt">Entrepôt</SelectItem>
              <SelectItem value="Usage mixte">Usage mixte</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="plannedArea">Surface (m²) *</Label>
            <Input
              id="plannedArea"
              type="number"
              placeholder="150"
              value={formData.plannedArea}
              onChange={(e) => handleInputChange('plannedArea', e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="numberOfFloors">Étages *</Label>
            <Input
              id="numberOfFloors"
              type="number"
              min="1"
              placeholder="2"
              value={formData.numberOfFloors}
              onChange={(e) => handleInputChange('numberOfFloors', e.target.value)}
              className="h-11"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="estimatedCost">Coût estimé (USD)</Label>
          <Input
            id="estimatedCost"
            type="number"
            placeholder="50000"
            value={formData.estimatedCost}
            onChange={(e) => handleInputChange('estimatedCost', e.target.value)}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="projectDescription">Description du projet *</Label>
          <Textarea
            id="projectDescription"
            placeholder="Décrivez brièvement votre projet..."
            value={formData.projectDescription}
            onChange={(e) => handleInputChange('projectDescription', e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        {requestType === 'new' ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Date de début *</Label>
              <Input
                id="startDate"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimatedDuration">Durée (mois)</Label>
              <Input
                id="estimatedDuration"
                type="number"
                placeholder="12"
                value={formData.estimatedDuration}
                onChange={(e) => handleInputChange('estimatedDuration', e.target.value)}
                className="h-11"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="constructionDate">Date de construction *</Label>
              <Input
                id="constructionDate"
                type="date"
                max={new Date().toISOString().split('T')[0]}
                value={formData.constructionDate}
                onChange={(e) => handleInputChange('constructionDate', e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentState">État actuel *</Label>
              <Select value={formData.currentState} onValueChange={(v) => handleInputChange('currentState', v)}>
                <SelectTrigger id="currentState" className="h-11">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                  <SelectItem value="Achevée">Achevée</SelectItem>
                  <SelectItem value="En cours">En cours</SelectItem>
                  <SelectItem value="Abandonnée">Abandonnée</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="complianceIssues">Non-conformités identifiées</Label>
              <Textarea
                id="complianceIssues"
                placeholder="Listez les non-conformités éventuelles..."
                value={formData.complianceIssues}
                onChange={(e) => handleInputChange('complianceIssues', e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const FormStep3 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-2">
          <User className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-xl font-semibold">Informations du demandeur</h3>
        <p className="text-sm text-muted-foreground">Vos coordonnées de contact</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="applicantName">Nom complet *</Label>
          <Input
            id="applicantName"
            placeholder="Jean Dupont"
            value={formData.applicantName}
            onChange={(e) => handleInputChange('applicantName', e.target.value)}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="applicantPhone">Téléphone *</Label>
          <Input
            id="applicantPhone"
            type="tel"
            placeholder="+243 800 000 000"
            value={formData.applicantPhone}
            onChange={(e) => handleInputChange('applicantPhone', e.target.value)}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="applicantEmail">Email</Label>
          <Input
            id="applicantEmail"
            type="email"
            placeholder="jean.dupont@email.com"
            value={formData.applicantEmail}
            onChange={(e) => handleInputChange('applicantEmail', e.target.value)}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="applicantAddress">Adresse</Label>
          <Textarea
            id="applicantAddress"
            placeholder="Votre adresse complète..."
            value={formData.applicantAddress}
            onChange={(e) => handleInputChange('applicantAddress', e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Note:</strong> Vous serez contacté à ces coordonnées pour le suivi de votre demande.
          </p>
        </div>
      </div>
    </div>
  );

  const FormContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-4 md:px-6 pt-2">
        <StepIndicator />
      </div>
      
      <div className="flex-1 px-4 md:px-6 overflow-y-auto" style={{ maxHeight: isMobile ? 'calc(95vh - 140px)' : 'calc(90vh - 140px)' }}>
        {currentFormStep === 1 && <FormStep1 />}
        {currentFormStep === 2 && <FormStep2 />}
        {currentFormStep === 3 && <FormStep3 />}
      </div>

      <div className="flex-shrink-0 border-t bg-background px-4 md:px-6 py-4">
        <div className="flex gap-3">
          {currentFormStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={handlePreviousStep}
              className="gap-2"
              disabled={loading}
            >
              <ArrowLeft className="h-4 w-4" />
              Précédent
            </Button>
          )}
          <Button
            type="button"
            onClick={handleNextStep}
            className="flex-1 gap-2"
            disabled={loading}
          >
            {currentFormStep === 3 ? (
              <>
                Continuer vers le paiement
                <DollarSign className="h-4 w-4" />
              </>
            ) : (
              <>
                Suivant
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  const Container = isMobile ? Drawer : Dialog;
  const Content = isMobile ? DrawerContent : DialogContent;
  const Header = isMobile ? DrawerHeader : DialogHeader;
  const Title = isMobile ? DrawerTitle : DialogTitle;
  const Description = isMobile ? DrawerDescription : DialogDescription;

  return (
    <Container open={open} onOpenChange={handleClose}>
      <Content className={cn(
        "flex flex-col",
        isMobile ? "h-[95vh]" : "sm:max-w-2xl h-[90vh]"
      )}>
        <Header className="flex-shrink-0">
          <Title>Demande de permis de construire</Title>
          <Description>
            Parcelle: {parcelNumber} • Étape {currentFormStep}/3
          </Description>
        </Header>
        <FormContent />
      </Content>
    </Container>
  );
};

export default BuildingPermitRequestDialog;
