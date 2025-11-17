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
import { MdDashboard, MdLocationOn, MdEventNote, MdAccountBalance, MdRateReview, MdInsertDriveFile } from 'react-icons/md';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
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
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const dialogContentRef = React.useRef<HTMLDivElement>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPermitPayment, setShowPermitPayment] = useState(false);
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
      
      if (result.success) {
        // Effacer les données sauvegardées après une soumission réussie
        clearSavedFormData();
        
        // Vérifier si l'utilisateur a demandé un permis
        if (permitMode === 'request' && permitRequestData) {
          // Sauvegarder les données du permis pour le paiement
          setSavedPermitRequestData(permitRequestData);
          setShowPermitPayment(true);
        } else {
          setShowSuccess(true);
        }
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
          description: `Coordonnées enregistrées avec succès`,
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
            errorMessage = "Veuillez autoriser l'accès à votre position";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Position indisponible";
            break;
          case error.TIMEOUT:
            errorMessage = "La demande de position a expiré";
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
        timeout: 10000,
        maximumAge: 0
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
        className="sm:max-w-3xl w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto border-0 shadow-2xl p-0 rounded-xl z-[9999]"
        onInteractOutside={(e) => {
          // Empêcher la fermeture si le clic est sur le bouton WhatsApp
          const target = e.target as HTMLElement;
          if (target.closest('[data-whatsapp-button="true"]')) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader className="px-4 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-4 border-b bg-gradient-to-r from-primary/5 to-transparent text-center sm:text-left">
          <DialogTitle className="text-base sm:text-2xl font-semibold leading-tight">
            <span className="hidden sm:inline">Contribuer aux informations cadastrales</span>
            <span className="sm:hidden">Contribution cadastrale</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-base mt-1 sm:mt-2 space-y-0.5 sm:space-y-0">
            <div className="flex items-center gap-1 flex-wrap justify-center sm:justify-start">
              <span className="text-muted-foreground">Parcelle :</span>
              <strong className="text-foreground font-semibold">{parcelNumber}</strong>
            </div>
            <p className="text-[10px] sm:text-sm text-muted-foreground leading-tight sm:leading-normal">
              Renseignez les informations que vous possédez
            </p>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} className="w-full" onValueChange={handleTabChange}>
          <div className="sticky top-0 z-20 bg-background px-4 sm:px-6 pt-4 pb-3 border-b shadow-sm">
            <TabsList className="grid w-full grid-cols-5 h-auto sm:h-12 bg-muted/50 p-1 rounded-lg shadow-inner mb-3 gap-1">
              <TabsTrigger 
                value="general" 
                className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all text-xs sm:text-sm py-2 sm:py-0 min-h-[44px] sm:min-h-0 flex items-center justify-center gap-1"
              >
                <MdDashboard className="h-5 w-5 sm:h-4 sm:w-4 flex-shrink-0" />
                {(!isMobile || activeTab === "general") && <span className="hidden sm:inline">Général</span>}
                {isMobile && activeTab === "general" && <span className="text-xs">Général</span>}
              </TabsTrigger>
              <TabsTrigger 
                value="location" 
                className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all text-xs sm:text-sm py-2 sm:py-0 min-h-[44px] sm:min-h-0 flex items-center justify-center gap-1"
              >
                <MdLocationOn className="h-5 w-5 sm:h-4 sm:w-4 flex-shrink-0" />
                {(!isMobile || activeTab === "location") && <span className="hidden sm:inline">Localisation</span>}
                {isMobile && activeTab === "location" && <span className="text-xs">Lieu</span>}
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all text-xs sm:text-sm py-2 sm:py-0 min-h-[44px] sm:min-h-0 flex items-center justify-center gap-1"
              >
                <MdEventNote className="h-5 w-5 sm:h-4 sm:w-4 flex-shrink-0" />
                {(!isMobile || activeTab === "history") && <span className="hidden sm:inline">Historiques</span>}
                {isMobile && activeTab === "history" && <span className="text-xs">Historique</span>}
              </TabsTrigger>
              <TabsTrigger 
                value="obligations" 
                className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all text-xs sm:text-sm py-2 sm:py-0 min-h-[44px] sm:min-h-0 flex items-center justify-center gap-1"
              >
                <MdAccountBalance className="h-5 w-5 sm:h-4 sm:w-4 flex-shrink-0" />
                {(!isMobile || activeTab === "obligations") && <span className="hidden sm:inline">Obligations</span>}
                {isMobile && activeTab === "obligations" && <span className="text-xs">Taxes</span>}
              </TabsTrigger>
              <TabsTrigger 
                value="review" 
                className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all text-xs sm:text-sm py-2 sm:py-0 min-h-[44px] sm:min-h-0 flex items-center justify-center gap-1"
              >
                <MdRateReview className="h-5 w-5 sm:h-4 sm:w-4 flex-shrink-0 text-amber-500" />
                {(!isMobile || activeTab === "review") && <span className="hidden sm:inline">Révision</span>}
                {isMobile && activeTab === "review" && <span className="text-xs">Révision</span>}
              </TabsTrigger>
            </TabsList>
            
            <div className="space-y-3">
              {/* Message motivant avec animation */}
              <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-3 rounded-lg border border-primary/20 animate-fade-in">
                <p className="text-sm font-medium text-foreground">
                  {getMotivationalMessage(calculateProgress())}
                </p>
              </div>
            </div>
          </div>
          
          <div className="px-4 sm:px-6 pb-6">

          <TabsContent value="general" className="space-y-6 mt-6 animate-fade-in">
            <PropertyTitleTypeSelect 
              value={formData.propertyTitleType || ''}
              onValueChange={(value) => handleInputChange('propertyTitleType', value)}
              leaseType={formData.leaseType}
              onLeaseTypeChange={(type) => handleInputChange('leaseType', type)}
            />

            {formData.propertyTitleType && (
              <div className="space-y-2 animate-fade-in">
                <Label htmlFor="titleReference">
                  Numéro de référence du {formData.propertyTitleType.toLowerCase()}
                </Label>
                <InputWithPopover
                  id="titleReference"
                  placeholder={PROPERTY_TITLE_TYPES.find(t => t.value === formData.propertyTitleType)?.reference || "Ex: XXX-123456"}
                  value={formData.titleReferenceNumber || ''}
                  onChange={(e) => handleInputChange('titleReferenceNumber', e.target.value)}
                  helpTitle="Numéro de référence"
                  helpText={`Le numéro de référence se trouve généralement en haut de votre document. Format attendu : ${PROPERTY_TITLE_TYPES.find(t => t.value === formData.propertyTitleType)?.reference || "XXX-123456"}`}
                />
                <p className="text-xs text-muted-foreground">
                  {PROPERTY_TITLE_TYPES.find(t => t.value === formData.propertyTitleType)?.description}
                </p>

                {/* Title document attachment */}
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="titleDoc">Document du titre de propriété (optionnel)</Label>
                    <span className="text-xs text-muted-foreground">
                      {titleDocFiles.length}/5 fichiers
                    </span>
                  </div>
                  
                  {/* Liste des fichiers ajoutés */}
                  {titleDocFiles.length > 0 && (
                    <div className="space-y-2">
                      {titleDocFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                          <MdInsertDriveFile className="h-4 w-4 text-primary" />
                          <span className="text-sm flex-1 truncate">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile('title', index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Bouton pour ajouter un fichier */}
                  {titleDocFiles.length < 5 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('titleDoc')?.click()}
                      className="gap-2 hover:bg-primary/5 transition-all w-full"
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter le titre de propriété
                    </Button>
                  )}
                  
                  <Input
                    id="titleDoc"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                    onChange={(e) => handleFileChange(e, 'title')}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, WEBP ou PDF - Max 5 MB par fichier - Maximum 5 fichiers
                  </p>
                </div>
              </div>
            )}

            {/* Section Propriétaire(s) actuel(s) */}
            <div className="space-y-4 pt-4 border-t">
              <div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-semibold">Propriétaire(s) actuel(s)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 rounded-full hover:bg-primary/10"
                      >
                        <Info className="h-4 w-4 text-primary" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="start">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-sm mb-2 text-foreground">
                            Propriétaire différent du document officiel ?
                          </h4>
                          <p className="text-xs text-muted-foreground mb-3">
                            Vous pouvez indiquer votre nom comme propriétaire actuel même si le document officiel comporte un nom différent.
                          </p>
                        </div>
                        
                        <div className="border-l-2 border-primary pl-3">
                          <h5 className="font-semibold text-xs mb-2 text-foreground">
                            Condition requise
                          </h5>
                          <p className="text-xs text-muted-foreground mb-2">
                            Vous devez détenir un document prouvant que vous êtes le nouveau propriétaire, tel que :
                          </p>
                          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                            <li>Acte de vente</li>
                            <li>Acte de donation</li>
                            <li>Acte de succession ou d'héritage</li>
                            <li>Tout autre document officiel de transfert de propriété</li>
                          </ul>
                        </div>
                        
                        <div className="bg-muted/50 p-2 rounded-md">
                          <p className="text-xs text-muted-foreground">
                            <strong className="text-foreground">💡 Important :</strong> Veuillez ajouter l'image du document prouvant que vous êtes le nouveau propriétaire en tant que pièce jointe dans la section "Type de titre de propriété, Document du titre de propriété (optionnel)". Ce document sera utilisé pour valider votre contribution CCC.
                          </p>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <p className="text-xs text-muted-foreground">
                  Indiquez le(s) propriétaire(s) actuel(s) de la parcelle
                </p>
              </div>

              {currentOwners.map((owner, index) => (
                <div key={index} className={`border rounded-xl p-4 space-y-3 bg-gradient-to-br from-muted/30 to-transparent animate-fade-in transition-all duration-300 ${
                  highlightIncompleteOwner && index === currentOwners.length - 1 && (!owner.lastName || !owner.firstName) 
                    ? 'ring-2 ring-primary bg-primary/5 animate-pulse' 
                    : ''
                }`}>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Propriétaire #{index + 1}</h4>
                    {currentOwners.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCurrentOwner(index)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Nom *</Label>
                      <Input
                        placeholder="Nom de famille"
                        value={owner.lastName}
                        onChange={(e) => updateCurrentOwner(index, 'lastName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Post-nom</Label>
                      <Input
                        placeholder="Post-nom (optionnel)"
                        value={owner.middleName}
                        onChange={(e) => updateCurrentOwner(index, 'middleName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Prénom *</Label>
                      <Input
                        placeholder="Prénom"
                        value={owner.firstName}
                        onChange={(e) => updateCurrentOwner(index, 'firstName', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Statut juridique</Label>
                      <Select 
                        value={owner.legalStatus}
                        onValueChange={(value) => updateCurrentOwner(index, 'legalStatus', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Personne physique">Personne physique</SelectItem>
                          <SelectItem value="Personne morale">Personne morale</SelectItem>
                          <SelectItem value="État">État</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Propriétaire depuis</Label>
                      <Input
                        type="date"
                        max={new Date().toISOString().split('T')[0]}
                        value={owner.since}
                        onChange={(e) => updateCurrentOwner(index, 'since', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Owner document attachment */}
                  <div className="space-y-2 mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Pièce d'identité du propriétaire (optionnel)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                            <Info className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <p className="text-xs text-muted-foreground">
                            La pièce d'identité du propriétaire va aider à valider votre identité en tant que propriétaire de la parcelle. 
                            Cela renforce la crédibilité de votre contribution cadastrale.
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
                        className="gap-2 hover:bg-primary/5 transition-all w-full"
                      >
                        <Plus className="h-4 w-4" />
                        Ajouter la pièce d'identité
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                        <MdInsertDriveFile className="h-4 w-4 text-primary" />
                        <span className="text-sm flex-1 truncate">{ownerDocFile.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile('owner')}
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
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG, WEBP ou PDF - Max 5 MB
                    </p>
                  </div>
                </div>
              ))}

              <div className="space-y-2">
                {/* Notification d'avertissement */}
                {showOwnerWarning && (
                  <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 animate-fade-in">
                    <div className="flex items-start gap-2">
                      <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                          Complétez d'abord le propriétaire actuel
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                          Veuillez renseigner le nom et le prénom du propriétaire #{currentOwners.length} avant d'en ajouter un nouveau.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-center sm:justify-start items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addCurrentOwner}
                    className="gap-2 text-primary hover:text-primary hover:bg-primary/10 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter un propriétaire
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <p className="text-xs text-muted-foreground">
                        Si vous n'êtes pas l'unique propriétaire de la parcelle, vous pouvez ajouter un autre propriétaire. 
                        Cela est utile dans le cas de copropriété ou de propriété partagée.
                      </p>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <div className={`space-y-2 transition-all duration-300 ${highlightRequiredFields && !formData.constructionType ? 'ring-2 ring-primary rounded-lg p-3 bg-primary/5 animate-pulse' : ''}`}>
              <div className="flex items-center gap-2">
                <Label htmlFor="constructionType" className="flex items-center gap-1">
                  Type de construction
                  {highlightRequiredFields && !formData.constructionType && (
                    <span className="text-primary text-xs font-semibold animate-fade-in">(Requis)</span>
                  )}
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-primary/10">
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 text-sm">
                    <h4 className="font-semibold mb-2">Type de construction</h4>
                    <p className="text-muted-foreground">
                      Définit la catégorie principale de votre bien immobilier. Cette classification détermine les taxes applicables et les règlements d'urbanisme à respecter.
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <li>• <strong>Résidentielle</strong>: Habitations et logements</li>
                      <li>• <strong>Commerciale</strong>: Bureaux, magasins, commerces</li>
                      <li>• <strong>Industrielle</strong>: Usines, ateliers, entrepôts</li>
                      <li>• <strong>Agricole</strong>: Exploitations agricoles</li>
                      <li>• <strong>Terrain nu</strong>: Parcelle sans construction</li>
                    </ul>
                  </PopoverContent>
                </Popover>
              </div>
              <Select 
                value={formData.constructionType || ''}
                onValueChange={(value) => {
                  handleInputChange('constructionType', value);
                  setHighlightRequiredFields(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Résidentielle">Résidentielle</SelectItem>
                  <SelectItem value="Commerciale">Commerciale</SelectItem>
                  <SelectItem value="Industrielle">Industrielle</SelectItem>
                  <SelectItem value="Agricole">Agricole</SelectItem>
                  <SelectItem value="Terrain nu">Terrain nu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className={`space-y-2 transition-all duration-300 ${highlightRequiredFields && !formData.constructionNature ? 'ring-2 ring-primary rounded-lg p-3 bg-primary/5 animate-pulse' : ''}`}>
              <div className="flex items-center gap-2">
                <Label htmlFor="constructionNature" className="flex items-center gap-1">
                  Nature de construction
                  {highlightRequiredFields && !formData.constructionNature && (
                    <span className="text-primary text-xs font-semibold animate-fade-in">(Requis)</span>
                  )}
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-primary/10">
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 text-sm">
                    <h4 className="font-semibold mb-2">Nature de construction</h4>
                    <p className="text-muted-foreground">
                      Indique la solidité et la durabilité de la construction, critère essentiel pour l'évaluation cadastrale et la détermination de la valeur du bien.
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <li>• <strong>Durable</strong>: Matériaux solides (béton, briques)</li>
                      <li>• <strong>Semi-durable</strong>: Matériaux mixtes</li>
                      <li>• <strong>Précaire</strong>: Matériaux temporaires</li>
                      <li>• <strong>Non bâti</strong>: Terrain sans construction</li>
                    </ul>
                  </PopoverContent>
                </Popover>
              </div>
              <Select 
                value={formData.constructionNature || ''}
                onValueChange={(value) => {
                  handleInputChange('constructionNature', value);
                  setHighlightRequiredFields(false);
                }}
                disabled={!formData.constructionType}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !formData.constructionType 
                      ? "Sélectionner d'abord le type de construction" 
                      : "Sélectionner la nature"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availableConstructionNatures.map((nature) => (
                    <SelectItem key={nature} value={nature}>{nature}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!formData.constructionType && (
                <p className="text-xs text-muted-foreground">
                  Veuillez d'abord sélectionner le type de construction
                </p>
              )}
            </div>

            <div className={`space-y-2 transition-all duration-300 ${highlightRequiredFields && !formData.declaredUsage ? 'ring-2 ring-primary rounded-lg p-3 bg-primary/5 animate-pulse' : ''}`}>
              <div className="flex items-center gap-2">
                <Label htmlFor="declaredUsage" className="flex items-center gap-1">
                  Usage déclaré
                  {highlightRequiredFields && !formData.declaredUsage && (
                    <span className="text-primary text-xs font-semibold animate-fade-in">(Requis)</span>
                  )}
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-primary/10">
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 text-sm">
                    <h4 className="font-semibold mb-2">Usage déclaré</h4>
                    <p className="text-muted-foreground">
                      Précise l'utilisation effective ou prévue du bien. Cette information est cruciale pour la conformité réglementaire et détermine les autorisations nécessaires.
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      L'usage doit correspondre à l'utilisation réelle du bien et être conforme aux règles d'urbanisme en vigueur dans votre zone.
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
                <SelectTrigger>
                  <SelectValue placeholder={
                    !formData.constructionType || !formData.constructionNature
                      ? "Sélectionner d'abord le type et la nature" 
                      : "Sélectionner l'usage"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availableDeclaredUsages.map((usage) => (
                    <SelectItem key={usage} value={usage}>{usage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(!formData.constructionType || !formData.constructionNature) && (
                <p className="text-xs text-muted-foreground">
                  Veuillez d'abord sélectionner le type et la nature de construction
                </p>
              )}
            </div>

            
            {/* Section Permis de construire */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-semibold">Permis de construire</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-transparent">
                        <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="start">
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Guide du permis de construire</h4>
                        
                        <div className="space-y-3 text-sm">
                          <div className="space-y-2">
                            <p className="font-medium text-primary">Option 1 : J'ai déjà un permis</p>
                            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
                              <li>Cliquez sur "J'ai déjà un permis"</li>
                              <li>Renseignez le numéro du permis</li>
                              <li>Indiquez la date d'émission</li>
                              <li>Sélectionnez le service émetteur</li>
                              <li>Joignez une copie du document (optionnel)</li>
                            </ol>
                          </div>
                          
                          <div className="space-y-2 pt-2 border-t">
                            <p className="font-medium text-primary">Option 2 : Demander un permis</p>
                            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
                              <li>Cliquez sur "Demander un permis"</li>
                              <li>Choisissez le type (construction ou régularisation)</li>
                              <li>Décrivez votre projet de construction</li>
                              <li>Renseignez vos coordonnées de contact</li>
                              <li>Joignez les plans architecturaux (si disponibles)</li>
                            </ol>
                          </div>
                        </div>
                        
                        <p className="text-xs text-muted-foreground italic pt-2 border-t">
                          💡 Cette section est optionnelle mais fortement recommandée pour régulariser votre parcelle
                        </p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Toggle pour choisir le mode */}
              <div className="space-y-3 bg-muted/30 p-4 rounded-lg border">
                <Label className="text-sm">Situation du permis</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={permitMode === 'existing' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPermitMode('existing')}
                    className="flex-1 text-xs sm:text-sm px-2 sm:px-4"
                  >
                    J'ai déjà un permis
                  </Button>
                  <Button
                    type="button"
                    variant={permitMode === 'request' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPermitMode('request')}
                    className="flex-1 text-xs sm:text-sm px-2 sm:px-4"
                  >
                    Demander un permis
                  </Button>
                </div>
              </div>

              {/* Mode: J'ai déjà un permis */}
              {permitMode === 'existing' && (
                <div className="space-y-4">
                  {buildingPermits.map((permit, index) => (
                      <div key={index} className={`border rounded-xl p-4 space-y-3 bg-gradient-to-br from-muted/30 to-transparent animate-fade-in transition-all duration-300 ${
                        highlightIncompletePermit && index === buildingPermits.length - 1 && (!permit.permitNumber || !permit.issuingService || !permit.issueDate) 
                          ? 'ring-2 ring-primary bg-primary/5 animate-pulse' 
                          : ''
                      }`}>
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">Permis #{index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (index === 0) {
                              toast({
                                title: "Suppression impossible",
                                description: "Le premier bloc de permis ne peut pas être supprimé. Vous pouvez le laisser vide si vous n'avez pas de permis.",
                                variant: "destructive"
                              });
                              return;
                            }
                            removeBuildingPermit(index);
                          }}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Type de permis */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs font-medium">Type de permis délivré</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 rounded-full hover:bg-muted">
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" align="start">
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <h4 className="font-medium text-sm">Qu'est-ce qu'un permis délivré ?</h4>
                                  <p className="text-xs text-muted-foreground">
                                    Il s'agit du permis de construire qui a été officiellement délivré par le service compétent (Commune, Ville, Division Urbaine) pour autoriser votre construction.
                                  </p>
                                </div>
                                
                                {!permit.permitNumber && (
                                  <div className="border-t pt-3 space-y-2">
                                    <h4 className="font-medium text-sm">Vous n'avez pas encore de permis ?</h4>
                                    <p className="text-xs text-muted-foreground">
                                      Vous pouvez faire une demande dans la section "Demander un permis" ci-dessous.
                                      {formData.constructionType !== "Terrain nu" ? (
                                        <span className="block mt-2 text-primary font-medium">
                                          → Un permis de régularisation serait le mieux adapté compte tenu de votre situation (Type de construction: {formData.constructionType}).
                                        </span>
                                      ) : formData.constructionNature === "Précaire" ? (
                                        <span className="block mt-2 text-primary font-medium">
                                          → Un permis de construire est adapté pour une construction précaire.
                                        </span>
                                      ) : (
                                        <span className="block mt-2 text-primary font-medium">
                                          → Un permis de construire est adapté pour un terrain nu.
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        
                        {/* Notification type de permis bloqué - affichée au-dessus */}
                        {showPermitTypeBlockedWarning && (
                          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 animate-fade-in mb-2 shadow-lg">
                            <div className="flex items-start gap-2">
                              <Info className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-destructive">
                                  Type de permis non applicable
                                </p>
                                <p className="text-xs text-destructive/80 mt-1">
                                  {permitTypeBlockedMessage}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <RadioGroup 
                          value={permit.permitType} 
                          onValueChange={(value: 'construction' | 'regularization') => {
                            const restrictions = getPermitTypeRestrictions();
                            
                            // Vérifier si le type est bloqué
                            if (restrictions.blockedInExisting === value) {
                              handleBlockedPermitTypeClick(value, restrictions.messageExisting, 'existing');
                              return;
                            }
                            
                            updateBuildingPermit(index, 'permitType', value);
                          }}
                          className="flex gap-2"
                        >
                          <div 
                            className={`flex items-center space-x-2 flex-1 p-2 rounded-lg border transition-colors ${
                              getPermitTypeRestrictions().blockedInExisting === 'construction'
                                ? 'bg-muted/30 opacity-60 cursor-not-allowed'
                                : 'bg-card hover:bg-muted/50 cursor-pointer'
                            }`}
                            onClick={(e) => {
                              const restrictions = getPermitTypeRestrictions();
                              if (restrictions.blockedInExisting === 'construction') {
                                e.preventDefault();
                                handleBlockedPermitTypeClick('construction', restrictions.messageExisting, 'existing');
                              }
                            }}
                          >
                            <RadioGroupItem 
                              value="construction" 
                              id={`construction-${index}`}
                              disabled={getPermitTypeRestrictions().blockedInExisting === 'construction'}
                            />
                            <Label 
                              htmlFor={`construction-${index}`} 
                              className={`flex-1 text-xs ${
                                getPermitTypeRestrictions().blockedInExisting === 'construction'
                                  ? 'cursor-not-allowed'
                                  : 'cursor-pointer'
                              }`}
                            >
                              Permis de construire
                            </Label>
                          </div>
                          <div 
                            className={`flex items-center space-x-2 flex-1 p-2 rounded-lg border transition-colors ${
                              getPermitTypeRestrictions().blockedInExisting === 'regularization'
                                ? 'bg-muted/30 opacity-60 cursor-not-allowed'
                                : 'bg-card hover:bg-muted/50 cursor-pointer'
                            }`}
                            onClick={(e) => {
                              const restrictions = getPermitTypeRestrictions();
                              if (restrictions.blockedInExisting === 'regularization') {
                                e.preventDefault();
                                handleBlockedPermitTypeClick('regularization', restrictions.messageExisting, 'existing');
                              }
                            }}
                          >
                            <RadioGroupItem 
                              value="regularization" 
                              id={`regularization-${index}`}
                              disabled={getPermitTypeRestrictions().blockedInExisting === 'regularization'}
                            />
                            <Label 
                              htmlFor={`regularization-${index}`} 
                              className={`flex-1 text-xs ${
                                getPermitTypeRestrictions().blockedInExisting === 'regularization'
                                  ? 'cursor-not-allowed'
                                  : 'cursor-pointer'
                              }`}
                            >
                              Permis de régularisation
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Numéro du permis</Label>
                          <InputWithPopover
                            placeholder="ex: PC-2024-001"
                            value={permit.permitNumber}
                            onChange={(e) => updateBuildingPermit(index, 'permitNumber', e.target.value)}
                            helpTitle="Numéro de permis"
                            helpText="Le numéro de permis de construire est un identifiant unique délivré par les services d'urbanisme. Il figure généralement en haut du document officiel du permis."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Date d'émission</Label>
                          <Input
                            type="date"
                            min={permit.permitType === 'construction' 
                              ? getPermitTypeRestrictions().dateMinExisting 
                              : getPermitTypeRestrictions().dateMinRegularization}
                            max={permit.permitType === 'construction'
                              ? getPermitTypeRestrictions().dateMaxExisting 
                              : getPermitTypeRestrictions().dateMaxRegularization}
                            value={permit.issueDate}
                            onChange={(e) => {
                              const restrictions = getPermitTypeRestrictions();
                              const selectedDate = new Date(e.target.value);
                              
                              const minDate = permit.permitType === 'construction'
                                ? (restrictions.dateMinExisting ? new Date(restrictions.dateMinExisting) : null)
                                : (restrictions.dateMinRegularization ? new Date(restrictions.dateMinRegularization) : null);
                              
                              const maxDate = permit.permitType === 'construction'
                                ? (restrictions.dateMaxExisting ? new Date(restrictions.dateMaxExisting) : new Date())
                                : (restrictions.dateMaxRegularization ? new Date(restrictions.dateMaxRegularization) : new Date());

                              if (minDate && selectedDate < minDate) {
                                toast({
                                  title: "Date invalide",
                                  description: `La date d'émission doit être postérieure au ${minDate.toLocaleDateString('fr-FR')}`,
                                  variant: "destructive"
                                });
                                return;
                              }

                              if (maxDate && selectedDate > maxDate) {
                                toast({
                                  title: "Date invalide",
                                  description: `La date d'émission doit être antérieure au ${maxDate.toLocaleDateString('fr-FR')}`,
                                  variant: "destructive"
                                });
                                return;
                              }

                              updateBuildingPermit(index, 'issueDate', e.target.value);
                            }}
                          />
                          {(getPermitTypeRestrictions().dateMinExisting || getPermitTypeRestrictions().dateMinRegularization) && (
                            <p className="text-xs text-muted-foreground">
                              Période: {permit.permitType === 'construction'
                                ? `${new Date(getPermitTypeRestrictions().dateMinExisting).toLocaleDateString('fr-FR')} - ${new Date(getPermitTypeRestrictions().dateMaxExisting).toLocaleDateString('fr-FR')}`
                                : `${new Date(getPermitTypeRestrictions().dateMinRegularization).toLocaleDateString('fr-FR')} - ${new Date(getPermitTypeRestrictions().dateMaxRegularization).toLocaleDateString('fr-FR')}`}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <BuildingPermitIssuingServiceSelect
                          value={permit.issuingService}
                          onValueChange={(value) => updateBuildingPermit(index, 'issuingService', value)}
                        />
                      </div>


                      {/* Pièce jointe du permis */}
                      <div className="space-y-2">
                        <Label className="text-xs">Pièce jointe (PDF, JPG, PNG)</Label>
                        {!permit.attachmentFile ? (
                          <div className="flex gap-2">
                            <Input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  // Vérifier la taille (max 10MB)
                                  if (file.size > 10 * 1024 * 1024) {
                                    toast({
                                      title: "Fichier trop volumineux",
                                      description: "La taille maximale est de 10 MB",
                                      variant: "destructive"
                                    });
                                    return;
                                  }
                                  updateBuildingPermitFile(index, file);
                                }
                              }}
                              className="flex-1"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border">
                            <MdInsertDriveFile className="h-4 w-4 text-primary" />
                            <span className="text-xs flex-1 truncate">{permit.attachmentFile.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {(permit.attachmentFile.size / 1024).toFixed(1)} KB
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeBuildingPermitFile(index)}
                              className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Ajoutez une copie du permis de construire pour validation
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Bouton Ajouter déplacé en dessous des blocs */}
                  <div className="space-y-2">

                    {/* Notification d'avertissement */}
                    {showPermitWarning && (
                      <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 animate-fade-in">
                        <div className="flex items-start gap-2">
                          <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                              Complétez d'abord le permis actuel
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                              Veuillez renseigner le numéro, le service émetteur et la date d'émission du Permis #{buildingPermits.length} avant d'en ajouter un nouveau.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addBuildingPermit}
                        className="gap-2 hover:bg-primary/5 transition-all hover:scale-[1.02] shadow-sm"
                      >
                        <Plus className="h-4 w-4" />
                        Ajouter un permis
                      </Button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                            <Info className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <p className="text-xs text-muted-foreground">
                            Si vous avez d'autres permis de construire ou de régularisation délivrés dans le passé, vous pouvez également les ajouter. 
                            Veuillez respecter la logique chronologique dépendante du permis précédent (les dates doivent être cohérentes).
                          </p>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              )}

              {/* Mode: Je souhaite faire une demande */}
              {permitMode === 'request' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Demande de permis
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          Votre demande sera traitée après validation de votre contribution cadastrale. Les frais de traitement seront communiqués par nos services.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Type de permis demandé */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Type de permis demandé *</Label>
                    
                    {/* Notification type de permis bloqué - affichée au-dessus */}
                    {showPermitTypeBlockedWarning && (
                      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 animate-fade-in shadow-lg">
                        <div className="flex items-start gap-2">
                          <Info className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-destructive">
                              Type de permis non applicable
                            </p>
                            <p className="text-xs text-destructive/80 mt-1">
                              {permitTypeBlockedMessage}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <div 
                        className={`flex items-start gap-2 p-3 rounded-lg border transition-colors ${
                          getPermitTypeRestrictions().blockedInRequest === 'construction'
                            ? 'bg-muted/30 opacity-60 cursor-not-allowed'
                            : permitRequest.permitType === 'construction' 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:bg-muted/30 cursor-pointer'
                        }`}
                        onClick={() => {
                          const restrictions = getPermitTypeRestrictions();
                          if (restrictions.blockedInRequest === 'construction') {
                            handleBlockedPermitTypeClick('construction', restrictions.messageRequest, 'request');
                          } else {
                            setPermitRequest({ ...permitRequest, permitType: 'construction' });
                          }
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="permit-type-construction"
                            name="permitType"
                            value="construction"
                            checked={permitRequest.permitType === 'construction'}
                            disabled={getPermitTypeRestrictions().blockedInRequest === 'construction'}
                            onChange={(e) => {
                              if (getPermitTypeRestrictions().blockedInRequest !== 'construction') {
                                setPermitRequest({ ...permitRequest, permitType: e.target.value as 'construction' | 'regularization' });
                              }
                            }}
                            className="h-4 w-4 mt-0.5"
                          />
                          <label 
                            htmlFor="permit-type-construction" 
                            className={`text-sm font-medium ${
                              getPermitTypeRestrictions().blockedInRequest === 'construction'
                                ? 'cursor-not-allowed'
                                : 'cursor-pointer'
                            }`}
                          >
                            Permis de construire
                          </label>
                        </div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-primary/10">
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-2">
                              <h4 className="font-semibold">Permis de construire</h4>
                              <p className="text-sm text-muted-foreground">
                                Pour une nouvelle construction ou un projet de construction sur un terrain vierge. 
                                Ce permis est nécessaire avant de commencer tout travaux de construction.
                              </p>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div 
                        className={`flex items-start gap-2 p-3 rounded-lg border transition-colors ${
                          getPermitTypeRestrictions().blockedInRequest === 'regularization'
                            ? 'bg-muted/30 opacity-60 cursor-not-allowed'
                            : permitRequest.permitType === 'regularization' 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:bg-muted/30 cursor-pointer'
                        }`}
                        onClick={() => {
                          const restrictions = getPermitTypeRestrictions();
                          if (restrictions.blockedInRequest === 'regularization') {
                            handleBlockedPermitTypeClick('regularization', restrictions.messageRequest, 'request');
                          } else {
                            setPermitRequest({ ...permitRequest, permitType: 'regularization' });
                          }
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="permit-type-regularisation"
                            name="permitType"
                            value="regularization"
                            checked={permitRequest.permitType === 'regularization'}
                            disabled={getPermitTypeRestrictions().blockedInRequest === 'regularization'}
                            onChange={(e) => {
                              if (getPermitTypeRestrictions().blockedInRequest !== 'regularization') {
                                setPermitRequest({ ...permitRequest, permitType: e.target.value as 'construction' | 'regularization' });
                              }
                            }}
                            className="h-4 w-4 mt-0.5"
                          />
                          <label 
                            htmlFor="permit-type-regularisation" 
                            className={`text-sm font-medium ${
                              getPermitTypeRestrictions().blockedInRequest === 'regularization'
                                ? 'cursor-not-allowed'
                                : 'cursor-pointer'
                            }`}
                          >
                            Permis de régularisation
                          </label>
                        </div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-primary/10">
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-2">
                              <h4 className="font-semibold">Permis de régularisation</h4>
                              <p className="text-sm text-muted-foreground">
                                Pour régulariser une construction existante qui a été réalisée sans permis ou qui ne respecte pas 
                                les normes initiales. Permet de mettre en conformité un bâtiment déjà construit.
                              </p>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>

                  {/* Champs conditionnels selon le type de permis */}
                  {permitRequest.permitType === 'construction' ? (
                    // === PERMIS DE CONSTRUIRE ===
                    <>
                      {/* Description du projet */}
                      <div className="space-y-2">
                        <Label>Description du projet de construction *</Label>
                        <Textarea
                          placeholder="Décrivez le projet (ex: Construction d'une villa moderne de type R+1 avec 4 chambres)"
                          value={permitRequest.constructionDescription}
                          onChange={(e) => setPermitRequest({ ...permitRequest, constructionDescription: e.target.value })}
                          rows={3}
                        />
                      </div>

                      {/* Usage prévu */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label>Usage prévu *</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                              <p className="text-xs text-muted-foreground">
                                L'usage prévu est automatiquement défini selon l'usage déclaré dans "Informations Générales". 
                                Cette valeur ne peut pas être modifiée ici pour garantir la cohérence des données.
                              </p>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <Select
                          value={permitRequest.plannedUsage || formData.declaredUsage}
                          onValueChange={(value) => {
                            setShowUsageLockedWarning(true);
                            setTimeout(() => setShowUsageLockedWarning(false), 5000);
                          }}
                          disabled={true}
                        >
                          <SelectTrigger className="bg-muted/30">
                            <SelectValue placeholder="Défini automatiquement selon l'usage déclaré" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableDeclaredUsages.map(usage => (
                              <SelectItem key={usage} value={usage}>{usage}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {showUsageLockedWarning && (
                          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-2 animate-fade-in">
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                              L'usage prévu est automatiquement rempli selon votre "Usage déclaré" dans l'onglet Informations Générales et ne peut être modifié ici.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Surface estimée */}
                        <div className="space-y-2">
                          <Label>Surface de construction estimée (m²) *</Label>
                          <Input
                            type="number"
                            placeholder="ex: 150"
                            value={permitRequest.estimatedArea}
                            onChange={(e) => setPermitRequest({ ...permitRequest, estimatedArea: e.target.value })}
                          />
                        </div>

                        {/* Nombre d'étages */}
                        <div className="space-y-2">
                          <Label>Nombre d'étages *</Label>
                          <Select
                            value={permitRequest.numberOfFloors}
                            onValueChange={(value) => setPermitRequest({ ...permitRequest, numberOfFloors: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="RDC">RDC (Rez-de-chaussée uniquement)</SelectItem>
                              <SelectItem value="R+1">R+1 (1 étage)</SelectItem>
                              <SelectItem value="R+2">R+2 (2 étages)</SelectItem>
                              <SelectItem value="R+3">R+3 (3 étages)</SelectItem>
                              <SelectItem value="R+4">R+4 (4 étages ou plus)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Matériaux de construction */}
                      <div className="space-y-2">
                        <Label>Matériaux de construction principaux *</Label>
                        <Select
                          value={permitRequest.buildingMaterials}
                          onValueChange={(value) => setPermitRequest({ ...permitRequest, buildingMaterials: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner les matériaux" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Béton armé">Béton armé</SelectItem>
                            <SelectItem value="Briques cuites">Briques cuites</SelectItem>
                            <SelectItem value="Blocs de ciment">Blocs de ciment</SelectItem>
                            <SelectItem value="Bois">Bois</SelectItem>
                            <SelectItem value="Matériaux mixtes">Matériaux mixtes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Plans architecturaux */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          Plans architecturaux * 
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72">
                              <p className="text-xs text-muted-foreground">
                                Veuillez joindre les plans de votre construction (plans de façade, plans d'étage, plans de masse). 
                                Formats acceptés: JPG, PNG, PDF. Maximum 5 fichiers.
                              </p>
                            </PopoverContent>
                          </Popover>
                        </Label>
                        <div className="space-y-2">
                          <Input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,application/pdf"
                            multiple
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              if (permitRequest.architecturalPlanImages.length + files.length > 5) {
                                toast({
                                  title: "Limite atteinte",
                                  description: "Vous ne pouvez ajouter que 5 plans maximum",
                                  variant: "destructive"
                                });
                                return;
                              }
                              setPermitRequest({ 
                                ...permitRequest, 
                                architecturalPlanImages: [...permitRequest.architecturalPlanImages, ...files] 
                              });
                              e.target.value = '';
                            }}
                            className="cursor-pointer"
                          />
                          {permitRequest.architecturalPlanImages.length > 0 && (
                            <div className="space-y-1">
                              {permitRequest.architecturalPlanImages.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs bg-secondary/50 p-2 rounded">
                                  <span className="truncate">{file.name}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => setPermitRequest({
                                      ...permitRequest,
                                      architecturalPlanImages: permitRequest.architecturalPlanImages.filter((_, i) => i !== idx)
                                    })}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    // === PERMIS DE RÉGULARISATION ===
                    <>
                      {/* Description de la construction existante */}
                      <div className="space-y-2">
                        <Label>Description de la construction existante *</Label>
                        <Textarea
                          placeholder="Décrivez la construction actuelle (ex: Maison en dur de type R+1, construite en 2018)"
                          value={permitRequest.constructionDescription}
                          onChange={(e) => setPermitRequest({ ...permitRequest, constructionDescription: e.target.value })}
                          rows={3}
                        />
                      </div>

                      {/* Usage actuel */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label>Usage actuel de la construction *</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                              <p className="text-xs text-muted-foreground">
                                L'usage actuel est automatiquement défini selon l'usage déclaré dans "Informations Générales". 
                                Cette valeur ne peut pas être modifiée ici pour garantir la cohérence des données.
                              </p>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <Select
                          value={permitRequest.plannedUsage || formData.declaredUsage}
                          onValueChange={(value) => {
                            setShowUsageLockedWarning(true);
                            setTimeout(() => setShowUsageLockedWarning(false), 5000);
                          }}
                          disabled={true}
                        >
                          <SelectTrigger className="bg-muted/30">
                            <SelectValue placeholder="Défini automatiquement selon l'usage déclaré" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableDeclaredUsages.map(usage => (
                              <SelectItem key={usage} value={usage}>{usage}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {showUsageLockedWarning && (
                          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-2 animate-fade-in">
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                              L'usage actuel est automatiquement rempli selon votre "Usage déclaré" dans l'onglet Informations Générales et ne peut être modifié ici.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Surface de la construction */}
                        <div className="space-y-2">
                          <Label>Surface de la construction (m²) *</Label>
                          <Input
                            type="number"
                            placeholder="ex: 120"
                            value={permitRequest.estimatedArea}
                            onChange={(e) => setPermitRequest({ ...permitRequest, estimatedArea: e.target.value })}
                          />
                        </div>

                        {/* Année de construction */}
                        <div className="space-y-2">
                          <Label>Année de construction *</Label>
                          <Select
                            value={permitRequest.constructionYear}
                            onValueChange={(value) => setPermitRequest({ ...permitRequest, constructionYear: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner l'année" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              {Array.from({ length: new Date().getFullYear() - 1950 + 1 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                                <SelectItem key={year} value={year.toString()}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Raison de la régularisation */}
                      <div className="space-y-2">
                        <Label>Raison de la régularisation *</Label>
                        <Select
                          value={permitRequest.regularizationReason}
                          onValueChange={(value) => setPermitRequest({ ...permitRequest, regularizationReason: value, previousPermitNumber: '' })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner la raison" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Construction sans permis">Construction réalisée sans permis initial</SelectItem>
                            <SelectItem value="Modifications non autorisées">Modifications non autorisées sur construction existante</SelectItem>
                            <SelectItem value="Non-conformité normes">Non-conformité aux normes d'urbanisme</SelectItem>
                            <SelectItem value="Extension non déclarée">Extension ou agrandissement non déclaré</SelectItem>
                            <SelectItem value="Changement d'usage">Changement d'usage sans autorisation</SelectItem>
                            <SelectItem value="Autre">Autre raison</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Numéro du permis précédent (si applicable) */}
                      {(permitRequest.regularizationReason === "Modifications non autorisées" || 
                        permitRequest.regularizationReason === "Extension non déclarée" ||
                        permitRequest.regularizationReason === "Changement d'usage") && (
                        <div className="space-y-2 border border-border/50 rounded-lg p-4 bg-muted/30">
                          <Label className="flex items-center gap-2">
                            Numéro du permis de construire précédent *
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <div className="space-y-2">
                                  <p className="text-xs text-muted-foreground">
                                    Pour régulariser des modifications, une extension ou un changement d'usage, vous devez fournir le numéro du permis de construire 
                                    initial de la construction.
                                  </p>
                                  <p className="text-xs font-medium text-primary">
                                    Si vous n'avez jamais obtenu de permis pour la construction originale, veuillez sélectionner 
                                    "Construction réalisée sans permis initial" dans la liste des raisons de régularisation.
                                  </p>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </Label>
                          <Input
                            type="text"
                            placeholder="ex: PC/2018/1234"
                            value={permitRequest.previousPermitNumber || ''}
                            onChange={(e) => setPermitRequest({ ...permitRequest, previousPermitNumber: e.target.value })}
                          />
                          <p className="text-xs text-muted-foreground">
                            Entrez le numéro du permis qui vous avait été délivré pour la construction originale avant les modifications.
                          </p>
                        </div>
                      )}

                      {/* Photos de la construction */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          Photos de la construction (tous les angles) * 
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72">
                              <p className="text-xs text-muted-foreground">
                                Veuillez fournir des photos de tous les angles de votre construction (façade principale, façades latérales, 
                                arrière, intérieur si pertinent). Minimum 4 photos, maximum 10 photos. Formats: JPG, PNG.
                              </p>
                            </PopoverContent>
                          </Popover>
                        </Label>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <input
                                type="file"
                                id="photo-camera-input"
                                accept="image/jpeg,image/jpg,image/png"
                                capture="environment"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                  const files = Array.from(e.target.files || []);
                                  if (permitRequest.constructionPhotos.length + files.length > 10) {
                                    toast({
                                      title: "Limite atteinte",
                                      description: "Vous ne pouvez ajouter que 10 photos maximum",
                                      variant: "destructive"
                                    });
                                    return;
                                  }
                                  
                                  // Renommer les fichiers avec un nom court
                                  const renamedFiles = files.map((file, idx) => {
                                    const extension = file.name.split('.').pop();
                                    const newName = `photo-${permitRequest.constructionPhotos.length + idx + 1}.${extension}`;
                                    return new File([file], newName, { type: file.type });
                                  });
                                  
                                  setPermitRequest({ 
                                    ...permitRequest, 
                                    constructionPhotos: [...permitRequest.constructionPhotos, ...renamedFiles] 
                                  });
                                  e.target.value = '';
                                }}
                              />
                              <Button
                                type="button"
                                variant="seloger"
                                size={isMobile ? "icon" : "default"}
                                className={isMobile ? "" : "w-full"}
                                onClick={() => document.getElementById('photo-camera-input')?.click()}
                              >
                                <Camera className="h-4 w-4" />
                                {!isMobile && <span className="ml-2">Prendre une photo</span>}
                              </Button>
                            </div>
                            <div className="flex-1">
                              <input
                                type="file"
                                id="photo-file-input"
                                accept="image/jpeg,image/jpg,image/png"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                  const files = Array.from(e.target.files || []);
                                  if (permitRequest.constructionPhotos.length + files.length > 10) {
                                    toast({
                                      title: "Limite atteinte",
                                      description: "Vous ne pouvez ajouter que 10 photos maximum",
                                      variant: "destructive"
                                    });
                                    return;
                                  }
                                  
                                  // Renommer les fichiers avec un nom court
                                  const renamedFiles = files.map((file, idx) => {
                                    const extension = file.name.split('.').pop();
                                    const newName = `photo-${permitRequest.constructionPhotos.length + idx + 1}.${extension}`;
                                    return new File([file], newName, { type: file.type });
                                  });
                                  
                                  setPermitRequest({ 
                                    ...permitRequest, 
                                    constructionPhotos: [...permitRequest.constructionPhotos, ...renamedFiles] 
                                  });
                                  e.target.value = '';
                                }}
                              />
                              <Button
                                type="button"
                                variant="seloger"
                                size={isMobile ? "icon" : "default"}
                                className={isMobile ? "" : "w-full"}
                                onClick={() => document.getElementById('photo-file-input')?.click()}
                              >
                                <Upload className="h-4 w-4" />
                                {!isMobile && <span className="ml-2">Choisir des fichiers</span>}
                              </Button>
                            </div>
                          </div>
                          {permitRequest.constructionPhotos.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">
                                {permitRequest.constructionPhotos.length} photo(s) ajoutée(s) {permitRequest.constructionPhotos.length < 4 && '(minimum 4 requis)'}
                              </p>
                              {permitRequest.constructionPhotos.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs bg-secondary/50 p-2 rounded">
                                  <span className="truncate">{file.name}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => setPermitRequest({
                                      ...permitRequest,
                                      constructionPhotos: permitRequest.constructionPhotos.filter((_, i) => i !== idx)
                                    })}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Label className="text-sm font-semibold">Informations du demandeur</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                            <Info className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <p className="text-xs text-muted-foreground">
                            Seul(e) le(la) propriétaire ou l'un des propriétaires peut faire une demande de permis de construire ou de régularisation.
                            Sélectionnez un propriétaire dans la liste ci-dessous.
                          </p>
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="space-y-3">
                      {currentOwners.length > 1 && (
                        <div className="space-y-2">
                          <Label>Sélectionner le propriétaire demandeur *</Label>
                          <Select
                            value={permitRequest.selectedOwnerIndex.toString()}
                            onValueChange={(value) => {
                              const idx = parseInt(value);
                              const owner = currentOwners[idx];
                              if (owner) {
                                const fullName = `${owner.lastName} ${owner.middleName ? owner.middleName + ' ' : ''}${owner.firstName}`.trim();
                                setPermitRequest({ 
                                  ...permitRequest, 
                                  applicantName: fullName,
                                  selectedOwnerIndex: idx
                                });
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir un propriétaire" />
                            </SelectTrigger>
                            <SelectContent>
                              {currentOwners.map((owner, idx) => {
                                if (owner.lastName && owner.firstName) {
                                  const fullName = `${owner.lastName} ${owner.middleName ? owner.middleName + ' ' : ''}${owner.firstName}`.trim();
                                  return (
                                    <SelectItem key={idx} value={idx.toString()}>
                                      {fullName}
                                    </SelectItem>
                                  );
                                }
                                return null;
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <Label>Nom complet *</Label>
                        <Input
                          placeholder="Nom et prénom du demandeur"
                          value={permitRequest.applicantName}
                          onChange={(e) => setPermitRequest({ ...permitRequest, applicantName: e.target.value })}
                          disabled={currentOwners.length > 0}
                          className={currentOwners.length > 0 ? 'bg-muted/30' : ''}
                        />
                        {currentOwners.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Le nom est défini automatiquement selon le propriétaire sélectionné
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Téléphone *</Label>
                        <Input
                          type="tel"
                          placeholder="ex: +243 999 999 999"
                          value={permitRequest.applicantPhone}
                          onChange={(e) => setPermitRequest({ ...permitRequest, applicantPhone: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Pour les tests, utilisez: 97123456 ou 97123TEST
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          placeholder="email@exemple.com"
                          value={permitRequest.applicantEmail}
                          onChange={(e) => setPermitRequest({ ...permitRequest, applicantEmail: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          Une fois votre contribution validée, vous recevrez les instructions pour finaliser votre demande de permis de construire.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
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

          <TabsContent value="location" className="space-y-6 mt-6 animate-fade-in">
            {/* Choix du type de section */}
            <div className="space-y-2 pb-4 border-t">
              <div className="flex items-center gap-2">
                <Label htmlFor="sectionType">Type de section *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-primary/10">
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 text-sm">
                    <h4 className="font-semibold mb-2">Type de section cadastrale</h4>
                    <p className="text-muted-foreground">
                      La RDC divise les parcelles en sections urbaines (SU) et sections rurales (SR). Cette classification détermine la structure administrative de localisation de votre bien.
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <li>• <strong>SU (Section Urbaine)</strong>: Zones urbanisées avec Ville → Commune → Quartier</li>
                      <li>• <strong>SR (Section Rurale)</strong>: Zones rurales avec Territoire → Collectivité → Village</li>
                    </ul>
                  </PopoverContent>
                </Popover>
              </div>
              <Select 
                value={sectionType} 
                onValueChange={(value: 'urbaine' | 'rurale') => handleSectionTypeChange(value)}
                disabled={sectionTypeAutoDetected}
              >
                <SelectTrigger className={sectionTypeAutoDetected ? 'bg-muted/50 cursor-not-allowed' : ''}>
                  <SelectValue placeholder="Choisir le type de section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urbaine">Section Urbaine (SU)</SelectItem>
                  <SelectItem value="rurale">Section rurale (SR)</SelectItem>
                </SelectContent>
              </Select>
              {sectionTypeAutoDetected ? (
                <p className="text-xs text-primary flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3" />
                  Type détecté automatiquement à partir du préfixe "{parcelNumber.toUpperCase().startsWith('SU') ? 'SU' : 'SR'}"
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Choisissez si vous renseignez un numéro SU (zone urbaine) ou SR (zone rurale)
                </p>
              )}
            </div>

            {/* Province - toujours visible */}
            {sectionType && (
              <div className="space-y-2">
                <Label htmlFor="province">Province *</Label>
                <Select 
                  value={formData.province} 
                  onValueChange={(value) => handleInputChange('province', value)}
                >
                  <SelectTrigger>
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

            {/* Section Urbaine (SU) - visible uniquement si type urbain sélectionné */}
            {sectionType === 'urbaine' && (
              <div className="space-y-3 pt-4 border-t">
                <h4 className="text-sm font-semibold text-muted-foreground">Section Urbaine (SU)</h4>
                <p className="text-xs text-muted-foreground">
                  Remplissez ces champs pour les zones urbaines (numéro SU).
                </p>
                
                <div className="space-y-2">
                  <Label htmlFor="ville">Ville</Label>
                  <Select 
                    value={formData.ville}
                    onValueChange={(value) => handleInputChange('ville', value)}
                    disabled={!formData.province || availableVilles.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !formData.province 
                        ? "Sélectionner d'abord une province" 
                        : availableVilles.length === 0 
                        ? "Aucune ville disponible"
                        : "Sélectionner la ville"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVilles.map(ville => (
                        <SelectItem key={ville} value={ville}>{ville}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commune">Commune</Label>
                  <Select 
                    value={formData.commune}
                    onValueChange={(value) => handleInputChange('commune', value)}
                    disabled={!formData.ville || availableCommunes.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !formData.ville 
                        ? "Sélectionner d'abord une ville" 
                        : availableCommunes.length === 0 
                        ? "Aucune commune disponible"
                        : "Sélectionner la commune"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCommunes.map(commune => (
                        <SelectItem key={commune} value={commune}>{commune}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quartier">Quartier</Label>
                  <Select 
                    value={formData.quartier}
                    onValueChange={(value) => handleInputChange('quartier', value)}
                    disabled={!formData.commune || availableQuartiers.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !formData.commune 
                        ? "Sélectionner d'abord une commune" 
                        : availableQuartiers.length === 0 
                        ? "Aucun quartier disponible - saisie manuelle possible"
                        : "Sélectionner le quartier"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableQuartiers.map(quartier => (
                        <SelectItem key={quartier} value={quartier}>{quartier}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableQuartiers.length === 0 && formData.commune && (
                    <div className="space-y-2 mt-2">
                      <Input
                        placeholder="Saisir le nom du quartier"
                        value={formData.quartier || ''}
                        onChange={(e) => handleInputChange('quartier', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Aucun quartier prédéfini - saisie manuelle</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avenue">Avenue</Label>
                  <Input
                    id="avenue"
                    placeholder="Saisir le nom de l'avenue"
                    value={formData.avenue || ''}
                    onChange={(e) => handleInputChange('avenue', e.target.value)}
                    disabled={!formData.quartier}
                  />
                  <p className="text-xs text-muted-foreground">
                    {!formData.quartier ? "Sélectionner d'abord un quartier" : "Saisie manuelle"}
                  </p>
                </div>
              </div>
            )}

            {/* Section Rurale (SR) - visible uniquement si type rural sélectionné */}
            {sectionType === 'rurale' && (
              <div className="space-y-3 pt-4 border-t">
                <h4 className="text-sm font-semibold text-muted-foreground">Section rurale (SR)</h4>
                <p className="text-xs text-muted-foreground">
                  Remplissez ces champs pour les zones rurales (numéro SR).
                </p>
                
                <div className="space-y-2">
                  <Label htmlFor="territoire">Territoire</Label>
                  <Select 
                    value={formData.territoire}
                    onValueChange={(value) => handleInputChange('territoire', value)}
                    disabled={!formData.province || availableTerritoires.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !formData.province 
                        ? "Sélectionner d'abord une province" 
                        : availableTerritoires.length === 0 
                        ? "Aucun territoire disponible"
                        : "Sélectionner le territoire"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTerritoires.map(territoire => (
                        <SelectItem key={territoire} value={territoire}>{territoire}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="collectivite">Collectivité</Label>
                  <Select 
                    value={formData.collectivite}
                    onValueChange={(value) => handleInputChange('collectivite', value)}
                    disabled={!formData.territoire || availableCollectivites.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !formData.territoire 
                        ? "Sélectionner d'abord un territoire" 
                        : availableCollectivites.length === 0 
                        ? "Aucune collectivité disponible"
                        : "Sélectionner la collectivité"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCollectivites.map(collectivite => (
                        <SelectItem key={collectivite} value={collectivite}>{collectivite}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="groupement">Groupement</Label>
                  <Input
                    id="groupement"
                    placeholder="ex: Katoyi"
                    value={formData.groupement || ''}
                    onChange={(e) => handleInputChange('groupement', e.target.value)}
                    disabled={!formData.collectivite}
                  />
                  <p className="text-xs text-muted-foreground">
                    {!formData.collectivite ? "Sélectionner d'abord une collectivité" : "Saisie manuelle - optionnel"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="village">Village</Label>
                  <Input
                    id="village"
                    placeholder="ex: Mushaki"
                    value={formData.village || ''}
                    onChange={(e) => handleInputChange('village', e.target.value)}
                    disabled={!formData.collectivite}
                  />
                  <p className="text-xs text-muted-foreground">
                    {!formData.collectivite ? "Sélectionner d'abord une collectivité" : "Saisie manuelle - optionnel"}
                  </p>
                </div>
              </div>
            )}

            {/* Dimensions de la parcelle et calcul de la superficie */}
            {sectionType && (
              <div className="space-y-2 pt-4 border-t">
                <div 
                  className={`space-y-4 p-4 rounded-xl bg-gradient-to-br from-muted/50 to-transparent border transition-all duration-500 ${
                    highlightSuperficie 
                      ? 'border-amber-500 shadow-lg shadow-amber-500/20 ring-2 ring-amber-500/30' 
                      : 'border-border/50'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Dimensions de chaque côté (en mètres)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-primary/10">
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 text-sm">
                          <h4 className="font-semibold mb-2">Dimensions de la parcelle</h4>
                          <p className="text-muted-foreground">
                            Indiquez la longueur en mètres de chaque côté de votre parcelle. Ces mesures permettent de calculer automatiquement la superficie cadastrale.
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Les dimensions doivent être mesurées sur le terrain ou extraites de documents cadastraux officiels pour garantir leur précision.
                          </p>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ajoutez les dimensions de chaque côté de la parcelle
                    </p>
                  </div>

                  <div className="space-y-2">
                    {parcelSides.map((side, index) => (
                      <div key={index} className="flex items-center gap-1.5 md:gap-2 animate-fade-in">
                        <Input
                          placeholder="Nom du côté"
                          value={side.name}
                          onChange={(e) => updateParcelSide(index, 'name', e.target.value)}
                          className="flex-1 transition-all focus:scale-[1.01] h-9 text-sm"
                        />
                        <Input
                          type="number"
                          placeholder="Longueur"
                          value={side.length}
                          onChange={(e) => updateParcelSide(index, 'length', e.target.value)}
                          className="w-20 md:w-32 transition-all focus:scale-[1.01] h-9 text-sm"
                        />
                        <span className="text-xs text-muted-foreground w-4 md:w-6">m</span>
                        {parcelSides.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeParcelSide(index)}
                            className="hover:bg-destructive/10 transition-all hover:scale-105 h-9 w-9 p-0 animate-fade-in"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addParcelSide}
                    className="w-full hover:bg-primary/5 transition-all hover:scale-[1.02] animate-fade-in h-9"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un côté
                  </Button>

                  {formData.areaSqm && (
                    <>
                      <div className={`p-2.5 md:p-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-lg md:rounded-xl border border-primary/20 animate-scale-in ${
                        shouldBlinkSuperficie ? 'blink-red' : ''
                      }`}>
                        <div className="flex items-center justify-between gap-3 md:block">
                          <div className="flex-1 md:mb-1">
                            <p className="text-xs md:text-sm font-medium text-muted-foreground mb-0.5 md:mb-1">
                              Superficie calculée
                            </p>
                            <p className="text-xl md:text-3xl font-bold text-primary">{formData.areaSqm} m²</p>
                          </div>
                          <p className="text-[10px] md:text-xs text-muted-foreground bg-background/50 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md whitespace-nowrap md:inline-block md:mt-2">
                            {parcelSides.length === 2 && "Calcul rectangulaire simple"}
                            {parcelSides.length === 4 && "Calcul rectangulaire (4 côtés)"}
                            {parcelSides.length > 4 && "Approximation basée sur les dimensions"}
                          </p>
                        </div>
                      </div>

                      {/* Notification d'erreur de validation superficie */}
                      {showAreaMismatchWarning && (
                        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 animate-fade-in">
                          <div className="flex items-start gap-3">
                            <Info className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-destructive mb-1">
                                Incohérence détectée
                              </p>
                              <p className="text-xs text-destructive/90 leading-relaxed">
                                {areaMismatchMessage}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
            
            {/* Coordonnées GPS des bornes */}
            {sectionType && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-semibold">Coordonnées GPS des bornes (optionnel)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 rounded-full hover:bg-primary/10"
                      >
                        <Info className="h-4 w-4 text-primary" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="start">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-sm mb-2 text-foreground">
                            Comment ajouter les coordonnées GPS ?
                          </h4>
                          <p className="text-xs text-muted-foreground mb-3">
                            Choisissez entre le mode automatique (détection GPS) ou le mode manuel (saisie des coordonnées).
                          </p>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ajoutez les coordonnées GPS de chaque borne du terrain
                </p>
                {(() => {
                  const filledSides = parcelSides.filter(s => s.length && parseFloat(s.length) > 0);
                  const isSuperficieCompleted = filledSides.length >= 3;
                  
                  if (!isSuperficieCompleted) {
                    return (
                      <p className="text-xs text-amber-600 dark:text-amber-500 mt-2 flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Complétez d'abord le bloc "Dimensions de chaque côté" (au moins 3 côtés)
                      </p>
                    );
                  }
                  
                  return null;
                })()}

                <div className="grid grid-cols-2 md:grid-cols-1 gap-1.5 md:gap-3">
                  {gpsCoordinates.map((coord, index) => (
                    <div key={index} className="border rounded-md md:rounded-lg p-1.5 md:p-3 space-y-1.5 md:space-y-3 bg-gradient-to-br from-muted/20 to-transparent animate-fade-in">
                      {/* Header compact */}
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[10px] md:text-xs font-medium text-muted-foreground">Borne {index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeGPSCoordinate(index)}
                          className="text-destructive hover:bg-destructive/10 h-6 w-6 md:h-8 md:w-8 p-0 flex-shrink-0"
                        >
                          <Trash2 className="h-3 md:h-4 w-3 md:w-4" />
                        </Button>
                      </div>

                      {/* Boutons mode compact */}
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant={coord.mode === 'auto' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateGPSCoordinate(index, 'mode', 'auto')}
                          className="flex-1 h-7 md:h-9 text-[10px] md:text-xs px-1.5 md:px-3"
                        >
                          Automatique
                        </Button>
                        <Button
                          type="button"
                          variant={coord.mode === 'manual' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateGPSCoordinate(index, 'mode', 'manual')}
                          className="flex-1 h-7 md:h-9 text-[10px] md:text-xs px-1.5 md:px-3"
                        >
                          Manuel
                        </Button>
                      </div>

                      {/* Mode automatique */}
                      {coord.mode === 'auto' && (
                        <div className="space-y-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => captureCurrentLocation(index)}
                            disabled={coord.detecting}
                            className="w-full h-7 md:h-9 text-[10px] md:text-xs"
                          >
                            <MdLocationOn className="h-3 md:h-4 w-3 md:w-4 mr-1 flex-shrink-0" />
                            {coord.detecting ? 'Détection...' : 'Détecter'}
                          </Button>
                          
                          {coord.detected && coord.lat && coord.lng && (
                            <div className="text-[10px] md:text-xs p-1.5 md:p-2 bg-muted/50 rounded space-y-0.5">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="font-medium">Lat:</span>
                                <span className="truncate">{parseFloat(coord.lat).toFixed(6)}</span>
                              </div>
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="font-medium">Lng:</span>
                                <span className="truncate">{parseFloat(coord.lng).toFixed(6)}</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  updateGPSCoordinate(index, 'lat', '');
                                  updateGPSCoordinate(index, 'lng', '');
                                  updateGPSCoordinate(index, 'detected', false);
                                }}
                                className="w-full mt-1 h-6 md:h-7 text-[9px] md:text-xs"
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Réinit.
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Mode manuel */}
                      {coord.mode === 'manual' && (
                        <div className="space-y-1.5">
                          <div className="space-y-1.5">
                            <Label htmlFor={`lat-${index}`} className="text-[10px] md:text-xs">
                              Latitude
                            </Label>
                            <Input
                              id={`lat-${index}`}
                              type="number"
                              step="0.000001"
                              placeholder="Ex: -1.234567"
                              value={coord.lat}
                              onChange={(e) => updateGPSCoordinate(index, 'lat', e.target.value)}
                              className="h-7 md:h-9 text-[10px] md:text-sm px-1.5 md:px-2"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`lng-${index}`} className="text-[10px] md:text-xs">
                              Longitude
                            </Label>
                            <Input
                              id={`lng-${index}`}
                              type="number"
                              step="0.000001"
                              placeholder="Ex: 29.123456"
                              value={coord.lng}
                              onChange={(e) => updateGPSCoordinate(index, 'lng', e.target.value)}
                              className="h-7 md:h-9 text-[10px] md:text-sm px-1.5 md:px-2"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                  
                {/* Bouton Ajouter */}
                <div className="space-y-2">
                  {showGPSWarning && (
                    <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 animate-fade-in">
                      <div className="flex items-start gap-2">
                        <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                            Limite de coordonnées GPS atteinte
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                            Vous avez atteint la limite de {parcelSides.filter(s => s.length && parseFloat(s.length) > 0).length} borne(s). Ajoutez un nouveau côté dans "Dimensions de chaque côté" pour ajouter plus de bornes.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const filledSides = parcelSides.filter(s => s.length && parseFloat(s.length) > 0);
                      const isSuperficieCompleted = filledSides.length >= 3;
                      const canAddMore = gpsCoordinates.length < filledSides.length;
                      
                      if (isSuperficieCompleted && !canAddMore) {
                        setShowGPSWarning(true);
                        setHighlightSuperficie(true);
                        setTimeout(() => setShowGPSWarning(false), 5000);
                        setTimeout(() => setHighlightSuperficie(false), 3000);
                        return;
                      }
                      
                      addGPSCoordinate();
                    }}
                    disabled={(() => {
                      const filledSides = parcelSides.filter(s => s.length && parseFloat(s.length) > 0);
                      return filledSides.length < 3;
                    })()}
                    className="w-full gap-2 hover:bg-primary/5 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter une borne
                  </Button>
                </div>
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

          <TabsContent value="history" className="space-y-6 mt-6 animate-fade-in">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-semibold">Historique de propriété (optionnel)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-primary/10">
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 text-sm">
                      <h4 className="font-semibold mb-2">Historique de propriété</h4>
                      <p className="text-muted-foreground mb-3">
                        Cette section vous permet de documenter tous les anciens propriétaires de la parcelle dont vous avez connaissance.
                      </p>
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <p><strong>Pourquoi c'est important :</strong></p>
                        <ul className="space-y-1 ml-4">
                          <li>• Établit la chaîne de propriété complète</li>
                          <li>• Facilite la vérification des droits de propriété</li>
                          <li>• Aide à résoudre d'éventuels conflits</li>
                          <li>• Enrichit les données cadastrales</li>
                        </ul>
                        <p className="mt-3"><strong>Logique chronologique :</strong></p>
                        <ul className="space-y-1 ml-4">
                          <li>• Le premier ancien propriétaire doit avoir une date de fin correspondant à la date à laquelle le propriétaire actuel a acquis le bien (renseignée dans l'onglet "Informations Générales")</li>
                          <li>• Les propriétaires suivants doivent être ordonnés chronologiquement du plus récent au plus ancien</li>
                          <li>• Les dates ne doivent pas se chevaucher</li>
                        </ul>
                        <p className="mt-3"><strong>Comment remplir :</strong></p>
                        <ul className="space-y-1 ml-4">
                          <li>• Ajoutez autant d'anciens propriétaires que vous connaissez</li>
                          <li>• Les dates doivent être cohérentes et chronologiques</li>
                          <li>• Indiquez le type de mutation (vente, succession, etc.)</li>
                          <li>• Laissez vide si vous n'avez pas d'informations</li>
                        </ul>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-6">
                {previousOwners.map((owner, index) => (
                    <div key={index} className="border rounded-xl p-5 space-y-4 relative bg-gradient-to-br from-muted/30 to-transparent hover:shadow-md transition-all animate-fade-in">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold bg-primary/10 px-3 py-1 rounded-full">Ancien.ne propriétaire #{index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (index === 0) {
                              toast({
                                title: "Suppression impossible",
                                description: "Le premier bloc de l'historique ne peut pas être supprimé. Vous pouvez le laisser vide si vous n'avez pas d'informations.",
                                variant: "destructive"
                              });
                              return;
                            }
                            removePreviousOwner(index);
                          }}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                       <div className="space-y-2">
                        <Label>Nom de l'ancien propriétaire</Label>
                        <InputWithPopover
                          placeholder="ex: Jean Mukendi"
                          value={owner.name}
                          onChange={(e) => updatePreviousOwner(index, 'name', e.target.value)}
                          helpTitle="Ancien propriétaire"
                          helpText="Indiquez le nom complet de l'ancien propriétaire tel qu'il figurait sur les documents officiels. Cette information aide à retracer l'historique de la propriété."
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label>Statut juridique</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-primary/10">
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 text-sm">
                              <h4 className="font-semibold mb-2">Statut juridique du propriétaire</h4>
                              <p className="text-muted-foreground">
                                Définit la nature légale du propriétaire pour établir ses droits et obligations.
                              </p>
                              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                                <li>• <strong>Personne physique</strong>: Individu (citoyen)</li>
                                <li>• <strong>Personne morale</strong>: Société, association</li>
                                <li>• <strong>État</strong>: Propriété publique</li>
                              </ul>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <Select
                          value={owner.legalStatus}
                          onValueChange={(value) => updatePreviousOwner(index, 'legalStatus', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner le statut" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Personne physique">Personne physique</SelectItem>
                            <SelectItem value="Personne morale">Personne morale</SelectItem>
                            <SelectItem value="État">État</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Date début (propriétaire depuis)</Label>
                          <Input
                            type="date"
                            max={owner.endDate || (index === 0 ? currentOwners[0]?.since : previousOwners[index - 1]?.startDate) || new Date().toISOString().split('T')[0]}
                            value={owner.startDate}
                            onChange={(e) => updatePreviousOwner(index, 'startDate', e.target.value)}
                          />
                          {owner.startDate && owner.endDate && owner.startDate > owner.endDate && (
                            <p className="text-xs text-destructive">La date de début doit être avant la date de fin</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Date fin (propriétaire jusqu'au)</Label>
                          <Input
                            type="date"
                            min={owner.startDate || undefined}
                            max={index === 0 ? (currentOwners[0]?.since || new Date().toISOString().split('T')[0]) : (previousOwners[index - 1]?.startDate || new Date().toISOString().split('T')[0])}
                            value={owner.endDate}
                            onChange={(e) => updatePreviousOwner(index, 'endDate', e.target.value)}
                            disabled={true}
                            className="cursor-not-allowed opacity-70"
                            onClick={() => {
                              toast({
                                title: "Champ verrouillé",
                                description: "Cette date est automatiquement remplie à partir de la date de début du propriétaire suivant dans la chronologie. Pour la modifier, changez la date de début du propriétaire suivant.",
                                variant: "default",
                              });
                            }}
                          />
                          {index === 0 && currentOwners[0]?.since && (
                            <p className="text-xs text-muted-foreground">
                              💡 Cette date devrait correspondre au {new Date(currentOwners[0].since).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} (date d'acquisition du propriétaire actuel)
                            </p>
                          )}
                          {index > 0 && previousOwners[index - 1]?.startDate && (
                            <p className="text-xs text-muted-foreground">
                              💡 Cette date devrait correspondre au {new Date(previousOwners[index - 1].startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} (date d'acquisition de l'Ancien.ne propriétaire #{index})
                            </p>
                          )}
                          {index === 0 && owner.endDate && currentOwners[0]?.since && owner.endDate > currentOwners[0].since && (
                            <p className="text-xs text-destructive">❌ La date de fin ne peut pas être après la date d'acquisition du propriétaire actuel ({new Date(currentOwners[0].since).toLocaleDateString('fr-FR')})</p>
                          )}
                          {index > 0 && owner.endDate && previousOwners[index - 1]?.startDate && owner.endDate > previousOwners[index - 1].startDate && (
                            <p className="text-xs text-destructive">❌ La date de fin ne peut pas être après la date d'acquisition de l'Ancien.ne propriétaire #{index} ({new Date(previousOwners[index - 1].startDate).toLocaleDateString('fr-FR')})</p>
                          )}
                          {index === 0 && owner.endDate && currentOwners[0]?.since && owner.endDate !== currentOwners[0].since && (
                            <p className="text-xs text-amber-600">⚠️ La date de fin devrait être exactement le {new Date(currentOwners[0].since).toLocaleDateString('fr-FR')} pour assurer la continuité chronologique</p>
                          )}
                          {index > 0 && owner.endDate && previousOwners[index - 1]?.startDate && owner.endDate !== previousOwners[index - 1].startDate && (
                            <p className="text-xs text-amber-600">⚠️ La date de fin devrait être exactement le {new Date(previousOwners[index - 1].startDate).toLocaleDateString('fr-FR')} pour assurer la continuité chronologique</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label>Type de mutation</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-primary/10">
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 text-sm">
                              <h4 className="font-semibold mb-2">Type de mutation</h4>
                              <p className="text-muted-foreground">
                                Indique le mode de transfert de propriété entre l'ancien et le nouveau propriétaire. Cette information est importante pour l'historique juridique de la parcelle.
                              </p>
                              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                                <li>• <strong>Vente</strong>: Transaction commerciale</li>
                                <li>• <strong>Donation</strong>: Transfert gratuit</li>
                                <li>• <strong>Succession</strong>: Héritage</li>
                                <li>• <strong>Expropriation</strong>: Acquisition forcée</li>
                              </ul>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <Select
                          value={owner.mutationType}
                          onValueChange={(value) => updatePreviousOwner(index, 'mutationType', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner le type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Vente">Vente</SelectItem>
                            <SelectItem value="Donation">Donation</SelectItem>
                            <SelectItem value="Succession">Succession</SelectItem>
                            <SelectItem value="Expropriation">Expropriation</SelectItem>
                            <SelectItem value="Échange">Échange</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                  </div>
                ))}
              </div>
              
              {/* Bouton Ajouter déplacé en dessous des blocs */}
              <div className="space-y-2">
                {/* Notification pour propriétaire actuel manquant */}
                {showCurrentOwnerRequiredWarning && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 animate-fade-in">
                    <div className="flex items-start gap-2">
                      <Info className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-destructive">
                          Ajoutez d'abord le(s) propriétaire(s) actuel(s)
                        </p>
                        <p className="text-xs text-destructive/80 mt-1">
                          Pour ajouter un ancien propriétaire, vous devez d'abord renseigner au moins un propriétaire actuel dans l'onglet "Informations Générales" (section Propriétaire).
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Notification d'avertissement */}
                {showPreviousOwnerWarning && (
                  <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 animate-fade-in">
                    <div className="flex items-start gap-2">
                      <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                          Complétez d'abord l'ancien propriétaire précédent
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                          Veuillez renseigner le nom, le statut juridique et le type de mutation de l'ancien propriétaire avant d'en ajouter un nouveau.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPreviousOwner}
                  className="gap-2 hover:bg-primary/5 transition-all hover:scale-[1.02] shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter un ancien propriétaire
                </Button>
              </div>
            </div>
            
            {/* Bouton Suivant */}
            <div className="flex justify-end pt-6 mt-6 border-t">
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

          <TabsContent value="obligations" className="space-y-6 mt-6 animate-fade-in">
            {/* Switch Taxes/Hypothèques redesigné */}
            <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-fit shadow-inner">
              <Button
                type="button"
                variant={obligationType === 'taxes' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setObligationType('taxes')}
                className="transition-all hover:scale-105 shadow-sm"
              >
                Taxes
              </Button>
              <Button
                type="button"
                variant={obligationType === 'mortgages' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setObligationType('mortgages')}
                className="transition-all hover:scale-105 shadow-sm"
              >
                Hypothèques
              </Button>
            </div>

            {/* Section Taxes */}
            {obligationType === 'taxes' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-semibold">Historique des taxes (optionnel)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-primary/10">
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 text-sm">
                        <h4 className="font-semibold mb-2">Historique des taxes</h4>
                        <p className="text-muted-foreground mb-3">
                          Documentez toutes les taxes foncières payées sur cette parcelle. Un historique fiscal complet démontre la conformité du bien.
                        </p>
                        <div className="space-y-2 text-xs text-muted-foreground">
                          <p><strong>Pourquoi c'est important :</strong></p>
                          <ul className="space-y-1 ml-4">
                            <li>• Prouve la conformité fiscale du bien</li>
                            <li>• Valorise la propriété lors d'une vente</li>
                            <li>• Évite les contentieux fiscaux</li>
                            <li>• Facilite les démarches administratives</li>
                          </ul>
                          <p className="mt-3"><strong>Comment remplir :</strong></p>
                          <ul className="space-y-1 ml-4">
                            <li>• Ajoutez autant de taxes que vous avez payées</li>
                            <li>• Joignez les reçus de paiement si possible</li>
                            <li>• Indiquez le montant exact et l'année fiscale</li>
                            <li>• Laissez vide si vous n'avez pas d'informations</li>
                          </ul>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-6">
                  {taxRecords.map((tax, index) => (
                      <div key={index} className={`border rounded-xl p-5 space-y-4 relative bg-gradient-to-br from-muted/30 to-transparent hover:shadow-md transition-all animate-fade-in ${index === 0 && highlightIncompleteTax ? 'ring-2 ring-amber-500 animate-pulse' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold bg-primary/10 px-3 py-1 rounded-full">Taxe #{index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (index === 0) {
                                toast({
                                  title: "Suppression impossible",
                                  description: "Le premier bloc de taxe ne peut pas être supprimé. Vous pouvez le laisser vide si vous n'avez pas d'informations.",
                                  variant: "destructive"
                                });
                                return;
                              }
                              removeTaxRecord(index);
                            }}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label>Type de taxe</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-primary/10">
                                  <Info className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 text-sm">
                                <h4 className="font-semibold mb-2">Type de taxe foncière</h4>
                                <p className="text-muted-foreground">
                                  Les taxes foncières sont des impôts périodiques dus par les propriétaires. Le paiement régulier démontre la conformité fiscale du bien.
                                </p>
                                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                                  <li>• <strong>Impôt foncier annuel</strong>: Taxe principale</li>
                                  <li>• <strong>Taxe de superficie</strong>: Basée sur la taille</li>
                                  <li>• <strong>Revenus locatifs</strong>: Si location</li>
                                </ul>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <Select
                            value={tax.taxType}
                            onValueChange={(value) => updateTaxRecord(index, 'taxType', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner le type de taxe" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Impôt foncier annuel">Impôt foncier annuel</SelectItem>
                              <SelectItem value="Impôt sur les revenus locatifs">Impôt sur les revenus locatifs</SelectItem>
                              <SelectItem value="Taxe de superficie">Taxe de superficie</SelectItem>
                              <SelectItem value="Taxe de plus-value immobilière">Taxe de plus-value immobilière</SelectItem>
                              <SelectItem value="Taxe d'habitation">Taxe d'habitation</SelectItem>
                              <SelectItem value="Autre taxe">Autre taxe</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Année fiscale</Label>
                          <Select
                            value={tax.taxYear}
                            onValueChange={(value) => updateTaxRecord(index, 'taxYear', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner l'année" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 10 }, (_, i) => {
                                const year = new Date().getFullYear() - i;
                                return <SelectItem key={year} value={year.toString()}>{year}</SelectItem>;
                              })}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">Années fiscales valides uniquement</p>
                        </div>

                        <div className="space-y-2">
                          <Label>Montant payé (USD)</Label>
                          <InputWithPopover
                            type="number"
                            placeholder="ex: 150"
                            value={tax.taxAmount}
                            onChange={(e) => updateTaxRecord(index, 'taxAmount', e.target.value)}
                            helpTitle="Montant de la taxe"
                            helpText="Indiquez le montant total payé pour cette taxe en dollars américains. Ce montant devrait correspondre à celui indiqué sur votre reçu de paiement officiel."
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label>Statut de paiement</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-primary/10">
                                  <Info className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 text-sm">
                                <h4 className="font-semibold mb-2">Statut de paiement</h4>
                                <p className="text-muted-foreground">
                                  Indique si la taxe a été acquittée. Un historique de paiement régulier améliore la valeur et la crédibilité du bien.
                                </p>
                                <p className="mt-2 text-xs text-muted-foreground">
                                  Conservez toujours vos reçus de paiement comme preuve de conformité fiscale.
                                </p>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <Select
                            value={tax.paymentStatus}
                            onValueChange={(value) => updateTaxRecord(index, 'paymentStatus', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner le statut" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Payé">Payé</SelectItem>
                              <SelectItem value="Payé partiellement">Payé partiellement</SelectItem>
                              <SelectItem value="En attente">En attente</SelectItem>
                              <SelectItem value="En retard">En retard</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Date de paiement</Label>
                          <InputWithPopover
                            type="date"
                            max={new Date().toISOString().split('T')[0]}
                            value={tax.paymentDate}
                            onChange={(e) => updateTaxRecord(index, 'paymentDate', e.target.value)}
                            helpTitle="Date de paiement"
                            helpText="Indiquez la date exacte à laquelle vous avez effectué le paiement de cette taxe. Cette date doit correspondre à celle figurant sur votre reçu officiel."
                          />
                          <p className="text-xs text-muted-foreground">Ne peut pas être dans le futur</p>
                        </div>

                        {/* Pièce jointe pour la taxe */}
                        <div className="space-y-2 pt-2 border-t">
                          <Label>Pièce justificative (optionnel)</Label>
                          {!tax.receiptFile ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                                onChange={(e) => handleTaxFileChange(index, e)}
                                className="cursor-pointer"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                              <MdInsertDriveFile className="h-4 w-4 text-primary" />
                              <span className="text-sm flex-1 truncate">{tax.receiptFile.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeTaxFile(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Reçu de paiement (JPG, PNG, WEBP ou PDF - Max 5 MB)
                          </p>
                        </div>
                    </div>
                  ))}
                </div>
                
                {/* Bouton Ajouter déplacé en dessous des blocs */}
                <div className="space-y-2">
                  {/* Notification d'avertissement */}
                  {showTaxWarning && (
                    <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 animate-fade-in">
                      <div className="flex items-start gap-2">
                        <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                            Complétez d'abord la première taxe
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                            Veuillez renseigner tous les champs obligatoires (type, année, montant, statut et date de paiement) avant d'ajouter une nouvelle taxe.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTaxRecord}
                    className="gap-2 hover:bg-primary/5 transition-all hover:scale-[1.02] shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter une taxe
                  </Button>
                </div>
              </div>
            )}

            {/* Section Hypothèques */}
            {obligationType === 'mortgages' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-semibold">Hypothèque (optionnel)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-primary/10">
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 text-sm">
                        <h4 className="font-semibold mb-2">Hypothèques</h4>
                        <p className="text-muted-foreground mb-3">
                          Déclarez toutes les hypothèques grevant cette parcelle. Cette information est essentielle pour établir la situation juridique complète du bien.
                        </p>
                        <div className="space-y-2 text-xs text-muted-foreground">
                          <p><strong>Pourquoi c'est important :</strong></p>
                          <ul className="space-y-1 ml-4">
                            <li>• Établit les charges financières sur le bien</li>
                            <li>• Informe les acheteurs potentiels</li>
                            <li>• Évite les surprises juridiques</li>
                            <li>• Facilite l'obtention de nouveaux crédits</li>
                          </ul>
                          <p className="mt-3"><strong>Comment remplir :</strong></p>
                          <ul className="space-y-1 ml-4">
                            <li>• Listez toutes les hypothèques actives</li>
                            <li>• Indiquez le montant exact et la durée</li>
                            <li>• Précisez le créancier et le statut</li>
                            <li>• Laissez vide si aucune hypothèque</li>
                          </ul>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-6">
                  {mortgageRecords.map((mortgage, index) => (
                      <div key={index} className={`border rounded-xl p-5 space-y-4 relative bg-gradient-to-br from-muted/30 to-transparent hover:shadow-md transition-all animate-fade-in ${index === 0 && highlightIncompleteMortgage ? 'ring-2 ring-amber-500 animate-pulse' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold bg-primary/10 px-3 py-1 rounded-full">Hypothèque #{index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (index === 0) {
                                toast({
                                  title: "Suppression impossible",
                                  description: "Le premier bloc d'hypothèque ne peut pas être supprimé. Vous pouvez le laisser vide si vous n'avez pas d'informations.",
                                  variant: "destructive"
                                });
                                return;
                              }
                              removeMortgageRecord(index);
                            }}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <Label>Montant de l'hypothèque (USD)</Label>
                          <InputWithPopover
                            type="number"
                            placeholder="ex: 50000"
                            value={mortgage.mortgageAmount}
                            onChange={(e) => updateMortgageRecord(index, 'mortgageAmount', e.target.value)}
                            helpTitle="Montant de l'hypothèque"
                            helpText="Indiquez le montant total de l'hypothèque en dollars américains. Il s'agit du capital emprunté garanti par la parcelle, tel qu'indiqué dans le contrat d'hypothèque."
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Durée (mois)</Label>
                          <InputWithPopover
                            type="number"
                            placeholder="ex: 120"
                            value={mortgage.duration}
                            onChange={(e) => updateMortgageRecord(index, 'duration', e.target.value)}
                            helpTitle="Durée de l'hypothèque"
                            helpText="Indiquez la durée totale de l'hypothèque en mois. Par exemple, pour un prêt de 10 ans, saisissez 120 mois. Cette information figure dans votre contrat d'hypothèque."
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Nom du créancier</Label>
                          <InputWithPopover
                            placeholder="ex: Banque XYZ"
                            value={mortgage.creditorName}
                            onChange={(e) => updateMortgageRecord(index, 'creditorName', e.target.value)}
                            helpTitle="Créancier"
                            helpText="Indiquez le nom complet de l'institution financière ou de la personne qui a accordé l'hypothèque. Ce nom doit correspondre exactement à celui figurant sur le contrat d'hypothèque."
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label>Type de créancier</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-primary/10">
                                  <Info className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 text-sm">
                                <h4 className="font-semibold mb-2">Type de créancier</h4>
                                <p className="text-muted-foreground">
                                  Précise la nature de l'institution ou de la personne ayant accordé le prêt hypothécaire. Cette information aide à identifier le type d'engagement financier.
                                </p>
                                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                                  <li>• <strong>Banque</strong>: Institution bancaire classique</li>
                                  <li>• <strong>Microfinance</strong>: Institution de microfinance</li>
                                  <li>• <strong>Particulier</strong>: Prêt entre particuliers</li>
                                </ul>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <Select
                            value={mortgage.creditorType}
                            onValueChange={(value) => updateMortgageRecord(index, 'creditorType', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner le type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Banque">Banque</SelectItem>
                              <SelectItem value="Microfinance">Microfinance</SelectItem>
                              <SelectItem value="Coopérative">Coopérative</SelectItem>
                              <SelectItem value="Particulier">Particulier</SelectItem>
                              <SelectItem value="Autre institution">Autre institution</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Date du contrat</Label>
                          <InputWithPopover
                            type="date"
                            max={new Date().toISOString().split('T')[0]}
                            value={mortgage.contractDate}
                            onChange={(e) => updateMortgageRecord(index, 'contractDate', e.target.value)}
                            helpTitle="Date du contrat"
                            helpText="Indiquez la date de signature du contrat d'hypothèque. Cette date marque le début de l'engagement hypothécaire sur la parcelle."
                          />
                          <p className="text-xs text-muted-foreground">Ne peut pas être dans le futur</p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label>Statut de l'hypothèque</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-primary/10">
                                  <Info className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 text-sm">
                                <h4 className="font-semibold mb-2">Statut de l'hypothèque</h4>
                                <p className="text-muted-foreground">
                                  Indique l'état actuel de l'hypothèque. Un bien avec hypothèque active a une charge financière qui peut affecter sa transaction.
                                </p>
                                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                                  <li>• <strong>Active</strong>: Hypothèque en cours de remboursement</li>
                                  <li>• <strong>Remboursée</strong>: Hypothèque soldée</li>
                                  <li>• <strong>En défaut</strong>: Retard de paiement</li>
                                  <li>• <strong>Renégociée</strong>: Conditions modifiées</li>
                                </ul>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <Select
                            value={mortgage.mortgageStatus}
                            onValueChange={(value) => updateMortgageRecord(index, 'mortgageStatus', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner le statut" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Active">Active</SelectItem>
                              <SelectItem value="Remboursée">Remboursée</SelectItem>
                              <SelectItem value="En défaut">En défaut</SelectItem>
                              <SelectItem value="Renégociée">Renégociée</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Pièce jointe pour l'hypothèque */}
                        <div className="space-y-2 pt-2 border-t">
                          <Label>Pièce justificative (optionnel)</Label>
                          {!mortgage.receiptFile ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                                onChange={(e) => handleMortgageFileChange(index, e)}
                                className="cursor-pointer"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                              <MdInsertDriveFile className="h-4 w-4 text-primary" />
                              <span className="text-sm flex-1 truncate">{mortgage.receiptFile.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeMortgageFile(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Contrat ou justificatif (JPG, PNG, WEBP ou PDF - Max 5 MB)
                          </p>
                        </div>
                    </div>
                  ))}
                </div>
                
                {/* Bouton Ajouter déplacé en dessous des blocs */}
                <div className="space-y-2">
                  {/* Notification d'avertissement */}
                  {showMortgageWarning && (
                    <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 animate-fade-in">
                      <div className="flex items-start gap-2">
                        <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                            Complétez d'abord la première hypothèque
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                            Veuillez renseigner tous les champs obligatoires (montant, durée, nom du créancier, type, date du contrat et statut) avant d'ajouter une nouvelle hypothèque.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMortgageRecord}
                    className="gap-2 hover:bg-primary/5 transition-all hover:scale-[1.02] shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter une hypothèque
                  </Button>
                </div>
              </div>
            )}
            
            {/* Bouton Suivant */}
            <div className="flex justify-end pt-6 mt-6 border-t">
              <Button
                type="button"
                onClick={() => handleTabChange('review')}
                className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 transition-all hover:scale-105 shadow-lg hover:shadow-xl animate-fade-in text-white"
              >
                Réviser ma contribution
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          {/* Onglet Révision & Soumission */}
          <TabsContent value="review" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <div className="space-y-6 py-6">
              {/* En-tête avec estimation CCC */}
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-2xl p-4 sm:p-6 shadow-lg">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg flex-shrink-0">
                    <Info className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-2xl font-bold text-amber-900 dark:text-amber-100 mb-2">
                      Votre contribution CCC
                    </h3>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-2xl sm:text-4xl font-bold text-amber-600 dark:text-amber-400">
                        ${calculateCCCValue().value.toFixed(2)}
                      </span>
                      <span className="text-sm sm:text-lg text-amber-700 dark:text-amber-300">/ $5.00</span>
                    </div>
                    {calculateCCCValue().value < 5 && (
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-2 flex items-start gap-1">
                        <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>Complétez davantage de champs pour maximiser votre code CCC !</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Récapitulatif des sections */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Récapitulatif de votre contribution
                </h3>

                {/* Section Informations Générales */}
                <div className="border rounded-lg p-3 sm:p-4 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-sm">📋 Informations générales</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTabChange('general')}
                      className="text-xs h-7 px-2 sm:px-3"
                    >
                      Modifier
                    </Button>
                  </div>
                  <div className="space-y-2 text-xs sm:text-sm">
                    {formData.parcelNumber && (
                      <div><span className="font-medium">N° Parcelle:</span> {formData.parcelNumber}</div>
                    )}
                    {formData.propertyTitleType && (
                      <div><span className="font-medium">Type de titre:</span> {formData.propertyTitleType}</div>
                    )}
                    {formData.titleReferenceNumber && (
                      <div><span className="font-medium">N° référence titre:</span> {formData.titleReferenceNumber}</div>
                    )}
                    {currentOwners.some(o => o.lastName || o.firstName) && (
                      <div className="pt-2 border-t">
                        <div className="font-medium mb-1">Propriétaire(s) actuel(s):</div>
                        {currentOwners.filter(o => o.lastName || o.firstName).map((owner, idx) => (
                          <div key={idx} className="ml-3 text-xs">
                            • {owner.lastName} {owner.middleName} {owner.firstName}
                            {owner.legalStatus && ` (${owner.legalStatus})`}
                            {owner.since && ` - Depuis le ${new Date(owner.since).toLocaleDateString('fr-FR')}`}
                          </div>
                        ))}
                      </div>
                    )}
                    {formData.constructionType && (
                      <div className="pt-2 border-t"><span className="font-medium">Type de construction:</span> {formData.constructionType}</div>
                    )}
                    {formData.constructionNature && (
                      <div><span className="font-medium">Nature:</span> {formData.constructionNature}</div>
                    )}
                    {formData.declaredUsage && (
                      <div><span className="font-medium">Usage déclaré:</span> {formData.declaredUsage}</div>
                    )}
                    {buildingPermits.some(p => p.permitNumber) && (
                      <div className="pt-2 border-t">
                        <div className="font-medium mb-1">Permis de construire:</div>
                        {buildingPermits.filter(p => p.permitNumber).map((permit, idx) => (
                          <div key={idx} className="ml-3 text-xs">
                            • N° {permit.permitNumber} - {permit.permitType === 'construction' ? 'Construction' : 'Régularisation'}
                            {permit.issueDate && ` - Émis le ${new Date(permit.issueDate).toLocaleDateString('fr-FR')}`}
                            {permit.issuingService && ` par ${permit.issuingService}`}
                          </div>
                        ))}
                      </div>
                    )}
                    {(!formData.propertyTitleType && !formData.titleReferenceNumber && !currentOwners.some(o => o.lastName || o.firstName) && !formData.constructionType) && (
                      <div className="text-muted-foreground italic text-xs">Aucune information générale renseignée</div>
                    )}
                  </div>
                </div>

                {/* Section Localisation */}
                <div className="border rounded-lg p-3 sm:p-4 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-sm">📍 Localisation</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTabChange('location')}
                      className="text-xs h-7 px-2 sm:px-3"
                    >
                      Modifier
                    </Button>
                  </div>
                  <div className="space-y-2 text-xs sm:text-sm">
                    {formData.province && (
                      <div><span className="font-medium">Province:</span> {formData.province}</div>
                    )}
                    {sectionType && (
                      <div><span className="font-medium">Type de section:</span> {sectionType === 'urbaine' ? 'Section Urbaine (SU)' : 'Section Rurale (SR)'}</div>
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
                        {formData.groupement && <div><span className="font-medium">Groupement:</span> {formData.groupement}</div>}
                      </>
                    )}
                    {formData.areaSqm && (
                      <div className="pt-2 border-t"><span className="font-medium">Superficie totale:</span> {formData.areaSqm} m²</div>
                    )}
                    {parcelSides.some(s => s.length) && (
                      <div className="pt-2 border-t">
                        <div className="font-medium mb-1">Dimensions de la parcelle:</div>
                        {parcelSides.filter(s => s.length).map((side, idx) => (
                          <div key={idx} className="ml-3 text-xs">• {side.name}: {side.length} m</div>
                        ))}
                      </div>
                    )}
                    {gpsCoordinates.filter(g => g.lat && g.lng).length > 0 && (
                      <div className="pt-2 border-t">
                        <div className="font-medium mb-1">Coordonnées GPS ({gpsCoordinates.filter(g => g.lat && g.lng).length} borne{gpsCoordinates.filter(g => g.lat && g.lng).length > 1 ? 's' : ''}):</div>
                        {gpsCoordinates.filter(g => g.lat && g.lng).map((coord, idx) => (
                          <div key={idx} className="ml-3 text-xs">
                            • {coord.borne}: {coord.lat}, {coord.lng}
                          </div>
                        ))}
                      </div>
                    )}
                    {(!formData.province && !formData.areaSqm && !parcelSides.some(s => s.length) && !gpsCoordinates.some(g => g.lat && g.lng)) && (
                      <div className="text-muted-foreground italic text-xs">Aucune information de localisation renseignée</div>
                    )}
                  </div>
                </div>

                {/* Section Historique des propriétaires */}
                <div className="border rounded-lg p-3 sm:p-4 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-sm">📜 Historique des propriétaires</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTabChange('history')}
                      className="text-xs h-7 px-2 sm:px-3"
                    >
                      Modifier
                    </Button>
                  </div>
                  <div className="space-y-3 text-xs sm:text-sm">
                    {previousOwners.some(o => o.name) ? (
                      previousOwners.filter(o => o.name).map((owner, idx) => (
                        <div key={idx} className="border-l-2 border-primary/30 pl-3">
                          <div className="font-medium">Ancien propriétaire #{idx + 1}</div>
                          <div className="ml-2 space-y-1 text-xs">
                            <div>• Nom: {owner.name}</div>
                            {owner.legalStatus && <div>• Statut: {owner.legalStatus}</div>}
                            {owner.startDate && <div>• Période: du {new Date(owner.startDate).toLocaleDateString('fr-FR')}</div>}
                            {owner.endDate && <div>  au {new Date(owner.endDate).toLocaleDateString('fr-FR')}</div>}
                            {owner.mutationType && <div>• Type de mutation: {owner.mutationType}</div>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-muted-foreground italic text-xs">Aucun historique de propriétaire renseigné</div>
                    )}
                  </div>
                </div>

                {/* Section Obligations (Taxes et Hypothèques) */}
                <div className="border rounded-lg p-3 sm:p-4 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-sm">💼 Obligations (Taxes et Hypothèques)</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTabChange('obligations')}
                      className="text-xs h-7 px-2 sm:px-3"
                    >
                      Modifier
                    </Button>
                  </div>
                  <div className="space-y-3 text-xs sm:text-sm">
                    {taxRecords.some(t => t.taxAmount) ? (
                      <div>
                        <div className="font-medium mb-2">Taxes foncières:</div>
                        {taxRecords.filter(t => t.taxAmount).map((tax, idx) => (
                          <div key={idx} className="border-l-2 border-blue-300 pl-3 mb-2">
                            <div className="ml-2 space-y-1 text-xs">
                              <div>• Type: {tax.taxType}</div>
                              {tax.taxYear && <div>• Année: {tax.taxYear}</div>}
                              {tax.taxAmount && <div>• Montant: {tax.taxAmount} USD</div>}
                              {tax.paymentStatus && <div>• Statut: {tax.paymentStatus}</div>}
                              {tax.paymentDate && <div>• Date de paiement: {new Date(tax.paymentDate).toLocaleDateString('fr-FR')}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted-foreground italic text-xs">Aucune taxe foncière renseignée</div>
                    )}
                    {mortgageRecords.some(m => m.mortgageAmount) ? (
                      <div className={taxRecords.some(t => t.taxAmount) ? "pt-2 border-t" : ""}>
                        <div className="font-medium mb-2">Hypothèques:</div>
                        {mortgageRecords.filter(m => m.mortgageAmount).map((mortgage, idx) => (
                          <div key={idx} className="border-l-2 border-amber-300 pl-3 mb-2">
                            <div className="ml-2 space-y-1 text-xs">
                              {mortgage.mortgageAmount && <div>• Montant: {mortgage.mortgageAmount} USD</div>}
                              {mortgage.duration && <div>• Durée: {mortgage.duration} mois</div>}
                              {mortgage.creditorName && <div>• Créancier: {mortgage.creditorName}</div>}
                              {mortgage.creditorType && <div>• Type: {mortgage.creditorType}</div>}
                              {mortgage.contractDate && <div>• Date du contrat: {new Date(mortgage.contractDate).toLocaleDateString('fr-FR')}</div>}
                              {mortgage.mortgageStatus && <div>• Statut: {mortgage.mortgageStatus}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={taxRecords.some(t => t.taxAmount) ? "pt-2 border-t text-muted-foreground italic text-xs" : "text-muted-foreground italic text-xs"}>
                        Aucune hypothèque renseignée
                      </div>
                    )}
                  </div>
                </div>

                {/* Pièces jointes */}
                <div className="border rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3 bg-muted/30">
                  <h4 className="font-semibold text-xs sm:text-sm">Pièces jointes</h4>
                  <div className="grid grid-cols-1 gap-2 text-xs sm:text-sm">
                    <div className={ownerDocFile ? "text-foreground flex items-start gap-2" : "text-muted-foreground italic flex items-start gap-2"}>
                      {ownerDocFile ? <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /> : <span className="text-base">⭕</span>}
                      <span className="break-words">Pièce d'identité : {ownerDocFile ? ownerDocFile.name : "Non fournie"}</span>
                    </div>
                    <div className={titleDocFiles.length > 0 ? "text-foreground flex items-start gap-2" : "text-muted-foreground italic flex items-start gap-2"}>
                      {titleDocFiles.length > 0 ? <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /> : <span className="text-base">⭕</span>}
                      <span className="break-words">Titre de propriété : {titleDocFiles.length > 0 ? `${titleDocFiles.length} fichier(s)` : "Non fourni"}</span>
                    </div>
                    
                    {/* Pièces jointes des permis de construire */}
                    {buildingPermits.some(p => p.attachmentFile) && (
                      <div className="text-foreground flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div className="break-words">
                          <span className="font-medium">Permis de construire :</span>
                          <ul className="ml-2 mt-1 space-y-1">
                            {buildingPermits.map((permit, index) => 
                              permit.attachmentFile && (
                                <li key={index} className="text-muted-foreground">
                                  • {permit.attachmentFile.name}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      </div>
                    )}
                    
                    {/* Reçus de taxes */}
                    {taxRecords.some(t => t.receiptFile) && (
                      <div className="text-foreground flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div className="break-words">
                          <span className="font-medium">Reçus de taxes :</span>
                          <ul className="ml-2 mt-1 space-y-1">
                            {taxRecords.map((tax, index) => 
                              tax.receiptFile && (
                                <li key={index} className="text-muted-foreground">
                                  • {tax.receiptFile.name}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      </div>
                    )}
                    
                    {/* Documents d'hypothèques */}
                    {mortgageRecords.some(m => m.receiptFile) && (
                      <div className="text-foreground flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div className="break-words">
                          <span className="font-medium">Documents d'hypothèques :</span>
                          <ul className="ml-2 mt-1 space-y-1">
                            {mortgageRecords.map((mortgage, index) => 
                              mortgage.receiptFile && (
                                <li key={index} className="text-muted-foreground">
                                  • {mortgage.receiptFile.name}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Message de motivation */}
              {calculateCCCValue().value < 5 && (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 flex items-start gap-2">
                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Conseil :</strong> Pour maximiser votre code CCC (5$), complétez les sections manquantes ci-dessus. 
                      Plus vous fournissez d'informations précises, plus votre contribution est valorisée !
                    </span>
                  </p>
                </div>
              )}

              {/* Bouton de soumission */}
              {user ? (
                <div className="sticky bottom-0 left-0 right-0 mt-8 -mx-4 sm:-mx-6 -mb-6 bg-background/95 backdrop-blur-sm border-t p-4 sm:p-6 z-10">
                  <div className="max-w-2xl mx-auto">
                    <Button
                      type="button"
                      size="lg"
                      onClick={handleSubmit}
                      disabled={loading || uploading || !isFormValidForSubmission()}
                      className="w-full h-14 text-base font-semibold gap-2 shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary to-primary/80"
                    >
                      {loading || uploading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          {uploading ? "Téléchargement..." : "Envoi en cours..."}
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-5 w-5" />
                          Soumettre ma contribution
                        </>
                      )}
                    </Button>
                    {!isFormValidForSubmission() && (
                      <p className="text-xs text-center text-amber-600 dark:text-amber-400 mt-2">
                        Veuillez compléter les champs obligatoires : Type de titre de propriété, Propriétaire(s) actuel(s), et toutes les informations de localisation
                      </p>
                    )}
                    <p className="text-xs text-center text-muted-foreground mt-3">
                      En soumettant, vous acceptez que vos données soient vérifiées par notre équipe
                    </p>
                  </div>
                </div>
              ) : (
                <div className="sticky bottom-0 left-0 right-0 mt-8 -mx-4 sm:-mx-6 -mb-6 bg-background/95 backdrop-blur-sm border-t p-4 sm:p-6 z-10">
                  <div className="max-w-2xl mx-auto">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                      <div className="flex-1 text-center sm:text-left">
                        <p className="text-sm font-medium text-foreground mb-1">
                          Formulaire complété
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Connectez-vous pour soumettre et obtenir votre code CCC
                        </p>
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
                        className="w-full sm:w-auto px-6 sm:px-8 h-12 sm:h-14 text-base font-semibold gap-2 shadow-lg hover:shadow-xl transition-all"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="hidden sm:inline">Soumettre ma contribution</span>
                        <span className="sm:hidden">Soumettre</span>
                      </Button>
                    </div>
                    {!isFormValidForSubmission() && (
                      <p className="text-xs text-center text-amber-600 dark:text-amber-400 mt-2">
                        Veuillez compléter les champs obligatoires : Type de titre de propriété, Propriétaire(s) actuel(s), et toutes les informations de localisation
                      </p>
                    )}
                  </div>
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
    </>
  );
};

export default CadastralContributionDialog;
