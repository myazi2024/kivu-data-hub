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
import { Building2, CheckCircle2, AlertCircle, ArrowLeft, Upload, X, FileImage } from 'lucide-react';
import { CartItem } from '@/hooks/useCart';

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
  const [currentTab, setCurrentTab] = useState<'construction' | 'applicant'>('construction');
  const [requestType, setRequestType] = useState<'new' | 'regularization'>(
    hasExistingConstruction ? 'regularization' : 'new'
  );
  const [loading, setLoading] = useState(false);
  const [constructionFiles, setConstructionFiles] = useState<File[]>([]);
  
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setConstructionFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setConstructionFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    setActiveStep('form');
    setConstructionFiles([]);
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
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      {/* Type de demande - Mobile-optimized segmented control */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Type de demande</Label>
        <div className="inline-flex items-center w-full rounded-lg bg-muted p-1 gap-1 border border-border/50">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRequestType('new')}
            className={`flex-1 h-9 text-xs font-medium transition-all ${
              requestType === 'new'
                ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
                : 'hover:bg-background/60'
            }`}
          >
            Nouveau permis
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRequestType('regularization')}
            className={`flex-1 h-9 text-xs font-medium transition-all ${
              requestType === 'regularization'
                ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
                : 'hover:bg-background/60'
            }`}
          >
            Régularisation
          </Button>
        </div>
        
        {requestType === 'regularization' && (
          <div className="p-3 bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-900 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-orange-700 dark:text-orange-300">
              Requis pour les constructions sans autorisation préalable.
            </p>
          </div>
        )}
      </div>

      <Separator />

      {/* Navigation par onglets - Mobile-optimized */}
      <div className="inline-flex items-center w-full rounded-lg bg-muted p-1 gap-1 border border-border/50">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setCurrentTab('construction')}
          className={`flex-1 h-9 text-xs font-medium transition-all ${
            currentTab === 'construction'
              ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
              : 'hover:bg-background/60'
          }`}
        >
          Construction
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setCurrentTab('applicant')}
          className={`flex-1 h-9 text-xs font-medium transition-all ${
            currentTab === 'applicant'
              ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
              : 'hover:bg-background/60'
          }`}
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
            <SelectContent>
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
            <SelectContent>
              <SelectItem value="Durable">Durable</SelectItem>
              <SelectItem value="Semi-durable">Semi-durable</SelectItem>
              <SelectItem value="Précaire">Précaire</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">Usage déclaré *</Label>
          <Select value={formData.declaredUsage} onValueChange={(v) => handleInputChange('declaredUsage', v)}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Sélectionner" />
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

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Surface (m²) *</Label>
            <Input
              type="number"
              placeholder="150"
              value={formData.plannedArea}
              onChange={(e) => handleInputChange('plannedArea', e.target.value)}
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
            value={formData.estimatedCost}
            onChange={(e) => handleInputChange('estimatedCost', e.target.value)}
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">Description du projet *</Label>
          <Textarea
            placeholder="Décrivez brièvement votre projet..."
            value={formData.projectDescription}
            onChange={(e) => handleInputChange('projectDescription', e.target.value)}
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
                <SelectContent>
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

        {/* Section Pièces jointes */}
        <div className="space-y-2 pt-2">
          <Label className="text-xs font-medium">
            {requestType === 'new' ? 'Plans de construction' : 'Images de la construction'}
          </Label>
          <div className="space-y-2">
            <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {requestType === 'new' ? 'Ajouter des plans' : 'Ajouter des images'}
              </span>
              <input
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            
            {constructionFiles.length > 0 && (
              <div className="space-y-2">
                {constructionFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <FileImage className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-xs flex-1 truncate">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="h-6 w-6 p-0 hover:bg-destructive/10"
                    >
                      <X className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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

      <Separator />

      <div className="flex gap-3 pt-2">
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
      <Content className={isMobile ? "max-h-[90vh]" : "sm:max-w-lg max-h-[90vh] overflow-y-auto"}>
        <Header className={isMobile ? "px-4" : undefined}>
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
