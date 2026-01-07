import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCadastralContribution, CadastralContributionData } from '@/hooks/useCadastralContribution';
import { Loader2, CheckCircle2, Upload, X, Plus, Trash2, Info, ExternalLink, RotateCcw, ChevronRight, Camera } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { MdDashboard, MdLocationOn, MdEventNote, MdAccountBalance, MdRateReview, MdInsertDriveFile } from 'react-icons/md';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  getAllProvinces, 
  getVillesForProvince, 
  getCommunesForVille,
  getTerritoiresForProvince,
  getCollectivitesForTerritoire,
  getQuartiersForCommune,
  getAvenuesForQuartier
} from '@/lib/geographicData';
import { InputWithPopover } from './InputWithPopover';
import { PropertyTitleTypeSelect, PROPERTY_TITLE_TYPES } from './PropertyTitleTypeSelect';
import { BuildingPermitIssuingServiceSelect } from './BuildingPermitIssuingServiceSelect';
import { useIsMobile } from '@/hooks/use-mobile';
import confetti from 'canvas-confetti';
import WhatsAppFloatingButton from './WhatsAppFloatingButton';
import { QuickAuthDialog } from './QuickAuthDialog';
import MobileMoneyPayment from '@/components/payment/MobileMoneyPayment';
import { CartItem } from '@/hooks/useCart';
import { useContributionConfig } from '@/hooks/useContributionConfig';
import { ParcelMapPreview } from './ParcelMapPreview';
import { PermitPaymentDialog } from './PermitPaymentDialog';
import { useMapConfig } from '@/hooks/useMapConfig';

interface CadastralContributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcelNumber: string;
}

