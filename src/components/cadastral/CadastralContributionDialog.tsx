import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { useCadastralContribution, CadastralContributionData } from '@/hooks/useCadastralContribution';
import { Loader2, CheckCircle2, Upload, X, FileText, Plus, Trash2, MapPin, Info, ExternalLink, UserPlus, LogIn, Sparkles } from 'lucide-react';
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
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
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
    permitType: 'construction' as 'construction' | 'regularisation',
    hasExistingConstruction: false,
    constructionDescription: '',
    plannedUsage: '',
    estimatedArea: '',
    applicantName: '',
    applicantPhone: '',
    applicantEmail: '',
    // Champs spécifiques permis de construire
    numberOfFloors: '',
    buildingMaterials: '',
    architecturalPlanImages: [] as File[],
    // Champs spécifiques permis de régularisation
    constructionYear: '',
    regularisationReason: '',
    constructionPhotos: [] as File[]
  });
  
  // État pour gérer les coordonnées GPS des bornes
  const [gpsCoordinates, setGpsCoordinates] = useState<Array<{
    borne: string;
    lat: string;
    lng: string;
  }>>([]);
  
  // Synchroniser initialement les bornes GPS avec les côtés par défaut
  useEffect(() => {
    if (gpsCoordinates.length === 0 && parcelSides.length > 0) {
      const initialBornes = parcelSides.map((_, index) => ({
        borne: `Borne ${index + 1}`,
        lat: '',
        lng: ''
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
      setShowAuthDialog(true);
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
      if (permitRequest.permitType === 'regularisation') {
        if (!permitRequest.constructionYear || !permitRequest.regularisationReason) {
          toast({
            title: "Champs requis manquants",
            description: "Veuillez remplir l'année de construction et la raison de la régularisation",
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
        } else if (permitRequest.permitType === 'regularisation' && permitRequest.constructionPhotos.length > 0) {
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
            regularisationReason: permitRequest.regularisationReason || undefined,
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

      // Add document URLs to form data
      const dataToSubmit = {
        ...formData,
        currentOwners: currentOwners.filter(o => o.lastName && o.firstName), // Ne garder que les propriétaires avec nom et prénom
        ownerDocumentUrl: ownerDocUrl || undefined,
        titleDocumentUrl: titleDocUrls.length > 0 ? JSON.stringify(titleDocUrls) : undefined,
        taxHistory: taxHistoryData.length > 0 ? taxHistoryData as any : undefined,
        mortgageHistory: mortgageHistoryData.length > 0 ? mortgageHistoryData as any : undefined,
        buildingPermits: buildingPermitsDataFinal,
        permitRequest: permitRequestData,
        gpsCoordinates: gpsCoordinatesData,
      };

      const result = await submitContribution(dataToSubmit);
      
      if (result.success) {
        // Effacer les données sauvegardées après une soumission réussie
        clearSavedFormData();
        setShowSuccess(true);
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
    
    setPreviousOwners([...previousOwners, {
      name: '',
      legalStatus: 'Personne physique',
      startDate: '',
      endDate: '',
      mutationType: 'Vente'
    }]);
  };

  const removePreviousOwner = (index: number) => {
    setPreviousOwners(previousOwners.filter((_, i) => i !== index));
  };

  const updatePreviousOwner = (index: number, field: string, value: string) => {
    const updated = [...previousOwners];
    updated[index] = { ...updated[index], [field]: value };
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
      lng: ''
    }]);
  };
  
  const removeGPSCoordinate = (index: number) => {
    setGpsCoordinates(gpsCoordinates.filter((_, i) => i !== index));
    
    // Supprimer automatiquement le côté correspondant
    if (parcelSides.length > 2 && index < parcelSides.length) {
      setParcelSides(parcelSides.filter((_, i) => i !== index));
    }
  };
  
  const updateGPSCoordinate = (index: number, field: string, value: string) => {
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
    
    toast({
      title: "Capture en cours",
      description: "Récupération de votre position GPS...",
    });
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const updated = [...gpsCoordinates];
        updated[index] = {
          ...updated[index],
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6)
        };
        setGpsCoordinates(updated);
        
        toast({
          title: "Position capturée",
          description: `Lat: ${position.coords.latitude.toFixed(6)}, Lng: ${position.coords.longitude.toFixed(6)}`,
        });
      },
      (error) => {
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


  // Calculer le pourcentage de complétion du formulaire
  const calculateProgress = () => {
    let totalFields = 0;
    let filledFields = 0;

    // Onglet Général (6 champs)
    if (formData.propertyTitleType) filledFields++;
    totalFields++;
    
    if (formData.titleReferenceNumber) filledFields++;
    totalFields++;
    
    if (formData.constructionType) filledFields++;
    totalFields++;
    
    if (formData.constructionNature) filledFields++;
    totalFields++;
    
    if (formData.declaredUsage) filledFields++;
    totalFields++;
    
    const hasValidOwner = currentOwners.some(o => o.lastName && o.firstName);
    if (hasValidOwner) filledFields++;
    totalFields++;

    // Onglet Localisation (3-4 champs)
    if (formData.province) filledFields++;
    totalFields++;
    
    if (sectionType === 'urbaine') {
      if (formData.ville) filledFields++;
      totalFields++;
      if (formData.commune) filledFields++;
      totalFields++;
    } else if (sectionType === 'rurale') {
      if (formData.territoire) filledFields++;
      totalFields++;
      if (formData.collectivite) filledFields++;
      totalFields++;
    }
    
    if (formData.areaSqm) filledFields++;
    totalFields++;

    // Onglet Historiques - vérifier que les champs sont vraiment remplis
    const hasValidPreviousOwners = previousOwners.some(o => 
      o.name && o.startDate && o.endDate
    );
    if (hasValidPreviousOwners) filledFields++;
    totalFields++;

    // Onglet Obligations - vérifier que les champs sont vraiment remplis
    const hasValidTaxes = taxRecords.some(t => 
      t.taxAmount && t.taxYear
    );
    const hasValidMortgages = mortgageRecords.some(m => 
      m.mortgageAmount && m.creditorName
    );
    if (hasValidTaxes || hasValidMortgages) filledFields++;
    totalFields++;

    // Note: Les permis de construire ne sont PAS comptés dans la progression

    return Math.round((filledFields / totalFields) * 100);
  };

  const handleClose = () => {
    setFormData({ parcelNumber: parcelNumber });
    setShowSuccess(false);
    setShowAuthDialog(false);
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

  if (showSuccess) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl">
          <div className="flex flex-col items-center justify-center py-8 space-y-6 animate-fade-in">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
              <CheckCircle2 className="h-20 w-20 text-primary relative animate-scale-in" />
            </div>
            <DialogTitle className="text-2xl text-center font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Merci pour votre contribution !
            </DialogTitle>
            <DialogDescription className="text-center text-base">
              Votre contribution pour la parcelle <strong className="text-foreground">{parcelNumber}</strong> a été enregistrée.
              Elle sera vérifiée par notre équipe.
            </DialogDescription>
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 rounded-xl w-full border border-primary/20 shadow-lg backdrop-blur-sm animate-scale-in">
              <div className="flex items-center justify-center mb-4">
                <CheckCircle2 className="h-12 w-12 text-primary" />
              </div>
              <p className="text-lg font-semibold text-center text-foreground mb-2">
                Contribution en cours de validation
              </p>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Notre équipe examine actuellement vos informations pour garantir leur exactitude.
              </p>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Votre code CCC sera généré après approbation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Délai de validation : 24 à 48 heures</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Vous serez notifié par email</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-center text-muted-foreground max-w-sm">
              Consultez l'onglet "Codes CCC" de votre tableau de bord pour suivre l'état de votre contribution.
            </p>
            <Button onClick={handleClose} className="w-full shadow-lg hover:shadow-xl transition-all">
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto border-0 shadow-2xl p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
          <DialogTitle className="text-2xl font-semibold">Contribuer aux informations cadastrales</DialogTitle>
          <DialogDescription className="text-base mt-2">
            Parcelle : <strong className="text-foreground font-semibold">{parcelNumber}</strong>
            <br />
            <span className="text-sm">Renseignez les informations que vous possédez sur cette parcelle.</span>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <div className="sticky top-0 z-20 bg-background px-6 pt-4 pb-3 -mx-6 border-b shadow-sm">
            <TabsList className="grid w-full grid-cols-4 h-12 bg-muted/50 p-1 rounded-lg shadow-inner mb-3">
              <TabsTrigger value="general" className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all text-xs sm:text-sm">
                Général
              </TabsTrigger>
              <TabsTrigger value="location" className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all text-xs sm:text-sm">
                Localisation
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all text-xs sm:text-sm">
                Historiques
              </TabsTrigger>
              <TabsTrigger value="obligations" className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all text-xs sm:text-sm">
                Obligations
              </TabsTrigger>
            </TabsList>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground font-medium">Progression</span>
                <span className="text-primary font-semibold">{calculateProgress()}%</span>
              </div>
              <Progress 
                value={calculateProgress()} 
                className="h-2 animate-fade-in"
              />
              {calculateProgress() < 100 && (
                <p className="text-xs text-muted-foreground">
                  Continuez à remplir le formulaire pour soumettre votre contribution
                </p>
              )}
              {calculateProgress() === 100 && (
                <p className="text-xs text-primary font-medium flex items-center gap-1 animate-fade-in">
                  <CheckCircle2 className="h-3 w-3" />
                  Formulaire complété ! Vous pouvez maintenant soumettre.
                </p>
              )}
            </div>
          </div>
          
          <div className="px-6 pb-6">

          <TabsContent value="general" className="space-y-6 mt-6 animate-fade-in">
            <PropertyTitleTypeSelect 
              value={formData.propertyTitleType || ''}
              onValueChange={(value) => handleInputChange('propertyTitleType', value)}
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
                          <FileText className="h-4 w-4 text-primary" />
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

                  <div className="grid grid-cols-2 gap-3">
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
                    <Label className="text-xs">Pièce d'identité du propriétaire (optionnel)</Label>
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
                        <FileText className="h-4 w-4 text-primary" />
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
                
                <div className="flex justify-center sm:justify-start">
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
                <div>
                  <Label className="text-sm font-semibold">Permis de construire (optionnel)</Label>
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
                        <Label className="text-xs font-medium">Type de permis</Label>
                        <RadioGroup 
                          value={permit.permitType} 
                          onValueChange={(value: 'construction' | 'regularization') => updateBuildingPermit(index, 'permitType', value)}
                          className="flex gap-2"
                        >
                          <div className="flex items-center space-x-2 flex-1 p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                            <RadioGroupItem value="construction" id={`construction-${index}`} />
                            <Label htmlFor={`construction-${index}`} className="flex-1 cursor-pointer text-xs">
                              Permis de construire
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2 flex-1 p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                            <RadioGroupItem value="regularization" id={`regularization-${index}`} />
                            <Label htmlFor={`regularization-${index}`} className="flex-1 cursor-pointer text-xs">
                              Permis de régularisation
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
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
                            max={new Date().toISOString().split('T')[0]}
                            value={permit.issueDate}
                            onChange={(e) => updateBuildingPermit(index, 'issueDate', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <BuildingPermitIssuingServiceSelect
                          value={permit.issuingService}
                          onValueChange={(value) => updateBuildingPermit(index, 'issuingService', value)}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Validité (mois)</Label>
                          <Input
                            type="number"
                            placeholder="36"
                            value={permit.validityMonths}
                            onChange={(e) => updateBuildingPermit(index, 'validityMonths', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Statut administratif</Label>
                          <Select
                            value={permit.administrativeStatus}
                            onValueChange={(value) => updateBuildingPermit(index, 'administrativeStatus', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="En attente">En attente</SelectItem>
                              <SelectItem value="Conforme">Conforme</SelectItem>
                              <SelectItem value="Non autorisé">Non autorisé</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
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
                            <FileText className="h-4 w-4 text-primary" />
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
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="permit-type-construction"
                            name="permitType"
                            value="construction"
                            checked={permitRequest.permitType === 'construction'}
                            onChange={(e) => setPermitRequest({ ...permitRequest, permitType: e.target.value as 'construction' | 'regularisation' })}
                            className="h-4 w-4 mt-0.5"
                          />
                          <label htmlFor="permit-type-construction" className="text-sm font-medium cursor-pointer">
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

                      <div className="flex items-start gap-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="permit-type-regularisation"
                            name="permitType"
                            value="regularisation"
                            checked={permitRequest.permitType === 'regularisation'}
                            onChange={(e) => setPermitRequest({ ...permitRequest, permitType: e.target.value as 'construction' | 'regularisation' })}
                            className="h-4 w-4 mt-0.5"
                          />
                          <label htmlFor="permit-type-regularisation" className="text-sm font-medium cursor-pointer">
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
                        <Label>Usage prévu *</Label>
                        <Select
                          value={permitRequest.plannedUsage}
                          onValueChange={(value) => setPermitRequest({ ...permitRequest, plannedUsage: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner l'usage prévu" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Résidentiel">Résidentiel</SelectItem>
                            <SelectItem value="Commercial">Commercial</SelectItem>
                            <SelectItem value="Industriel">Industriel</SelectItem>
                            <SelectItem value="Mixte">Mixte (Résidentiel + Commercial)</SelectItem>
                            <SelectItem value="Agricole">Agricole</SelectItem>
                          </SelectContent>
                        </Select>
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
                        <Label>Usage actuel de la construction *</Label>
                        <Select
                          value={permitRequest.plannedUsage}
                          onValueChange={(value) => setPermitRequest({ ...permitRequest, plannedUsage: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner l'usage actuel" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Résidentiel">Résidentiel</SelectItem>
                            <SelectItem value="Commercial">Commercial</SelectItem>
                            <SelectItem value="Industriel">Industriel</SelectItem>
                            <SelectItem value="Mixte">Mixte (Résidentiel + Commercial)</SelectItem>
                            <SelectItem value="Agricole">Agricole</SelectItem>
                          </SelectContent>
                        </Select>
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
                          <Input
                            type="number"
                            placeholder="ex: 2018"
                            min="1950"
                            max={new Date().getFullYear()}
                            value={permitRequest.constructionYear}
                            onChange={(e) => setPermitRequest({ ...permitRequest, constructionYear: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Raison de la régularisation */}
                      <div className="space-y-2">
                        <Label>Raison de la régularisation *</Label>
                        <Select
                          value={permitRequest.regularisationReason}
                          onValueChange={(value) => setPermitRequest({ ...permitRequest, regularisationReason: value })}
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
                          <Input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png"
                            multiple
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
                              setPermitRequest({ 
                                ...permitRequest, 
                                constructionPhotos: [...permitRequest.constructionPhotos, ...files] 
                              });
                              e.target.value = '';
                            }}
                            className="cursor-pointer"
                          />
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
                    <Label className="text-sm font-semibold mb-3 block">Informations du demandeur</Label>
                    
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Nom complet *</Label>
                        <Input
                          placeholder="Nom et prénom du demandeur"
                          value={permitRequest.applicantName}
                          onChange={(e) => setPermitRequest({ ...permitRequest, applicantName: e.target.value })}
                        />
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
                      <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
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
                      <div key={index} className="flex items-center gap-2 animate-fade-in">
                        <Input
                          placeholder="Nom du côté"
                          value={side.name}
                          onChange={(e) => updateParcelSide(index, 'name', e.target.value)}
                          className="flex-1 transition-all focus:scale-[1.01]"
                        />
                        <Input
                          type="number"
                          placeholder="Longueur"
                          value={side.length}
                          onChange={(e) => updateParcelSide(index, 'length', e.target.value)}
                          className="w-32 transition-all focus:scale-[1.01]"
                        />
                        <span className="text-xs text-muted-foreground w-6">m</span>
                        {parcelSides.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeParcelSide(index)}
                            className="hover:bg-destructive/10 transition-all"
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
                    className="w-full hover:bg-primary/5 transition-all hover:scale-[1.02]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un côté
                  </Button>

                  {formData.areaSqm && (
                    <div className="p-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl border border-primary/20 animate-scale-in">
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        Superficie calculée
                      </p>
                      <p className="text-3xl font-bold text-primary mb-2">{formData.areaSqm} m²</p>
                      <p className="text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded-md inline-block">
                        {parcelSides.length === 2 && "Calcul rectangulaire simple"}
                        {parcelSides.length === 4 && "Calcul rectangulaire (4 côtés)"}
                        {parcelSides.length > 4 && "Approximation basée sur les dimensions"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Coordonnées GPS des bornes */}
            {sectionType && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
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
                                Deux méthodes sont disponibles pour renseigner les coordonnées GPS de chaque borne de votre terrain :
                              </p>
                            </div>
                            
                            <div className="space-y-3">
                              <div className="border-l-2 border-primary pl-3">
                                <h5 className="font-semibold text-xs mb-1 text-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  Méthode 1 : Capture automatique
                                </h5>
                                <p className="text-xs text-muted-foreground mb-2">
                                  Rendez-vous physiquement à l'emplacement de chaque borne avec votre smartphone ou appareil GPS.
                                </p>
                                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                                  <li>Cliquez sur "Capturer ma position actuelle"</li>
                                  <li>Autorisez l'accès à votre localisation</li>
                                  <li>Les coordonnées seront automatiquement renseignées</li>
                                </ul>
                              </div>
                              
                              <div className="border-l-2 border-secondary pl-3">
                                <h5 className="font-semibold text-xs mb-1 text-foreground">
                                  Méthode 2 : Saisie manuelle
                                </h5>
                                <p className="text-xs text-muted-foreground mb-2">
                                  Si vous disposez déjà des coordonnées GPS de vos bornes :
                                </p>
                                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                                  <li>Saisissez la latitude (position nord-sud)</li>
                                  <li>Saisissez la longitude (position est-ouest)</li>
                                  <li>Utilisez au moins 6 décimales pour une précision optimale</li>
                                </ul>
                              </div>
                            </div>
                            
                            <div className="bg-muted/50 p-2 rounded-md">
                              <p className="text-xs text-muted-foreground">
                                <strong className="text-foreground">💡 Conseil :</strong> Pour une délimitation précise de votre terrain, nous recommandons d'ajouter les coordonnées de toutes les bornes.
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
                      const canAddMore = gpsCoordinates.length < filledSides.length;
                      
                      if (!isSuperficieCompleted) {
                        return (
                          <p className="text-xs text-amber-600 dark:text-amber-500 mt-2 flex items-center gap-1">
                            <Info className="h-3 w-3" />
                            Complétez d'abord le bloc "Dimensions de chaque côté" (au moins 3 côtés)
                          </p>
                        );
                      }
                      
                      if (!canAddMore && gpsCoordinates.length > 0) {
                        return (
                          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <Info className="h-3 w-3" />
                            Limite atteinte : {filledSides.length} borne(s) pour {filledSides.length} côté(s)
                          </p>
                        );
                      }
                      
                      return null;
                    })()}
                  </div>
                </div>

                <div className="space-y-3">
                  {gpsCoordinates.map((coord, index) => (
                      <div key={index} className="border rounded-xl p-4 space-y-3 bg-gradient-to-br from-muted/30 to-transparent">
                        <div className="flex items-center justify-between">
                          <Input
                            placeholder="Nom de la borne"
                            value={coord.borne}
                            onChange={(e) => updateGPSCoordinate(index, 'borne', e.target.value)}
                            className="flex-1 mr-2"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeGPSCoordinate(index)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label className="text-xs">Latitude</Label>
                                <InputWithPopover
                                  type="number"
                                  step="0.000001"
                                  placeholder="ex: -1.674"
                                  value={coord.lat}
                                  onChange={(e) => updateGPSCoordinate(index, 'lat', e.target.value)}
                                  helpTitle="Latitude"
                                  helpText="La latitude représente la position nord-sud. Au Congo, les valeurs sont généralement négatives (entre -13° et 5°). Vous pouvez utiliser votre smartphone ou un GPS pour obtenir cette coordonnée précise."
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Longitude</Label>
                                <InputWithPopover
                                  type="number"
                                  step="0.000001"
                                  placeholder="ex: 29.224"
                                  value={coord.lng}
                                  onChange={(e) => updateGPSCoordinate(index, 'lng', e.target.value)}
                                  helpTitle="Longitude"
                                  helpText="La longitude représente la position est-ouest. Au Congo, les valeurs sont généralement positives (entre 12° et 31°). Assurez-vous d'utiliser au moins 6 décimales pour une précision optimale."
                                />
                              </div>
                            </div>
                          
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => captureCurrentLocation(index)}
                            className="w-full gap-2 hover:bg-primary/10 transition-all"
                          >
                            <MapPin className="h-4 w-4" />
                            Capturer ma position actuelle
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Bouton Ajouter déplacé en dessous des blocs */}
                  <div className="space-y-2">
                    {/* Notification d'avertissement pour GPS */}
                    {showGPSWarning && (
                      <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 animate-fade-in">
                        <div className="flex items-start gap-2">
                          <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                              Limite de coordonnées GPS atteinte
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                              Vous avez atteint la limite de {parcelSides.filter(s => s.length && parseFloat(s.length) > 0).length} borne(s) correspondant aux {parcelSides.filter(s => s.length && parseFloat(s.length) > 0).length} côté(s) de votre parcelle. Pour ajouter plus de coordonnées GPS, vous devez d'abord ajouter un nouveau côté dans le bloc "Dimensions de chaque côté" ci-dessus.
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
                        
                        // Si la limite est atteinte, afficher la notification et surbrillance
                        if (isSuperficieCompleted && !canAddMore) {
                          setShowGPSWarning(true);
                          setHighlightSuperficie(true);
                          
                          // Retirer la notification après 5 secondes
                          setTimeout(() => {
                            setShowGPSWarning(false);
                          }, 5000);
                          
                          // Retirer la surbrillance après 3 secondes
                          setTimeout(() => {
                            setHighlightSuperficie(false);
                          }, 3000);
                          
                          return;
                        }
                        
                        addGPSCoordinate();
                      }}
                      disabled={(() => {
                        const filledSides = parcelSides.filter(s => s.length && parseFloat(s.length) > 0);
                        const isSuperficieCompleted = filledSides.length >= 3;
                        return !isSuperficieCompleted;
                      })()}
                      className="gap-2 hover:bg-primary/5 transition-all hover:scale-[1.02] shadow-sm"
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter une coordonnée GPS
                    </Button>
                  </div>
                </div>
              )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6 mt-6 animate-fade-in">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Historique de propriété (optionnel)</Label>
                  <p className="text-xs text-muted-foreground">
                    Ajoutez les anciens propriétaires que vous connaissez
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {previousOwners.map((owner, index) => (
                    <div key={index} className="border rounded-xl p-5 space-y-4 relative bg-gradient-to-br from-muted/30 to-transparent hover:shadow-md transition-all animate-fade-in">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold bg-primary/10 px-3 py-1 rounded-full">Propriétaire #{index + 1}</h4>
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

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Date début</Label>
                          <Input
                            type="date"
                            max={currentOwners[0]?.since || new Date().toISOString().split('T')[0]}
                            value={owner.startDate}
                            onChange={(e) => updatePreviousOwner(index, 'startDate', e.target.value)}
                          />
                          {owner.startDate && owner.endDate && owner.startDate > owner.endDate && (
                            <p className="text-xs text-destructive">La date de début doit être avant la date de fin</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Date fin</Label>
                          <Input
                            type="date"
                            min={owner.startDate || undefined}
                            max={currentOwners[0]?.since || new Date().toISOString().split('T')[0]}
                            value={owner.endDate}
                            onChange={(e) => updatePreviousOwner(index, 'endDate', e.target.value)}
                          />
                          {owner.endDate && currentOwners[0]?.since && owner.endDate > currentOwners[0].since && (
                            <p className="text-xs text-destructive">La date de fin doit être avant la date du propriétaire actuel</p>
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
                {/* Notification d'avertissement */}
                {showPreviousOwnerWarning && (
                  <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 animate-fade-in">
                    <div className="flex items-start gap-2">
                      <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                          Complétez d'abord le propriétaire actuel
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
                  <div>
                    <Label className="text-sm font-semibold">Historique des taxes (optionnel)</Label>
                    <p className="text-xs text-muted-foreground">
                      Ajoutez les taxes que vous connaissez pour cette parcelle
                    </p>
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
                              <FileText className="h-4 w-4 text-primary" />
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
                  <div>
                    <Label className="text-sm font-semibold">Hypothèque (optionnel)</Label>
                    <p className="text-xs text-muted-foreground">
                      Ajoutez les hypothèques que vous connaissez pour cette parcelle
                    </p>
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
                              <FileText className="h-4 w-4 text-primary" />
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

                {/* Bouton de soumission finale */}
                <div className="sticky bottom-0 left-0 right-0 mt-8 -mx-6 -mb-6 bg-background/95 backdrop-blur-sm border-t p-4 sm:p-6 z-10">
                  <div className="max-w-2xl mx-auto">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                      {/* Info compacte */}
                      <div className="flex-1 text-center sm:text-left">
                        <p className="text-sm font-medium text-foreground mb-1">
                          Formulaire complété
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Connectez-vous pour soumettre et obtenir votre code CCC
                        </p>
                      </div>
                      
                      {/* Bouton principal */}
                      <Button
                        type="button"
                        size="lg"
                        onClick={() => {
                          saveFormDataToStorage();
                          setShowAuthDialog(true);
                        }}
                        className="w-full sm:w-auto px-6 sm:px-8 h-12 sm:h-14 text-base font-semibold gap-2 shadow-lg hover:shadow-xl transition-all"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="hidden sm:inline">Soumettre ma contribution</span>
                        <span className="sm:hidden">Soumettre</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>

    {/* Dialog d'authentification */}
    <AlertDialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <AlertDialogContent className="sm:max-w-md border-0 shadow-2xl">
          <AlertDialogHeader>
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-8 w-8 text-primary" />
            </div>
            <AlertDialogTitle className="text-2xl text-center">
              Authentification requise
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-4 pt-4">
              <p className="text-base">
                Pour soumettre votre contribution et bénéficier de tous nos services, vous devez créer un compte ou vous connecter.
              </p>
              <div className="bg-muted/50 p-4 rounded-lg space-y-3 text-left">
                <p className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Avec un compte, vous pouvez :
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Soumettre vos contributions cadastrales</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Suivre l'état de validation de vos données</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Être informé de la valeur accordée à votre contribution</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Contester les décisions de validation si nécessaire</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Gérer tous vos codes CCC depuis un tableau de bord</span>
                  </li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-3 mt-2">
            <Button 
              onClick={() => {
                setShowAuthDialog(false);
                onOpenChange(false);
                navigate('/auth');
              }}
              className="w-full h-12 text-base font-semibold gap-2 shadow-lg hover:shadow-xl transition-all"
            >
              <UserPlus className="h-5 w-5" />
              Créer un compte
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                setShowAuthDialog(false);
                onOpenChange(false);
                navigate('/auth');
              }}
              className="w-full h-12 text-base font-semibold gap-2 hover:bg-muted transition-all"
            >
              <LogIn className="h-5 w-5" />
              Se connecter
            </Button>
            <Button 
              variant="ghost"
              onClick={() => setShowAuthDialog(false)}
              className="w-full mt-2"
            >
              Annuler
            </Button>
          </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default CadastralContributionDialog;
