import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import MobileMoneyPayment from '@/components/payment/MobileMoneyPayment';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, Building2, CheckCircle2, AlertCircle } from 'lucide-react';
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
  const [activeStep, setActiveStep] = useState<'form' | 'payment' | 'success'>('form');
  const [requestType, setRequestType] = useState<'new' | 'regularization'>(
    hasExistingConstruction ? 'regularization' : 'new'
  );
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    // Informations sur la construction
    constructionType: '',
    constructionNature: '',
    declaredUsage: '',
    plannedArea: '',
    numberOfFloors: '1',
    estimatedCost: '',
    
    // Informations du demandeur
    applicantName: '',
    applicantPhone: '',
    applicantEmail: '',
    applicantAddress: '',
    
    // Détails du projet
    projectDescription: '',
    startDate: '',
    estimatedDuration: '',
    
    // Pour la régularisation
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
      // Ici vous pouvez ajouter la logique pour enregistrer la demande dans Supabase
      // await supabase.from('building_permit_requests').insert({ ... });
      
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

  // Prix du service (à ajuster selon vos tarifs)
  const servicePrice = requestType === 'new' ? 150 : 200;
  const cartItem: CartItem = {
    id: 'building-permit-request',
    title: requestType === 'new' ? 'Demande de permis de construire' : 'Demande de permis de régularisation',
    price: servicePrice,
    description: `Parcelle: ${parcelNumber}`
  };

  if (activeStep === 'success') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
              <CheckCircle2 className="h-20 w-20 text-primary relative animate-scale-in" />
            </div>
            <DialogTitle className="text-2xl text-center font-semibold">
              Demande enregistrée !
            </DialogTitle>
            <DialogDescription className="text-center text-base">
              Votre demande de {requestType === 'new' ? 'permis de construire' : 'régularisation'} pour la parcelle <strong>{parcelNumber}</strong> a été enregistrée.
            </DialogDescription>
            <Card className="w-full border-primary/20">
              <CardContent className="pt-6">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Dossier en cours d'instruction</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Délai de traitement : 15 à 30 jours</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Notification par email et SMS</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Button onClick={handleClose} className="w-full">
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (activeStep === 'payment') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Paiement du service</DialogTitle>
            <DialogDescription>
              Réglez les frais de traitement pour votre demande
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Service</span>
                    <span className="text-sm font-medium">{cartItem.title}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Parcelle</span>
                    <span className="text-sm font-medium">{parcelNumber}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-base font-semibold">Total</span>
                    <span className="text-2xl font-bold text-primary">{servicePrice} USD</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <MobileMoneyPayment
              item={cartItem}
              currency="USD"
              onPaymentSuccess={handlePaymentSuccess}
            />

            <Button
              variant="outline"
              onClick={() => setActiveStep('form')}
              className="w-full"
            >
              Retour au formulaire
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Demande de permis - Parcelle {parcelNumber}
          </DialogTitle>
          <DialogDescription>
            Remplissez ce formulaire pour effectuer votre demande
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type de demande */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-sm">Type de demande</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={requestType} onValueChange={(value: 'new' | 'regularization') => setRequestType(value)}>
                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="new" id="new" />
                  <Label htmlFor="new" className="flex-1 cursor-pointer">
                    <div className="font-medium">Nouveau permis de construire</div>
                    <div className="text-xs text-muted-foreground">Pour une construction à venir</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="regularization" id="regularization" />
                  <Label htmlFor="regularization" className="flex-1 cursor-pointer">
                    <div className="font-medium">Permis de régularisation</div>
                    <div className="text-xs text-muted-foreground">Pour une construction existante</div>
                  </Label>
                </div>
              </RadioGroup>
              
              {requestType === 'regularization' && (
                <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-orange-700 dark:text-orange-300">
                    Un permis de régularisation est requis pour les constructions réalisées sans autorisation préalable.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="construction" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="construction">Construction</TabsTrigger>
              <TabsTrigger value="applicant">Demandeur</TabsTrigger>
            </TabsList>

            <TabsContent value="construction" className="space-y-4 mt-4">
              {/* Informations sur la construction */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Type de construction *</Label>
                  <Select value={formData.constructionType} onValueChange={(v) => handleInputChange('constructionType', v)}>
                    <SelectTrigger>
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
                  <Label>Nature de construction *</Label>
                  <Select value={formData.constructionNature} onValueChange={(v) => handleInputChange('constructionNature', v)}>
                    <SelectTrigger>
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
                  <Label>Usage déclaré *</Label>
                  <Select value={formData.declaredUsage} onValueChange={(v) => handleInputChange('declaredUsage', v)}>
                    <SelectTrigger>
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
                    <Label>Surface prévue (m²) *</Label>
                    <Input
                      type="number"
                      placeholder="ex: 150"
                      value={formData.plannedArea}
                      onChange={(e) => handleInputChange('plannedArea', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre d'étages *</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="ex: 2"
                      value={formData.numberOfFloors}
                      onChange={(e) => handleInputChange('numberOfFloors', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Coût estimé (USD)</Label>
                  <Input
                    type="number"
                    placeholder="ex: 50000"
                    value={formData.estimatedCost}
                    onChange={(e) => handleInputChange('estimatedCost', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description du projet *</Label>
                  <Textarea
                    placeholder="Décrivez brièvement votre projet de construction..."
                    value={formData.projectDescription}
                    onChange={(e) => handleInputChange('projectDescription', e.target.value)}
                    rows={3}
                  />
                </div>

                {requestType === 'new' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Date de début prévue *</Label>
                      <Input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        value={formData.startDate}
                        onChange={(e) => handleInputChange('startDate', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Durée estimée (mois)</Label>
                      <Input
                        type="number"
                        placeholder="ex: 12"
                        value={formData.estimatedDuration}
                        onChange={(e) => handleInputChange('estimatedDuration', e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Date de construction *</Label>
                      <Input
                        type="date"
                        max={new Date().toISOString().split('T')[0]}
                        value={formData.constructionDate}
                        onChange={(e) => handleInputChange('constructionDate', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>État actuel de la construction *</Label>
                      <Select value={formData.currentState} onValueChange={(v) => handleInputChange('currentState', v)}>
                        <SelectTrigger>
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
                      <Label>Problèmes de conformité identifiés</Label>
                      <Textarea
                        placeholder="Décrivez les éventuels problèmes de conformité..."
                        value={formData.complianceIssues}
                        onChange={(e) => handleInputChange('complianceIssues', e.target.value)}
                        rows={2}
                      />
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="applicant" className="space-y-4 mt-4">
              {/* Informations du demandeur */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Nom complet *</Label>
                  <Input
                    placeholder="ex: Jean Kabila Mukendi"
                    value={formData.applicantName}
                    onChange={(e) => handleInputChange('applicantName', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Téléphone *</Label>
                  <Input
                    type="tel"
                    placeholder="+243 970 123 456"
                    value={formData.applicantPhone}
                    onChange={(e) => handleInputChange('applicantPhone', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="exemple@email.com"
                    value={formData.applicantEmail}
                    onChange={(e) => handleInputChange('applicantEmail', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Adresse</Label>
                  <Textarea
                    placeholder="Adresse complète du demandeur..."
                    value={formData.applicantAddress}
                    onChange={(e) => handleInputChange('applicantAddress', e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Résumé du paiement */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Frais de traitement</p>
                  <p className="text-xs text-muted-foreground">{cartItem.title}</p>
                </div>
                <p className="text-2xl font-bold text-primary">{servicePrice} USD</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" disabled={!isFormValid() || loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  Procéder au paiement
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BuildingPermitRequestDialog;