const CadastralContributionDialog: React.FC<CadastralContributionDialogProps> = ({
  open,
  onOpenChange,
  parcelNumber
}) => {
  const { submitContribution, loading } = useCadastralContribution();
  const { getConfig } = useContributionConfig();
  const { config: mapConfig, loading: mapConfigLoading } = useMapConfig();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const dialogContentRef = React.useRef<HTMLDivElement>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPermitPayment, setShowPermitPayment] = useState(false);
  const [savedContributionId, setSavedContributionId] = useState<string | null>(null);
  const [savedPermitRequestData, setSavedPermitRequestData] = useState<any>(null);
  const [showQuickAuth, setShowQuickAuth] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [ownerDocFile, setOwnerDocFile] = useState<File | null>(null);
  const [titleDocFiles, setTitleDocFiles] = useState<File[]>([]);
  const [showRequiredFieldsPopover, setShowRequiredFieldsPopover] = useState(false);
  const [highlightRequiredFields, setHighlightRequiredFields] = useState(false);
  const [showOwnerWarning, setShowOwnerWarning] = useState(false);
  const [highlightIncompleteOwner, setHighlightIncompleteOwner] = useState(false);
  const [showPermitWarning, setShowPermitWarning] = useState(false);
  const [highlightIncompletePermit, setHighlightIncompletePermit] = useState(false);
  const [showPreviousOwnerWarning, setShowPreviousOwnerWarning] = useState(false);
  const [highlightIncompletePreviousOwner, setHighlightIncompletePreviousOwner] = useState(false);
  const [highlightSuperficie, setHighlightSuperficie] = useState(false);
  const [showGPSWarning, setShowGPSWarning] = useState(false);
  const [showTaxWarning, setShowTaxWarning] = useState(false);
  const [highlightIncompleteTax, setHighlightIncompleteTax] = useState(false);
  const [showMortgageWarning, setShowMortgageWarning] = useState(false);
  const [highlightIncompleteMortgage, setHighlightIncompleteMortgage] = useState(false);
  const [showCurrentOwnerRequiredWarning, setShowCurrentOwnerRequiredWarning] = useState(false);
  const [showPermitTypeBlockedWarning, setShowPermitTypeBlockedWarning] = useState(false);
  const [permitTypeBlockedMessage, setPermitTypeBlockedMessage] = useState('');
  const [showAreaMismatchWarning, setShowAreaMismatchWarning] = useState(false);
  const [areaMismatchMessage, setAreaMismatchMessage] = useState('');
  const [shouldBlinkSuperficie, setShouldBlinkSuperficie] = useState(false);
  const [showUsageLockedWarning, setShowUsageLockedWarning] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  
  // Fonction pour vérifier si le formulaire est valide pour soumission
  const isFormValidForSubmission = () => {
    // Vérifier Type de titre de propriété
    if (!formData.propertyTitleType) return false;
    
    // Vérifier qu'au moins un propriétaire actuel a lastName et firstName
    const hasValidOwner = currentOwners.some(owner => 
      owner.lastName && owner.lastName.trim() !== '' && 
      owner.firstName && owner.firstName.trim() !== ''
    );
    if (!hasValidOwner) return false;
    
    // Vérifier les informations de lieu
    if (!sectionType) return false;
    if (!formData.province) return false;
    
    if (sectionType === 'urbaine') {
      // Pour section urbaine : ville, commune, quartier, avenue requis
      if (!formData.ville || !formData.commune || !formData.quartier || !formData.avenue) {
        return false;
      }
    } else if (sectionType === 'rurale') {
      // Pour section rurale : territoire et collectivite requis (groupement et village optionnels)
      if (!formData.territoire || !formData.collectivite) {
        return false;
      }
    }
    
    return true;
  };
  
  // Fonction pour changer d'onglet avec scroll vers le haut
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Scroll vers le haut du contenu du dialogue
    if (dialogContentRef.current) {
      dialogContentRef.current.scrollTop = 0;
    }
  };
  const [hasShownConfetti, setHasShownConfetti] = useState(false);
  
  // État pour gérer les côtés bordant une route
  const [roadSides, setRoadSides] = useState<any[]>([]);
  
  // État pour gérer plusieurs anciens propriétaires
  const [previousOwners, setPreviousOwners] = useState<Array<{
    name: string;
    legalStatus: string;
    startDate: string;
    endDate: string;
    mutationType: string;
  }>>([{
    name: '',
    legalStatus: 'Personne physique',
    startDate: '',
    endDate: '',
    mutationType: 'Vente'
  }]);

  // État pour gérer plusieurs propriétaires actuels (copropriété)
  const [currentOwners, setCurrentOwners] = useState<Array<{
    lastName: string;
    middleName: string;
    firstName: string;
    legalStatus: string;
    since: string;
  }>>([{
    lastName: '',
    middleName: '',
    firstName: '',
    legalStatus: 'Personne physique',
    since: ''
  }]);

  // État pour gérer plusieurs taxes
  const [taxRecords, setTaxRecords] = useState<Array<{
    taxType: string;
    taxYear: string;
    taxAmount: string;
    paymentStatus: string;
    paymentDate: string;
    receiptFile: File | null;
  }>>([{
    taxType: 'Taxe foncière',
    taxYear: '',
    taxAmount: '',
    paymentStatus: 'Non payée',
    paymentDate: '',
    receiptFile: null
  }]);

  // État pour savoir si une hypothèque existe sur la parcelle
  const [hasMortgage, setHasMortgage] = useState<boolean | null>(null);
  
  // État pour gérer plusieurs hypothèques
  const [mortgageRecords, setMortgageRecords] = useState<Array<{
    mortgageAmount: string;
    duration: string;
    creditorName: string;
    creditorType: string;
    contractDate: string;
    mortgageStatus: string;
    receiptFile: File | null;
  }>>([{
    mortgageAmount: '',
    duration: '',
    creditorName: '',
    creditorType: 'Banque',
    contractDate: '',
    mortgageStatus: 'Active',
    receiptFile: null
  }]);
  
  // État pour le mode de permis de construire
  const [permitMode, setPermitMode] = useState<'existing' | 'request'>('existing');
  
  // État pour gérer les permis de construire existants
  const [buildingPermits, setBuildingPermits] = useState<Array<{
    permitType: 'construction' | 'regularization';
    permitNumber: string;
    issuingService: string;
    issueDate: string;
    validityMonths: string;
    administrativeStatus: string;
    issuingServiceContact: string;
    attachmentFile: File | null;
  }>>([{
    permitType: 'construction',
    permitNumber: '',
    issuingService: '',
    issueDate: '',
    validityMonths: '36',
    administrativeStatus: 'En attente',
    issuingServiceContact: '',
    attachmentFile: null
  }]);

  // État pour gérer la demande de permis
  const [permitRequest, setPermitRequest] = useState({
    permitType: 'construction' as 'construction' | 'regularization',
    hasExistingConstruction: false,
    constructionDescription: '',
    plannedUsage: '',
    estimatedArea: '',
    applicantName: '',
    applicantPhone: '',
    applicantEmail: '',
    selectedOwnerIndex: -1, // Index du propriétaire sélectionné
    // Champs spécifiques permis de construire
    numberOfFloors: '',
    buildingMaterials: '',
    architecturalPlanImages: [] as File[],
    // Champs spécifiques permis de régularisation
    constructionYear: '',
    regularizationReason: '',
    originalPermitNumber: '',
    previousPermitNumber: '',
    constructionPhotos: [] as File[]
  });
  
  // État pour gérer les coordonnées GPS des bornes
  const [gpsCoordinates, setGpsCoordinates] = useState<Array<{
    borne: string;
    lat: string;
    lng: string;
    mode?: 'auto' | 'manual';
    detected?: boolean;
    detecting?: boolean;
  }>>([]);
  
  // Synchroniser initialement les bornes GPS avec les côtés par défaut
  useEffect(() => {
    if (gpsCoordinates.length === 0 && parcelSides.length > 0) {
      const initialBornes = parcelSides.map((_, index) => ({
        borne: `Borne ${index + 1}`,
        lat: '',
        lng: '',
        mode: 'auto' as 'auto' | 'manual',
        detected: false,
        detecting: false
      }));
      setGpsCoordinates(initialBornes);
    }
  }, []);

  // État pour le switch Taxes/Hypothèques dans l'onglet obligations
  const [obligationType, setObligationType] = useState<'taxes' | 'mortgages'>('taxes');

  // États pour gérer les options de dépendance Type de construction -> Nature -> Usage
  const [availableConstructionNatures, setAvailableConstructionNatures] = useState<string[]>([]);
  const [availableDeclaredUsages, setAvailableDeclaredUsages] = useState<string[]>([]);

  const [formData, setFormData] = useState<CadastralContributionData>({
    parcelNumber: parcelNumber,
  });

  // État pour gérer les dimensions des côtés de la parcelle
  const [parcelSides, setParcelSides] = useState<Array<{
    name: string;
    length: string;
  }>>([
    { name: 'Côté Nord', length: '' },
    { name: 'Côté Sud', length: '' },
    { name: 'Côté Est', length: '' },
    { name: 'Côté Ouest', length: '' }
  ]);

  // États pour gérer les listes déroulantes dépendantes
  const [availableVilles, setAvailableVilles] = useState<string[]>([]);
  const [availableCommunes, setAvailableCommunes] = useState<string[]>([]);
  const [availableTerritoires, setAvailableTerritoires] = useState<string[]>([]);
  const [availableCollectivites, setAvailableCollectivites] = useState<string[]>([]);
  const [availableQuartiers, setAvailableQuartiers] = useState<string[]>([]);
  const [availableAvenues, setAvailableAvenues] = useState<string[]>([]);
  
  // État pour déterminer le type de section (SU ou SR)
  const [sectionType, setSectionType] = useState<'urbaine' | 'rurale' | ''>('');
  const [sectionTypeAutoDetected, setSectionTypeAutoDetected] = useState(false);

  // Clé pour le localStorage basée sur le numéro de parcelle
  const STORAGE_KEY = `cadastral_contribution_${parcelNumber}`;

  // Fonction pour sauvegarder les données dans localStorage
  const saveFormDataToStorage = () => {
    const dataToSave = {
      formData,
      currentOwners,
      previousOwners,
      taxRecords: taxRecords.map(tax => ({
        ...tax,
        receiptFile: null // Les fichiers ne peuvent pas être sauvegardés dans localStorage
      })),
      mortgageRecords: mortgageRecords.map(mortgage => ({
        ...mortgage,
        receiptFile: null
      })),
      permitMode,
      buildingPermits: buildingPermits.map(permit => ({
        ...permit,
        attachmentFile: null
      })),
      permitRequest: {
        ...permitRequest,
        architecturalPlanImages: [], // Les fichiers ne peuvent pas être sauvegardés dans localStorage
        constructionPhotos: []
      },
      gpsCoordinates,
      parcelSides,
      obligationType,
      sectionType,
      timestamp: new Date().toISOString()
    };
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      // Sauvegarder aussi l'URL de retour pour la redirection après authentification
      localStorage.setItem('auth_redirect_url', window.location.pathname + window.location.search);
      console.log('Données du formulaire sauvegardées');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des données:', error);
    }
  };

  // Fonction pour charger les données depuis localStorage
  const loadFormDataFromStorage = () => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        
        // Restaurer toutes les données
        if (parsed.formData) setFormData(parsed.formData);
        if (parsed.currentOwners) setCurrentOwners(parsed.currentOwners);
        if (parsed.previousOwners) setPreviousOwners(parsed.previousOwners);
        if (parsed.taxRecords) setTaxRecords(parsed.taxRecords);
        if (parsed.mortgageRecords) setMortgageRecords(parsed.mortgageRecords);
        if (parsed.permitMode) setPermitMode(parsed.permitMode);
        if (parsed.buildingPermits) setBuildingPermits(parsed.buildingPermits);
        if (parsed.permitRequest) setPermitRequest(parsed.permitRequest);
        if (parsed.gpsCoordinates) setGpsCoordinates(parsed.gpsCoordinates);
        if (parsed.parcelSides) setParcelSides(parsed.parcelSides);
        if (parsed.obligationType) setObligationType(parsed.obligationType);
        if (parsed.sectionType) setSectionType(parsed.sectionType);
        
        toast({
          title: "Données restaurées",
          description: "Vos données précédentes ont été restaurées. Vous pouvez continuer là où vous vous étiez arrêté.",
        });
        
        console.log('Données du formulaire restaurées');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  };

  // Fonction pour effacer les données sauvegardées
  const clearSavedFormData = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('Données du formulaire effacées');
    } catch (error) {
      console.error('Erreur lors de l\'effacement des données:', error);
    }
  };

  // Charger les données au montage, que l'utilisateur soit connecté ou non
  useEffect(() => {
    if (open) {
      loadFormDataFromStorage();
    }
  }, [open]);

  // Sauvegarder automatiquement les données à chaque modification importante
  useEffect(() => {
    if (open && formData.parcelNumber) {
      const timeoutId = setTimeout(() => {
        saveFormDataToStorage();
      }, 1000); // Debounce de 1 seconde
      
      return () => clearTimeout(timeoutId);
    }
  }, [open, formData, currentOwners, previousOwners, taxRecords, mortgageRecords, buildingPermits, gpsCoordinates]);

  // Sauvegarder automatiquement les données toutes les 30 secondes
  useEffect(() => {
    if (!open || !user) return;

    const autoSaveInterval = setInterval(() => {
      saveFormDataToStorage();
    }, 30000); // 30 secondes

    return () => clearInterval(autoSaveInterval);
  }, [open, user, formData, currentOwners, previousOwners, taxRecords, mortgageRecords, buildingPermits, gpsCoordinates, parcelSides]);

  // Sauvegarder les données quand le dialogue se ferme
  useEffect(() => {
    if (!open && formData.parcelNumber) {
      // Sauvegarder uniquement si des données ont été renseignées
      const hasData = Object.keys(formData).length > 1 || 
                     currentOwners.some(o => o.lastName || o.firstName) ||
                     previousOwners.some(o => o.name) ||
                     taxRecords.some(t => t.taxAmount) ||
                     mortgageRecords.some(m => m.mortgageAmount) ||
                     buildingPermits.some(p => p.permitNumber) ||
                     gpsCoordinates.some(g => g.lat || g.lng);
      
      if (hasData) {
        saveFormDataToStorage();
      }
    }
  }, [open]);

  // Détecter automatiquement le type de section à partir du préfixe du numéro de parcelle
  useEffect(() => {
    if (parcelNumber) {
      const upperParcelNumber = parcelNumber.toUpperCase().trim();
      
      if (upperParcelNumber.startsWith('SU')) {
        setSectionType('urbaine');
        setSectionTypeAutoDetected(true);
      } else if (upperParcelNumber.startsWith('SR')) {
        setSectionType('rurale');
        setSectionTypeAutoDetected(true);
      } else {
        setSectionType('');
        setSectionTypeAutoDetected(false);
      }
    }
  }, [parcelNumber]);

  // Synchroniser automatiquement la date de fin du premier propriétaire précédent
  // avec la date de début du propriétaire actuel
  useEffect(() => {
    if (currentOwners.length > 0 && currentOwners[0]?.since && previousOwners.length > 0) {
      const firstPreviousOwner = previousOwners[0];
      // Si la date de fin n'est pas encore définie ou est différente de la date du propriétaire actuel
      if (!firstPreviousOwner.endDate || firstPreviousOwner.endDate !== currentOwners[0].since) {
        const updated = [...previousOwners];
        updated[0] = { ...updated[0], endDate: currentOwners[0].since };
        setPreviousOwners(updated);
      }
    }
  }, [currentOwners]);

  // Recalculer automatiquement la superficie quand les dimensions changent
  useEffect(() => {
    const sides = parcelSides.filter(s => s.length && parseFloat(s.length) > 0);
    
    if (sides.length < 3) return;

    // Pour une forme rectangulaire simple (4 côtés)
    if (sides.length === 4) {
      const lengths = sides.map(s => parseFloat(s.length));
      
      // Pour un rectangle : Nord/Sud sont opposés et Est/Ouest sont opposés
      // Indices : 0=Nord, 1=Sud, 2=Est, 3=Ouest
      const isRectangle = (
        Math.abs(lengths[0] - lengths[1]) < 0.1 &&  // Nord ≈ Sud
        Math.abs(lengths[2] - lengths[3]) < 0.1     // Est ≈ Ouest
      );
      
      if (isRectangle) {
        // Rectangle: côté Nord × côté Est
        const area = lengths[0] * lengths[2];
        handleInputChange('areaSqm', parseFloat(area.toFixed(2)));
        return;
      }
      
      // Si pas un rectangle parfait, utiliser la formule de Brahmagupta
      const s = (lengths[0] + lengths[1] + lengths[2] + lengths[3]) / 2;
      const area = Math.sqrt(
        (s - lengths[0]) * (s - lengths[1]) * (s - lengths[2]) * (s - lengths[3])
      );
      handleInputChange('areaSqm', parseFloat(area.toFixed(2)));
      return;
    }
    
    // Pour 2 côtés (forme rectangulaire simplifiée)
    if (sides.length === 2) {
      const length1 = parseFloat(sides[0].length);
      const length2 = parseFloat(sides[1].length);
      const area = length1 * length2;
      handleInputChange('areaSqm', parseFloat(area.toFixed(2)));
      return;
    }
    
    // Pour 3 côtés (triangle) : formule de Héron
    if (sides.length === 3) {
      const lengths = sides.map(s => parseFloat(s.length));
      const s = (lengths[0] + lengths[1] + lengths[2]) / 2;
      const area = Math.sqrt(s * (s - lengths[0]) * (s - lengths[1]) * (s - lengths[2]));
      handleInputChange('areaSqm', parseFloat(area.toFixed(2)));
      return;
    }
    
    // Pour plus de 4 côtés, utiliser une approximation
    if (sides.length > 4) {
      const lengths = sides.map(s => parseFloat(s.length));
      const perimeter = lengths.reduce((a, b) => a + b, 0);
      const area = (perimeter * perimeter) / (4 * sides.length * Math.tan(Math.PI / sides.length));
      handleInputChange('areaSqm', parseFloat(area.toFixed(2)));
    }
  }, [parcelSides]);

  // Validation: Superficie calculée vs Surface de construction (si demande de permis)
  useEffect(() => {
    // Vérifier seulement si on est en mode "Demander un permis"
    if (permitMode !== 'request') {
      setShowAreaMismatchWarning(false);
      setShouldBlinkSuperficie(false);
      return;
    }

    const superficieCalculee = formData.areaSqm ? parseFloat(formData.areaSqm.toString()) : 0;
    const surfaceConstruction = permitRequest.estimatedArea ? parseFloat(permitRequest.estimatedArea) : 0;

    // Si les deux valeurs sont renseignées
    if (superficieCalculee > 0 && surfaceConstruction > 0) {
      // La superficie calculée doit être >= surface de construction
      if (superficieCalculee < surfaceConstruction) {
        setShouldBlinkSuperficie(true);
        
        // Message adapté selon le type de permis
        const permitTypeText = permitRequest.permitType === 'construction' 
          ? 'Surface de construction estimée' 
          : 'Surface de construction';
        
        const message = `La superficie totale de la parcelle (${superficieCalculee} m²) ne peut pas être inférieure à la ${permitTypeText.toLowerCase()} (${surfaceConstruction} m²) qui sera bâtie dessus. Si vous estimez que les mesures fournies dans "Dimensions de chaque côté" sont correctes, veuillez revoir la valeur attribuée à la ${permitTypeText} dans l'onglet "Informations Générales".`;
        
        setAreaMismatchMessage(message);
        setShowAreaMismatchWarning(true);
      } else {
        setShouldBlinkSuperficie(false);
        setShowAreaMismatchWarning(false);
      }
    } else {
      setShouldBlinkSuperficie(false);
      setShowAreaMismatchWarning(false);
    }
  }, [formData.areaSqm, permitRequest.estimatedArea, permitRequest.permitType, permitMode]);

  // Mise à jour des villes quand la province change
  useEffect(() => {
    if (formData.province) {
      const villes = getVillesForProvince(formData.province);
      setAvailableVilles(villes);
      const territoires = getTerritoiresForProvince(formData.province);
      setAvailableTerritoires(territoires);
      
      // Réinitialiser les niveaux inférieurs si la province change
      if (!villes.includes(formData.ville || '')) {
        handleInputChange('ville', undefined);
        setAvailableCommunes([]);
        handleInputChange('commune', undefined);
      }
      if (!territoires.includes(formData.territoire || '')) {
        handleInputChange('territoire', undefined);
        setAvailableCollectivites([]);
        handleInputChange('collectivite', undefined);
      }
    } else {
      setAvailableVilles([]);
      setAvailableCommunes([]);
      setAvailableTerritoires([]);
      setAvailableCollectivites([]);
    }
  }, [formData.province]);

  // Mise à jour des communes quand la ville change
  useEffect(() => {
    if (formData.province && formData.ville) {
      const communes = getCommunesForVille(formData.province, formData.ville);
      setAvailableCommunes(communes);
      
      // Réinitialiser la commune si elle n'est plus valide
      if (!communes.includes(formData.commune || '')) {
        handleInputChange('commune', undefined);
        setAvailableQuartiers([]);
        handleInputChange('quartier', undefined);
        setAvailableAvenues([]);
        handleInputChange('avenue', undefined);
      }
    } else {
      setAvailableCommunes([]);
      setAvailableQuartiers([]);
      setAvailableAvenues([]);
    }
  }, [formData.province, formData.ville]);

  // Mise à jour des quartiers quand la commune change
  useEffect(() => {
    if (formData.province && formData.ville && formData.commune) {
      const quartiers = getQuartiersForCommune(formData.province, formData.ville, formData.commune);
      setAvailableQuartiers(quartiers);
      
      // Réinitialiser le quartier si il n'est plus valide
      if (!quartiers.includes(formData.quartier || '')) {
        handleInputChange('quartier', undefined);
        setAvailableAvenues([]);
        handleInputChange('avenue', undefined);
      }
    } else {
      setAvailableQuartiers([]);
      setAvailableAvenues([]);
    }
  }, [formData.province, formData.ville, formData.commune]);

  // Mise à jour des avenues quand le quartier change
  useEffect(() => {
    if (formData.province && formData.ville && formData.commune && formData.quartier) {
      const avenues = getAvenuesForQuartier(formData.province, formData.ville, formData.commune, formData.quartier);
      setAvailableAvenues(avenues);
      
      // Réinitialiser l'avenue si elle n'est plus valide
      if (!avenues.includes(formData.avenue || '')) {
        handleInputChange('avenue', undefined);
      }
    } else {
      setAvailableAvenues([]);
    }
  }, [formData.province, formData.ville, formData.commune, formData.quartier]);

  // Mise à jour des collectivités quand le territoire change
  useEffect(() => {
    if (formData.province && formData.territoire) {
      const collectivites = getCollectivitesForTerritoire(formData.province, formData.territoire);
      setAvailableCollectivites(collectivites);
      
      // Réinitialiser la collectivité si elle n'est plus valide
      if (!collectivites.includes(formData.collectivite || '')) {
        handleInputChange('collectivite', undefined);
      }
    } else {
      setAvailableCollectivites([]);
    }
  }, [formData.province, formData.territoire]);

  // Logique de dépendance: Type de construction -> Nature de construction
  useEffect(() => {
    if (!formData.constructionType) {
      setAvailableConstructionNatures([]);
      handleInputChange('constructionNature', undefined);
      setAvailableDeclaredUsages([]);
      handleInputChange('declaredUsage', undefined);
      return;
    }

    let natures: string[] = [];
    
    switch (formData.constructionType) {
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
    
    // Réinitialiser la nature si elle n'est plus valide
    if (formData.constructionNature && !natures.includes(formData.constructionNature)) {
      handleInputChange('constructionNature', undefined);
    }
  }, [formData.constructionType]);

  // Logique de dépendance: Type + Nature -> Usage déclaré
  useEffect(() => {
    if (!formData.constructionType || !formData.constructionNature) {
      setAvailableDeclaredUsages([]);
      handleInputChange('declaredUsage', undefined);
      return;
    }

    let usages: string[] = [];
    
    // Pour les terrains non bâtis
    if (formData.constructionNature === 'Non bâti') {
      usages = ['Terrain vacant', 'Agriculture', 'Parking'];
    }
    // Pour les constructions résidentielles
    else if (formData.constructionType === 'Résidentielle') {
      if (formData.constructionNature === 'Durable') {
        usages = ['Habitation', 'Usage mixte'];
      } else if (formData.constructionNature === 'Semi-durable') {
        usages = ['Habitation', 'Usage mixte'];
      } else if (formData.constructionNature === 'Précaire') {
        usages = ['Habitation'];
      }
    }
    // Pour les constructions commerciales
    else if (formData.constructionType === 'Commerciale') {
      if (formData.constructionNature === 'Durable') {
        usages = ['Commerce', 'Bureau', 'Usage mixte', 'Entrepôt'];
      } else if (formData.constructionNature === 'Semi-durable') {
        usages = ['Commerce', 'Bureau', 'Entrepôt'];
      } else if (formData.constructionNature === 'Précaire') {
        usages = ['Commerce'];
      }
    }
    // Pour les constructions industrielles
    else if (formData.constructionType === 'Industrielle') {
      if (formData.constructionNature === 'Durable') {
        usages = ['Industrie', 'Entrepôt'];
      } else if (formData.constructionNature === 'Semi-durable') {
        usages = ['Industrie', 'Entrepôt'];
      } else if (formData.constructionNature === 'Précaire') {
        usages = ['Industrie'];
      }
    }
    // Pour l'usage agricole
    else if (formData.constructionType === 'Agricole') {
      if (formData.constructionNature === 'Non bâti') {
        usages = ['Agriculture'];
      } else {
        usages = ['Agriculture', 'Habitation'];
      }
    }
    // Pour les terrains nus (redondant avec le premier test, mais pour la clarté)
    else if (formData.constructionType === 'Terrain nu') {
      usages = ['Terrain vacant', 'Agriculture', 'Parking'];
    }
    
    setAvailableDeclaredUsages(usages);
    
    // Réinitialiser l'usage si il n'est plus valide
    if (formData.declaredUsage && !usages.includes(formData.declaredUsage)) {
      handleInputChange('declaredUsage', undefined);
    }
  }, [formData.constructionType, formData.constructionNature]);

  // Synchroniser "usage prévu" avec "usage déclaré" quand on passe en mode "Demander un permis"
  useEffect(() => {
    if (permitMode === 'request' && formData.declaredUsage && !permitRequest.plannedUsage) {
      setPermitRequest(prev => ({ ...prev, plannedUsage: formData.declaredUsage || '' }));
    }
  }, [permitMode, formData.declaredUsage]);

  // Auto-remplir les informations du demandeur si un seul propriétaire
  useEffect(() => {
    if (permitMode === 'request' && currentOwners.length === 1) {
      const owner = currentOwners[0];
      if (owner.lastName && owner.firstName && !permitRequest.applicantName) {
        const fullName = `${owner.lastName} ${owner.middleName ? owner.middleName + ' ' : ''}${owner.firstName}`.trim();
        setPermitRequest(prev => ({ 
          ...prev, 
          applicantName: fullName,
          selectedOwnerIndex: 0
        }));
      }
    }
  }, [permitMode, currentOwners]);

  const handleInputChange = (field: keyof CadastralContributionData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSectionTypeChange = (type: 'urbaine' | 'rurale') => {
    setSectionType(type);
    
    // Réinitialiser tous les champs de localisation sauf la province
    setFormData(prev => ({
      ...prev,
      ville: undefined,
      commune: undefined,
      quartier: undefined,
      avenue: undefined,
      territoire: undefined,
      collectivite: undefined,
      groupement: undefined,
      village: undefined
    }));
    
    // Réinitialiser les listes
    setAvailableQuartiers([]);
    setAvailableAvenues([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'owner' | 'title') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Type de fichier non valide",
        description: "Seuls les fichiers JPG, PNG, WEBP et PDF sont acceptés",
        variant: "destructive"
      });
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale est de 5 MB",
        variant: "destructive"
      });
      return;
    }
    
    if (type === 'owner') {
      setOwnerDocFile(file);
    } else {
      // Check if we can add more title files
      if (titleDocFiles.length >= 5) {
        toast({
          title: "Limite atteinte",
          description: "Vous ne pouvez ajouter que 5 pièces jointes maximum",
          variant: "destructive"
        });
        return;
      }
      setTitleDocFiles(prev => [...prev, file]);
    }
    
    // Reset the input
    e.target.value = '';
  };

  const removeFile = (type: 'owner' | 'title', index?: number) => {
    if (type === 'owner') {
      setOwnerDocFile(null);
    } else if (index !== undefined) {
      setTitleDocFiles(prev => prev.filter((_, i) => i !== index));
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${path}/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('cadastral-documents')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('cadastral-documents')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  };

  const handleSubmit = async () => {
    // Vérifier si l'utilisateur est connecté via le user ou la session
    // On vérifie aussi la session Supabase directement pour plus de fiabilité
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!user && !session) {
      // Sauvegarder les données avant de demander l'authentification
      saveFormDataToStorage();
      setShowQuickAuth(true);
      setPendingSubmission(true);
      return;
    }

    // Validation spécifique pour la demande de permis
    if (permitMode === 'request') {
      // Champs communs obligatoires
      if (!permitRequest.constructionDescription || !permitRequest.plannedUsage || !permitRequest.estimatedArea ||
          !permitRequest.applicantName || !permitRequest.applicantPhone) {
        toast({
          title: "Champs requis manquants",
          description: "Veuillez remplir tous les champs obligatoires de la demande de permis",
          variant: "destructive"
        });
        return;
      }

      // Validation spécifique au permis de construire
      if (permitRequest.permitType === 'construction') {
        if (!permitRequest.numberOfFloors || !permitRequest.buildingMaterials) {
          toast({
            title: "Champs requis manquants",
            description: "Veuillez remplir le nombre d'étages et les matériaux de construction",
            variant: "destructive"
          });
          return;
        }
        if (permitRequest.architecturalPlanImages.length === 0) {
          toast({
            title: "Plans architecturaux requis",
            description: "Veuillez joindre au moins un plan architectural",
            variant: "destructive"
          });
          return;
        }
      }

      // Validation spécifique au permis de régularisation
      if (permitRequest.permitType === 'regularization') {
        if (!permitRequest.constructionYear || !permitRequest.regularizationReason) {
          toast({
            title: "Champs requis manquants",
            description: "Veuillez remplir l'année de construction et la raison de la régularisation",
            variant: "destructive"
          });
          return;
        }
        
        // Validation du numéro de permis précédent pour certaines raisons
        const requiresPreviousPermit = 
          permitRequest.regularizationReason === "Modifications non autorisées" || 
          permitRequest.regularizationReason === "Extension non déclarée" ||
          permitRequest.regularizationReason === "Changement d'usage";
        
        if (requiresPreviousPermit && !permitRequest.previousPermitNumber) {
          toast({
            title: "Numéro de permis précédent requis",
            description: "Pour cette raison de régularisation, vous devez fournir le numéro du permis de construire initial",
            variant: "destructive"
          });
          return;
        }
        
        if (permitRequest.constructionPhotos.length < 4) {
          toast({
            title: "Photos de construction requises",
            description: "Veuillez joindre au moins 4 photos de la construction (tous les angles)",
            variant: "destructive"
          });
          return;
        }
      }
    }

    setUploading(true);
    
    try {
      // Upload files if provided
      let ownerDocUrl = null;
      let titleDocUrls: string[] = [];

      if (ownerDocFile) {
        ownerDocUrl = await uploadFile(ownerDocFile, 'owner-documents');
        if (!ownerDocUrl) {
          toast({
            title: "Erreur de téléchargement",
            description: "Impossible de télécharger le document du propriétaire",
            variant: "destructive"
          });
          setUploading(false);
          return;
        }
      }

      if (titleDocFiles.length > 0) {
        for (const file of titleDocFiles) {
          const url = await uploadFile(file, 'title-documents');
          if (!url) {
            toast({
              title: "Erreur de téléchargement",
              description: "Impossible de télécharger un document de titre",
              variant: "destructive"
            });
            setUploading(false);
            return;
          }
          titleDocUrls.push(url);
        }
      }

      // Upload tax receipt files and transform data
      const taxHistoryData = await Promise.all(
        taxRecords.map(async (tax) => {
          let receiptUrl = null;
          if (tax.receiptFile) {
            receiptUrl = await uploadFile(tax.receiptFile, 'tax-receipts');
            if (!receiptUrl) {
              throw new Error('Erreur lors du téléchargement du reçu de taxe');
            }
          }
          return {
            taxYear: parseInt(tax.taxYear),
            amountUsd: parseFloat(tax.taxAmount),
            paymentStatus: tax.paymentStatus,
            paymentDate: tax.paymentDate || undefined,
            receiptUrl: receiptUrl || undefined,
            taxType: tax.taxType
          };
        })
      );

      // Upload mortgage receipt files and transform data
      const mortgageHistoryData = await Promise.all(
        mortgageRecords.map(async (mortgage) => {
          let receiptUrl = null;
          if (mortgage.receiptFile) {
            receiptUrl = await uploadFile(mortgage.receiptFile, 'mortgage-documents');
            if (!receiptUrl) {
              throw new Error('Erreur lors du téléchargement du document d\'hypothèque');
            }
          }
          return {
            mortgageAmountUsd: parseFloat(mortgage.mortgageAmount),
            durationMonths: parseInt(mortgage.duration),
            creditorName: mortgage.creditorName,
            creditorType: mortgage.creditorType,
            contractDate: mortgage.contractDate,
            mortgageStatus: mortgage.mortgageStatus,
            receiptUrl: receiptUrl || undefined
          };
        })
      );
      
      // Upload building permit files and transform data (only if existing mode)
      let buildingPermitsDataFinal = undefined;
      let permitRequestData = undefined;

      if (permitMode === 'existing') {
        const buildingPermitsData = await Promise.all(
          buildingPermits.map(async (permit) => {
            let attachmentUrl = null;
            if (permit.attachmentFile) {
              attachmentUrl = await uploadFile(permit.attachmentFile, 'building-permits');
              if (!attachmentUrl) {
                throw new Error('Erreur lors du téléchargement du permis de construire');
              }
            }
            return {
              permitType: permit.permitType,
              permitNumber: permit.permitNumber,
              issuingService: permit.issuingService,
              issueDate: permit.issueDate,
              validityMonths: parseInt(permit.validityMonths),
              administrativeStatus: permit.administrativeStatus,
              issuingServiceContact: permit.issuingServiceContact || undefined,
              attachmentUrl: attachmentUrl || undefined
            };
          })
        );
        buildingPermitsDataFinal = buildingPermitsData.length > 0 ? buildingPermitsData : undefined;
      } else if (permitMode === 'request') {
        // Préparer les données de demande de permis
        
        // Upload architectural plan images (for construction permit) or construction photos (for regularisation permit)
        let uploadedImages: string[] = [];
        
        if (permitRequest.permitType === 'construction' && permitRequest.architecturalPlanImages.length > 0) {
          // Upload architectural plans
          for (const file of permitRequest.architecturalPlanImages) {
            const url = await uploadFile(file, 'permit-request-plans');
            if (!url) {
              throw new Error('Erreur lors du téléchargement des plans architecturaux');
            }
            uploadedImages.push(url);
          }
        } else if (permitRequest.permitType === 'regularization' && permitRequest.constructionPhotos.length > 0) {
          // Upload construction photos
          for (const file of permitRequest.constructionPhotos) {
            const url = await uploadFile(file, 'permit-request-photos');
            if (!url) {
              throw new Error('Erreur lors du téléchargement des photos de construction');
            }
            uploadedImages.push(url);
          }
        }
        
        permitRequestData = {
          permitType: permitRequest.permitType,
          hasExistingConstruction: permitRequest.hasExistingConstruction,
          constructionDescription: permitRequest.constructionDescription,
          plannedUsage: permitRequest.plannedUsage,
          estimatedArea: permitRequest.estimatedArea ? parseFloat(permitRequest.estimatedArea) : undefined,
          applicantName: permitRequest.applicantName,
          applicantPhone: permitRequest.applicantPhone,
          applicantEmail: permitRequest.applicantEmail || undefined,
          // Champs conditionnels selon le type de permis
          ...(permitRequest.permitType === 'construction' ? {
            numberOfFloors: permitRequest.numberOfFloors || undefined,
            buildingMaterials: permitRequest.buildingMaterials || undefined,
            architecturalPlanImages: uploadedImages.length > 0 ? uploadedImages : undefined
          } : {
            constructionYear: permitRequest.constructionYear || undefined,
            regularizationReason: permitRequest.regularizationReason || undefined,
            originalPermitNumber: permitRequest.originalPermitNumber || undefined,
            constructionPhotos: uploadedImages.length > 0 ? uploadedImages : undefined
          })
        };
      }
      
      // Transform GPS coordinates data
      const gpsCoordinatesData = gpsCoordinates.length > 0 ? gpsCoordinates.map(coord => ({
        borne: coord.borne,
        lat: parseFloat(coord.lat),
        lng: parseFloat(coord.lng)
      })) : undefined;

      // Transform previousOwners to ownershipHistory
      const ownershipHistoryData = previousOwners
        .filter(owner => owner.name && owner.startDate)
        .map(owner => ({
          ownerName: owner.name,
          legalStatus: owner.legalStatus,
          startDate: owner.startDate,
          endDate: owner.endDate || undefined,
          mutationType: owner.mutationType || undefined
        }));

      // Add document URLs to form data
      const dataToSubmit = {
        ...formData,
        currentOwners: currentOwners.filter(o => o.lastName && o.firstName), // Ne garder que les propriétaires avec nom et prénom
        ownershipHistory: ownershipHistoryData.length > 0 ? ownershipHistoryData as any : undefined,
        ownerDocumentUrl: ownerDocUrl || undefined,
        titleDocumentUrl: titleDocUrls.length > 0 ? JSON.stringify(titleDocUrls) : undefined,
        taxHistory: taxHistoryData.length > 0 ? taxHistoryData as any : undefined,
        mortgageHistory: mortgageHistoryData.length > 0 ? mortgageHistoryData as any : undefined,
        buildingPermits: buildingPermitsDataFinal,
        permitRequest: permitRequestData,
        previousPermitNumber: permitRequest.previousPermitNumber || undefined, // ✅ NOUVEAU: Ajout du numéro de permis précédent
        gpsCoordinates: gpsCoordinatesData,
        parcelSides: parcelSides.filter(s => s.length && parseFloat(s.length) > 0).length > 0 
          ? parcelSides.filter(s => s.length && parseFloat(s.length) > 0) 
          : undefined, // Dimensions exactes des côtés
      };

      const result = await submitContribution(dataToSubmit);
      
      if (result?.success) {
        // Effacer les données sauvegardées après une soumission réussie
        clearSavedFormData();
        
        // Vérifier si l'utilisateur a demandé un permis
        if (permitMode === 'request' && permitRequestData) {
          // Sauvegarder l'ID de la contribution et les données du permis pour le paiement
          setSavedContributionId(result.contributionId);
          setSavedPermitRequestData(permitRequestData);
          setShowPermitPayment(true);
        } else {
          setShowSuccess(true);
        }
      } else if (result && !result.success) {
        // La gestion d'erreur est déjà faite dans le hook useCadastralContribution
        // On ne fait rien ici pour éviter les doublons de messages
        console.error('Échec de la soumission de la contribution');
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue lors du téléchargement",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const addPreviousOwner = () => {
    // Vérifier d'abord si au moins un propriétaire actuel est renseigné
    const firstCurrentOwner = currentOwners[0];
    if (!firstCurrentOwner?.lastName || !firstCurrentOwner?.firstName) {
      // Afficher la notification demandant d'ajouter d'abord les propriétaires actuels
      setShowCurrentOwnerRequiredWarning(true);
      
      // Masquer la notification après 5 secondes
      setTimeout(() => {
        setShowCurrentOwnerRequiredWarning(false);
      }, 5000);
      
      return;
    }
    
    const firstOwner = previousOwners[0];
    
    // Vérifier si le premier propriétaire est complété
    if (!firstOwner?.name || !firstOwner?.legalStatus || !firstOwner?.mutationType) {
      // Afficher la notification et mettre en surbrillance
      setShowPreviousOwnerWarning(true);
      setHighlightIncompletePreviousOwner(true);
      
      // Masquer la notification après 5 secondes
      setTimeout(() => {
        setShowPreviousOwnerWarning(false);
      }, 5000);
      
      // Retirer la surbrillance après 3 secondes
      setTimeout(() => {
        setHighlightIncompletePreviousOwner(false);
      }, 3000);
      
      return;
    }
    
    // Réinitialiser les états d'avertissement
    setShowPreviousOwnerWarning(false);
    setHighlightIncompletePreviousOwner(false);
    
    const newOwner = {
      name: '',
      legalStatus: 'Personne physique',
      startDate: '',
      endDate: '',
      mutationType: 'Vente'
    };
    
    // Si on ajoute un nouveau propriétaire après un existant, auto-remplir sa date de fin
    // avec la date de début du propriétaire précédent (moins ancien)
    if (previousOwners.length > 0) {
      const lastOwner = previousOwners[previousOwners.length - 1];
      if (lastOwner.startDate) {
        newOwner.endDate = lastOwner.startDate;
      }
    }
    
    setPreviousOwners([...previousOwners, newOwner]);
  };

  const removePreviousOwner = (index: number) => {
    setPreviousOwners(previousOwners.filter((_, i) => i !== index));
  };

  const updatePreviousOwner = (index: number, field: string, value: string) => {
    const updated = [...previousOwners];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-remplir la date de fin du propriétaire suivant (plus ancien) quand on change la date de début
    if (field === 'startDate' && value && index < previousOwners.length - 1) {
      // Mettre à jour la date de fin du propriétaire suivant (index + 1)
      updated[index + 1] = { ...updated[index + 1], endDate: value };
    }
    
    setPreviousOwners(updated);
  };

  // Fonctions pour gérer les propriétaires actuels
  const addCurrentOwner = () => {
    const lastOwner = currentOwners[currentOwners.length - 1];
    
    // Vérifier si le dernier propriétaire est complété
    if (!lastOwner?.lastName || !lastOwner?.firstName) {
      // Afficher la notification et mettre en surbrillance
      setShowOwnerWarning(true);
      setHighlightIncompleteOwner(true);
      
      // Masquer la notification après 5 secondes
      setTimeout(() => {
        setShowOwnerWarning(false);
      }, 5000);
      
      // Retirer la surbrillance après 3 secondes
      setTimeout(() => {
        setHighlightIncompleteOwner(false);
      }, 3000);
      
      return;
    }
    
    // Réinitialiser les états d'avertissement
    setShowOwnerWarning(false);
    setHighlightIncompleteOwner(false);
    
    setCurrentOwners([...currentOwners, {
      lastName: '',
      middleName: '',
      firstName: '',
      legalStatus: 'Personne physique',
      since: ''
    }]);
  };

  const removeCurrentOwner = (index: number) => {
    if (currentOwners.length > 1) {
      setCurrentOwners(currentOwners.filter((_, i) => i !== index));
    }
  };

  const updateCurrentOwner = (index: number, field: string, value: string) => {
    const updated = [...currentOwners];
    updated[index] = { ...updated[index], [field]: value };
    setCurrentOwners(updated);
  };

  // Fonctions pour gérer les taxes
  const addTaxRecord = () => {
    const firstTax = taxRecords[0];
    
    // Vérifier si la première taxe est complétée
    if (!firstTax?.taxType || !firstTax?.taxYear || !firstTax?.taxAmount || !firstTax?.paymentStatus || !firstTax?.paymentDate) {
      // Afficher la notification et mettre en surbrillance
      setShowTaxWarning(true);
      setHighlightIncompleteTax(true);
      
      // Masquer la notification après 5 secondes
      setTimeout(() => {
        setShowTaxWarning(false);
      }, 5000);
      
      // Retirer la surbrillance après 3 secondes
      setTimeout(() => {
        setHighlightIncompleteTax(false);
      }, 3000);
      
      return;
    }
    
    // Réinitialiser les états d'avertissement
    setShowTaxWarning(false);
    setHighlightIncompleteTax(false);
    
    setTaxRecords([...taxRecords, {
      taxType: '',
      taxYear: '',
      taxAmount: '',
      paymentStatus: '',
      paymentDate: '',
      receiptFile: null
    }]);
  };

  const removeTaxRecord = (index: number) => {
    setTaxRecords(taxRecords.filter((_, i) => i !== index));
  };

  const updateTaxRecord = (index: number, field: string, value: string) => {
    const updated = [...taxRecords];
    updated[index] = { ...updated[index], [field]: value };
    setTaxRecords(updated);
  };

  const handleTaxFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Fichier trop volumineux",
          description: "La taille maximale est de 5 MB",
          variant: "destructive"
        });
        return;
      }
      const updated = [...taxRecords];
      updated[index] = { ...updated[index], receiptFile: file };
      setTaxRecords(updated);
    }
  };

  const removeTaxFile = (index: number) => {
    const updated = [...taxRecords];
    updated[index] = { ...updated[index], receiptFile: null };
    setTaxRecords(updated);
  };

  // Fonctions pour gérer les hypothèques
  const addMortgageRecord = () => {
    const firstMortgage = mortgageRecords[0];
    
    // Vérifier si la première hypothèque est complétée
    if (!firstMortgage?.mortgageAmount || !firstMortgage?.duration || !firstMortgage?.creditorName || !firstMortgage?.creditorType || !firstMortgage?.contractDate || !firstMortgage?.mortgageStatus) {
      // Afficher la notification et mettre en surbrillance
      setShowMortgageWarning(true);
      setHighlightIncompleteMortgage(true);
      
      // Masquer la notification après 5 secondes
      setTimeout(() => {
        setShowMortgageWarning(false);
      }, 5000);
      
      // Retirer la surbrillance après 3 secondes
      setTimeout(() => {
        setHighlightIncompleteMortgage(false);
      }, 3000);
      
      return;
    }
    
    // Réinitialiser les états d'avertissement
    setShowMortgageWarning(false);
    setHighlightIncompleteMortgage(false);
    
    setMortgageRecords([...mortgageRecords, {
      mortgageAmount: '',
      duration: '',
      creditorName: '',
      creditorType: '',
      contractDate: '',
      mortgageStatus: '',
      receiptFile: null
    }]);
  };

  const removeMortgageRecord = (index: number) => {
    setMortgageRecords(mortgageRecords.filter((_, i) => i !== index));
  };

  const updateMortgageRecord = (index: number, field: string, value: string) => {
    const updated = [...mortgageRecords];
    updated[index] = { ...updated[index], [field]: value };
    setMortgageRecords(updated);
  };

  const handleMortgageFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Fichier trop volumineux",
          description: "La taille maximale est de 5 MB",
          variant: "destructive"
        });
        return;
      }
      const updated = [...mortgageRecords];
      updated[index] = { ...updated[index], receiptFile: file };
      setMortgageRecords(updated);
    }
  };

  const removeMortgageFile = (index: number) => {
    const updated = [...mortgageRecords];
    updated[index] = { ...updated[index], receiptFile: null };
    setMortgageRecords(updated);
  };
  
  // Fonctions pour gérer les permis de construire
  const addBuildingPermit = () => {
    const lastPermit = buildingPermits[buildingPermits.length - 1];
    
    // Vérifier si le dernier permis est complété
    if (!lastPermit?.permitNumber || !lastPermit?.issuingService || !lastPermit?.issueDate) {
      // Afficher la notification et mettre en surbrillance
      setShowPermitWarning(true);
      setHighlightIncompletePermit(true);
      
      // Masquer la notification après 5 secondes
      setTimeout(() => {
        setShowPermitWarning(false);
      }, 5000);
      
      // Retirer la surbrillance après 3 secondes
      setTimeout(() => {
        setHighlightIncompletePermit(false);
      }, 3000);
      
      return;
    }
    
    // Réinitialiser les états d'avertissement
    setShowPermitWarning(false);
    setHighlightIncompletePermit(false);
    
    setBuildingPermits([...buildingPermits, {
      permitType: 'construction',
      permitNumber: '',
      issuingService: '',
      issueDate: '',
      validityMonths: '36',
      administrativeStatus: 'En attente',
      issuingServiceContact: '',
      attachmentFile: null
    }]);
  };
  
  const removeBuildingPermit = (index: number) => {
    setBuildingPermits(buildingPermits.filter((_, i) => i !== index));
  };
  
  const updateBuildingPermit = (index: number, field: string, value: string) => {
    const updated = [...buildingPermits];
    updated[index] = { ...updated[index], [field]: value };
    setBuildingPermits(updated);
  };

  const updateBuildingPermitFile = (index: number, file: File | null) => {
    const updated = [...buildingPermits];
    updated[index] = { ...updated[index], attachmentFile: file };
    setBuildingPermits(updated);
  };

  const removeBuildingPermitFile = (index: number) => {
    const updated = [...buildingPermits];
    updated[index] = { ...updated[index], attachmentFile: null };
    setBuildingPermits(updated);
  };

  // Logiques dépendantes pour les permis de construire
  const getPermitTypeRestrictions = () => {
    const restrictions = {
      blockedInExisting: null as 'construction' | 'regularization' | null,
      blockedInRequest: null as 'construction' | 'regularization' | null,
      messageExisting: '',
      messageRequest: '',
      dateMinExisting: '',
      dateMaxExisting: '',
      dateMinRegularization: '',
      dateMaxRegularization: ''
    };

    const today = new Date();
    const threeYearsAgo = new Date(today);
    threeYearsAgo.setFullYear(today.getFullYear() - 3);
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(today.getMonth() - 1);

    // Logique 1: Si type de construction = "terrain nu"
    if (formData.constructionType === 'Terrain nu') {
      restrictions.blockedInExisting = 'regularization';
      restrictions.blockedInRequest = 'regularization';
      restrictions.messageExisting = `Vous avez indiqué dans "Type de construction" que c'est un terrain nu. Un terrain nu n'a pas besoin d'un permis de régularisation, mais plutôt d'un permis de construire.`;
      restrictions.messageRequest = `Vous avez indiqué dans "Type de construction" que c'est un "terrain nu". Un terrain nu n'a pas besoin d'un permis de régularisation, mais plutôt d'un permis de construire.`;
      restrictions.dateMinExisting = threeYearsAgo.toISOString().split('T')[0];
      restrictions.dateMaxExisting = today.toISOString().split('T')[0];
      return restrictions;
    }

    // Logique 2: Si nature de construction = "Précaire"
    if (formData.constructionNature === 'Précaire') {
      restrictions.blockedInExisting = 'regularization';
      restrictions.blockedInRequest = 'regularization';
      restrictions.messageExisting = `Vous avez indiqué dans "Nature de construction" que c'est une construction précaire. Une construction précaire n'a pas besoin d'un permis de régularisation, mais plutôt d'un permis de construire.`;
      restrictions.messageRequest = `Vous avez indiqué dans "Nature de construction" que c'est une construction "Précaire". Une construction précaire n'a pas besoin d'un permis de régularisation, mais plutôt d'un permis de construire.`;
      restrictions.dateMinExisting = threeYearsAgo.toISOString().split('T')[0];
      restrictions.dateMaxExisting = today.toISOString().split('T')[0];
      return restrictions;
    }

    // Logique 3: Si type de construction ≠ "terrain nu"
    // Les deux options (Permis de construire et Permis de régularisation) restent disponibles
    if (formData.constructionType && formData.constructionType !== 'Terrain nu') {
      // Dates pour permis de construire: 3 ans passé - 1 mois avant aujourd'hui
      restrictions.dateMinExisting = threeYearsAgo.toISOString().split('T')[0];
      restrictions.dateMaxExisting = oneMonthAgo.toISOString().split('T')[0];
      
      // Dates pour permis de régularisation: 3 ans passé - aujourd'hui
      restrictions.dateMinRegularization = threeYearsAgo.toISOString().split('T')[0];
      restrictions.dateMaxRegularization = today.toISOString().split('T')[0];
    }

    return restrictions;
  };

  const handleBlockedPermitTypeClick = (
    blockedType: 'construction' | 'regularization',
    message: string,
    mode: 'existing' | 'request'
  ) => {
    setPermitTypeBlockedMessage(message);
    setShowPermitTypeBlockedWarning(true);

    // Masquer la notification après 8 secondes
    setTimeout(() => {
      setShowPermitTypeBlockedWarning(false);
    }, 8000);
  };
  
  // Fonctions pour gérer les coordonnées GPS
  const addGPSCoordinate = () => {
    // Vérifier si le nombre de bornes n'excède pas le nombre de côtés
    const filledSides = parcelSides.filter(s => s.length && parseFloat(s.length) > 0);
    if (gpsCoordinates.length >= filledSides.length) {
      return; // La notification est gérée par le onClick du bouton
    }
    
    setGpsCoordinates([...gpsCoordinates, {
      borne: `Borne ${gpsCoordinates.length + 1}`,
      lat: '',
      lng: '',
      mode: 'auto',
      detected: false,
      detecting: false
    }]);
  };
  
  const removeGPSCoordinate = (index: number) => {
    setGpsCoordinates(gpsCoordinates.filter((_, i) => i !== index));
    
    // Supprimer automatiquement le côté correspondant
    if (parcelSides.length > 2 && index < parcelSides.length) {
      setParcelSides(parcelSides.filter((_, i) => i !== index));
    }
  };
  
  const updateGPSCoordinate = (index: number, field: string, value: any) => {
    const updated = [...gpsCoordinates];
    updated[index] = { ...updated[index], [field]: value };
    setGpsCoordinates(updated);
  };
  
  const captureCurrentLocation = (index: number) => {
    if (!navigator.geolocation) {
      toast({
        title: "Erreur",
        description: "La géolocalisation n'est pas supportée par votre navigateur",
        variant: "destructive"
      });
      return;
    }
    
    // Marquer comme en cours de détection
    const updated = [...gpsCoordinates];
    updated[index] = { ...updated[index], detecting: true };
    setGpsCoordinates(updated);
    
    // Afficher un toast informatif
    toast({
      title: "Détection en cours...",
      description: "Veuillez patienter pendant que nous obtenons votre position GPS",
    });
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const finalUpdate = [...gpsCoordinates];
        finalUpdate[index] = {
          ...finalUpdate[index],
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6),
          detected: true,
          detecting: false
        };
        setGpsCoordinates(finalUpdate);
        
        toast({
          title: "Borne détectée",
          description: `Coordonnées enregistrées avec succès (précision: ±${Math.round(position.coords.accuracy)}m)`,
        });
      },
      (error) => {
        // Réinitialiser l'état de détection en cas d'erreur
        const errorUpdate = [...gpsCoordinates];
        errorUpdate[index] = { ...errorUpdate[index], detecting: false };
        setGpsCoordinates(errorUpdate);
        
        let errorMessage = "Impossible de récupérer votre position";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Veuillez autoriser l'accès à votre position dans les paramètres de votre navigateur";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Position indisponible. Assurez-vous que le GPS est activé et que vous êtes à l'extérieur ou près d'une fenêtre";
            break;
          case error.TIMEOUT:
            errorMessage = "La détection a pris trop de temps. Assurez-vous que le GPS est activé et réessayez";
            break;
        }
        
        toast({
          title: "Erreur de géolocalisation",
          description: errorMessage,
          variant: "destructive"
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 30000, // 30 secondes pour permettre au GPS de se stabiliser
        maximumAge: 5000 // Accepter une position récente (5 secondes) pour améliorer la performance
      }
    );
  };

  const resetGPSCoordinate = (index: number) => {
    const updated = [...gpsCoordinates];
    updated[index] = {
      ...updated[index],
      lat: '',
      lng: '',
      detected: false,
      detecting: false
    };
    setGpsCoordinates(updated);
    
    toast({
      title: "Borne réinitialisée",
      description: "Vous pouvez à nouveau détecter cette borne",
    });
  };

  // Fonctions pour gérer les côtés de la parcelle
  const addParcelSide = () => {
    const sideNumber = parcelSides.length + 1;
    setParcelSides([...parcelSides, {
      name: `Côté ${sideNumber}`,
      length: ''
    }]);
    
    // Ajouter automatiquement une borne GPS correspondante
    const borneNumber = gpsCoordinates.length + 1;
    setGpsCoordinates([...gpsCoordinates, {
      borne: `Borne ${borneNumber}`,
      lat: '',
      lng: ''
    }]);
  };

  const removeParcelSide = (index: number) => {
    if (parcelSides.length > 2) {
      setParcelSides(parcelSides.filter((_, i) => i !== index));
      
      // Supprimer automatiquement la borne GPS correspondante
      if (gpsCoordinates.length > 0) {
        setGpsCoordinates(gpsCoordinates.slice(0, -1));
      }
    }
  };

  const updateParcelSide = (index: number, field: 'name' | 'length', value: string) => {
    const updated = [...parcelSides];
    updated[index] = { ...updated[index], [field]: value };
    setParcelSides(updated);
  };


  // Calculer la valeur CCC estimée (similaire au backend calculate_ccc_value)
  const calculateCCCValue = () => {
    let totalFields = 0;
    let filledFields = 0;
    
    // SECTION 1: Champ obligatoire (1 champ)
    totalFields += 1; // parcelNumber
    filledFields += 1; // toujours rempli
    
    // SECTION 2: Informations générales (12 champs)
    totalFields += 12;
    if (formData.propertyTitleType) filledFields += 1;
    if (formData.leaseType) filledFields += 1;
    if (formData.titleReferenceNumber) filledFields += 1;
    
    // Propriétaires actuels
    const hasValidOwners = currentOwners.some(o => o.lastName && o.firstName && o.legalStatus);
    if (hasValidOwners) filledFields += 3; // lastName, firstName, legalStatus
    
    const hasOwnerSince = currentOwners.some(o => o.since);
    if (hasOwnerSince) filledFields += 1;
    
    if (formData.areaSqm) filledFields += 1;
    if (formData.constructionType) filledFields += 1;
    if (formData.constructionNature) filledFields += 1;
    if (formData.declaredUsage) filledFields += 1;
    
    // SECTION 3: Permis de construire (3 champs)
    totalFields += 3;
    const hasValidPermits = buildingPermits.some(p => p.permitNumber && p.issuingService);
    if (hasValidPermits) filledFields += 1;
    
    const hasPermitAttachments = buildingPermits.some(p => p.attachmentFile);
    if (hasPermitAttachments) filledFields += 1;
    
    if (permitRequest.applicantName && permitRequest.constructionDescription) {
      filledFields += 1;
    }
    
    // SECTION 4: Localisation (12 champs)
    totalFields += 12;
    if (formData.province) filledFields += 1;
    if (formData.ville) filledFields += 1;
    if (formData.commune) filledFields += 1;
    if (formData.quartier) filledFields += 1;
    if (formData.avenue) filledFields += 1;
    if (formData.territoire) filledFields += 1;
    if (formData.collectivite) filledFields += 1;
    if (formData.groupement) filledFields += 1;
    if (formData.village) filledFields += 1;
    if (formData.circonscriptionFonciere) filledFields += 1;
    
    const hasValidGPS = gpsCoordinates.filter(g => g.lat && g.lng).length >= 3;
    if (hasValidGPS) {
      filledFields += 2; // coordonnées + validation >= 3 bornes
    } else if (gpsCoordinates.some(g => g.lat && g.lng)) {
      filledFields += 1; // coordonnées partielles
    }
    
    // SECTION 5: Historiques (3 champs)
    totalFields += 3;
    const hasOwnershipHistory = previousOwners.some(o => o.name && o.startDate);
    if (hasOwnershipHistory) filledFields += 1;
    
    if (formData.boundaryHistory && formData.boundaryHistory.length > 0) filledFields += 1;
    
    const hasTaxHistory = taxRecords.some(t => t.taxAmount && t.taxYear);
    if (hasTaxHistory) filledFields += 1;
    
    // SECTION 6: Obligations (1 champ)
    totalFields += 1;
    const hasMortgageHistory = mortgageRecords.some(m => m.mortgageAmount && m.creditorName);
    if (hasMortgageHistory) filledFields += 1;
    
    // SECTION 7: Pièces jointes (2 champs)
    totalFields += 2;
    if (ownerDocFile) filledFields += 1;
    if (titleDocFiles.length > 0) filledFields += 1;
    
    // SECTION 8: Métadonnées (1 champ)
    totalFields += 1;
    if (formData.whatsappNumber) filledFields += 1;
    
    // Calculer le taux de complétion
    const completionRate = filledFields / totalFields;
    
    // Calculer la valeur du code CCC (max 5$)
    let cccValue = Math.round(5.0 * completionRate * 100) / 100;
    
    // Valeur minimum de 0.50$ si au moins le numéro de parcelle est fourni
    if (cccValue < 0.50) {
      cccValue = 0.50;
    }
    
    return {
      value: cccValue,
      completionRate: completionRate,
      filledFields,
      totalFields
    };
  };

  // Calculer les détails de progression avec points et badges
  const calculateProgressDetails = () => {
    let earnedPoints = 0;
    const totalPoints = 1000; // Base de 1000 points pour 100%
    
    const tabProgress = {
      general: { filled: 0, total: 0 },
      location: { filled: 0, total: 0 },
      history: { filled: 0, total: 0 },
      obligations: { filled: 0, total: 0 }
    };

    // ============================================
    // ONGLET INFORMATIONS GÉNÉRALES - 30% (300 points)
    // 40% pour données textuelles (120 pts), 60% pour pièces (180 pts)
    // ============================================
    const generalTextPoints = 120;
    const generalDocPoints = 180;
    
    // Données textuelles (120 points répartis sur 6 champs = 20 pts/champ)
    let generalTextFilled = 0;
    const generalTextTotal = 6;
    
    if (formData.propertyTitleType) { earnedPoints += 20; generalTextFilled++; }
    if (formData.titleReferenceNumber) { earnedPoints += 20; generalTextFilled++; }
    if (formData.constructionType) { earnedPoints += 20; generalTextFilled++; }
    if (formData.constructionNature) { earnedPoints += 20; generalTextFilled++; }
    if (formData.declaredUsage) { earnedPoints += 20; generalTextFilled++; }
    const hasValidOwner = currentOwners.some(o => o.lastName && o.firstName);
    if (hasValidOwner) { earnedPoints += 20; generalTextFilled++; }
    
    // Pièces justificatives (180 points : 90 pts titre + 90 pts proprio)
    let generalDocFilled = 0;
    const generalDocTotal = 2;
    
    if (titleDocFiles.length > 0) { earnedPoints += 90; generalDocFilled++; }
    if (ownerDocFile) { earnedPoints += 90; generalDocFilled++; }
    
    tabProgress.general.filled = generalTextFilled + generalDocFilled;
    tabProgress.general.total = generalTextTotal + generalDocTotal;

    // ============================================
    // ONGLET LOCALISATION - 15% (150 points)
    // 40% pour données textuelles (60 pts), 60% pour pièces (90 pts)
    // ============================================
    const locationTextPoints = 60;
    const locationDocPoints = 90;
    
    // Données textuelles (60 points répartis sur 3-4 champs)
    let locationTextFilled = 0;
    let locationTextTotal = 0;
    
    if (formData.province) { earnedPoints += 15; locationTextFilled++; }
    locationTextTotal++;
    
    if (sectionType === 'urbaine') {
      if (formData.ville) { earnedPoints += 15; locationTextFilled++; }
      locationTextTotal++;
      if (formData.commune) { earnedPoints += 15; locationTextFilled++; }
      locationTextTotal++;
    } else if (sectionType === 'rurale') {
      if (formData.territoire) { earnedPoints += 15; locationTextFilled++; }
      locationTextTotal++;
      if (formData.collectivite) { earnedPoints += 15; locationTextFilled++; }
      locationTextTotal++;
    }
    
    if (formData.areaSqm) { earnedPoints += 15; locationTextFilled++; }
    locationTextTotal++;
    
    // Pièces justificatives (90 points pour les coordonnées GPS)
    let locationDocFilled = 0;
    const locationDocTotal = 1;
    
    const hasValidGPS = gpsCoordinates.some(coord => coord.lat && coord.lng);
    if (hasValidGPS) { earnedPoints += 90; locationDocFilled++; }
    
    tabProgress.location.filled = locationTextFilled + locationDocFilled;
    tabProgress.location.total = locationTextTotal + locationDocTotal;

    // ============================================
    // HISTORIQUE DES PROPRIÉTAIRES - 15% (150 points)
    // 40% pour données textuelles (60 pts), 60% pour pièces (90 pts)
    // ============================================
    
    // Données textuelles (60 points pour jusqu'à 3 propriétaires = 20 pts/proprio)
    let historyTextFilled = 0;
    const historyTextTotal = 3;
    
    const validPreviousOwners = previousOwners.filter(o => 
      o.name && o.startDate && o.endDate && o.legalStatus && o.mutationType
    );
    
    const ownerCount = Math.min(validPreviousOwners.length, 3);
    earnedPoints += ownerCount * 20;
    historyTextFilled = ownerCount;
    
    // Pièces justificatives (90 points si au moins un document)
    let historyDocFilled = 0;
    const historyDocTotal = 1;
    
    if (validPreviousOwners.length > 0) { 
      earnedPoints += 90; 
      historyDocFilled++; 
    }
    
    tabProgress.history.filled = historyTextFilled + historyDocFilled;
    tabProgress.history.total = historyTextTotal + historyDocTotal;

    // ============================================
    // TAXE FONCIÈRE - 15% (150 points)
    // 40% pour données textuelles (60 pts), 60% pour pièces (90 pts)
    // ============================================
    
    // Données textuelles (60 points pour jusqu'à 3 taxes = 20 pts/taxe)
    let taxTextFilled = 0;
    const taxTextTotal = 3;
    
    const validTaxes = taxRecords.filter(t => 
      t.taxAmount && t.taxYear && t.taxType && t.paymentStatus
    );
    
    const taxCount = Math.min(validTaxes.length, 3);
    earnedPoints += taxCount * 20;
    taxTextFilled = taxCount;
    
    // Pièces justificatives (90 points si au moins un reçu)
    let taxDocFilled = 0;
    const taxDocTotal = 1;
    
    const hasTaxReceipts = taxRecords.some(t => t.receiptFile !== null);
    if (hasTaxReceipts) { earnedPoints += 90; taxDocFilled++; }

    // ============================================
    // HYPOTHÈQUES - 25% (250 points)
    // 40% pour données textuelles (100 pts), 60% pour pièces (150 pts)
    // ============================================
    
    // Données textuelles (100 points pour jusqu'à 2 hypothèques = 50 pts/hypothèque)
    let mortgageTextFilled = 0;
    const mortgageTextTotal = 2;
    
    const validMortgages = mortgageRecords.filter(m => 
      m.mortgageAmount && m.creditorName && m.creditorType && m.contractDate
    );
    
    const mortgageCount = Math.min(validMortgages.length, 2);
    earnedPoints += mortgageCount * 50;
    mortgageTextFilled = mortgageCount;
    
    // Pièces justificatives (150 points si au moins un document)
    let mortgageDocFilled = 0;
    const mortgageDocTotal = 1;
    
    const hasMortgageReceipts = mortgageRecords.some(m => m.receiptFile !== null);
    if (hasMortgageReceipts) { earnedPoints += 150; mortgageDocFilled++; }
    
    // Combiner taxes et hypothèques pour l'onglet obligations
    tabProgress.obligations.filled = taxTextFilled + taxDocFilled + mortgageTextFilled + mortgageDocFilled;
    tabProgress.obligations.total = taxTextTotal + taxDocTotal + mortgageTextTotal + mortgageDocTotal;

    // Calculer le pourcentage final
    const percentage = Math.round((earnedPoints / totalPoints) * 100);
    
    // Calculer le nombre total de champs pour l'affichage
    const filledFields = tabProgress.general.filled + tabProgress.location.filled + 
                         tabProgress.history.filled + tabProgress.obligations.filled;
    const totalFields = tabProgress.general.total + tabProgress.location.total + 
                       tabProgress.history.total + tabProgress.obligations.total;

    return { 
      percentage, 
      filledFields, 
      totalFields, 
      points: earnedPoints, 
      totalPoints,
      tabProgress 
    };
  };

  // Calculer le pourcentage de complétion du formulaire
  const calculateProgress = () => {
    return calculateProgressDetails().percentage;
  };

  // Fonction pour obtenir le message motivant
  const getMotivationalMessage = (progress: number) => {
    if (progress === 0) return "Commencez votre contribution ! 🚀";
    if (progress < 25) return "Excellent début ! Continuons ensemble 💪";
    if (progress < 50) return "Vous progressez bien ! Bientôt à mi-chemin 🎯";
    if (progress < 75) return "Plus que la moitié ! Vous y êtes presque ⚡";
    if (progress < 100) return "Dernière ligne droite ! Quelques détails encore ✨";
    return "Parfait ! Formulaire complété 🎉";
  };

  // Fonction pour obtenir la couleur de la barre
  const getProgressColor = (progress: number) => {
    if (progress < 40) return "bg-red-500";
    if (progress < 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  // Fonction pour déclencher les confettis
  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  };

  const handleClose = () => {
    setFormData({ parcelNumber: parcelNumber });
    setShowSuccess(false);
    setShowPermitPayment(false);
    setSavedPermitRequestData(null);
    setShowQuickAuth(false);
    setPendingSubmission(false);
    setOwnerDocFile(null);
    setTitleDocFiles([]);
    setSectionType('');
    setSectionTypeAutoDetected(false);
    setPreviousOwners([{
      name: '',
      legalStatus: 'Personne physique',
      startDate: '',
      endDate: '',
      mutationType: 'Vente'
    }]);
    setCurrentOwners([{
      lastName: '',
      middleName: '',
      firstName: '',
      legalStatus: 'Personne physique',
      since: ''
    }]);
    setTaxRecords([{
      taxType: 'Taxe foncière',
      taxYear: '',
      taxAmount: '',
      paymentStatus: 'Non payée',
      paymentDate: '',
      receiptFile: null
    }]);
    setMortgageRecords([{
      mortgageAmount: '',
      duration: '',
      creditorName: '',
      creditorType: 'Banque',
      contractDate: '',
      mortgageStatus: 'Active',
      receiptFile: null
    }]);
    setObligationType('taxes');
    setParcelSides([
      { name: 'Côté Nord', length: '' },
      { name: 'Côté Sud', length: '' },
      { name: 'Côté Est', length: '' },
      { name: 'Côté Ouest', length: '' }
    ]);
    setAvailableQuartiers([]);
    setAvailableAvenues([]);
    setBuildingPermits([{
      permitType: 'construction',
      permitNumber: '',
      issuingService: '',
      issueDate: '',
      validityMonths: '36',
      administrativeStatus: 'En attente',
      issuingServiceContact: '',
      attachmentFile: null
    }]);
    setGpsCoordinates([{
      borne: 'Borne 1',
      lat: '',
      lng: ''
    }]);
    setShowRequiredFieldsPopover(false);
    setHighlightRequiredFields(false);
    onOpenChange(false);
  };

  // Dialogue de paiement de permis
  if (showPermitPayment && savedPermitRequestData) {
    const permitType = savedPermitRequestData.permitType;
    const servicePrice = permitType === 'construction' ? 150 : 200;
    const serviceName = permitType === 'construction' 
      ? 'Permis de construire' 
      : 'Permis de régularisation';
    
    const cartItem: CartItem = {
      id: `permit-${Date.now()}`,
      title: serviceName,
      price: servicePrice,
      description: `Demande de ${serviceName.toLowerCase()} pour la parcelle ${parcelNumber}`
    };
    
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay 
            className="fixed inset-0 z-[10000] bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" 
          />
          <DialogPrimitive.Content
            className={cn(
              "fixed left-[50%] top-[50%] z-[10000] grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-xl sm:max-w-lg overflow-y-auto max-h-[90vh]"
            )}
          >
            <div className="space-y-4 sm:space-y-6">
              <div className="text-center space-y-2">
                <DialogPrimitive.Title className="text-xl sm:text-2xl font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Paiement du {serviceName}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-sm text-muted-foreground">
                  Finalisez le paiement pour traiter votre demande de permis
                </DialogPrimitive.Description>
              </div>
              
              {/* Détails de la demande */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Service</span>
                  <span className="font-semibold">{serviceName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Parcelle</span>
                  <span className="font-semibold">{parcelNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Demandeur</span>
                  <span className="font-semibold">{savedPermitRequestData.applicantName}</span>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex justify-between items-center text-lg">
                  <span className="font-semibold">Total à payer</span>
                  <span className="font-bold text-primary">${servicePrice} USD</span>
                </div>
              </div>
              
              {/* Message informatif */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <p className="font-semibold">À propos du traitement de votre demande</p>
                    <p className="text-xs">
                      Une fois le paiement effectué, votre demande sera traitée par nos services dans un délai de 5 à 10 jours ouvrables. 
                      Vous recevrez une notification avec le reçu de paiement et les prochaines étapes.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Composant de paiement */}
              <div className="border rounded-lg p-4">
                <MobileMoneyPayment
                  item={cartItem}
                  currency="USD"
                  onPaymentSuccess={() => {
                    toast({
                      title: "Paiement effectué",
                      description: "Votre demande de permis sera traitée dans les plus brefs délais.",
                    });
                    setShowPermitPayment(false);
                    setShowSuccess(true);
                  }}
                />
              </div>
              
              {/* Option pour payer plus tard */}
              <div className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowPermitPayment(false);
                    setShowSuccess(true);
                  }}
                  className="text-sm"
                >
                  Payer plus tard
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Vous pourrez effectuer le paiement depuis votre espace client
                </p>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </Dialog>
    );
  }

  if (showSuccess) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay 
            className="fixed inset-0 z-[10000] bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" 
          />
          <DialogPrimitive.Content
            className={cn(
              "fixed left-[50%] top-[50%] z-[10000] grid w-[calc(100%-2rem)] max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-xl sm:max-w-md"
            )}
          >
            <div className="flex flex-col items-center justify-center py-4 sm:py-8 space-y-4 sm:space-y-6 animate-fade-in">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                <CheckCircle2 className="h-16 w-16 sm:h-20 sm:w-20 text-primary relative animate-scale-in" />
              </div>
              <DialogPrimitive.Title className="text-xl sm:text-2xl text-center font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Merci pour votre contribution !
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-center text-sm sm:text-base px-2">
                Votre contribution pour la parcelle <strong className="text-foreground">{parcelNumber}</strong> a été enregistrée.
                Elle sera vérifiée par notre équipe.
              </DialogPrimitive.Description>
              <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 sm:p-6 rounded-xl w-full border border-primary/20 shadow-lg backdrop-blur-sm animate-scale-in">
                <div className="flex items-center justify-center mb-3 sm:mb-4">
                  <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
                </div>
                <p className="text-base sm:text-lg font-semibold text-center text-foreground mb-2">
                  Contribution en cours de validation
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground text-center mb-3 sm:mb-4">
                  Notre équipe examine actuellement vos informations pour garantir leur exactitude.
                </p>
                <div className="flex flex-col gap-2 text-xs sm:text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Votre code CCC sera généré après approbation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Délai de validation : 24 à 48 heures</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Vous serez notifié par email</span>
                  </div>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-center text-muted-foreground max-w-sm px-2">
                Consultez l'onglet "Codes CCC" de votre tableau de bord pour suivre l'état de votre contribution.
              </p>
              <Button onClick={handleClose} className="w-full shadow-lg hover:shadow-xl transition-all">
                Fermer
              </Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        ref={dialogContentRef} 
        className="sm:max-w-xl w-[calc(100%-1rem)] max-w-[380px] sm:max-w-xl max-h-[92vh] overflow-y-auto border-0 shadow-2xl p-0 rounded-2xl z-[9999]"
        onInteractOutside={(e) => {
          // Empêcher la fermeture si le clic est sur le bouton WhatsApp
          const target = e.target as HTMLElement;
          if (target.closest('[data-whatsapp-button="true"]')) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader className="px-3 sm:px-4 pt-2 sm:pt-3 pb-1.5 sm:pb-2 border-b bg-gradient-to-r from-primary/5 to-transparent rounded-t-2xl">
          <DialogTitle className="text-sm sm:text-base font-semibold leading-tight flex items-center gap-2 justify-center sm:justify-start">
            <Badge variant="secondary" className="text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded-lg">
              {parcelNumber}
            </Badge>
            <span className="text-xs sm:text-sm text-muted-foreground">Contribution CCC</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} className="w-full" onValueChange={handleTabChange}>
          <div className="sticky top-0 z-20 bg-background px-2 sm:px-4 pt-2 pb-1.5 border-b shadow-sm">
            <TabsList className="grid w-full grid-cols-5 h-10 bg-muted/50 p-0.5 rounded-xl shadow-inner gap-0.5">
              <TabsTrigger 
                value="general" 
                className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all text-sm font-semibold py-1.5 rounded-lg"
              >
                Infos
              </TabsTrigger>
              <TabsTrigger 
                value="location" 
                className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all text-sm font-semibold py-1.5 rounded-lg"
              >
                Lieu
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all text-sm font-semibold py-1.5 rounded-lg"
              >
                Passé
              </TabsTrigger>
              <TabsTrigger 
                value="obligations" 
                className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all text-sm font-semibold py-1.5 rounded-lg"
              >
                Taxes
              </TabsTrigger>
              <TabsTrigger 
                value="review" 
                className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all text-sm font-semibold py-1.5 rounded-lg"
              >
                Envoi
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="px-3 sm:px-6 pb-4 sm:pb-6">

          <TabsContent value="general" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6 animate-fade-in">
            <PropertyTitleTypeSelect 
              value={formData.propertyTitleType || ''}
              onValueChange={(value) => handleInputChange('propertyTitleType', value)}
              leaseType={formData.leaseType}
              onLeaseTypeChange={(type) => handleInputChange('leaseType', type)}
            />

            {formData.propertyTitleType && (
              <Card className="max-w-[360px] mx-auto rounded-2xl shadow-md border-border/50 overflow-hidden animate-fade-in">
                <CardContent className="p-3 space-y-3">
                  {/* Numéro de référence et Date de délivrance - côte-à-côte */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="titleReference" className="text-sm font-medium">
                        N° {formData.propertyTitleType ? (() => {
                          const titleType = formData.propertyTitleType;
                          // Abréviations pour les noms longs
                          const abbreviations: Record<string, string> = {
                            "Certificat d'enregistrement": "Cert. d'enreg.",
                            "Titre foncier": "Titre foncier",
                            "Concession perpétuelle": "Conc. perpét.",
                            "Concession ordinaire": "Conc. ordin.",
                            "Bail emphytéotique": "Bail emphyt.",
                            "Certificat de location": "Cert. de loc.",
                            "Autorisation d'occupation provisoire": "AOP",
                            "Permis d'occupation urbain": "POU",
                            "Permis d'occupation rural": "POR",
                            "Livret de logeur": "Livret logeur",
                            "Fiche parcellaire": "Fiche parcel."
                          };
                          return abbreviations[titleType] || titleType;
                        })() : "de référence"}
                      </Label>
                      <InputWithPopover
                        id="titleReference"
                        placeholder={PROPERTY_TITLE_TYPES.find(t => t.value === formData.propertyTitleType)?.reference || "XXX-123456"}
                        value={formData.titleReferenceNumber || ''}
                        onChange={(e) => handleInputChange('titleReferenceNumber', e.target.value)}
                        helpTitle="Référence"
                        helpText={`Format : ${PROPERTY_TITLE_TYPES.find(t => t.value === formData.propertyTitleType)?.reference || "XXX-123456"}`}
                        className="h-9 text-sm rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="titleIssueDate" className="text-sm font-medium">
                        Date délivrance
                      </Label>
                      <Input
                        id="titleIssueDate"
                        type="date"
                        max={new Date().toISOString().split('T')[0]}
                        value={formData.titleIssueDate || ''}
                        onChange={(e) => handleInputChange('titleIssueDate', e.target.value)}
                        className="h-9 text-sm rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Document du titre */}
                  <div className="space-y-2 pt-1 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="titleDoc" className="text-sm font-medium">
                        Images ou pdf du {formData.propertyTitleType ? formData.propertyTitleType.toLowerCase() : 'titre de propriété'} <span className="text-destructive">*</span>
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {titleDocFiles.length}/5
                      </span>
                    </div>
                    
                    {titleDocFiles.length > 0 && (
                      <div className="space-y-1.5">
                        {titleDocFiles.map((file, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-xl overflow-hidden min-w-0">
                            <MdInsertDriveFile className="h-4 w-4 text-primary flex-shrink-0" />
                            <span className="text-xs flex-1 truncate overflow-hidden min-w-0">{file.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile('title', index)}
                              className="h-6 w-6 p-0"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {titleDocFiles.length < 5 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('titleDoc')?.click()}
                        className="gap-2 w-full text-sm h-9 rounded-xl border-dashed border-2"
                      >
                        <Plus className="h-4 w-4" />
                        Ajouter fichier
                      </Button>
                    )}
                    
                    <Input
                      id="titleDoc"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                      onChange={(e) => handleFileChange(e, 'title')}
                      className="hidden"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      JPG, PNG, PDF • Max 5 MB
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Le titre foncier est-il au nom du propriétaire actuel? - Affiché uniquement si N° Titre foncier est rempli */}
            {formData.titleReferenceNumber && formData.titleReferenceNumber.trim() !== '' && (
              <Card className="max-w-[360px] mx-auto rounded-2xl shadow-md border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 overflow-hidden">
                <CardContent className="p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-amber-900 dark:text-amber-100">
                      Ce titre de type "{formData.propertyTitleType || 'non sélectionné'}" est-il au nom du propriétaire actuel ?
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 rounded-full hover:bg-transparent">
                          <Info className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 rounded-xl text-xs">
                        <p className="text-muted-foreground">
                          Il est essentiel que le titre foncier soit enregistré au nom du véritable propriétaire afin de prévenir d'éventuelles complications légales, fiscales ou administratives.
                        </p>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleInputChange('isTitleInCurrentOwnerName', true);
                        // Si "Oui" sélectionné, synchroniser la date "Propriétaire depuis" avec "Date délivrance"
                        if (formData.titleIssueDate) {
                          const updatedOwners = [...currentOwners];
                          if (updatedOwners.length > 0) {
                            updatedOwners[0] = { ...updatedOwners[0], since: formData.titleIssueDate };
                            setCurrentOwners(updatedOwners);
                          }
                        }
                      }}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                        formData.isTitleInCurrentOwnerName === true
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-background text-muted-foreground hover:bg-background/80 border border-border'
                      }`}
                    >
                      Oui
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange('isTitleInCurrentOwnerName', false)}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                        formData.isTitleInCurrentOwnerName === false
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-background text-muted-foreground hover:bg-background/80 border border-border'
                      }`}
                    >
                      Non
                    </button>
                  </div>
                  {formData.isTitleInCurrentOwnerName === false && (() => {
                    const ownerSinceDate = currentOwners[0]?.since;
                    if (!ownerSinceDate) return null;
                    
                    const daysDiff = Math.floor((new Date().getTime() - new Date(ownerSinceDate).getTime()) / (1000 * 60 * 60 * 24));
                    
                    if (daysDiff >= 20) {
                      return (
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          ⚠️ Hors délai légal de mutation (De 1 à 20 jours après acquisition).
                        </p>
                      );
                    } else {
                      return (
                        <p className="text-xs text-green-700 dark:text-green-400">
                          ✓ Pensez à faire la mutation dès que possible, vous êtes encore dans le délai légal (De 1 à 20 jours après acquisition).
                        </p>
                      );
                    }
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Section Propriétaire(s) actuel(s) */}
            <Card className="max-w-[360px] mx-auto rounded-2xl shadow-md border-border/50 overflow-hidden">
              <CardContent className="p-3 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center">
                      <MdDashboard className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <Label className="text-sm font-semibold">
                      {formData.isTitleInCurrentOwnerName === true 
                        ? `Ajouter le/la propriétaire figurant sur le ${formData.propertyTitleType || 'titre de propriété'}`
                        : formData.isTitleInCurrentOwnerName === false
                        ? "Ajouter le/la propriétaire figurant sur tout acte prouvant son droit sur cette parcelle"
                        : "Propriétaire(s) actuel(s)"}
                    </Label>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 rounded-full hover:bg-transparent">
                        <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 rounded-xl" align="end">
                      <div className="space-y-2 text-xs">
                        <h4 className="font-semibold text-sm">Nom différent du document ?</h4>
                        <p className="text-muted-foreground">
                          Vous pouvez indiquer votre nom si vous détenez un acte de transfert (vente, donation, succession).
                        </p>
                        <p className="text-muted-foreground">
                          <strong>💡</strong> Ajoutez ce document dans la section "Document du titre".
                        </p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {currentOwners.map((owner, index) => (
                  <div key={index} className={`border-2 rounded-2xl p-3 space-y-3 bg-card shadow-sm transition-all duration-300 ${
                    highlightIncompleteOwner && index === currentOwners.length - 1 && (!owner.lastName || !owner.firstName) 
                      ? 'ring-2 ring-primary border-primary animate-pulse' 
                      : 'border-border'
                  }`}>
                    {/* Bouton supprimer si plusieurs propriétaires */}
                    {currentOwners.length > 1 && (
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCurrentOwner(index)}
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 rounded-xl"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-2">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Nom *</Label>
                        <Input
                          placeholder="Nom de famille"
                          value={owner.lastName}
                          onChange={(e) => updateCurrentOwner(index, 'lastName', e.target.value)}
                          className="h-10 text-sm rounded-xl"
                        />
                      </div>
                      {/* Post-nom et Prénom - côte-à-côte */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-sm font-medium">Post-nom</Label>
                          <Input
                            placeholder="Post-nom"
                            value={owner.middleName}
                            onChange={(e) => updateCurrentOwner(index, 'middleName', e.target.value)}
                            className="h-10 text-sm rounded-xl"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm font-medium">Prénom *</Label>
                          <Input
                            placeholder="Prénom"
                            value={owner.firstName}
                            onChange={(e) => updateCurrentOwner(index, 'firstName', e.target.value)}
                            className="h-10 text-sm rounded-xl"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Statut juridique</Label>
                        <Select 
                          value={owner.legalStatus}
                          onValueChange={(value) => updateCurrentOwner(index, 'legalStatus', value)}
                        >
                          <SelectTrigger className="h-10 text-sm rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="Personne physique">Personne physique</SelectItem>
                            <SelectItem value="Personne morale">Personne morale</SelectItem>
                            <SelectItem value="État">État</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Propriétaire depuis</Label>
                        <Input
                          type="date"
                          max={new Date().toISOString().split('T')[0]}
                          value={owner.since}
                          onChange={(e) => updateCurrentOwner(index, 'since', e.target.value)}
                          className={`h-10 text-sm rounded-xl ${formData.isTitleInCurrentOwnerName === true && index === 0 ? 'cursor-not-allowed opacity-70' : ''}`}
                          disabled={formData.isTitleInCurrentOwnerName === true && index === 0}
                          title={formData.isTitleInCurrentOwnerName === true && index === 0 ? 'Cette date est synchronisée avec la date de délivrance du titre' : undefined}
                        />
                        {formData.isTitleInCurrentOwnerName === true && index === 0 && (
                          <p className="text-xs text-muted-foreground">
                            Synchronisée avec la date de délivrance
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Pièce d'identité */}
                    <div className="space-y-1.5 pt-2 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium">Pièce d'identité (optionnel)</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-4 w-4 p-0 rounded-full">
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 rounded-xl text-xs">
                            <p className="text-muted-foreground">
                              La pièce d'identité renforce la crédibilité de votre contribution.
                            </p>
                          </PopoverContent>
                        </Popover>
                      </div>
                      {!ownerDocFile ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('ownerDoc')?.click()}
                          className="gap-2 w-full text-sm h-10 rounded-xl border-dashed border-2 hover:bg-primary/5"
                        >
                          <Plus className="h-4 w-4" />
                          Ajouter la pièce d'identité
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-xl border overflow-hidden min-w-0">
                          <MdInsertDriveFile className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-sm flex-1 truncate overflow-hidden min-w-0">{ownerDocFile.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile('owner')}
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 rounded-lg"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      <Input
                        id="ownerDoc"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                        onChange={(e) => handleFileChange(e, 'owner')}
                        className="hidden"
                      />
                    </div>
                  </div>
                ))}

                {/* Avertissement propriétaire incomplet */}
                {showOwnerWarning && (
                  <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      ⚠️ Complétez le propriétaire actuel avant d'en ajouter un nouveau.
                    </p>
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addCurrentOwner}
                  className="w-full h-10 gap-2 text-sm font-medium rounded-2xl border-2 border-dashed hover:bg-primary/5 hover:border-primary transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter un propriétaire
                </Button>
              </CardContent>
            </Card>


            {/* Section Type de construction */}
            <Card className="max-w-[360px] mx-auto rounded-2xl shadow-md border-border/50 overflow-hidden">
              <CardContent className="p-3 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center">
                      <MdLocationOn className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <Label className="text-sm font-semibold">Type de construction</Label>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 rounded-full hover:bg-transparent">
                        <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 rounded-xl" align="end">
                      <div className="space-y-2 text-xs">
                        <h4 className="font-semibold text-sm">Type de construction</h4>
                        <p className="text-muted-foreground">
                          Catégorie de votre bien : Résidentielle, Commerciale, Industrielle, Agricole ou Terrain nu.
                        </p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Type et Nature - côte-à-côte */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Type de construction */}
                  <div className={`space-y-1.5 ${highlightRequiredFields && !formData.constructionType ? 'ring-2 ring-primary rounded-xl p-2 bg-primary/5 animate-pulse' : ''}`}>
                    <Label className="text-sm font-medium flex items-center gap-1">
                      Type
                      {highlightRequiredFields && !formData.constructionType && (
                        <span className="text-primary text-xs font-semibold">*</span>
                      )}
                    </Label>
                    <Select 
                      value={formData.constructionType || ''}
                      onValueChange={(value) => {
                        handleInputChange('constructionType', value);
                        // Reset materials if switching to Terrain nu
                        if (value === 'Terrain nu') {
                          handleInputChange('constructionMaterials', '');
                        }
                        setHighlightRequiredFields(false);
                      }}
                    >
                      <SelectTrigger className="h-10 rounded-xl text-sm">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Résidentielle">Résidentielle</SelectItem>
                        <SelectItem value="Commerciale">Commerciale</SelectItem>
                        <SelectItem value="Industrielle">Industrielle</SelectItem>
                        <SelectItem value="Agricole">Agricole</SelectItem>
                        <SelectItem value="Terrain nu">Terrain nu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Nature de construction */}
                  <div className={`space-y-1.5 ${highlightRequiredFields && !formData.constructionNature ? 'ring-2 ring-primary rounded-xl p-2 bg-primary/5 animate-pulse' : ''}`}>
                    <Label className="text-sm font-medium flex items-center gap-1">
                      Nature
                      {highlightRequiredFields && !formData.constructionNature && (
                        <span className="text-primary text-xs font-semibold">*</span>
                      )}
                    </Label>
                    <Select 
                      value={formData.constructionNature || ''}
                      onValueChange={(value) => {
                        handleInputChange('constructionNature', value);
                        setHighlightRequiredFields(false);
                      }}
                      disabled={!formData.constructionType}
                    >
                      <SelectTrigger className="h-10 rounded-xl text-sm">
                        <SelectValue placeholder={
                          !formData.constructionType 
                            ? "Type d'abord" 
                            : "Sélectionner"
                        } />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {availableConstructionNatures.map((nature) => (
                          <SelectItem key={nature} value={nature}>{nature}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Matériaux et Usage - côte-à-côte */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Matériaux de construction - visible sauf pour Terrain nu */}
                  {formData.constructionType && formData.constructionType !== 'Terrain nu' ? (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Matériaux utilisés</Label>
                      <Select 
                        value={formData.constructionMaterials || ''}
                        onValueChange={(value) => handleInputChange('constructionMaterials', value)}
                      >
                        <SelectTrigger className="h-10 rounded-xl text-sm">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
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

                  {/* Usage déclaré */}
                  <div className={`space-y-1.5 ${highlightRequiredFields && !formData.declaredUsage ? 'ring-2 ring-primary rounded-xl p-2 bg-primary/5 animate-pulse' : ''}`}>
                    <div className="flex items-center gap-1">
                      <Label className="text-sm font-medium flex items-center gap-1">
                        Usage
                        {highlightRequiredFields && !formData.declaredUsage && (
                          <span className="text-primary text-xs font-semibold">*</span>
                        )}
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-4 w-4 p-0 rounded-full">
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 rounded-xl text-xs">
                          <p className="text-muted-foreground">
                            Utilisation effective ou prévue du bien, conforme aux règles d'urbanisme.
                          </p>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Select 
                      value={formData.declaredUsage || ''}
                      onValueChange={(value) => {
                        handleInputChange('declaredUsage', value);
                        setHighlightRequiredFields(false);
                      }}
                      disabled={!formData.constructionType || !formData.constructionNature}
                    >
                      <SelectTrigger className="h-10 rounded-xl text-sm">
                        <SelectValue placeholder={
                          !formData.constructionType || !formData.constructionNature
                            ? "Type et nature d'abord" 
                            : "Sélectionner"
                        } />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {availableDeclaredUsages.map((usage) => (
                          <SelectItem key={usage} value={usage}>{usage}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            
            {/* Section Permis de construire - Simplifié - Masquée si Terrain nu */}
            {formData.constructionType !== 'Terrain nu' && (
            <Card className="max-w-[360px] mx-auto rounded-2xl shadow-md border-border/50 overflow-hidden">
              <CardContent className="p-3 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <MdInsertDriveFile className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <Label className="text-sm font-semibold leading-tight">
                      Avez-vous un permis de construire pour votre construction {formData.constructionType?.toLowerCase() || ''}
                      {formData.constructionNature ? `, ${formData.constructionNature.toLowerCase()}` : ''}
                      {formData.constructionMaterials ? `, en ${formData.constructionMaterials.toLowerCase()}` : ''}
                      {formData.declaredUsage ? `, utilisée en tant que ${formData.declaredUsage.toLowerCase()}` : ''} ?
                    </Label>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 rounded-full hover:bg-transparent">
                        <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 rounded-xl" align="end">
                      <div className="space-y-2 text-xs">
                        <h4 className="font-semibold text-sm">À propos du permis</h4>
                        <p className="text-muted-foreground">
                          Si vous avez déjà un permis, renseignez-le ici. Sinon, vous pourrez faire une demande depuis votre espace personnel après la soumission de votre contribution.
                        </p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Toggle pour choisir le mode */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPermitMode('existing')}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-2xl text-sm font-semibold transition-all",
                      permitMode === 'existing'
                        ? 'bg-primary text-primary-foreground shadow-lg'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    J'ai un permis
                  </button>
                  <button
                    type="button"
                    onClick={() => setPermitMode('request')}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-2xl text-sm font-semibold transition-all",
                      permitMode === 'request'
                        ? 'bg-primary text-primary-foreground shadow-lg'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    Pas de permis
                  </button>
                </div>

                {/* Mode: J'ai déjà un permis */}
                {permitMode === 'existing' && (
                  <div className="space-y-4 animate-fade-in">
                    {buildingPermits.map((permit, index) => (
                      <div key={index} className={cn(
                        "border-2 rounded-2xl p-4 space-y-4 bg-card shadow-md",
                        highlightIncompletePermit && index === buildingPermits.length - 1 && (!permit.permitNumber || !permit.issuingService || !permit.issueDate) 
                          ? 'ring-2 ring-primary border-primary animate-pulse' 
                          : 'border-border'
                      )}>
                        {/* Header du permis */}
                        <div className="flex items-center justify-between pb-2 border-b border-border/50">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center">
                              <MdInsertDriveFile className="h-4 w-4 text-primary" />
                            </div>
                            <span className="text-sm font-semibold text-foreground">Permis #{index + 1}</span>
                          </div>
                          {index > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeBuildingPermit(index)}
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 rounded-xl"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        {/* Type de permis */}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const restrictions = getPermitTypeRestrictions();
                              if (restrictions.blockedInExisting !== 'construction') {
                                updateBuildingPermit(index, 'permitType', 'construction');
                              }
                            }}
                            disabled={getPermitTypeRestrictions().blockedInExisting === 'construction'}
                            className={cn(
                              "flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all",
                              permit.permitType === 'construction'
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80',
                              getPermitTypeRestrictions().blockedInExisting === 'construction' && 'opacity-50 cursor-not-allowed'
                            )}
                          >
                            Construire
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const restrictions = getPermitTypeRestrictions();
                              if (restrictions.blockedInExisting !== 'regularization') {
                                updateBuildingPermit(index, 'permitType', 'regularization');
                              }
                            }}
                            disabled={getPermitTypeRestrictions().blockedInExisting === 'regularization'}
                            className={cn(
                              "flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all",
                              permit.permitType === 'regularization'
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80',
                              getPermitTypeRestrictions().blockedInExisting === 'regularization' && 'opacity-50 cursor-not-allowed'
                            )}
                          >
                            Régularisation
                          </button>
                        </div>

                        {/* Champs du formulaire */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-foreground">N° Permis</Label>
                            <Input
                              placeholder="PC-2024-001"
                              value={permit.permitNumber}
                              onChange={(e) => updateBuildingPermit(index, 'permitNumber', e.target.value)}
                              className="h-10 text-sm rounded-xl"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-foreground">Date</Label>
                            <Input
                              type="date"
                              value={permit.issueDate}
                              onChange={(e) => updateBuildingPermit(index, 'issueDate', e.target.value)}
                              className="h-10 text-sm rounded-xl"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-foreground">Service émetteur</Label>
                          <BuildingPermitIssuingServiceSelect
                            value={permit.issuingService}
                            onValueChange={(value) => updateBuildingPermit(index, 'issuingService', value)}
                          />
                        </div>

                        {/* Document */}
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-foreground">Document (optionnel)</Label>
                          {!permit.attachmentFile ? (
                            <Input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 10 * 1024 * 1024) {
                                    toast({ title: "Fichier trop volumineux", description: "Max 10 MB", variant: "destructive" });
                                    return;
                                  }
                                  updateBuildingPermitFile(index, file);
                                }
                              }}
                              className="h-10 text-sm rounded-xl"
                            />
                          ) : (
                            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl border overflow-hidden min-w-0">
                              <MdInsertDriveFile className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="text-sm flex-1 truncate overflow-hidden min-w-0">{permit.attachmentFile.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeBuildingPermitFile(index)}
                                className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 rounded-lg"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Avertissement permis incomplet */}
                    {showPermitWarning && (
                      <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          ⚠️ Complétez le permis actuel avant d'en ajouter un nouveau.
                        </p>
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={addBuildingPermit}
                      className="w-full h-11 gap-2 text-sm font-medium rounded-2xl border-2 border-dashed hover:bg-primary/5 hover:border-primary transition-all"
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter un autre permis
                    </Button>
                  </div>
                )}

                {/* Mode: Pas de permis */}
                {permitMode === 'request' && (
                  <div className="animate-fade-in">
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                      <p className="text-sm text-amber-800 dark:text-amber-200 text-center">
                        Demande disponible dans <strong>Espace Personnel</strong> après soumission
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            )}
            
            {/* Bouton Suivant */}
            <div className="flex justify-end pt-6 mt-6 border-t">
              <Button
                type="button"
                onClick={() => handleTabChange('location')}
                className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all hover:scale-105 shadow-lg hover:shadow-xl animate-fade-in"
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="location" className="space-y-3 md:space-y-6 mt-4 md:mt-6 animate-fade-in">
            {/* Localisation de la parcelle - Aligné avec LandTitleRequestDialog */}
            <Card className="max-w-[360px] mx-auto rounded-2xl shadow-md border-border/50 overflow-hidden">
              <CardContent className="p-3 space-y-3">
                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <MdLocationOn className="h-4 w-4 text-primary" />
                  </div>
                  <Label className="text-sm font-semibold">Localisation de la parcelle</Label>
                </div>

                {/* Province - toujours visible en premier */}
                <div className="space-y-1.5">
                  <Label htmlFor="province" className="text-sm">Province *</Label>
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

                {/* Zone urbaine ou rurale - visible après province */}
                {formData.province && (
                  <div className="space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Zone urbaine ou Zone rurale ? *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-primary/10 rounded-full">
                            <Info className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 text-sm rounded-xl">
                          <h4 className="font-semibold mb-1.5 text-sm">Section cadastrale</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            SU (Urbain): Ville → Commune → Quartier<br/>
                            SR (Rural): Territoire → Collectivité → Village
                          </p>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => !sectionTypeAutoDetected && handleSectionTypeChange('urbaine')}
                        disabled={sectionTypeAutoDetected}
                        className={cn(
                          "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all",
                          sectionType === 'urbaine'
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80',
                          sectionTypeAutoDetected && 'cursor-not-allowed opacity-70'
                        )}
                      >
                        SU - Urbaine
                      </button>
                      <button
                        type="button"
                        onClick={() => !sectionTypeAutoDetected && handleSectionTypeChange('rurale')}
                        disabled={sectionTypeAutoDetected}
                        className={cn(
                          "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all",
                          sectionType === 'rurale'
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80',
                          sectionTypeAutoDetected && 'cursor-not-allowed opacity-70'
                        )}
                      >
                        SR - Rurale
                      </button>
                    </div>
                    {sectionTypeAutoDetected && (
                      <p className="text-xs text-primary flex items-center gap-1 justify-center">
                        <CheckCircle2 className="h-3 w-3" />
                        Type auto-détecté depuis le numéro
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section Urbaine (SU) - visible uniquement si type urbain sélectionné */}
            {sectionType === 'urbaine' && formData.province && (
              <Card className="max-w-[360px] mx-auto rounded-2xl shadow-md border-border/50 animate-fade-in">
                <CardContent className="p-3 space-y-3">
                  <Label className="text-sm font-semibold">Section Urbaine (SU)</Label>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="ville" className="text-sm">Ville *</Label>
                      <Select 
                        value={formData.ville}
                        onValueChange={(value) => handleInputChange('ville', value)}
                        disabled={!formData.province || availableVilles.length === 0}
                      >
                        <SelectTrigger className="h-9 text-sm rounded-xl border">
                          <SelectValue placeholder={
                            !formData.province 
                            ? "Province d'abord" 
                            : availableVilles.length === 0 
                            ? "Aucune ville"
                            : "Sélectionner"
                          } />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {availableVilles.map(ville => (
                            <SelectItem key={ville} value={ville} className="text-sm py-2">{ville}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="commune" className="text-sm">Commune *</Label>
                      <Select 
                        value={formData.commune}
                        onValueChange={(value) => handleInputChange('commune', value)}
                        disabled={!formData.ville || availableCommunes.length === 0}
                      >
                        <SelectTrigger className="h-9 text-sm rounded-xl border">
                          <SelectValue placeholder={
                            !formData.ville 
                            ? "Ville d'abord" 
                            : availableCommunes.length === 0 
                            ? "Aucune commune"
                            : "Sélectionner"
                          } />
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
                      <Label htmlFor="quartier" className="text-sm">Quartier *</Label>
                      <Select 
                        value={formData.quartier}
                        onValueChange={(value) => handleInputChange('quartier', value)}
                        disabled={!formData.commune || availableQuartiers.length === 0}
                      >
                        <SelectTrigger className="h-9 text-sm rounded-xl border">
                          <SelectValue placeholder={
                            !formData.commune 
                            ? "Commune d'abord" 
                            : availableQuartiers.length === 0 
                            ? "Saisie manuelle"
                            : "Sélectionner"
                          } />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {availableQuartiers.map(quartier => (
                            <SelectItem key={quartier} value={quartier} className="text-sm py-2">{quartier}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {availableQuartiers.length === 0 && formData.commune && (
                        <Input
                          className="h-9 text-sm rounded-xl mt-1"
                          placeholder="Saisir quartier"
                          value={formData.quartier || ''}
                          onChange={(e) => handleInputChange('quartier', e.target.value)}
                        />
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="avenue" className="text-sm">Avenue *</Label>
                      <Input
                        id="avenue"
                        className="h-9 text-sm rounded-xl"
                        placeholder="Nom de l'avenue"
                        value={formData.avenue || ''}
                        onChange={(e) => handleInputChange('avenue', e.target.value)}
                        disabled={!formData.quartier}
                      />
                      <p className="text-xs text-muted-foreground">
                        {!formData.quartier ? "Quartier d'abord" : ""}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Section Rurale (SR) - visible uniquement si type rural sélectionné */}
            {sectionType === 'rurale' && formData.province && (
              <Card className="max-w-[360px] mx-auto rounded-2xl shadow-md border-border/50 animate-fade-in">
                <CardContent className="p-3 space-y-3">
                  <Label className="text-sm font-semibold">Section Rurale (SR)</Label>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="territoire" className="text-sm">Territoire *</Label>
                      <Select 
                        value={formData.territoire}
                        onValueChange={(value) => handleInputChange('territoire', value)}
                        disabled={!formData.province || availableTerritoires.length === 0}
                      >
                        <SelectTrigger className="h-9 text-sm rounded-xl border">
                          <SelectValue placeholder={
                            !formData.province 
                            ? "Province d'abord" 
                            : availableTerritoires.length === 0 
                            ? "Aucun territoire"
                            : "Sélectionner"
                          } />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {availableTerritoires.map(territoire => (
                            <SelectItem key={territoire} value={territoire} className="text-sm py-2">{territoire}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="collectivite" className="text-sm">Collectivité *</Label>
                      <Select 
                        value={formData.collectivite}
                        onValueChange={(value) => handleInputChange('collectivite', value)}
                        disabled={!formData.territoire || availableCollectivites.length === 0}
                      >
                        <SelectTrigger className="h-9 text-sm rounded-xl border">
                          <SelectValue placeholder={
                            !formData.territoire 
                            ? "Territoire d'abord" 
                            : availableCollectivites.length === 0 
                            ? "Aucune collectivité"
                            : "Sélectionner"
                          } />
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
                      <Label htmlFor="groupement" className="text-sm">Groupement</Label>
                      <Input
                        id="groupement"
                        className="h-9 text-sm rounded-xl"
                        placeholder="ex: Katoyi"
                        value={formData.groupement || ''}
                        onChange={(e) => handleInputChange('groupement', e.target.value)}
                        disabled={!formData.collectivite}
                      />
                      <p className="text-xs text-muted-foreground">
                        {!formData.collectivite ? "Collectivité d'abord" : "Optionnel"}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="village" className="text-sm">Village</Label>
                      <Input
                        id="village"
                        className="h-9 text-sm rounded-xl"
                        placeholder="ex: Mushaki"
                        value={formData.village || ''}
                        onChange={(e) => handleInputChange('village', e.target.value)}
                        disabled={!formData.collectivite}
                      />
                      <p className="text-xs text-muted-foreground">
                        {!formData.collectivite ? "Collectivité d'abord" : "Optionnel"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Aperçu de la carte - collecte GPS et dimensions via dessin */}
            {sectionType && (
              <div className="space-y-3 pt-4 border-t relative z-0">
                <ParcelMapPreview
                  coordinates={gpsCoordinates}
                  onCoordinatesUpdate={(updatedCoords) => {
                    setGpsCoordinates(updatedCoords);
                  }}
                  config={mapConfig}
                  currentParcelNumber={parcelNumber}
                  enableConflictDetection={true}
                  roadSides={roadSides}
                  onRoadSidesChange={setRoadSides}
                  parcelSides={parcelSides}
                  onParcelSidesUpdate={setParcelSides}
                  enableDrawingMode={true}
                  onSurfaceChange={(surface) => {
                    handleInputChange('areaSqm', String(surface));
                  }}
                />
              </div>
            )}
            
            {/* Bouton Suivant */}
            <div className="flex justify-end pt-6 mt-6 border-t">
              <Button
                type="button"
                onClick={() => handleTabChange('history')}
                className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all hover:scale-105 shadow-lg hover:shadow-xl animate-fade-in"
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-3 mt-4 animate-fade-in">
            {/* Historique des anciens propriétaires - Design moderne compact */}
            <Card className="max-w-[360px] mx-auto rounded-2xl shadow-md border-border/50 overflow-hidden">
              <CardContent className="p-3 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center">
                      <MdEventNote className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <Label className="text-sm font-semibold">Anciens propriétaires</Label>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 rounded-full hover:bg-transparent">
                        <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 rounded-xl" align="end">
                      <div className="space-y-2 text-xs">
                        <h4 className="font-semibold text-sm">Historique (optionnel)</h4>
                        <p className="text-muted-foreground">
                          Documentez les anciens propriétaires pour établir la chaîne de propriété.
                        </p>
                        <p className="text-muted-foreground">
                          <strong>💡</strong> Ordonnez du plus récent au plus ancien.
                        </p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {previousOwners.map((owner, index) => (
                  <div key={index} className={`border-2 rounded-2xl p-3 space-y-2 bg-card shadow-sm transition-all duration-300 ${
                    highlightIncompletePreviousOwner && index === previousOwners.length - 1 && !owner.name 
                      ? 'ring-2 ring-primary border-primary animate-pulse' 
                      : 'border-border'
                  }`}>
                    {/* Header du propriétaire */}
                    <div className="flex items-center justify-between pb-2 border-b border-border/50">
                      <span className="text-sm font-semibold text-foreground">Ancien #{index + 1}</span>
                      {previousOwners.length > 1 && index > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePreviousOwner(index)}
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 rounded-xl"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Nom complet</Label>
                      <Input
                        placeholder="ex: Jean Mukendi"
                        value={owner.name}
                        onChange={(e) => updatePreviousOwner(index, 'name', e.target.value)}
                        className="h-10 text-sm rounded-xl"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Statut</Label>
                        <Select
                          value={owner.legalStatus}
                          onValueChange={(value) => updatePreviousOwner(index, 'legalStatus', value)}
                        >
                          <SelectTrigger className="h-10 text-sm rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="Personne physique">Personne physique</SelectItem>
                            <SelectItem value="Personne morale">Personne morale</SelectItem>
                            <SelectItem value="État">État</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Mutation</Label>
                        <Select
                          value={owner.mutationType}
                          onValueChange={(value) => updatePreviousOwner(index, 'mutationType', value)}
                        >
                          <SelectTrigger className="h-10 text-sm rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="Vente">Vente</SelectItem>
                            <SelectItem value="Donation">Donation</SelectItem>
                            <SelectItem value="Succession">Succession</SelectItem>
                            <SelectItem value="Expropriation">Expropriation</SelectItem>
                            <SelectItem value="Échange">Échange</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Date début</Label>
                        <Input
                          type="date"
                          max={owner.endDate || (index === 0 ? currentOwners[0]?.since : previousOwners[index - 1]?.startDate) || new Date().toISOString().split('T')[0]}
                          value={owner.startDate}
                          onChange={(e) => updatePreviousOwner(index, 'startDate', e.target.value)}
                          className="h-10 text-sm rounded-xl"
                        />
                        {owner.startDate && owner.endDate && owner.startDate > owner.endDate && (
                          <p className="text-xs text-destructive">Début avant fin</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Date fin</Label>
                        <Input
                          type="date"
                          min={owner.startDate || undefined}
                          max={index === 0 ? (currentOwners[0]?.since || new Date().toISOString().split('T')[0]) : (previousOwners[index - 1]?.startDate || new Date().toISOString().split('T')[0])}
                          value={owner.endDate}
                          onChange={(e) => updatePreviousOwner(index, 'endDate', e.target.value)}
                          disabled={true}
                          className="h-10 text-sm rounded-xl cursor-not-allowed opacity-70"
                          onClick={() => {
                            toast({
                              title: "Auto-calculée",
                              description: "Date basée sur le propriétaire suivant.",
                              variant: "default",
                            });
                          }}
                        />
                      </div>
                    </div>

                    {/* Messages de validation compacts */}
                    {index === 0 && currentOwners[0]?.since && (
                      <p className="text-xs text-muted-foreground">
                        💡 Fin: {new Date(currentOwners[0].since).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                    {index > 0 && previousOwners[index - 1]?.startDate && (
                      <p className="text-xs text-muted-foreground">
                        💡 Fin: {new Date(previousOwners[index - 1].startDate).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                ))}

                {/* Avertissements compacts */}
                {showCurrentOwnerRequiredWarning && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-2">
                    <p className="text-xs text-destructive">
                      ⚠️ Ajoutez d'abord un propriétaire actuel (onglet Général).
                    </p>
                  </div>
                )}

                {showPreviousOwnerWarning && (
                  <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl p-2">
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      ⚠️ Complétez le propriétaire actuel avant d'ajouter.
                    </p>
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addPreviousOwner}
                  className="w-full h-10 gap-2 text-sm font-medium rounded-2xl border-2 border-dashed hover:bg-primary/5 hover:border-primary transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter ancien propriétaire
                </Button>
              </CardContent>
            </Card>
            
            {/* Bouton Suivant */}
            <div className="flex justify-end pt-4 mt-4 border-t">
              <Button
                type="button"
                onClick={() => handleTabChange('obligations')}
                className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all hover:scale-105 shadow-lg hover:shadow-xl animate-fade-in"
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="obligations" className="space-y-3 mt-4 animate-fade-in">
            {/* Switch Taxes/Hypothèques compact */}
            <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-fit shadow-inner mx-auto">
              <Button
                type="button"
                variant={obligationType === 'taxes' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setObligationType('taxes')}
                className="text-sm h-8"
              >
                Taxes
              </Button>
              <Button
                type="button"
                variant={obligationType === 'mortgages' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setObligationType('mortgages')}
                className="text-sm h-8"
              >
                Hypothèques
              </Button>
            </div>

            {/* Section Taxes - Design moderne compact */}
            {obligationType === 'taxes' && (
              <Card className="max-w-[360px] mx-auto rounded-2xl shadow-md border-border/50 overflow-hidden">
                <CardContent className="p-3 space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center">
                        <MdAccountBalance className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <Label className="text-sm font-semibold">Historique fiscal</Label>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 rounded-full hover:bg-transparent">
                          <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 rounded-xl" align="end">
                        <div className="space-y-2 text-xs">
                          <h4 className="font-semibold text-sm">Taxes (optionnel)</h4>
                          <p className="text-muted-foreground">
                            Documentez les taxes payées pour prouver la conformité fiscale.
                          </p>
                          <p className="text-muted-foreground">
                            <strong>💡</strong> Joignez les reçus si possible.
                          </p>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {taxRecords.map((tax, index) => (
                    <div key={index} className={`border-2 rounded-2xl p-3 space-y-2 bg-card shadow-sm transition-all duration-300 ${
                      highlightIncompleteTax && index === 0 
                        ? 'ring-2 ring-amber-500 animate-pulse' 
                        : 'border-border'
                    }`}>
                      {/* Header de la taxe */}
                      <div className="flex items-center justify-between pb-2 border-b border-border/50">
                        <span className="text-sm font-semibold text-foreground">Taxe #{index + 1}</span>
                        {taxRecords.length > 1 && index > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTaxRecord(index)}
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 rounded-xl"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-sm font-medium">Type</Label>
                          <Select
                            value={tax.taxType}
                            onValueChange={(value) => updateTaxRecord(index, 'taxType', value)}
                          >
                            <SelectTrigger className="h-10 text-sm rounded-xl">
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="Impôt foncier annuel">Impôt foncier</SelectItem>
                              <SelectItem value="Impôt sur les revenus locatifs">Revenus locatifs</SelectItem>
                              <SelectItem value="Taxe de superficie">Superficie</SelectItem>
                              <SelectItem value="Taxe de plus-value immobilière">Plus-value</SelectItem>
                              <SelectItem value="Taxe d'habitation">Habitation</SelectItem>
                              <SelectItem value="Autre taxe">Autre</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm font-medium">Année</Label>
                          <Select
                            value={tax.taxYear}
                            onValueChange={(value) => updateTaxRecord(index, 'taxYear', value)}
                          >
                            <SelectTrigger className="h-10 text-sm rounded-xl">
                              <SelectValue placeholder="Année" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {Array.from({ length: 10 }, (_, i) => {
                                const year = new Date().getFullYear() - i;
                                return <SelectItem key={year} value={year.toString()}>{year}</SelectItem>;
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-sm font-medium">Montant (USD)</Label>
                          <Input
                            type="number"
                            placeholder="150"
                            value={tax.taxAmount}
                            onChange={(e) => updateTaxRecord(index, 'taxAmount', e.target.value)}
                            className="h-10 text-sm rounded-xl"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm font-medium">Statut</Label>
                          <Select
                            value={tax.paymentStatus}
                            onValueChange={(value) => updateTaxRecord(index, 'paymentStatus', value)}
                          >
                            <SelectTrigger className="h-10 text-sm rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="Payé">Payé</SelectItem>
                              <SelectItem value="Payé partiellement">Partiel</SelectItem>
                              <SelectItem value="En attente">En attente</SelectItem>
                              <SelectItem value="En retard">En retard</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Date paiement</Label>
                        <Input
                          type="date"
                          max={new Date().toISOString().split('T')[0]}
                          value={tax.paymentDate}
                          onChange={(e) => updateTaxRecord(index, 'paymentDate', e.target.value)}
                          className="h-10 text-sm rounded-xl"
                        />
                      </div>

                      {/* Pièce jointe compacte */}
                      <div className="space-y-1 pt-2 border-t border-border/50">
                        <Label className="text-sm font-medium">Reçu (optionnel)</Label>
                        {!tax.receiptFile ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById(`taxFile-${index}`)?.click()}
                            className="gap-2 w-full text-sm h-9 rounded-xl border-dashed border-2"
                          >
                            <Plus className="h-4 w-4" />
                            Ajouter reçu
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-xl border overflow-hidden min-w-0">
                            <MdInsertDriveFile className="h-4 w-4 text-primary flex-shrink-0" />
                            <span className="text-sm flex-1 truncate overflow-hidden min-w-0">{tax.receiptFile.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTaxFile(index)}
                              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 rounded-lg"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        <Input
                          id={`taxFile-${index}`}
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                          onChange={(e) => handleTaxFileChange(index, e)}
                          className="hidden"
                        />
                      </div>
                    </div>
                  ))}

                  {/* Avertissement compact */}
                  {showTaxWarning && (
                    <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl p-2">
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        ⚠️ Complétez la taxe avant d'en ajouter une nouvelle.
                      </p>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addTaxRecord}
                    className="w-full h-10 gap-2 text-sm font-medium rounded-2xl border-2 border-dashed hover:bg-primary/5 hover:border-primary transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter une taxe
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Section Hypothèques - Design moderne compact avec question parent */}
            {obligationType === 'mortgages' && (
              <Card className="max-w-[360px] mx-auto rounded-2xl shadow-md border-border/50 overflow-hidden">
                <CardContent className="p-3 space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center">
                        <MdAccountBalance className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <Label className="text-sm font-semibold">Hypothèque</Label>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 rounded-full hover:bg-transparent">
                          <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 rounded-xl" align="end">
                        <div className="space-y-2 text-xs">
                          <h4 className="font-semibold text-sm">Statut hypothécaire</h4>
                          <p className="text-muted-foreground">
                            Indiquez si cette parcelle est grevée d'une hypothèque active.
                          </p>
                          <p className="text-muted-foreground">
                            <strong>💡</strong> Cette information est importante pour les acheteurs potentiels.
                          </p>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Question parent: Y a-t-il une hypothèque? */}
                  <div className="border-2 rounded-2xl p-3 space-y-3 bg-card shadow-sm">
                    <Label className="text-sm font-medium">
                      Y a-t-il une hypothèque active sur cette parcelle ?
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={hasMortgage === true ? "default" : "outline"}
                        onClick={() => setHasMortgage(true)}
                        className={`h-10 text-sm rounded-xl transition-all ${
                          hasMortgage === true 
                            ? "bg-primary text-primary-foreground shadow-md" 
                            : "hover:bg-primary/10"
                        }`}
                      >
                        Oui
                      </Button>
                      <Button
                        type="button"
                        variant={hasMortgage === false ? "default" : "outline"}
                        onClick={() => {
                          setHasMortgage(false);
                          // Reset mortgage records when No is selected
                          setMortgageRecords([{
                            mortgageAmount: '',
                            duration: '',
                            creditorName: '',
                            creditorType: 'Banque',
                            contractDate: '',
                            mortgageStatus: 'Active',
                            receiptFile: null
                          }]);
                        }}
                        className={`h-10 text-sm rounded-xl transition-all ${
                          hasMortgage === false 
                            ? "bg-primary text-primary-foreground shadow-md" 
                            : "hover:bg-primary/10"
                        }`}
                      >
                        Non
                      </Button>
                    </div>

                    {/* Confirmation si Non */}
                    {hasMortgage === false && (
                      <div className="bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-xl p-2 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <p className="text-xs text-green-700 dark:text-green-300">
                          Aucune hypothèque active - parcelle libre de charges
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Formulaire hypothèque - affiché uniquement si Oui */}
                  {hasMortgage === true && (
                    <>
                      {mortgageRecords.map((mortgage, index) => (
                        <div key={index} className={`border-2 rounded-2xl p-3 space-y-2 bg-card shadow-sm transition-all duration-300 ${
                          highlightIncompleteMortgage && index === 0 
                            ? 'ring-2 ring-amber-500 animate-pulse' 
                            : 'border-border'
                        }`}>
                          {/* Header de l'hypothèque */}
                          <div className="flex items-center justify-between pb-2 border-b border-border/50">
                            <span className="text-sm font-semibold text-foreground">Hypothèque #{index + 1}</span>
                            {mortgageRecords.length > 1 && index > 0 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeMortgageRecord(index)}
                                className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 rounded-xl"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-sm font-medium">Montant (USD)</Label>
                              <Input
                                type="number"
                                placeholder="50000"
                                value={mortgage.mortgageAmount}
                                onChange={(e) => updateMortgageRecord(index, 'mortgageAmount', e.target.value)}
                                className="h-10 text-sm rounded-xl"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-sm font-medium">Durée (mois)</Label>
                              <Input
                                type="number"
                                placeholder="120"
                                value={mortgage.duration}
                                onChange={(e) => updateMortgageRecord(index, 'duration', e.target.value)}
                                className="h-10 text-sm rounded-xl"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-sm font-medium">Créancier</Label>
                              <Input
                                placeholder="ex: Banque XYZ"
                                value={mortgage.creditorName}
                                onChange={(e) => updateMortgageRecord(index, 'creditorName', e.target.value)}
                                className="h-10 text-sm rounded-xl"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-sm font-medium">Type</Label>
                              <Select
                                value={mortgage.creditorType}
                                onValueChange={(value) => updateMortgageRecord(index, 'creditorType', value)}
                              >
                                <SelectTrigger className="h-10 text-sm rounded-xl">
                                  <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  <SelectItem value="Banque">Banque</SelectItem>
                                  <SelectItem value="Microfinance">Microfinance</SelectItem>
                                  <SelectItem value="Coopérative">Coopérative</SelectItem>
                                  <SelectItem value="Particulier">Particulier</SelectItem>
                                  <SelectItem value="Autre institution">Autre</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-sm font-medium">Date contrat</Label>
                              <Input
                                type="date"
                                max={new Date().toISOString().split('T')[0]}
                                value={mortgage.contractDate}
                                onChange={(e) => updateMortgageRecord(index, 'contractDate', e.target.value)}
                                className="h-10 text-sm rounded-xl"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-sm font-medium">Statut</Label>
                              <Select
                                value={mortgage.mortgageStatus}
                                onValueChange={(value) => updateMortgageRecord(index, 'mortgageStatus', value)}
                              >
                                <SelectTrigger className="h-10 text-sm rounded-xl">
                                  <SelectValue placeholder="Statut" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  <SelectItem value="Active">En cours</SelectItem>
                                  <SelectItem value="En défaut">En défaut de paiement</SelectItem>
                                  <SelectItem value="Renégociée">Renégociée</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Pièce jointe compacte */}
                          <div className="space-y-1 pt-2 border-t border-border/50">
                            <Label className="text-sm font-medium">Justificatif (optionnel)</Label>
                            {!mortgage.receiptFile ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => document.getElementById(`mortgageFile-${index}`)?.click()}
                                className="gap-2 w-full text-sm h-9 rounded-xl border-dashed border-2"
                              >
                                <Plus className="h-4 w-4" />
                                Ajouter justificatif
                              </Button>
                            ) : (
                              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-xl border overflow-hidden min-w-0">
                                <MdInsertDriveFile className="h-4 w-4 text-primary flex-shrink-0" />
                                <span className="text-sm flex-1 truncate overflow-hidden min-w-0">{mortgage.receiptFile.name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeMortgageFile(index)}
                                  className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 rounded-lg flex-shrink-0"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                            <Input
                              id={`mortgageFile-${index}`}
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                              onChange={(e) => handleMortgageFileChange(index, e)}
                              className="hidden"
                            />
                          </div>
                        </div>
                      ))}

                      {/* Avertissement compact */}
                      {showMortgageWarning && (
                        <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl p-2">
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            ⚠️ Complétez l'hypothèque avant d'en ajouter une nouvelle.
                          </p>
                        </div>
                      )}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={addMortgageRecord}
                        className="w-full h-10 gap-2 text-sm font-medium rounded-2xl border-2 border-dashed hover:bg-primary/5 hover:border-primary transition-all"
                      >
                        <Plus className="h-4 w-4" />
                        Ajouter une hypothèque
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* Bouton Suivant */}
            <div className="flex justify-end pt-4 sm:pt-6 mt-4 sm:mt-6 border-t">
              <Button
                type="button"
                onClick={() => handleTabChange('review')}
                className="gap-2 bg-gradient-to-r from-seloger-red to-seloger-red-dark hover:from-seloger-red-dark hover:to-red-700 transition-all hover:scale-105 shadow-lg hover:shadow-xl animate-fade-in text-white text-sm sm:text-base h-10 sm:h-11 rounded-xl"
              >
                Reviser
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          {/* Onglet Révision & Soumission */}
          <TabsContent value="review" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <div className="space-y-3 py-3 max-w-[360px] mx-auto">
              {/* En-tête avec estimation CCC */}
              <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden bg-gradient-to-br from-amber-50/50 to-amber-100/30 dark:from-amber-950/20 dark:to-amber-900/10">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md flex-shrink-0">
                      <MdRateReview className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-amber-900 dark:text-amber-100">
                        Valeur CCC estimée
                      </h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                          ${calculateCCCValue().value.toFixed(2)}
                        </span>
                        <span className="text-xs text-amber-700 dark:text-amber-300">/ $5.00</span>
                      </div>
                    </div>
                  </div>
                  {calculateCCCValue().value < 5 && (
                    <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
                      <Info className="h-3 w-3 flex-shrink-0" />
                      <span>Complétez plus de champs pour maximiser votre CCC</span>
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Titre Récapitulatif */}
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Récapitulatif</h3>
              </div>

              {/* Section Infos Générales */}
              <Card className="rounded-2xl shadow-sm border-border/50">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold flex items-center gap-1.5">
                      <span>📋</span> Infos générales
                    </h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTabChange('general')}
                      className="text-xs h-6 px-2"
                    >
                      Modifier
                    </Button>
                  </div>
                  <div className="space-y-1 text-xs">
                    {formData.parcelNumber && (
                      <div><span className="font-medium">Parcelle:</span> {formData.parcelNumber}</div>
                    )}
                    {formData.propertyTitleType && (
                      <div><span className="font-medium">Titre:</span> {formData.propertyTitleType}</div>
                    )}
                    {formData.titleReferenceNumber && (
                      <div><span className="font-medium">Réf:</span> {formData.titleReferenceNumber}</div>
                    )}
                    {currentOwners.some(o => o.lastName || o.firstName) && (
                      <div className="pt-1 border-t border-border/50">
                        <div className="font-medium">Propriétaire(s):</div>
                        {currentOwners.filter(o => o.lastName || o.firstName).map((owner, idx) => (
                          <div key={idx} className="ml-2 text-muted-foreground">
                            • {owner.lastName} {owner.firstName}
                            {owner.since && ` (${new Date(owner.since).toLocaleDateString('fr-FR')})`}
                          </div>
                        ))}
                      </div>
                    )}
                    {formData.constructionType && (
                      <div className="pt-1 border-t border-border/50"><span className="font-medium">Construction:</span> {formData.constructionType}</div>
                    )}
                    {formData.declaredUsage && (
                      <div><span className="font-medium">Usage:</span> {formData.declaredUsage}</div>
                    )}
                    {buildingPermits.some(p => p.permitNumber) && (
                      <div className="pt-1 border-t border-border/50">
                        <div className="font-medium">Permis:</div>
                        {buildingPermits.filter(p => p.permitNumber).map((permit, idx) => (
                          <div key={idx} className="ml-2 text-muted-foreground">
                            • N° {permit.permitNumber}
                          </div>
                        ))}
                      </div>
                    )}
                    {(!formData.propertyTitleType && !currentOwners.some(o => o.lastName || o.firstName)) && (
                      <div className="text-muted-foreground italic">Aucune info renseignée</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Section Localisation */}
              <Card className="rounded-2xl shadow-sm border-border/50">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold flex items-center gap-1.5">
                      <span>📍</span> Localisation
                    </h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTabChange('location')}
                      className="text-xs h-6 px-2"
                    >
                      Modifier
                    </Button>
                  </div>
                  <div className="space-y-1 text-xs">
                    {formData.province && (
                      <div><span className="font-medium">Province:</span> {formData.province}</div>
                    )}
                    {sectionType && (
                      <div><span className="font-medium">Section:</span> {sectionType === 'urbaine' ? 'Urbaine' : 'Rurale'}</div>
                    )}
                    {sectionType === 'urbaine' && (
                      <>
                        {formData.ville && <div><span className="font-medium">Ville:</span> {formData.ville}</div>}
                        {formData.commune && <div><span className="font-medium">Commune:</span> {formData.commune}</div>}
                        {formData.quartier && <div><span className="font-medium">Quartier:</span> {formData.quartier}</div>}
                        {formData.avenue && <div><span className="font-medium">Avenue:</span> {formData.avenue}</div>}
                      </>
                    )}
                    {sectionType === 'rurale' && (
                      <>
                        {formData.territoire && <div><span className="font-medium">Territoire:</span> {formData.territoire}</div>}
                        {formData.collectivite && <div><span className="font-medium">Collectivité:</span> {formData.collectivite}</div>}
                        {formData.village && <div><span className="font-medium">Village:</span> {formData.village}</div>}
                      </>
                    )}
                    {formData.areaSqm && (
                      <div className="pt-1 border-t border-border/50"><span className="font-medium">Superficie:</span> {formData.areaSqm} m²</div>
                    )}
                    {parcelSides.some(s => s.length) && (
                      <div className="pt-1 border-t border-border/50">
                        <div className="font-medium">Dimensions:</div>
                        {parcelSides.filter(s => s.length).map((side, idx) => (
                          <span key={idx} className="text-muted-foreground mr-2">
                            {side.name.replace('Côté ', '')}: {side.length}m
                          </span>
                        ))}
                      </div>
                    )}
                    {gpsCoordinates.filter(g => g.lat && g.lng).length > 0 && (
                      <div className="pt-1 border-t border-border/50">
                        <span className="font-medium">GPS:</span> {gpsCoordinates.filter(g => g.lat && g.lng).length} borne(s)
                      </div>
                    )}
                    {(!formData.province && !formData.areaSqm) && (
                      <div className="text-muted-foreground italic">Aucune localisation renseignée</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Section Historique */}
              <Card className="rounded-2xl shadow-sm border-border/50">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold flex items-center gap-1.5">
                      <span>📜</span> Historique
                    </h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTabChange('history')}
                      className="text-xs h-6 px-2"
                    >
                      Modifier
                    </Button>
                  </div>
                  <div className="space-y-1 text-xs">
                    {previousOwners.some(o => o.name) ? (
                      previousOwners.filter(o => o.name).map((owner, idx) => (
                        <div key={idx} className="border-l-2 border-primary/30 pl-2">
                          <div className="font-medium">Ancien #{idx + 1}: {owner.name}</div>
                          <div className="text-muted-foreground">
                            {owner.mutationType && `${owner.mutationType}`}
                            {owner.startDate && ` • ${new Date(owner.startDate).toLocaleDateString('fr-FR')}`}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-muted-foreground italic">Aucun historique</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Section Obligations */}
              <Card className="rounded-2xl shadow-sm border-border/50">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold flex items-center gap-1.5">
                      <span>💼</span> Obligations
                    </h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTabChange('obligations')}
                      className="text-xs h-6 px-2"
                    >
                      Modifier
                    </Button>
                  </div>
                  <div className="space-y-2 text-xs">
                    {taxRecords.some(t => t.taxAmount) ? (
                      <div>
                        <div className="font-medium">Taxes:</div>
                        {taxRecords.filter(t => t.taxAmount).map((tax, idx) => (
                          <div key={idx} className="ml-2 text-muted-foreground">
                            • {tax.taxYear}: {tax.taxAmount} USD ({tax.paymentStatus})
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted-foreground italic">Aucune taxe</div>
                    )}
                    {/* Section Hypothèque */}
                    <div className="pt-1 border-t border-border/50">
                      <div className="font-medium">Hypothèque:</div>
                      {hasMortgage === null ? (
                        <div className="ml-2 text-muted-foreground italic">Non renseigné</div>
                      ) : hasMortgage === false ? (
                        <div className="ml-2 text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Aucune hypothèque - Parcelle libre
                        </div>
                      ) : mortgageRecords.some(m => m.mortgageAmount) ? (
                        <>
                          {mortgageRecords.filter(m => m.mortgageAmount).map((mortgage, idx) => (
                            <div key={idx} className="ml-2 text-muted-foreground">
                              • {mortgage.mortgageAmount} USD - {mortgage.creditorName} ({mortgage.mortgageStatus})
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="ml-2 text-amber-600">Hypothèque déclarée - détails à compléter</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pièces jointes */}
              <Card className="rounded-2xl shadow-sm border-border/50">
                <CardContent className="p-3 space-y-2">
                  <h4 className="text-xs font-semibold flex items-center gap-1.5">
                    <span>📎</span> Documents joints
                  </h4>
                  <div className="space-y-1 text-xs">
                    <div className={ownerDocFile ? "text-foreground flex items-center gap-1.5" : "text-muted-foreground flex items-center gap-1.5"}>
                      {ownerDocFile ? <CheckCircle2 className="h-3 w-3 text-primary" /> : <span>⭕</span>}
                      <span>Pièce d'identité: {ownerDocFile ? "✓" : "Non"}</span>
                    </div>
                    <div className={titleDocFiles.length > 0 ? "text-foreground flex items-center gap-1.5" : "text-muted-foreground flex items-center gap-1.5"}>
                      {titleDocFiles.length > 0 ? <CheckCircle2 className="h-3 w-3 text-primary" /> : <span>⭕</span>}
                      <span>Titre: {titleDocFiles.length > 0 ? `${titleDocFiles.length} fichier(s)` : "Non"}</span>
                    </div>
                    {buildingPermits.some(p => p.attachmentFile) && (
                      <div className="text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-primary" />
                        <span>Permis: {buildingPermits.filter(p => p.attachmentFile).length} fichier(s)</span>
                      </div>
                    )}
                    {taxRecords.some(t => t.receiptFile) && (
                      <div className="text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-primary" />
                        <span>Reçus taxes: {taxRecords.filter(t => t.receiptFile).length} fichier(s)</span>
                      </div>
                    )}
                    {mortgageRecords.some(m => m.receiptFile) && (
                      <div className="text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-primary" />
                        <span>Hypothèques: {mortgageRecords.filter(m => m.receiptFile).length} fichier(s)</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Message de motivation */}
              {calculateCCCValue().value < 5 && (
                <Card className="rounded-2xl shadow-sm border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                  <CardContent className="p-3">
                    <p className="text-xs text-blue-800 dark:text-blue-200 flex items-start gap-1.5">
                      <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <span>Complétez plus de champs pour maximiser votre CCC (5$)</span>
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Bouton de soumission */}
              {user ? (
                <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t pt-3 -mx-3 px-3 -mb-3 pb-3">
                  <Button
                    type="button"
                    size="lg"
                    onClick={handleSubmit}
                    disabled={loading || uploading || !isFormValidForSubmission()}
                    className="w-full h-11 text-sm font-semibold gap-2 shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary to-primary/80 rounded-xl"
                  >
                    {loading || uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {uploading ? "Téléchargement..." : "Envoi..."}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Soumettre
                      </>
                    )}
                  </Button>
                  {!isFormValidForSubmission() && (
                    <p className="text-xs text-center text-amber-600 dark:text-amber-400 mt-2">
                      Complétez: Titre, Propriétaire, Localisation
                    </p>
                  )}
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    En soumettant, vous acceptez la vérification des données
                  </p>
                </div>
              ) : (
                <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t pt-3 -mx-3 px-3 -mb-3 pb-3">
                  <div className="text-center mb-2">
                    <p className="text-xs font-medium">Formulaire complété</p>
                    <p className="text-xs text-muted-foreground">Connectez-vous pour soumettre</p>
                  </div>
                  <Button
                    type="button"
                    size="lg"
                    onClick={() => {
                      saveFormDataToStorage();
                      setShowQuickAuth(true);
                      setPendingSubmission(true);
                    }}
                    disabled={!isFormValidForSubmission()}
                    className="w-full h-11 text-sm font-semibold gap-2 shadow-lg hover:shadow-xl transition-all rounded-xl"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Soumettre
                  </Button>
                  {!isFormValidForSubmission() && (
                    <p className="text-xs text-center text-amber-600 dark:text-amber-400 mt-2">
                      Complétez: Titre, Propriétaire, Localisation
                    </p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>

    {/* Dialog d'authentification rapide */}
    <QuickAuthDialog
      open={showQuickAuth}
      onOpenChange={setShowQuickAuth}
      onAuthSuccess={async () => {
        // Après connexion réussie, soumettre automatiquement le formulaire
        if (pendingSubmission) {
          // Attendre un court délai pour s'assurer que l'état d'authentification est mis à jour
          setTimeout(async () => {
            await handleSubmit();
            setPendingSubmission(false);
          }, 1000);
        }
      }}
    />

    {/* Bouton WhatsApp flottant */}
    {open && <WhatsAppFloatingButton />}
    
    {/* Dialog de paiement du permis */}
    {showPermitPayment && savedContributionId && savedPermitRequestData && (
      <PermitPaymentDialog
        open={showPermitPayment}
        onOpenChange={setShowPermitPayment}
        contributionId={savedContributionId}
        permitType={savedPermitRequestData.permitType}
        onPaymentSuccess={() => {
          setShowPermitPayment(false);
          setShowSuccess(true);
        }}
      />
    )}
    </>
  );
};

export default CadastralContributionDialog;
