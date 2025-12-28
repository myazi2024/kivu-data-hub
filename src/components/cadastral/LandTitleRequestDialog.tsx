import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, CheckCircle2, Upload, X, Info, ChevronRight, User, MapPin, FileText, CreditCard, Building } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  getAllProvinces, 
  getVillesForProvince, 
  getCommunesForVille,
  getTerritoiresForProvince,
  getCollectivitesForTerritoire,
  getQuartiersForCommune
} from '@/lib/geographicData';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLandTitleRequest, LandTitleRequestData } from '@/hooks/useLandTitleRequest';
import { QuickAuthDialog } from './QuickAuthDialog';
import MobileMoneyPayment from '@/components/payment/MobileMoneyPayment';
import { CartItem } from '@/hooks/useCart';
import { ParcelMapPreview } from './ParcelMapPreview';
import { useMapConfig } from '@/hooks/useMapConfig';

interface LandTitleRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LandTitleRequestDialog: React.FC<LandTitleRequestDialogProps> = ({
  open,
  onOpenChange
}) => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const isMobile = useIsMobile();
  const { config: mapConfig } = useMapConfig();
  const { 
    loading, 
    fees, 
    loadingFees, 
    calculateTotal, 
    getMandatoryFees, 
    getOptionalFees,
    submitRequest 
  } = useLandTitleRequest();
  
  const [activeTab, setActiveTab] = useState('requester');
  const [showQuickAuth, setShowQuickAuth] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedReferenceNumber, setSavedReferenceNumber] = useState<string>('');
  
  // Form data
  const [formData, setFormData] = useState<LandTitleRequestData>({
    requesterType: 'owner',
    requesterLastName: '',
    requesterFirstName: '',
    requesterMiddleName: '',
    requesterPhone: '',
    requesterEmail: '',
    isOwnerSameAsRequester: true,
    sectionType: '',
    province: '',
    selectedFees: []
  });
  
  // Files
  const [requesterIdFile, setRequesterIdFile] = useState<File | null>(null);
  const [ownerIdFile, setOwnerIdFile] = useState<File | null>(null);
  const [proofOfOwnershipFile, setProofOfOwnershipFile] = useState<File | null>(null);
  
  // Location options
  const [availableVilles, setAvailableVilles] = useState<string[]>([]);
  const [availableCommunes, setAvailableCommunes] = useState<string[]>([]);
  const [availableQuartiers, setAvailableQuartiers] = useState<string[]>([]);
  const [availableTerritoires, setAvailableTerritoires] = useState<string[]>([]);
  const [availableCollectivites, setAvailableCollectivites] = useState<string[]>([]);
  
  // GPS coordinates
  const [gpsCoordinates, setGpsCoordinates] = useState<Array<{ borne: string; lat: string; lng: string }>>([
    { borne: 'Borne 1', lat: '', lng: '' }
  ]);
  
  // Parcel sides
  const [parcelSides, setParcelSides] = useState<Array<{ name: string; length: string }>>([
    { name: 'Côté Nord', length: '' },
    { name: 'Côté Sud', length: '' },
    { name: 'Côté Est', length: '' },
    { name: 'Côté Ouest', length: '' }
  ]);

  // Pre-fill with user info
  useEffect(() => {
    if (profile) {
      const nameParts = (profile.full_name || '').split(' ');
      setFormData(prev => ({
        ...prev,
        requesterLastName: nameParts[0] || '',
        requesterFirstName: nameParts.slice(1).join(' ') || '',
        requesterPhone: profile.phone || '',
        requesterEmail: profile.email || ''
      }));
    }
  }, [profile]);

  // Update location options
  useEffect(() => {
    if (formData.province) {
      if (formData.sectionType === 'urbaine') {
        setAvailableVilles(getVillesForProvince(formData.province));
      } else {
        setAvailableTerritoires(getTerritoiresForProvince(formData.province));
      }
    }
  }, [formData.province, formData.sectionType]);

  useEffect(() => {
    if (formData.ville) {
      setAvailableCommunes(getCommunesForVille(formData.ville));
    }
  }, [formData.ville]);

  useEffect(() => {
    if (formData.commune) {
      setAvailableQuartiers(getQuartiersForCommune(formData.commune));
    }
  }, [formData.commune]);

  useEffect(() => {
    if (formData.territoire) {
      setAvailableCollectivites(getCollectivitesForTerritoire(formData.territoire));
    }
  }, [formData.territoire]);

  const handleInputChange = (field: keyof LandTitleRequestData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Reset dependent fields
    if (field === 'sectionType') {
      setFormData(prev => ({
        ...prev,
        ville: '',
        commune: '',
        quartier: '',
        avenue: '',
        territoire: '',
        collectivite: '',
        groupement: '',
        village: ''
      }));
    }
    if (field === 'province') {
      setAvailableVilles([]);
      setAvailableCommunes([]);
      setAvailableQuartiers([]);
      setAvailableTerritoires([]);
      setAvailableCollectivites([]);
    }
  };

  const toggleFee = (feeId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedFees: prev.selectedFees.includes(feeId)
        ? prev.selectedFees.filter(id => id !== feeId)
        : [...prev.selectedFees, feeId]
    }));
  };

  const isFormValid = (): boolean => {
    // Check requester info
    if (!formData.requesterLastName || !formData.requesterFirstName || !formData.requesterPhone) {
      return false;
    }
    
    // Check owner info if different
    if (!formData.isOwnerSameAsRequester) {
      if (!formData.ownerLastName || !formData.ownerFirstName) {
        return false;
      }
    }
    
    // Check location
    if (!formData.sectionType || !formData.province) {
      return false;
    }
    
    if (formData.sectionType === 'urbaine') {
      if (!formData.ville || !formData.commune || !formData.quartier) {
        return false;
      }
    } else if (formData.sectionType === 'rurale') {
      if (!formData.territoire || !formData.collectivite) {
        return false;
      }
    }
    
    return true;
  };

  const handleProceedToPayment = () => {
    if (!user) {
      setShowQuickAuth(true);
      return;
    }
    
    if (!isFormValid()) {
      toast({ title: "Formulaire incomplet", description: "Veuillez remplir tous les champs obligatoires", variant: "destructive" });
      return;
    }
    
    setShowPayment(true);
  };

  const handlePaymentSuccess = async () => {
    const result = await submitRequest({
      ...formData,
      requesterIdDocumentFile: requesterIdFile,
      ownerIdDocumentFile: ownerIdFile,
      proofOfOwnershipFile: proofOfOwnershipFile,
      gpsCoordinates: gpsCoordinates,
      parcelSides: parcelSides
    });
    
    if (result.success) {
      setSavedReferenceNumber(result.referenceNumber || '');
      setShowPayment(false);
      setShowSuccess(true);
    }
  };

  const handleClose = () => {
    setFormData({
      requesterType: 'owner',
      requesterLastName: '',
      requesterFirstName: '',
      requesterMiddleName: '',
      requesterPhone: '',
      requesterEmail: '',
      isOwnerSameAsRequester: true,
      sectionType: '',
      province: '',
      selectedFees: []
    });
    setRequesterIdFile(null);
    setOwnerIdFile(null);
    setProofOfOwnershipFile(null);
    setActiveTab('requester');
    setShowPayment(false);
    setShowSuccess(false);
    onOpenChange(false);
  };

  const totalAmount = calculateTotal(formData.selectedFees);

  // Payment view
  if (showPayment) {
    const cartItem: CartItem = {
      id: `land-title-${Date.now()}`,
      title: 'Demande de titre foncier',
      price: totalAmount,
      description: `Demande de titre foncier - ${formData.province}`
    };

    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[10000] bg-black/80" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-[10000] w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] border bg-background p-6 shadow-2xl rounded-xl max-h-[90vh] overflow-y-auto">
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <DialogPrimitive.Title className="text-xl font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Paiement - Titre foncier
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-sm text-muted-foreground">
                  Montant total : {totalAmount} USD
                </DialogPrimitive.Description>
              </div>
              
              <MobileMoneyPayment
                items={[cartItem]}
                onSuccess={handlePaymentSuccess}
                onCancel={() => setShowPayment(false)}
              />
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </Dialog>
    );
  }

  // Success view
  if (showSuccess) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[10000] bg-black/80" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-[10000] w-[calc(100%-2rem)] max-w-md translate-x-[-50%] translate-y-[-50%] border bg-background p-6 shadow-2xl rounded-xl">
            <div className="text-center space-y-4">
              <div className="h-16 w-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <DialogPrimitive.Title className="text-xl font-semibold">
                Demande soumise avec succès !
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-muted-foreground">
                Votre demande de titre foncier a été enregistrée sous le numéro :
              </DialogPrimitive.Description>
              <div className="bg-primary/10 rounded-xl p-4">
                <p className="text-2xl font-bold text-primary">{savedReferenceNumber}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Vous recevrez une notification dès que votre demande sera traitée.
              </p>
              <Button onClick={handleClose} className="w-full">Fermer</Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[10000] bg-black/80" />
          <DialogPrimitive.Content className={cn(
            "fixed left-[50%] top-[50%] z-[10000] w-[calc(100%-1rem)] translate-x-[-50%] translate-y-[-50%] border bg-background shadow-2xl rounded-xl overflow-hidden",
            isMobile ? "max-w-[400px] max-h-[90vh]" : "max-w-2xl max-h-[85vh]"
          )}>
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                    <Building className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <DialogPrimitive.Title className="text-lg font-semibold">
                      Demande de titre foncier
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Description className="text-xs text-muted-foreground">
                      Obtenez votre certificat d'enregistrement
                    </DialogPrimitive.Description>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClose} className="rounded-full">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-140px)] p-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-4">
                  <TabsTrigger value="requester" className="text-xs gap-1">
                    <User className="h-3 w-3" />
                    <span className="hidden sm:inline">Demandeur</span>
                  </TabsTrigger>
                  <TabsTrigger value="location" className="text-xs gap-1">
                    <MapPin className="h-3 w-3" />
                    <span className="hidden sm:inline">Lieu</span>
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="text-xs gap-1">
                    <FileText className="h-3 w-3" />
                    <span className="hidden sm:inline">Documents</span>
                  </TabsTrigger>
                  <TabsTrigger value="payment" className="text-xs gap-1">
                    <CreditCard className="h-3 w-3" />
                    <span className="hidden sm:inline">Frais</span>
                  </TabsTrigger>
                </TabsList>

                {/* Tab: Requester */}
                <TabsContent value="requester" className="space-y-4">
                  <Card className="rounded-2xl">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <Label className="text-sm font-semibold">Informations du demandeur</Label>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Vous êtes *</Label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleInputChange('requesterType', 'owner')}
                            className={cn(
                              "flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all",
                              formData.requesterType === 'owner'
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            )}
                          >
                            Propriétaire
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInputChange('requesterType', 'representative')}
                            className={cn(
                              "flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all",
                              formData.requesterType === 'representative'
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            )}
                          >
                            Mandataire
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-sm">Nom *</Label>
                          <Input
                            value={formData.requesterLastName}
                            onChange={(e) => handleInputChange('requesterLastName', e.target.value)}
                            placeholder="Votre nom"
                            className="h-9 rounded-xl"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm">Prénom *</Label>
                          <Input
                            value={formData.requesterFirstName}
                            onChange={(e) => handleInputChange('requesterFirstName', e.target.value)}
                            placeholder="Votre prénom"
                            className="h-9 rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-sm">Post-nom</Label>
                          <Input
                            value={formData.requesterMiddleName}
                            onChange={(e) => handleInputChange('requesterMiddleName', e.target.value)}
                            placeholder="Post-nom"
                            className="h-9 rounded-xl"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm">Téléphone *</Label>
                          <Input
                            value={formData.requesterPhone}
                            onChange={(e) => handleInputChange('requesterPhone', e.target.value)}
                            placeholder="+243..."
                            className="h-9 rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-sm">Email</Label>
                        <Input
                          type="email"
                          value={formData.requesterEmail}
                          onChange={(e) => handleInputChange('requesterEmail', e.target.value)}
                          placeholder="votre@email.com"
                          className="h-9 rounded-xl"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {formData.requesterType === 'representative' && (
                    <Card className="rounded-2xl animate-fade-in">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <Label className="text-sm font-semibold">Informations du propriétaire</Label>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-sm">Nom *</Label>
                            <Input
                              value={formData.ownerLastName || ''}
                              onChange={(e) => handleInputChange('ownerLastName', e.target.value)}
                              placeholder="Nom du propriétaire"
                              className="h-9 rounded-xl"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm">Prénom *</Label>
                            <Input
                              value={formData.ownerFirstName || ''}
                              onChange={(e) => handleInputChange('ownerFirstName', e.target.value)}
                              placeholder="Prénom"
                              className="h-9 rounded-xl"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-sm">Post-nom</Label>
                            <Input
                              value={formData.ownerMiddleName || ''}
                              onChange={(e) => handleInputChange('ownerMiddleName', e.target.value)}
                              placeholder="Post-nom"
                              className="h-9 rounded-xl"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm">Téléphone</Label>
                            <Input
                              value={formData.ownerPhone || ''}
                              onChange={(e) => handleInputChange('ownerPhone', e.target.value)}
                              placeholder="+243..."
                              className="h-9 rounded-xl"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-sm">Statut juridique</Label>
                          <Select
                            value={formData.ownerLegalStatus || 'Personne physique'}
                            onValueChange={(value) => handleInputChange('ownerLegalStatus', value)}
                          >
                            <SelectTrigger className="h-9 rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Personne physique">Personne physique</SelectItem>
                              <SelectItem value="Personne morale">Personne morale</SelectItem>
                              <SelectItem value="Indivision">Indivision</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex justify-end pt-4">
                    <Button onClick={() => setActiveTab('location')} className="gap-2">
                      Suivant <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>

                {/* Tab: Location */}
                <TabsContent value="location" className="space-y-4">
                  <Card className="rounded-2xl">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center">
                          <MapPin className="h-4 w-4 text-primary" />
                        </div>
                        <Label className="text-sm font-semibold">Localisation de la parcelle</Label>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Type de section *</Label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleInputChange('sectionType', 'urbaine')}
                            className={cn(
                              "flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all",
                              formData.sectionType === 'urbaine'
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            )}
                          >
                            SU - Urbaine
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInputChange('sectionType', 'rurale')}
                            className={cn(
                              "flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all",
                              formData.sectionType === 'rurale'
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            )}
                          >
                            SR - Rurale
                          </button>
                        </div>
                      </div>

                      {formData.sectionType && (
                        <div className="space-y-1 animate-fade-in">
                          <Label className="text-sm">Province *</Label>
                          <Select
                            value={formData.province}
                            onValueChange={(value) => handleInputChange('province', value)}
                          >
                            <SelectTrigger className="h-9 rounded-xl">
                              <SelectValue placeholder="Sélectionner la province" />
                            </SelectTrigger>
                            <SelectContent>
                              {getAllProvinces().map(province => (
                                <SelectItem key={province} value={province}>{province}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {formData.sectionType === 'urbaine' && formData.province && (
                    <Card className="rounded-2xl animate-fade-in">
                      <CardContent className="p-4 space-y-3">
                        <Label className="text-sm font-semibold">Section Urbaine (SU)</Label>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-sm">Ville *</Label>
                            <Select
                              value={formData.ville}
                              onValueChange={(value) => handleInputChange('ville', value)}
                              disabled={availableVilles.length === 0}
                            >
                              <SelectTrigger className="h-9 rounded-xl">
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableVilles.map(ville => (
                                  <SelectItem key={ville} value={ville}>{ville}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm">Commune *</Label>
                            <Select
                              value={formData.commune}
                              onValueChange={(value) => handleInputChange('commune', value)}
                              disabled={!formData.ville || availableCommunes.length === 0}
                            >
                              <SelectTrigger className="h-9 rounded-xl">
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableCommunes.map(commune => (
                                  <SelectItem key={commune} value={commune}>{commune}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-sm">Quartier *</Label>
                            <Select
                              value={formData.quartier}
                              onValueChange={(value) => handleInputChange('quartier', value)}
                              disabled={!formData.commune}
                            >
                              <SelectTrigger className="h-9 rounded-xl">
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableQuartiers.map(quartier => (
                                  <SelectItem key={quartier} value={quartier}>{quartier}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm">Avenue</Label>
                            <Input
                              value={formData.avenue || ''}
                              onChange={(e) => handleInputChange('avenue', e.target.value)}
                              placeholder="Nom de l'avenue"
                              className="h-9 rounded-xl"
                              disabled={!formData.quartier}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {formData.sectionType === 'rurale' && formData.province && (
                    <Card className="rounded-2xl animate-fade-in">
                      <CardContent className="p-4 space-y-3">
                        <Label className="text-sm font-semibold">Section Rurale (SR)</Label>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-sm">Territoire *</Label>
                            <Select
                              value={formData.territoire}
                              onValueChange={(value) => handleInputChange('territoire', value)}
                              disabled={availableTerritoires.length === 0}
                            >
                              <SelectTrigger className="h-9 rounded-xl">
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableTerritoires.map(territoire => (
                                  <SelectItem key={territoire} value={territoire}>{territoire}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm">Collectivité *</Label>
                            <Select
                              value={formData.collectivite}
                              onValueChange={(value) => handleInputChange('collectivite', value)}
                              disabled={!formData.territoire || availableCollectivites.length === 0}
                            >
                              <SelectTrigger className="h-9 rounded-xl">
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableCollectivites.map(collectivite => (
                                  <SelectItem key={collectivite} value={collectivite}>{collectivite}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-sm">Groupement</Label>
                            <Input
                              value={formData.groupement || ''}
                              onChange={(e) => handleInputChange('groupement', e.target.value)}
                              placeholder="Nom du groupement"
                              className="h-9 rounded-xl"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm">Village</Label>
                            <Input
                              value={formData.village || ''}
                              onChange={(e) => handleInputChange('village', e.target.value)}
                              placeholder="Nom du village"
                              className="h-9 rounded-xl"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Map preview for GPS */}
                  {formData.sectionType && formData.province && (
                    <div className="space-y-3 pt-2">
                      <ParcelMapPreview
                        coordinates={gpsCoordinates}
                        onCoordinatesUpdate={setGpsCoordinates}
                        config={mapConfig}
                        enableDrawingMode={true}
                        parcelSides={parcelSides}
                        onParcelSidesUpdate={setParcelSides}
                        onSurfaceChange={(surface) => handleInputChange('areaSqm', surface)}
                      />
                    </div>
                  )}

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setActiveTab('requester')}>Précédent</Button>
                    <Button onClick={() => setActiveTab('documents')} className="gap-2">
                      Suivant <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>

                {/* Tab: Documents */}
                <TabsContent value="documents" className="space-y-4">
                  <Card className="rounded-2xl">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <Label className="text-sm font-semibold">Documents justificatifs</Label>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label className="text-sm">Pièce d'identité du demandeur</Label>
                          {!requesterIdFile ? (
                            <Input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file && file.size <= 10 * 1024 * 1024) {
                                  setRequesterIdFile(file);
                                }
                              }}
                              className="h-10 rounded-xl"
                            />
                          ) : (
                            <div className="flex items-center gap-2 p-2 bg-muted rounded-xl">
                              <FileText className="h-4 w-4 text-primary" />
                              <span className="text-sm flex-1 truncate">{requesterIdFile.name}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setRequesterIdFile(null)}
                                className="h-6 w-6 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {formData.requesterType === 'representative' && (
                          <div className="space-y-1 animate-fade-in">
                            <Label className="text-sm">Pièce d'identité du propriétaire</Label>
                            {!ownerIdFile ? (
                              <Input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file && file.size <= 10 * 1024 * 1024) {
                                    setOwnerIdFile(file);
                                  }
                                }}
                                className="h-10 rounded-xl"
                              />
                            ) : (
                              <div className="flex items-center gap-2 p-2 bg-muted rounded-xl">
                                <FileText className="h-4 w-4 text-primary" />
                                <span className="text-sm flex-1 truncate">{ownerIdFile.name}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setOwnerIdFile(null)}
                                  className="h-6 w-6 p-0"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="space-y-1">
                          <Label className="text-sm">Preuve de propriété (acte de vente, héritage, etc.)</Label>
                          {!proofOfOwnershipFile ? (
                            <Input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file && file.size <= 10 * 1024 * 1024) {
                                  setProofOfOwnershipFile(file);
                                }
                              }}
                              className="h-10 rounded-xl"
                            />
                          ) : (
                            <div className="flex items-center gap-2 p-2 bg-muted rounded-xl">
                              <FileText className="h-4 w-4 text-primary" />
                              <span className="text-sm flex-1 truncate">{proofOfOwnershipFile.name}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setProofOfOwnershipFile(null)}
                                className="h-6 w-6 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setActiveTab('location')}>Précédent</Button>
                    <Button onClick={() => setActiveTab('payment')} className="gap-2">
                      Suivant <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>

                {/* Tab: Payment */}
                <TabsContent value="payment" className="space-y-4">
                  <Card className="rounded-2xl">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center">
                          <CreditCard className="h-4 w-4 text-primary" />
                        </div>
                        <Label className="text-sm font-semibold">Frais de dossier</Label>
                      </div>

                      {loadingFees ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Mandatory fees */}
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase">Frais obligatoires</p>
                            {getMandatoryFees().map(fee => (
                              <div key={fee.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                                <div>
                                  <p className="text-sm font-medium">{fee.fee_name}</p>
                                  {fee.description && (
                                    <p className="text-xs text-muted-foreground">{fee.description}</p>
                                  )}
                                </div>
                                <p className="text-sm font-semibold">{fee.amount_usd} USD</p>
                              </div>
                            ))}
                          </div>

                          {/* Optional fees */}
                          {getOptionalFees().length > 0 && (
                            <div className="space-y-2 pt-2 border-t">
                              <p className="text-xs font-medium text-muted-foreground uppercase">Frais optionnels</p>
                              {getOptionalFees().map(fee => (
                                <div
                                  key={fee.id}
                                  className={cn(
                                    "flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all",
                                    formData.selectedFees.includes(fee.id)
                                      ? "border-primary bg-primary/5"
                                      : "border-transparent bg-muted/30 hover:bg-muted/50"
                                  )}
                                  onClick={() => toggleFee(fee.id)}
                                >
                                  <div className="flex items-center gap-3">
                                    <Checkbox checked={formData.selectedFees.includes(fee.id)} />
                                    <div>
                                      <p className="text-sm font-medium">{fee.fee_name}</p>
                                      {fee.description && (
                                        <p className="text-xs text-muted-foreground">{fee.description}</p>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-sm font-semibold">{fee.amount_usd} USD</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Total */}
                          <div className="flex items-center justify-between p-4 bg-primary/10 rounded-xl mt-4">
                            <p className="text-base font-semibold">Total à payer</p>
                            <p className="text-xl font-bold text-primary">{totalAmount} USD</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setActiveTab('documents')}>Précédent</Button>
                    <Button
                      onClick={handleProceedToPayment}
                      disabled={loading || !isFormValid()}
                      className="gap-2 bg-gradient-to-r from-primary to-primary/80"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Payer {totalAmount} USD
                          <ChevronRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </Dialog>

      {/* Quick Auth Dialog */}
      <QuickAuthDialog
        open={showQuickAuth}
        onOpenChange={setShowQuickAuth}
        onSuccess={() => {
          setShowQuickAuth(false);
          handleProceedToPayment();
        }}
      />
    </>
  );
};

export default LandTitleRequestDialog;
