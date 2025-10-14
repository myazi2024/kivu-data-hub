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
import { useBuildingPermitRequest, BuildingPermitRequestData } from '@/hooks/useBuildingPermitRequest';
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
  const { createPayment, loading: paymentLoading, paymentStep, resetPaymentState } = usePayment();
  const [activeStep, setActiveStep] = useState<'form' | 'payment' | 'success'>('form');
  const [currentTab, setCurrentTab] = useState<'construction' | 'applicant'>('construction');
  const [requestType, setRequestType] = useState<'new' | 'regularization'>(
    hasExistingConstruction ? 'regularization' : 'new'
  );
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    requestType: hasExistingConstruction ? 'regularization' : 'new',
    constructionType: '',
    constructionNature: '',
    proposedUsage: '',
    estimatedSurface: '',
    numberOfFloors: '1',
    estimatedBudget: '',
    applicantFullName: '',
    applicantLegalStatus: 'Personne physique',
    applicantPhone: '',
    applicantEmail: '',
    applicantAddress: '',
    constructionDescription: '',
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
      formData.proposedUsage,
      formData.estimatedSurface,
      formData.applicantFullName,
      formData.applicantPhone,
      formData.constructionDescription
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

  const handlePaymentSuccess = async (paymentData?: { provider: string; phoneNumber: string }) => {
    setLoading(true);
    
    try {
      // Soumettre la demande de permis après le paiement réussi
      const requestData: BuildingPermitRequestData = {
        parcelNumber,
        requestType: formData.requestType as 'new' | 'regularization',
        hasExistingConstruction,
        constructionType: formData.constructionType,
        constructionNature: formData.constructionNature,
        proposedUsage: formData.proposedUsage,
        estimatedSurface: formData.estimatedSurface ? parseFloat(formData.estimatedSurface) : undefined,
        numberOfFloors: formData.numberOfFloors ? parseInt(formData.numberOfFloors) : undefined,
        estimatedBudget: formData.estimatedBudget ? parseFloat(formData.estimatedBudget) : undefined,
        constructionDescription: formData.constructionDescription,
        applicantFullName: formData.applicantFullName,
        applicantLegalStatus: formData.applicantLegalStatus,
        applicantPhone: formData.applicantPhone,
        applicantEmail: formData.applicantEmail,
        applicantAddress: formData.applicantAddress,
        paymentMethod: 'mobile_money',
        paymentProvider: paymentData?.provider,
        phoneNumber: paymentData?.phoneNumber,
      };

      const result = await submitRequest(requestData);
      
      if (result.success) {
        setActiveStep('success');
        toast({
          title: "Demande enregistrée",
          description: "Votre demande de permis de construire a été enregistrée et sera traitée prochainement.",
        });
      } else {
        toast({
          title: "Erreur",
          description: "Le paiement a réussi mais l'enregistrement de la demande a échoué. Veuillez contacter le support.",
          variant: "destructive",
        });
      }
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
    setCurrentTab('construction');
    resetPaymentState();
    setFormData({
      requestType: hasExistingConstruction ? 'regularization' : 'new',
      constructionType: '',
      constructionNature: '',
      proposedUsage: '',
      estimatedSurface: '',
      numberOfFloors: '1',
      estimatedBudget: '',
      applicantFullName: '',
      applicantLegalStatus: 'Personne physique',
      applicantPhone: '',
      applicantEmail: '',
      applicantAddress: '',
      constructionDescription: '',
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

  const FormContent = () => (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 space-y-4">
        {/* Type de demande */}
        <div className="space-y-3 pt-4">
          <Label className="text-sm font-semibold">Type de demande</Label>
          <RadioGroup value={requestType} onValueChange={(value: 'new' | 'regularization') => setRequestType(value)} className="space-y-2">
            <div className="flex items-center space-x-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="new" id="new" />
              <Label htmlFor="new" className="flex-1 cursor-pointer">
                <div className="font-medium text-sm">Nouveau permis</div>
                <div className="text-xs text-muted-foreground">Construction à venir</div>
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
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
            className="flex-1"
          >
            Construction
          </Button>
          <Button
            type="button"
            variant={currentTab === 'applicant' ? 'default' : 'outline'}
            onClick={() => setCurrentTab('applicant')}
            size="sm"
            className="flex-1"
          >
            Demandeur
          </Button>
        </div>

        {/* Onglet Construction */}
        <div className={currentTab !== 'construction' ? 'hidden' : 'space-y-3'}>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Type de construction *</Label>
            <Select value={formData.constructionType} onValueChange={(v) => handleInputChange('constructionType', v)}>
              <SelectTrigger className="h-10">
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
            <Label className="text-xs font-medium">Nature de construction *</Label>
            <Select value={formData.constructionNature} onValueChange={(v) => handleInputChange('constructionNature', v)}>
              <SelectTrigger className="h-10">
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
            <Label className="text-xs font-medium">Usage déclaré *</Label>
            <Select value={formData.proposedUsage} onValueChange={(v) => handleInputChange('proposedUsage', v)}>
              <SelectTrigger className="h-10">
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
            <Label className="text-xs font-medium">Surface (m²) *</Label>
            <Input
              type="number"
              placeholder="150"
              value={formData.estimatedSurface}
              onChange={(e) => handleInputChange('estimatedSurface', e.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Étages *</Label>
            <Input
              type="number"
              min="1"
              placeholder="2"
              value={formData.numberOfFloors}
              onChange={(e) => handleInputChange('numberOfFloors', e.target.value)}
              className="h-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">Coût estimé (USD)</Label>
          <Input
            type="number"
            placeholder="50000"
            value={formData.estimatedBudget}
            onChange={(e) => handleInputChange('estimatedBudget', e.target.value)}
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">Description du projet *</Label>
          <Textarea
            placeholder="Décrivez brièvement votre projet..."
            value={formData.constructionDescription}
            onChange={(e) => handleInputChange('constructionDescription', e.target.value)}
            rows={3}
            className="resize-none text-sm"
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
            value={formData.applicantFullName}
            onChange={(e) => handleInputChange('applicantFullName', e.target.value)}
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">Statut juridique</Label>
          <Select value={formData.applicantLegalStatus} onValueChange={(v) => handleInputChange('applicantLegalStatus', v)}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4} className="z-[100]">
              <SelectItem value="Personne physique">Personne physique</SelectItem>
              <SelectItem value="Entreprise">Entreprise</SelectItem>
              <SelectItem value="Société">Société</SelectItem>
              <SelectItem value="ONG">ONG</SelectItem>
            </SelectContent>
          </Select>
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
      <div className="flex gap-3 p-4 bg-background border-t">
        <Button
          type="button"
          variant="outline"
          onClick={handleClose}
          className="flex-1"
          size="sm"
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={!isFormValid()}
          className="flex-1"
          size="sm"
        >
          Paiement
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
