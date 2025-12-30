import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, CheckCircle2, Upload, X, Info, ChevronRight, User, MapPin, FileText, CreditCard, Building, Home, Award, AlertCircle, Check, ClipboardCheck, TrendingUp } from 'lucide-react';
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
import { useLandTitleDynamicFees } from '@/hooks/useLandTitleDynamicFees';
import { 
  deduceLandTitleType as deduceLandTitle, 
  DeducedLandTitle,
  NATIONALITY_OPTIONS,
  OCCUPATION_DURATION_OPTIONS,
  validateDeductionInput
} from '@/utils/landTitleDeduction';
import { QuickAuthDialog } from './QuickAuthDialog';
import MobileMoneyPayment from '@/components/payment/MobileMoneyPayment';
import { CartItem } from '@/hooks/useCart';
import { ParcelMapPreview } from './ParcelMapPreview';
import { useMapConfig } from '@/hooks/useMapConfig';
import LandTitleReviewTab from './LandTitleReviewTab';

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
    submitRequest 
  } = useLandTitleRequest();
  
  // Frais dynamiques
  const {
    loading: loadingDynamicFees,
    calculateFees: calculateDynamicFees
  } = useLandTitleDynamicFees();
  
  const [activeTab, setActiveTab] = useState('requester');
  const [showQuickAuth, setShowQuickAuth] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedReferenceNumber, setSavedReferenceNumber] = useState<string>('');
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  
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
  
  // New fields for land title deduction
  const [nationality, setNationality] = useState<'congolais' | 'etranger' | ''>('');
  const [occupationDuration, setOccupationDuration] = useState<'perpetuel' | 'long_terme' | 'temporaire' | ''>('');
  
  // Land title type deduction
  const [valorisationValidated, setValorisationValidated] = useState(false);
  const [deducedTitleType, setDeducedTitleType] = useState<DeducedLandTitle | null>(null);

  const handleValidateValorisation = () => {
    const validation = validateDeductionInput({
      sectionType: formData.sectionType as 'urbaine' | 'rurale' | '',
      constructionType,
      constructionNature,
      declaredUsage,
      nationality,
      occupationDuration
    });

    if (!validation.isValid) {
      toast({
        title: "Données incomplètes",
        description: `Veuillez remplir: ${validation.missingFields.join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    // Check for recommendations
    if (validation.recommendations.length > 0 && !nationality) {
      toast({
        title: "Données incomplètes",
        description: "Veuillez indiquer votre nationalité et la durée d'occupation souhaitée",
        variant: "destructive"
      });
      return;
    }
    
    const deduced = deduceLandTitle({
      sectionType: formData.sectionType as 'urbaine' | 'rurale' | '',
      constructionType,
      constructionNature,
      declaredUsage,
      nationality,
      occupationDuration,
      areaSqm: formData.areaSqm
    });
    
    setDeducedTitleType(deduced);
    setValorisationValidated(true);
    
    if (deduced) {
      toast({
        title: "Données validées",
        description: `Vous pourrez obtenir : ${deduced.label}`,
      });
    }
  };

  // Reset validation when construction data changes
  useEffect(() => {
    setValorisationValidated(false);
    setDeducedTitleType(null);
  }, [constructionType, constructionNature, declaredUsage, nationality, occupationDuration, formData.sectionType]);

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
      toast({
        title: "Formulaire incomplet",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
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

  const handleCloseRequest = () => {
    // If user has entered any data, show confirmation
    const hasData = formData.requesterLastName || 
                   formData.requesterFirstName || 
                   formData.requesterPhone ||
                   formData.province ||
                   requesterIdFile || 
                   ownerIdFile || 
                   proofOfOwnershipFile;
    
    if (hasData) {
      setShowCloseConfirmation(true);
    } else {
      handleConfirmClose();
    }
  };

  const handleConfirmClose = () => {
    setShowCloseConfirmation(false);
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

  // Calcul dynamique des frais basé sur le titre déduit
  const calculatedFeesResult = useMemo(() => {
    return calculateDynamicFees(
      deducedTitleType,
      formData.sectionType as 'urbaine' | 'rurale' | '',
      formData.areaSqm
    );
  }, [deducedTitleType, formData.sectionType, formData.areaSqm, calculateDynamicFees]);

  const totalAmount = calculatedFeesResult.totalAmount;


  // Payment view
  if (showPayment) {
    const cartItem: CartItem = {
      id: `land-title-${Date.now()}`,
      title: 'Demande de titre foncier',
      price: totalAmount,
      description: `Demande de titre foncier - ${formData.province}`
    };

    return (
      <Dialog open={open} onOpenChange={handleConfirmClose}>
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
              className="w-full h-8 text-xs rounded-xl mt-2"
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
      <Dialog open={open} onOpenChange={handleConfirmClose}>
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
              <Button onClick={handleConfirmClose} className="w-full h-8 text-xs rounded-xl">Fermer</Button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    );
  }

  return (
    <>
      {/* Confirmation dialog for closing */}
      <AlertDialog open={showCloseConfirmation} onOpenChange={setShowCloseConfirmation}>
        <AlertDialogContent className={cn(
          "z-[99999]",
          isMobile && "w-[90vw] max-w-[320px] rounded-2xl p-4"
        )}>
          <AlertDialogHeader className={isMobile ? "space-y-1" : ""}>
            <AlertDialogTitle className={isMobile ? "text-base" : ""}>
              Fermer le formulaire ?
            </AlertDialogTitle>
            <AlertDialogDescription className={isMobile ? "text-xs" : ""}>
              Vous avez des données non enregistrées. Êtes-vous sûr de vouloir fermer ? Toutes les informations seront perdues.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isMobile ? "flex-row gap-2 mt-3" : ""}>
            <AlertDialogCancel className={isMobile ? "flex-1 h-9 text-xs rounded-xl mt-0" : ""}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmClose} 
              className={cn(
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                isMobile && "flex-1 h-9 text-xs rounded-xl"
              )}
            >
              Fermer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={open} onOpenChange={handleCloseRequest}>
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
                  <TabsList className="grid w-full grid-cols-6 mb-4">
                    <TabsTrigger value="requester" className="text-xs gap-1.5">
                      <User className="h-4 w-4 stroke-[2.5]" />
                      <span className="hidden sm:inline">Demandeur</span>
                    </TabsTrigger>
                    <TabsTrigger value="location" className="text-xs gap-1.5">
                      <MapPin className="h-4 w-4 stroke-[2.5]" />
                      <span className="hidden sm:inline">Lieu</span>
                    </TabsTrigger>
                    <TabsTrigger value="valorisation" className="text-xs gap-1.5">
                      <Home className="h-4 w-4 stroke-[2.5]" />
                      <span className="hidden sm:inline">Mise en valeur</span>
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="text-xs gap-1.5">
                      <FileText className="h-4 w-4 stroke-[2.5]" />
                      <span className="hidden sm:inline">Documents</span>
                    </TabsTrigger>
                    <TabsTrigger value="payment" className="text-xs gap-1.5">
                      <CreditCard className="h-4 w-4 stroke-[2.5]" />
                      <span className="hidden sm:inline">Frais</span>
                    </TabsTrigger>
                    <TabsTrigger value="review" className="text-xs gap-1.5">
                      <ClipboardCheck className="h-4 w-4 stroke-[2.5]" />
                      <span className="hidden sm:inline">Envoi</span>
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
                    <Button onClick={() => setActiveTab('location')} className="h-8 text-xs rounded-xl gap-2">
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

                      <div className="space-y-1.5">
                        <Label className="text-sm">Province *</Label>
                        <Select
                          value={formData.province}
                          onValueChange={(value) => handleInputChange('province', value)}
                        >
                          <SelectTrigger className="h-9 text-sm rounded-xl border">
                            <SelectValue placeholder="Sélectionner la province" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl max-h-48 overflow-y-auto w-56">
                            {getAllProvinces().map(province => (
                              <SelectItem key={province} value={province} className="text-sm py-2 rounded-lg">{province}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.province && (
                        <div className="space-y-2 animate-fade-in">
                          <Label className="text-sm">Zone urbaine ou Zone rurale ? *</Label>
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
                              <SelectTrigger className="h-9 text-sm rounded-xl border">
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
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
                              <SelectTrigger className="h-9 text-sm rounded-xl border">
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
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
                              <SelectTrigger className="h-9 text-sm rounded-xl border">
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
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
                              <SelectTrigger className="h-9 text-sm rounded-xl border">
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
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
                              <SelectTrigger className="h-9 text-sm rounded-xl border">
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
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
                    <Button variant="outline" onClick={() => setActiveTab('requester')} className="flex-1 h-8 text-xs rounded-xl">
                      Précédent
                    </Button>
                    <Button onClick={() => setActiveTab('valorisation')} className="flex-1 h-8 text-xs rounded-xl gap-2">
                      Suivant <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>

                {/* Tab: Valorisation */}
                <TabsContent value="valorisation" className="space-y-4">
                  {/* Type de construction */}
                  <Card className="border rounded-xl">
                    <CardContent className="p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <Home className="h-4 w-4 text-muted-foreground" />
                          Mise en valeur
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 bg-muted rounded-full">
                          {formData.sectionType === 'urbaine' ? 'SU' : formData.sectionType === 'rurale' ? 'SR' : '—'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <Label className="text-sm">Type de construct. *</Label>
                          <Select 
                            value={constructionType}
                            onValueChange={(value) => {
                              setConstructionType(value);
                              if (value === 'Terrain nu') setConstructionMaterials('');
                            }}
                          >
                            <SelectTrigger className="h-11 text-sm rounded-xl border-2 focus:border-primary">
                              <SelectValue placeholder="Choisir le type" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="Résidentielle" className="text-sm py-2">Résidentielle</SelectItem>
                              <SelectItem value="Commerciale" className="text-sm py-2">Commerciale</SelectItem>
                              <SelectItem value="Industrielle" className="text-sm py-2">Industrielle</SelectItem>
                              <SelectItem value="Agricole" className="text-sm py-2">Agricole</SelectItem>
                              <SelectItem value="Terrain nu" className="text-sm py-2">Terrain nu</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-sm">Nature *</Label>
                          <Select 
                            value={constructionNature}
                            onValueChange={setConstructionNature}
                            disabled={!constructionType}
                          >
                            <SelectTrigger className={cn(
                              "h-11 text-sm rounded-xl border-2",
                              !constructionType ? "bg-muted/50 cursor-not-allowed" : "focus:border-primary"
                            )}>
                              <SelectValue placeholder={!constructionType ? "→ Type d'abord" : "Choisir"} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {availableConstructionNatures.map((nature) => (
                                <SelectItem key={nature} value={nature} className="text-sm py-2">{nature}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {constructionType && (
                        <div className="grid grid-cols-2 gap-2">
                          {constructionType !== 'Terrain nu' && (
                            <div className="space-y-1.5">
                              <Label className="text-sm">Matériaux</Label>
                              <Select value={constructionMaterials} onValueChange={setConstructionMaterials}>
                                <SelectTrigger className="h-11 text-sm rounded-xl border-2 focus:border-primary">
                                  <SelectValue placeholder="Choisir" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  <SelectItem value="Béton armé" className="text-sm py-2">Béton armé</SelectItem>
                                  <SelectItem value="Briques cuites" className="text-sm py-2">Briques cuites</SelectItem>
                                  <SelectItem value="Briques adobes" className="text-sm py-2">Briques adobes</SelectItem>
                                  <SelectItem value="Parpaings" className="text-sm py-2">Parpaings</SelectItem>
                                  <SelectItem value="Bois" className="text-sm py-2">Bois</SelectItem>
                                  <SelectItem value="Tôles" className="text-sm py-2">Tôles</SelectItem>
                                  <SelectItem value="Semi-dur" className="text-sm py-2">Semi-dur</SelectItem>
                                  <SelectItem value="Mixte" className="text-sm py-2">Mixte</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div className={cn("space-y-1.5", constructionType === 'Terrain nu' && "col-span-2")}>
                            <Label className="text-sm">Usage déclaré *</Label>
                            <Select 
                              value={declaredUsage}
                              onValueChange={setDeclaredUsage}
                              disabled={!constructionNature}
                            >
                              <SelectTrigger className={cn(
                                "h-11 text-sm rounded-xl border-2",
                                !constructionNature ? "bg-muted/50" : "focus:border-primary"
                              )}>
                                <SelectValue placeholder={!constructionNature ? "→ Nature d'abord" : "Choisir l'usage"} />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {availableDeclaredUsages.map((usage) => (
                                  <SelectItem key={usage} value={usage} className="text-sm py-2">{usage}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Éligibilité légale */}
                  {constructionType && constructionNature && declaredUsage && (
                    <Card className="border-2 border-dashed rounded-xl">
                      <CardContent className="p-3 space-y-3">
                        <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                          Éligibilité
                        </h4>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label className="text-sm">Nationalité *</Label>
                            <Select 
                              value={nationality}
                              onValueChange={(value) => setNationality(value as 'congolais' | 'etranger')}
                            >
                              <SelectTrigger className="h-11 text-sm rounded-xl border-2 focus:border-primary">
                                <SelectValue placeholder="Choisir" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {NATIONALITY_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value} className="text-sm py-2">
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-sm">Durée souhaitée *</Label>
                            <Select 
                              value={occupationDuration}
                              onValueChange={(value) => setOccupationDuration(value as 'perpetuel' | 'long_terme' | 'temporaire')}
                            >
                              <SelectTrigger className={cn(
                                "h-11 text-sm rounded-xl border-2",
                                nationality === 'etranger' && occupationDuration === 'perpetuel'
                                  ? "border-destructive"
                                  : "focus:border-primary"
                              )}>
                                <SelectValue placeholder="Choisir" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {OCCUPATION_DURATION_OPTIONS.map((option) => (
                                  <SelectItem 
                                    key={option.value} 
                                    value={option.value}
                                    disabled={nationality === 'etranger' && option.value === 'perpetuel'}
                                    className="text-sm py-2"
                                  >
                                    <div className="flex flex-col">
                                      <span className={cn(
                                        nationality === 'etranger' && option.value === 'perpetuel' && "line-through text-muted-foreground"
                                      )}>
                                        {option.label}
                                      </span>
                                      {nationality === 'etranger' && option.value === 'perpetuel' && (
                                        <span className="text-[10px] text-destructive">Non accessible aux étrangers</span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {nationality && occupationDuration && (
                          <div className={cn(
                            "p-2 rounded-lg text-xs flex items-center gap-2",
                            nationality === 'congolais' && occupationDuration === 'perpetuel'
                              ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                              : nationality === 'etranger'
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                          )}>
                            {nationality === 'congolais' && occupationDuration === 'perpetuel' ? (
                              <>
                                <Check className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>Éligible → <strong>Concession Perpétuelle</strong></span>
                              </>
                            ) : nationality === 'etranger' ? (
                              <>
                                <Info className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>Éligible → <strong>Bail/Concession Ordinaire</strong></span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>Titre temporaire disponible</span>
                              </>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Bouton de validation */}
                  {nationality && occupationDuration && (
                    <Button 
                      onClick={handleValidateValorisation}
                      disabled={!constructionType || !constructionNature || !declaredUsage || !nationality || !occupationDuration}
                      className={cn(
                        "w-full h-10 text-sm rounded-xl gap-2",
                        valorisationValidated ? "bg-green-600 hover:bg-green-700" : ""
                      )}
                    >
                      {valorisationValidated ? (
                        <><CheckCircle2 className="h-4 w-4" /> Titre déterminé</>
                      ) : (
                        <><Award className="h-4 w-4" /> Déterminer le titre</>
                      )}
                    </Button>
                  )}

                  {/* Résultat: Titre déduit */}
                  {valorisationValidated && deducedTitleType && (
                    <Card className={cn(
                      "border-2 rounded-xl",
                      deducedTitleType.confidence === 'high' 
                        ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20" 
                        : deducedTitleType.confidence === 'medium'
                        ? "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
                        : "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20"
                    )}>
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center gap-3">
                          <Award className={cn(
                            "h-6 w-6",
                            deducedTitleType.confidence === 'high' 
                              ? "text-green-600" 
                              : deducedTitleType.confidence === 'medium'
                              ? "text-amber-600"
                              : "text-blue-600"
                          )} />
                          <h4 className={cn(
                            "text-base font-bold",
                            deducedTitleType.confidence === 'high' 
                              ? "text-green-700 dark:text-green-400" 
                              : deducedTitleType.confidence === 'medium'
                              ? "text-amber-700 dark:text-amber-400"
                              : "text-blue-700 dark:text-blue-400"
                          )}>
                            {deducedTitleType.label}
                          </h4>
                          <span className={cn(
                            "ml-auto text-xs px-2.5 py-1 rounded-full font-medium",
                            deducedTitleType.confidence === 'high' 
                              ? "bg-green-500 text-white" 
                              : deducedTitleType.confidence === 'medium'
                              ? "bg-amber-500 text-white"
                              : "bg-blue-500 text-white"
                          )}>
                            {deducedTitleType.confidence === 'high' ? 'Fiable' : 
                             deducedTitleType.confidence === 'medium' ? 'Probable' : 
                             'À préciser'}
                          </span>
                        </div>
                        
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {deducedTitleType.description}
                        </p>

                        {deducedTitleType.conditions && deducedTitleType.conditions.length > 0 && (
                          <div className="pt-3 border-t border-border/50">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Conditions :</p>
                            <ul className="space-y-1.5">
                              {deducedTitleType.conditions.slice(0, 2).map((condition, idx) => (
                                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                  {condition}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {deducedTitleType.conversionPossible && (
                          <div className="p-2.5 bg-primary/5 rounded-md">
                            <p className="text-sm text-primary font-medium">
                              → Évolution : {deducedTitleType.conversionPossible.targetTitle}
                            </p>
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground/60 pt-2 border-t border-border/30">
                          Réf: {deducedTitleType.legalBasis}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={() => setActiveTab('location')} className="flex-1 h-8 text-xs rounded-xl">
                      Précédent
                    </Button>
                    <Button 
                      onClick={() => setActiveTab('documents')} 
                      disabled={!valorisationValidated}
                      className="flex-1 h-8 text-xs rounded-xl gap-2"
                    >
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
                    <Button variant="outline" onClick={() => setActiveTab('location')} className="flex-1 h-8 text-xs rounded-xl">
                      Précédent
                    </Button>
                    <Button onClick={() => setActiveTab('payment')} className="flex-1 h-8 text-xs rounded-xl gap-2">
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
                        {deducedTitleType && (
                          <span className="ml-auto text-xs px-2 py-1 bg-primary/10 text-primary rounded-full font-medium">
                            {deducedTitleType.label}
                          </span>
                        )}
                      </div>

                      {!valorisationValidated ? (
                        <div className="flex flex-col items-center py-6 text-center">
                          <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Veuillez d'abord valider l'éligibilité dans l'onglet "Mise en valeur"
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-3 rounded-xl"
                            onClick={() => setActiveTab('valorisation')}
                          >
                            Aller à Mise en valeur
                          </Button>
                        </div>
                      ) : loadingDynamicFees ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : calculatedFeesResult.fees.length === 0 ? (
                        <div className="flex flex-col items-center py-6 text-center">
                          <Info className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Aucun frais configuré pour ce type de titre
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Info sur le calcul */}
                          <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-xs text-blue-700 dark:text-blue-400 flex items-start gap-2">
                            <TrendingUp className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="font-medium">Frais calculés selon :</span>
                              <ul className="mt-1 space-y-0.5 text-blue-600 dark:text-blue-500">
                                <li>• Type de titre : <strong>{deducedTitleType?.label}</strong></li>
                                <li>• Zone : <strong>{formData.sectionType === 'urbaine' ? 'Urbaine' : formData.sectionType === 'rurale' ? 'Rurale' : 'Non spécifiée'}</strong></li>
                                {formData.areaSqm && <li>• Superficie : <strong>{formData.areaSqm} m²</strong></li>}
                              </ul>
                            </div>
                          </div>

                          {/* Liste des frais */}
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase">Détail des frais</p>
                            {calculatedFeesResult.fees.map(fee => (
                              <div key={fee.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{fee.fee_name}</p>
                                  {fee.description && (
                                    <p className="text-xs text-muted-foreground">{fee.description}</p>
                                  )}
                                  {fee.zone_adjustment !== 0 && (
                                    <p className={cn(
                                      "text-[10px] mt-0.5",
                                      fee.zone_adjustment > 0 ? "text-amber-600" : "text-green-600"
                                    )}>
                                      {fee.zone_adjustment > 0 ? '+' : ''}{fee.zone_adjustment}$ (zone {formData.sectionType})
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  {fee.zone_adjustment !== 0 && (
                                    <p className="text-xs text-muted-foreground line-through">${fee.base_amount}</p>
                                  )}
                                  <p className="text-sm font-semibold whitespace-nowrap">${fee.final_amount}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Résumé */}
                          {calculatedFeesResult.breakdown.zoneAdjustment !== 0 && (
                            <div className="p-2 bg-muted/30 rounded-lg text-xs space-y-1">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Frais de base</span>
                                <span>${calculatedFeesResult.breakdown.baseFees}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Ajustement zone</span>
                                <span className={calculatedFeesResult.breakdown.zoneAdjustment > 0 ? "text-amber-600" : "text-green-600"}>
                                  {calculatedFeesResult.breakdown.zoneAdjustment > 0 ? '+' : ''}{calculatedFeesResult.breakdown.zoneAdjustment}$
                                </span>
                              </div>
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
                    <Button variant="outline" onClick={() => setActiveTab('documents')} className="flex-1 h-8 text-xs rounded-xl">
                      Précédent
                    </Button>
                    <Button
                      onClick={() => setActiveTab('review')}
                      disabled={loading}
                      className="flex-1 h-8 text-xs rounded-xl"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <ClipboardCheck className="h-4 w-4 mr-2" />
                          Réviser
                        </>
                      )}
                    </Button>
                  </div>
                  </TabsContent>

                  {/* Tab: Review / Envoi */}
                  <TabsContent value="review" className="space-y-4">
                    <LandTitleReviewTab
                      formData={formData}
                      constructionType={constructionType}
                      constructionNature={constructionNature}
                      declaredUsage={declaredUsage}
                      nationality={nationality}
                      occupationDuration={occupationDuration}
                      valorisationValidated={valorisationValidated}
                      deducedTitleType={deducedTitleType}
                      requesterIdFile={requesterIdFile}
                      ownerIdFile={ownerIdFile}
                      proofOfOwnershipFile={proofOfOwnershipFile}
                      gpsCoordinates={gpsCoordinates}
                      parcelSides={parcelSides}
                      totalAmount={totalAmount}
                      loading={loading}
                      onEditTab={(tabId) => setActiveTab(tabId)}
                      onProceedToPayment={handleProceedToPayment}
                    />
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
