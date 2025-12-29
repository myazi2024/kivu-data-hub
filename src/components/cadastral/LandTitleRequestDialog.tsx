import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, CheckCircle2, Upload, X, Info, ChevronRight, User, MapPin, FileText, CreditCard, Building, Home } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  
  // Road sides for dimensions panel
  const [roadSides, setRoadSides] = useState<Array<any>>([]);

  // Construction type state
  const [constructionType, setConstructionType] = useState<string>('');
  const [constructionNature, setConstructionNature] = useState<string>('');
  const [constructionMaterials, setConstructionMaterials] = useState<string>('');
  const [declaredUsage, setDeclaredUsage] = useState<string>('');
  const [availableConstructionNatures, setAvailableConstructionNatures] = useState<string[]>([]);
  const [availableDeclaredUsages, setAvailableDeclaredUsages] = useState<string[]>([]);

  // Construction type -> Nature logic
  useEffect(() => {
    if (!constructionType) {
      setAvailableConstructionNatures([]);
      setConstructionNature('');
      setAvailableDeclaredUsages([]);
      setDeclaredUsage('');
      return;
    }

    let natures: string[] = [];
    
    switch (constructionType) {
      case 'Résidentielle':
      case 'Commerciale':
      case 'Industrielle':
        natures = ['Durable', 'Semi-durable', 'Précaire'];
        break;
      case 'Agricole':
        natures = ['Durable', 'Semi-durable', 'Précaire', 'Non bâti'];
        break;
      case 'Terrain nu':
        natures = ['Non bâti'];
        break;
      default:
        natures = [];
    }
    
    setAvailableConstructionNatures(natures);
    
    if (constructionNature && !natures.includes(constructionNature)) {
      setConstructionNature('');
    }
  }, [constructionType]);

  // Construction type + Nature -> Usage logic
  useEffect(() => {
    if (!constructionType || !constructionNature) {
      setAvailableDeclaredUsages([]);
      setDeclaredUsage('');
      return;
    }

    let usages: string[] = [];
    
    if (constructionNature === 'Non bâti') {
      usages = ['Terrain vacant', 'Agriculture', 'Parking'];
    } else if (constructionType === 'Résidentielle') {
      if (constructionNature === 'Durable') {
        usages = ['Habitation', 'Usage mixte'];
      } else if (constructionNature === 'Semi-durable') {
        usages = ['Habitation', 'Usage mixte'];
      } else if (constructionNature === 'Précaire') {
        usages = ['Habitation'];
      }
    } else if (constructionType === 'Commerciale') {
      if (constructionNature === 'Durable') {
        usages = ['Commerce', 'Bureau', 'Usage mixte', 'Entrepôt'];
      } else if (constructionNature === 'Semi-durable') {
        usages = ['Commerce', 'Bureau', 'Entrepôt'];
      } else if (constructionNature === 'Précaire') {
        usages = ['Commerce'];
      }
    } else if (constructionType === 'Industrielle') {
      if (constructionNature === 'Durable') {
        usages = ['Industrie', 'Entrepôt'];
      } else if (constructionNature === 'Semi-durable') {
        usages = ['Industrie', 'Entrepôt'];
      } else if (constructionNature === 'Précaire') {
        usages = ['Industrie'];
      }
    } else if (constructionType === 'Agricole') {
      if (constructionNature === 'Non bâti') {
        usages = ['Agriculture'];
      } else {
        usages = ['Agriculture', 'Habitation'];
      }
    } else if (constructionType === 'Terrain nu') {
      usages = ['Terrain vacant', 'Agriculture', 'Parking'];
    }
    
    setAvailableDeclaredUsages(usages);
    
    if (declaredUsage && !usages.includes(declaredUsage)) {
      setDeclaredUsage('');
    }
  }, [constructionType, constructionNature]);

  // Pre-fill with user info
  useEffect(() => {
    if (profile) {
      const nameParts = (profile.full_name || '').split(' ');
      setFormData(prev => ({
        ...prev,
        requesterLastName: nameParts[0] || '',
        requesterFirstName: nameParts.slice(1).join(' ') || '',
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
      setAvailableCommunes(getCommunesForVille(formData.province, formData.ville));
    }
  }, [formData.ville, formData.province]);

  useEffect(() => {
    if (formData.commune && formData.ville) {
      setAvailableQuartiers(getQuartiersForCommune(formData.province, formData.ville, formData.commune));
    }
  }, [formData.commune, formData.province, formData.ville]);

  useEffect(() => {
    if (formData.territoire) {
      setAvailableCollectivites(getCollectivitesForTerritoire(formData.province, formData.territoire));
    }
  }, [formData.territoire, formData.province]);

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
        <DialogPortal>
          <DialogOverlay className="z-[1100]" />
          <DialogContent className={`z-[1100] ${isMobile ? 'w-[92vw] max-w-[360px] max-h-[88vh] rounded-2xl' : 'max-w-md rounded-2xl'} p-4 overflow-hidden`}>
            <DialogHeader className="pb-2">
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <CreditCard className="h-4 w-4 text-primary" />
                </div>
                Paiement - Titre foncier
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Montant total : {totalAmount} USD
              </DialogDescription>
            </DialogHeader>
            
            <MobileMoneyPayment
              item={cartItem}
              currency="USD"
              onPaymentSuccess={handlePaymentSuccess}
            />
            <Button 
              variant="outline" 
              onClick={() => setShowPayment(false)} 
              className="w-full h-8 text-xs rounded-lg mt-2"
            >
              Annuler
            </Button>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    );
  }

  // Success view
  if (showSuccess) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogPortal>
          <DialogOverlay className="z-[1100]" />
          <DialogContent className={`z-[1100] ${isMobile ? 'w-[92vw] max-w-[360px] max-h-[88vh] rounded-2xl' : 'max-w-md rounded-2xl'} p-4 overflow-hidden`}>
            <div className="space-y-3 text-center py-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              
              <div>
                <h3 className="font-semibold text-sm">Demande soumise avec succès</h3>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Votre demande de titre foncier a été enregistrée
                </p>
              </div>

              <Card className="bg-muted/50 border-0 text-left rounded-lg">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Référence</span>
                    <span className="font-mono font-bold text-xs text-primary">{savedReferenceNumber}</span>
                  </div>
                </CardContent>
              </Card>
              
              <p className="text-[10px] text-muted-foreground">
                Vous recevrez une notification dès que votre demande sera traitée.
              </p>
              <Button onClick={handleClose} className="w-full h-8 text-xs rounded-lg">Fermer</Button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogPortal>
          <DialogOverlay className="z-[1100]" />
          <DialogContent className={`z-[1100] ${isMobile ? 'w-[92vw] max-w-[360px] max-h-[88vh] rounded-2xl' : 'max-w-md rounded-2xl'} p-4 overflow-hidden`}>
            <DialogHeader className="pb-2">
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <Building className="h-4 w-4 text-primary" />
                </div>
                Demande de titre foncier
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Obtenez votre certificat d'enregistrement
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="h-[65vh] sm:h-[70vh]">
              <div className="space-y-4 pr-2">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-5 mb-4">
                    <TabsTrigger value="requester" className="text-xs gap-1">
                      <User className="h-3 w-3" />
                      <span className="hidden sm:inline">Demandeur</span>
                    </TabsTrigger>
                    <TabsTrigger value="location" className="text-xs gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="hidden sm:inline">Lieu</span>
                    </TabsTrigger>
                    <TabsTrigger value="valorisation" className="text-xs gap-1">
                      <Home className="h-3 w-3" />
                      <span className="hidden sm:inline">Mise en valeur</span>
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
                  <Card className="border-2 rounded-lg">
                    <CardContent className="p-3 space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-primary/10 rounded-lg">
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
                              "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all",
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
                              "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all",
                              formData.requesterType === 'representative'
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            )}
                          >
                            Mandataire
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <Label className="text-sm">Nom *</Label>
                          <Input
                            value={formData.requesterLastName}
                            onChange={(e) => handleInputChange('requesterLastName', e.target.value)}
                            placeholder="Votre nom"
                            className="h-9 text-sm rounded-lg border"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm">Prénom *</Label>
                          <Input
                            value={formData.requesterFirstName}
                            onChange={(e) => handleInputChange('requesterFirstName', e.target.value)}
                            placeholder="Votre prénom"
                            className="h-9 text-sm rounded-lg border"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <Label className="text-sm">Post-nom</Label>
                          <Input
                            value={formData.requesterMiddleName}
                            onChange={(e) => handleInputChange('requesterMiddleName', e.target.value)}
                            placeholder="Post-nom"
                            className="h-9 text-sm rounded-lg border"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm">Téléphone *</Label>
                          <Input
                            value={formData.requesterPhone}
                            onChange={(e) => handleInputChange('requesterPhone', e.target.value)}
                            placeholder="+243..."
                            className="h-9 text-sm rounded-lg border"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm">Email</Label>
                        <Input
                          type="email"
                          value={formData.requesterEmail}
                          onChange={(e) => handleInputChange('requesterEmail', e.target.value)}
                          placeholder="votre@email.com"
                          className="h-9 text-sm rounded-lg border"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {formData.requesterType === 'representative' && (
                    <Card className="border-2 border-dashed rounded-lg">
                      <CardContent className="p-3 space-y-3">
                        <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                          Informations du propriétaire
                        </h4>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label className="text-sm">Nom *</Label>
                            <Input
                              value={formData.ownerLastName || ''}
                              onChange={(e) => handleInputChange('ownerLastName', e.target.value)}
                              placeholder="Nom du propriétaire"
                              className="h-9 text-sm rounded-lg border"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm">Prénom *</Label>
                            <Input
                              value={formData.ownerFirstName || ''}
                              onChange={(e) => handleInputChange('ownerFirstName', e.target.value)}
                              placeholder="Prénom"
                              className="h-9 text-sm rounded-lg border"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label className="text-sm">Post-nom</Label>
                            <Input
                              value={formData.ownerMiddleName || ''}
                              onChange={(e) => handleInputChange('ownerMiddleName', e.target.value)}
                              placeholder="Post-nom"
                              className="h-9 text-sm rounded-lg border"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm">Téléphone</Label>
                            <Input
                              value={formData.ownerPhone || ''}
                              onChange={(e) => handleInputChange('ownerPhone', e.target.value)}
                              placeholder="+243..."
                              className="h-9 text-sm rounded-lg border"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-sm">Statut juridique</Label>
                          <Select
                            value={formData.ownerLegalStatus || 'Personne physique'}
                            onValueChange={(value) => handleInputChange('ownerLegalStatus', value)}
                          >
                            <SelectTrigger className="h-9 text-sm rounded-lg border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-lg">
                              <SelectItem value="Personne physique" className="text-sm py-2">Personne physique</SelectItem>
                              <SelectItem value="Personne morale" className="text-sm py-2">Personne morale</SelectItem>
                              <SelectItem value="Indivision" className="text-sm py-2">Indivision</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex justify-end pt-4">
                    <Button onClick={() => setActiveTab('location')} className="h-8 text-xs rounded-lg gap-2">
                      Suivant <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>

                {/* Tab: Location */}
                <TabsContent value="location" className="space-y-4">
                  <Card className="border-2 rounded-lg">
                    <CardContent className="p-3 space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-primary/10 rounded-lg">
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
                              "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all",
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
                              "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all",
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
                        <div className="space-y-1.5 animate-fade-in">
                          <Label className="text-sm">Province *</Label>
                          <Select
                            value={formData.province}
                            onValueChange={(value) => handleInputChange('province', value)}
                          >
                            <SelectTrigger className="h-9 text-sm rounded-lg border">
                              <SelectValue placeholder="Sélectionner la province" />
                            </SelectTrigger>
                            <SelectContent className="rounded-lg">
                              {getAllProvinces().map(province => (
                                <SelectItem key={province} value={province} className="text-sm py-2">{province}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {formData.sectionType === 'urbaine' && formData.province && (
                    <Card className="border-2 rounded-lg animate-fade-in">
                      <CardContent className="p-3 space-y-3">
                        <Label className="text-sm font-semibold">Section Urbaine (SU)</Label>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label className="text-sm">Ville *</Label>
                            <Select
                              value={formData.ville}
                              onValueChange={(value) => handleInputChange('ville', value)}
                              disabled={availableVilles.length === 0}
                            >
                              <SelectTrigger className="h-9 text-sm rounded-lg border">
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg">
                                {availableVilles.map(ville => (
                                  <SelectItem key={ville} value={ville} className="text-sm py-2">{ville}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm">Commune *</Label>
                            <Select
                              value={formData.commune}
                              onValueChange={(value) => handleInputChange('commune', value)}
                              disabled={!formData.ville || availableCommunes.length === 0}
                            >
                              <SelectTrigger className="h-9 text-sm rounded-lg border">
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg">
                                {availableCommunes.map(commune => (
                                  <SelectItem key={commune} value={commune} className="text-sm py-2">{commune}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label className="text-sm">Quartier *</Label>
                            <Select
                              value={formData.quartier}
                              onValueChange={(value) => handleInputChange('quartier', value)}
                              disabled={!formData.commune}
                            >
                              <SelectTrigger className="h-9 text-sm rounded-lg border">
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg">
                                {availableQuartiers.map(quartier => (
                                  <SelectItem key={quartier} value={quartier} className="text-sm py-2">{quartier}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm">Avenue</Label>
                            <Input
                              value={formData.avenue || ''}
                              onChange={(e) => handleInputChange('avenue', e.target.value)}
                              placeholder="Nom de l'avenue"
                              className="h-9 text-sm rounded-lg border"
                              disabled={!formData.quartier}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {formData.sectionType === 'rurale' && formData.province && (
                    <Card className="border-2 rounded-lg animate-fade-in">
                      <CardContent className="p-3 space-y-3">
                        <Label className="text-sm font-semibold">Section Rurale (SR)</Label>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label className="text-sm">Territoire *</Label>
                            <Select
                              value={formData.territoire}
                              onValueChange={(value) => handleInputChange('territoire', value)}
                              disabled={availableTerritoires.length === 0}
                            >
                              <SelectTrigger className="h-9 text-sm rounded-lg border">
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg">
                                {availableTerritoires.map(territoire => (
                                  <SelectItem key={territoire} value={territoire} className="text-sm py-2">{territoire}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm">Collectivité *</Label>
                            <Select
                              value={formData.collectivite}
                              onValueChange={(value) => handleInputChange('collectivite', value)}
                              disabled={!formData.territoire || availableCollectivites.length === 0}
                            >
                              <SelectTrigger className="h-9 text-sm rounded-lg border">
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg">
                                {availableCollectivites.map(collectivite => (
                                  <SelectItem key={collectivite} value={collectivite} className="text-sm py-2">{collectivite}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label className="text-sm">Groupement</Label>
                            <Input
                              value={formData.groupement || ''}
                              onChange={(e) => handleInputChange('groupement', e.target.value)}
                              placeholder="Nom du groupement"
                              className="h-9 text-sm rounded-lg border"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm">Village</Label>
                            <Input
                              value={formData.village || ''}
                              onChange={(e) => handleInputChange('village', e.target.value)}
                              placeholder="Nom du village"
                              className="h-9 text-sm rounded-lg border"
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
                        roadSides={roadSides}
                        onRoadSidesChange={setRoadSides}
                      />
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={() => setActiveTab('requester')} className="flex-1 h-8 text-xs rounded-lg">
                      Précédent
                    </Button>
                    <Button onClick={() => setActiveTab('valorisation')} className="flex-1 h-8 text-xs rounded-lg gap-2">
                      Suivant <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>

                {/* Tab: Valorisation */}
                <TabsContent value="valorisation" className="space-y-4">
                  <Card className="border-2 rounded-lg">
                    <CardContent className="p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-primary/10 rounded-lg">
                            <Home className="h-4 w-4 text-primary" />
                          </div>
                          <Label className="text-sm font-semibold">Mise en valeur de la parcelle</Label>
                        </div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 rounded-full hover:bg-transparent">
                              <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 rounded-lg" align="end">
                            <div className="space-y-2 text-xs">
                              <h4 className="font-semibold text-sm">Mise en valeur</h4>
                              <p className="text-muted-foreground">
                                Renseignez les informations sur la construction existante ou le type de terrain.
                              </p>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Type et Nature - côte-à-côte */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Type</Label>
                          <Select 
                            value={constructionType}
                            onValueChange={(value) => {
                              setConstructionType(value);
                              if (value === 'Terrain nu') {
                                setConstructionMaterials('');
                              }
                            }}
                          >
                            <SelectTrigger className="h-9 text-sm rounded-lg border">
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent className="rounded-lg">
                              <SelectItem value="Résidentielle">Résidentielle</SelectItem>
                              <SelectItem value="Commerciale">Commerciale</SelectItem>
                              <SelectItem value="Industrielle">Industrielle</SelectItem>
                              <SelectItem value="Agricole">Agricole</SelectItem>
                              <SelectItem value="Terrain nu">Terrain nu</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Nature</Label>
                          <Select 
                            value={constructionNature}
                            onValueChange={setConstructionNature}
                            disabled={!constructionType}
                          >
                            <SelectTrigger className="h-9 text-sm rounded-lg border">
                              <SelectValue placeholder={!constructionType ? "Type d'abord" : "Sélectionner"} />
                            </SelectTrigger>
                            <SelectContent className="rounded-lg">
                              {availableConstructionNatures.map((nature) => (
                                <SelectItem key={nature} value={nature}>{nature}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Matériaux et Usage - côte-à-côte */}
                      <div className="grid grid-cols-2 gap-2">
                        {constructionType && constructionType !== 'Terrain nu' ? (
                          <div className="space-y-1.5">
                            <Label className="text-sm font-medium">Matériaux</Label>
                            <Select 
                              value={constructionMaterials}
                              onValueChange={setConstructionMaterials}
                            >
                              <SelectTrigger className="h-9 text-sm rounded-lg border">
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg">
                                <SelectItem value="Béton armé">Béton armé</SelectItem>
                                <SelectItem value="Briques cuites">Briques cuites</SelectItem>
                                <SelectItem value="Briques adobes">Briques adobes</SelectItem>
                                <SelectItem value="Parpaings">Parpaings</SelectItem>
                                <SelectItem value="Bois">Bois</SelectItem>
                                <SelectItem value="Tôles">Tôles</SelectItem>
                                <SelectItem value="Semi-dur">Semi-dur</SelectItem>
                                <SelectItem value="Mixte">Mixte</SelectItem>
                                <SelectItem value="Autre">Autre</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div />
                        )}

                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Usage</Label>
                          <Select 
                            value={declaredUsage}
                            onValueChange={setDeclaredUsage}
                            disabled={!constructionType || !constructionNature}
                          >
                            <SelectTrigger className="h-9 text-sm rounded-lg border">
                              <SelectValue placeholder={
                                !constructionType || !constructionNature
                                  ? "Type et nature d'abord" 
                                  : "Sélectionner"
                              } />
                            </SelectTrigger>
                            <SelectContent className="rounded-lg">
                              {availableDeclaredUsages.map((usage) => (
                                <SelectItem key={usage} value={usage}>{usage}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={() => setActiveTab('location')} className="flex-1 h-8 text-xs rounded-lg">
                      Précédent
                    </Button>
                    <Button onClick={() => setActiveTab('documents')} className="flex-1 h-8 text-xs rounded-lg gap-2">
                      Suivant <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>

                {/* Tab: Documents */}
                <TabsContent value="documents" className="space-y-4">
                  <Card className="border-2 rounded-lg">
                    <CardContent className="p-3 space-y-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        Documents justificatifs
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Pièces d'identité, preuves de propriété (max 10MB/fichier)
                      </p>

                      <div className="space-y-3">
                        <div className="space-y-1.5">
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
                              className="h-9 text-sm rounded-lg border"
                            />
                          ) : (
                            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                              <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="flex-1 truncate text-sm">{requesterIdFile.name}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setRequesterIdFile(null)}
                                className="h-7 w-7 rounded-lg hover:bg-destructive/10"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {formData.requesterType === 'representative' && (
                          <div className="space-y-1.5 animate-fade-in">
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
                                className="h-9 text-sm rounded-lg border"
                              />
                            ) : (
                              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                                <span className="flex-1 truncate text-sm">{ownerIdFile.name}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setOwnerIdFile(null)}
                                  className="h-7 w-7 rounded-lg hover:bg-destructive/10"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="space-y-1.5">
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
                              className="h-9 text-sm rounded-lg border"
                            />
                          ) : (
                            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                              <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="flex-1 truncate text-sm">{proofOfOwnershipFile.name}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setProofOfOwnershipFile(null)}
                                className="h-7 w-7 rounded-lg hover:bg-destructive/10"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={() => setActiveTab('location')} className="flex-1 h-8 text-xs rounded-lg">
                      Précédent
                    </Button>
                    <Button onClick={() => setActiveTab('payment')} className="flex-1 h-8 text-xs rounded-lg gap-2">
                      Suivant <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>

                {/* Tab: Payment */}
                <TabsContent value="payment" className="space-y-4">
                  <Card className="border-2 rounded-lg">
                    <CardContent className="p-3 space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-primary/10 rounded-lg">
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
                              <div key={fee.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                <div>
                                  <p className="text-sm font-medium">{fee.fee_name}</p>
                                  {fee.description && (
                                    <p className="text-xs text-muted-foreground">{fee.description}</p>
                                  )}
                                </div>
                                <p className="text-sm font-semibold whitespace-nowrap">${fee.amount_usd}</p>
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
                                    "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all",
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
                                  <p className="text-sm font-semibold whitespace-nowrap">${fee.amount_usd}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Total */}
                  <Card className="border rounded-lg">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                        <span className="font-semibold text-sm">Total à payer</span>
                        <span className="text-lg font-bold text-primary">${totalAmount}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={() => setActiveTab('documents')} className="flex-1 h-8 text-xs rounded-lg">
                      Précédent
                    </Button>
                    <Button
                      onClick={handleProceedToPayment}
                      disabled={loading || !isFormValid()}
                      className="flex-1 h-8 text-xs rounded-lg"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Payer ${totalAmount}
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      {/* Quick Auth Dialog */}
      <QuickAuthDialog
        open={showQuickAuth}
        onOpenChange={setShowQuickAuth}
        onAuthSuccess={() => {
          setShowQuickAuth(false);
          handleProceedToPayment();
        }}
      />
    </>
  );
};

export default LandTitleRequestDialog;
