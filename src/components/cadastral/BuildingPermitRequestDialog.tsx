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
import { ScrollArea } from '@/components/ui/scroll-area';
import MobileMoneyPayment from '@/components/payment/MobileMoneyPayment';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Building2, CheckCircle2, AlertCircle, ArrowLeft, User, FileText } from 'lucide-react';
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
        <CheckCircle2 className="h-20 w-20 text-primary relative animate-scale-in" />
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
    <ScrollArea className="h-full">
      <form onSubmit={handleSubmit} className="space-y-6 p-4 md:p-6">
        {/* Type de demande */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <Label className="text-base font-semibold">Type de demande</Label>
          </div>
          <RadioGroup 
            value={requestType} 
            onValueChange={(value: 'new' | 'regularization') => setRequestType(value)} 
            className="grid gap-3"
          >
            <div className={cn(
              "relative flex items-center space-x-4 p-4 rounded-xl border-2 transition-all cursor-pointer",
              requestType === 'new' 
                ? "border-primary bg-primary/5 shadow-sm" 
                : "border-border bg-card hover:border-primary/50"
            )}>
              <RadioGroupItem value="new" id="new" className="mt-0" />
              <Label htmlFor="new" className="flex-1 cursor-pointer">
                <div className="font-semibold">Nouveau permis</div>
                <div className="text-sm text-muted-foreground">Pour une construction future</div>
              </Label>
            </div>
            <div className={cn(
              "relative flex items-center space-x-4 p-4 rounded-xl border-2 transition-all cursor-pointer",
              requestType === 'regularization' 
                ? "border-primary bg-primary/5 shadow-sm" 
                : "border-border bg-card hover:border-primary/50"
            )}>
              <RadioGroupItem value="regularization" id="regularization" className="mt-0" />
              <Label htmlFor="regularization" className="flex-1 cursor-pointer">
                <div className="font-semibold">Régularisation</div>
                <div className="text-sm text-muted-foreground">Pour une construction existante</div>
              </Label>
            </div>
          </RadioGroup>
          
          {requestType === 'regularization' && (
            <div className="p-4 bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-900 rounded-xl flex items-start gap-3 animate-fade-in">
              <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-orange-700 dark:text-orange-300">
                Requis pour les constructions réalisées sans autorisation préalable.
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Section Construction */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <Label className="text-base font-semibold">Informations sur la construction</Label>
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="constructionType" className="text-sm font-medium">Type de construction *</Label>
              <Select value={formData.constructionType} onValueChange={(v) => handleInputChange('constructionType', v)}>
                <SelectTrigger id="constructionType" className="h-12">
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

            <div className="space-y-2">
              <Label htmlFor="constructionNature" className="text-sm font-medium">Nature de construction *</Label>
              <Select value={formData.constructionNature} onValueChange={(v) => handleInputChange('constructionNature', v)}>
                <SelectTrigger id="constructionNature" className="h-12">
                  <SelectValue placeholder="Sélectionner la nature" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Durable">Durable</SelectItem>
                  <SelectItem value="Semi-durable">Semi-durable</SelectItem>
                  <SelectItem value="Précaire">Précaire</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="declaredUsage" className="text-sm font-medium">Usage déclaré *</Label>
              <Select value={formData.declaredUsage} onValueChange={(v) => handleInputChange('declaredUsage', v)}>
                <SelectTrigger id="declaredUsage" className="h-12">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plannedArea" className="text-sm font-medium">Surface (m²) *</Label>
                <Input
                  id="plannedArea"
                  type="number"
                  placeholder="150"
                  value={formData.plannedArea}
                  onChange={(e) => handleInputChange('plannedArea', e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numberOfFloors" className="text-sm font-medium">Nombre d'étages *</Label>
                <Input
                  id="numberOfFloors"
                  type="number"
                  min="1"
                  placeholder="2"
                  value={formData.numberOfFloors}
                  onChange={(e) => handleInputChange('numberOfFloors', e.target.value)}
                  className="h-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedCost" className="text-sm font-medium">Coût estimé (USD)</Label>
              <Input
                id="estimatedCost"
                type="number"
                placeholder="50000"
                value={formData.estimatedCost}
                onChange={(e) => handleInputChange('estimatedCost', e.target.value)}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectDescription" className="text-sm font-medium">Description du projet *</Label>
              <Textarea
                id="projectDescription"
                placeholder="Décrivez brièvement votre projet de construction..."
                value={formData.projectDescription}
                onChange={(e) => handleInputChange('projectDescription', e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            {requestType === 'new' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-sm font-medium">Date de début *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimatedDuration" className="text-sm font-medium">Durée (mois)</Label>
                  <Input
                    id="estimatedDuration"
                    type="number"
                    placeholder="12"
                    value={formData.estimatedDuration}
                    onChange={(e) => handleInputChange('estimatedDuration', e.target.value)}
                    className="h-12"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="constructionDate" className="text-sm font-medium">Date de construction *</Label>
                  <Input
                    id="constructionDate"
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    value={formData.constructionDate}
                    onChange={(e) => handleInputChange('constructionDate', e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentState" className="text-sm font-medium">État actuel *</Label>
                  <Select value={formData.currentState} onValueChange={(v) => handleInputChange('currentState', v)}>
                    <SelectTrigger id="currentState" className="h-12">
                      <SelectValue placeholder="Sélectionner l'état" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="En cours">En cours</SelectItem>
                      <SelectItem value="Terminée">Terminée</SelectItem>
                      <SelectItem value="Partiellement terminée">Partiellement terminée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complianceIssues" className="text-sm font-medium">Problèmes de conformité</Label>
                  <Textarea
                    id="complianceIssues"
                    placeholder="Décrivez les éventuels problèmes de conformité..."
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

        <Separator />

        {/* Section Demandeur */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <Label className="text-base font-semibold">Informations du demandeur</Label>
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="applicantName" className="text-sm font-medium">Nom complet *</Label>
              <Input
                id="applicantName"
                type="text"
                placeholder="Jean Dupont"
                value={formData.applicantName}
                onChange={(e) => handleInputChange('applicantName', e.target.value)}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="applicantPhone" className="text-sm font-medium">Téléphone *</Label>
              <Input
                id="applicantPhone"
                type="tel"
                placeholder="+243 900 000 000"
                value={formData.applicantPhone}
                onChange={(e) => handleInputChange('applicantPhone', e.target.value)}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="applicantEmail" className="text-sm font-medium">Email</Label>
              <Input
                id="applicantEmail"
                type="email"
                placeholder="jean@example.com"
                value={formData.applicantEmail}
                onChange={(e) => handleInputChange('applicantEmail', e.target.value)}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="applicantAddress" className="text-sm font-medium">Adresse complète</Label>
              <Textarea
                id="applicantAddress"
                placeholder="Votre adresse complète..."
                value={formData.applicantAddress}
                onChange={(e) => handleInputChange('applicantAddress', e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex gap-3 pt-2 sticky bottom-0 bg-background pb-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="flex-1 h-12"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={!isFormValid()}
            className="flex-1 h-12 font-semibold"
          >
            Procéder au paiement
          </Button>
        </div>
      </form>
    </ScrollArea>
  );

  const Container = isMobile ? Drawer : Dialog;
  const Content = isMobile ? DrawerContent : DialogContent;
  const Header = isMobile ? DrawerHeader : DialogHeader;
  const Title = isMobile ? DrawerTitle : DialogTitle;
  const Description = isMobile ? DrawerDescription : DialogDescription;

  return (
    <Container open={open} onOpenChange={handleClose}>
      <Content className={isMobile ? "max-h-[95vh] flex flex-col" : "sm:max-w-2xl max-h-[90vh] flex flex-col"}>
        <Header className={isMobile ? "px-4 pb-4" : "pb-4"}>
          <Title className="flex items-center gap-2 text-lg">
            <Building2 className="h-6 w-6 text-primary" />
            Demande de permis de construire
          </Title>
          <Description>
            Parcelle <strong className="text-foreground">{parcelNumber}</strong>
          </Description>
        </Header>
        <FormContent />
      </Content>
    </Container>
  );
};

export default BuildingPermitRequestDialog;
