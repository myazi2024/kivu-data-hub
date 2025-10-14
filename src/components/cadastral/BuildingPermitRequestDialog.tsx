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
import { Building2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { CartItem } from '@/hooks/useCart';
import { useBuildingPermitRequest } from '@/hooks/useBuildingPermitRequest';
import { usePayment } from '@/hooks/usePayment';

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
  const { submitRequest, loading: submitLoading } = useBuildingPermitRequest();
  const { createPayment } = usePayment();
  const [activeStep, setActiveStep] = useState<'form' | 'payment' | 'success'>('form');
  const [currentTab, setCurrentTab] = useState<'construction' | 'applicant'>('construction');
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
      return baseFields.every(f => f) && formData.constructionDate && formData.currentState;
    }

    return baseFields.every(f => f) && formData.startDate;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      toast({
        title: "Formulaire incomplet",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    setActiveStep('payment');
  };

  const handlePaymentSuccess = async () => {
    setLoading(true);
    
    try {
      const success = await submitRequest({
        parcelNumber,
        requestType,
        constructionType: formData.constructionType,
        constructionNature: formData.constructionNature,
        declaredUsage: formData.declaredUsage,
        plannedArea: formData.plannedArea,
        numberOfFloors: formData.numberOfFloors,
        estimatedCost: formData.estimatedCost,
        applicantName: formData.applicantName,
        applicantPhone: formData.applicantPhone,
        applicantEmail: formData.applicantEmail,
        applicantAddress: formData.applicantAddress,
        projectDescription: formData.projectDescription,
        startDate: formData.startDate,
        estimatedDuration: formData.estimatedDuration,
        constructionDate: formData.constructionDate,
        currentState: formData.currentState,
        complianceIssues: formData.complianceIssues
      });

      if (success) {
        setActiveStep('success');
      }
    } catch (error) {
      console.error('Erreur soumission:', error);
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
    <div className="flex flex-col items-center justify-center py-6 px-4 space-y-4">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
        <CheckCircle2 className="h-16 w-16 text-primary relative" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold">Demande enregistrée !</h3>
        <p className="text-sm text-muted-foreground">
          Votre demande de {requestType === 'new' ? 'permis de construire' : 'régularisation'} pour la parcelle <strong>{parcelNumber}</strong> a été enregistrée.
        </p>
      </div>
      <div className="w-full space-y-2 text-sm p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
          <span>Dossier en cours d'instruction</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
          <span>Délai : 15 à 30 jours</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
          <span>Notification par email et SMS</span>
        </div>
      </div>
      <Button onClick={handleClose} className="w-full">
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
            <Building2 className="h-5 w-5 text-primary" />
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
        onPaymentSuccess={() => handlePaymentSuccess()}
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

  const FormContent = () => (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-4 space-y-3 sm:space-y-4">
        {/* Type de demande */}
        <div className="space-y-2 pt-3 sm:pt-4">
          <Label className="text-xs sm:text-sm font-semibold">Type de demande</Label>
          <RadioGroup value={requestType} onValueChange={(value: 'new' | 'regularization') => setRequestType(value)} className="space-y-2">
            <div className="flex items-center space-x-3 p-3 rounded-xl border-2 bg-card hover:bg-muted/50 transition-all duration-200 cursor-pointer">
              <RadioGroupItem value="new" id="new" />
              <Label htmlFor="new" className="flex-1 cursor-pointer">
                <div className="font-medium text-sm">Nouveau permis</div>
                <div className="text-xs text-muted-foreground">Construction à venir</div>
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-xl border-2 bg-card hover:bg-muted/50 transition-all duration-200 cursor-pointer">
              <RadioGroupItem value="regularization" id="regularization" />
              <Label htmlFor="regularization" className="flex-1 cursor-pointer">
                <div className="font-medium text-sm">Régularisation</div>
                <div className="text-xs text-muted-foreground">Construction existante</div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Separator />

        {/* Navigation par onglets */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={currentTab === 'construction' ? 'default' : 'outline'}
            onClick={() => setCurrentTab('construction')}
            size="sm"
            className="flex-1 rounded-full"
          >
            Construction
          </Button>
          <Button
            type="button"
            variant={currentTab === 'applicant' ? 'default' : 'outline'}
            onClick={() => setCurrentTab('applicant')}
            size="sm"
            className="flex-1 rounded-full"
          >
            Demandeur
          </Button>
        </div>

        {/* Onglet Construction */}
        <div className={currentTab !== 'construction' ? 'hidden' : 'space-y-3'}>
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1">
              Type de construction <span className="text-destructive">*</span>
            </Label>
            <Select value={formData.constructionType} onValueChange={(v) => handleInputChange('constructionType', v)}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4} className="z-[100]">
                <SelectItem value="Résidentielle">Résidentielle</SelectItem>
                <SelectItem value="Commerciale">Commerciale</SelectItem>
                <SelectItem value="Industrielle">Industrielle</SelectItem>
                <SelectItem value="Agricole">Agricole</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1">
              Nature de construction <span className="text-destructive">*</span>
            </Label>
            <Select value={formData.constructionNature} onValueChange={(v) => handleInputChange('constructionNature', v)}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4} className="z-[100]">
                <SelectItem value="Durable">Durable</SelectItem>
                <SelectItem value="Semi-durable">Semi-durable</SelectItem>
                <SelectItem value="Précaire">Précaire</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1">
              Usage déclaré <span className="text-destructive">*</span>
            </Label>
            <Select value={formData.declaredUsage} onValueChange={(v) => handleInputChange('declaredUsage', v)}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4} className="z-[100]">
                <SelectItem value="Habitation">Habitation</SelectItem>
                <SelectItem value="Commerce">Commerce</SelectItem>
                <SelectItem value="Bureau">Bureau</SelectItem>
                <SelectItem value="Entrepôt">Entrepôt</SelectItem>
                <SelectItem value="Usage mixte">Usage mixte</SelectItem>
              </SelectContent>
            </Select>
          </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1">
              Surface (m²) <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              placeholder="150"
              value={formData.plannedArea}
              onChange={(e) => handleInputChange('plannedArea', e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1">
              Étages <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              min="1"
              placeholder="2"
              value={formData.numberOfFloors}
              onChange={(e) => handleInputChange('numberOfFloors', e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">Coût estimé (USD)</Label>
          <Input
            type="number"
            placeholder="50000"
            value={formData.estimatedCost}
            onChange={(e) => handleInputChange('estimatedCost', e.target.value)}
            className="h-11 rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium flex items-center gap-1">
            Description du projet <span className="text-destructive">*</span>
          </Label>
          <Textarea
            placeholder="Décrivez brièvement votre projet..."
            value={formData.projectDescription}
            onChange={(e) => handleInputChange('projectDescription', e.target.value)}
            rows={3}
            className="resize-none text-sm rounded-xl"
          />
        </div>

        {requestType === 'new' ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Date début *</Label>
              <Input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Durée (mois)</Label>
              <Input
                type="number"
                placeholder="12"
                value={formData.estimatedDuration}
                onChange={(e) => handleInputChange('estimatedDuration', e.target.value)}
                className="h-10"
              />
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Date de construction *</Label>
              <Input
                type="date"
                max={new Date().toISOString().split('T')[0]}
                value={formData.constructionDate}
                onChange={(e) => handleInputChange('constructionDate', e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">État actuel *</Label>
              <Select value={formData.currentState} onValueChange={(v) => handleInputChange('currentState', v)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4} className="z-[100]">
                  <SelectItem value="En cours">En cours</SelectItem>
                  <SelectItem value="Terminée">Terminée</SelectItem>
                  <SelectItem value="Partiellement terminée">Partiellement terminée</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Problèmes de conformité</Label>
              <Textarea
                placeholder="Décrivez les problèmes..."
                value={formData.complianceIssues}
                onChange={(e) => handleInputChange('complianceIssues', e.target.value)}
                rows={2}
                className="resize-none text-sm"
              />
            </div>
          </>
        )}
        </div>

        {/* Onglet Demandeur */}
        <div className={currentTab !== 'applicant' ? 'hidden' : 'space-y-3'}>
        <div className="space-y-2">
          <Label className="text-xs font-medium">Nom complet *</Label>
          <Input
            type="text"
            placeholder="Jean Dupont"
            value={formData.applicantName}
            onChange={(e) => handleInputChange('applicantName', e.target.value)}
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">Téléphone *</Label>
          <Input
            type="tel"
            placeholder="+243 900 000 000"
            value={formData.applicantPhone}
            onChange={(e) => handleInputChange('applicantPhone', e.target.value)}
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">Email</Label>
          <Input
            type="email"
            placeholder="jean@example.com"
            value={formData.applicantEmail}
            onChange={(e) => handleInputChange('applicantEmail', e.target.value)}
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">Adresse</Label>
          <Textarea
            placeholder="Votre adresse complète..."
            value={formData.applicantAddress}
            onChange={(e) => handleInputChange('applicantAddress', e.target.value)}
            rows={2}
            className="resize-none text-sm"
          />
        </div>
        </div>

        <Separator className="my-4" />
      </div>

      {/* Boutons d'action fixes en bas */}
      <div className="flex gap-2 sm:gap-3 p-3 sm:p-4 bg-background border-t shadow-lg">
        <Button
          type="button"
          variant="outline"
          onClick={handleClose}
          className="flex-1 rounded-xl"
          size="sm"
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={!isFormValid()}
          className="flex-1 rounded-xl"
          size="sm"
        >
          Continuer
        </Button>
      </div>
    </form>
  );

  const Container = isMobile ? Drawer : Dialog;
  const Content = isMobile ? DrawerContent : DialogContent;
  const Header = isMobile ? DrawerHeader : DialogHeader;
  const Title = isMobile ? DrawerTitle : DialogTitle;
  const Description = isMobile ? DrawerDescription : DialogDescription;

  return (
    <Container open={open} onOpenChange={handleClose}>
      <Content className={isMobile ? "h-[92vh] flex flex-col" : "sm:max-w-lg h-[85vh] flex flex-col"}>
        <Header className={isMobile ? "px-4 flex-shrink-0" : "flex-shrink-0"}>
          <Title className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5 text-primary" />
            Demande de permis
          </Title>
          <Description className="text-xs">
            Parcelle {parcelNumber}
          </Description>
        </Header>
        <FormContent />
      </Content>
    </Container>
  );
};

export default BuildingPermitRequestDialog;
