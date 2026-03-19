import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
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
import { PropertyTitleTypeSelect, PROPERTY_TITLE_TYPES, getEffectiveTitleName } from './PropertyTitleTypeSelect';
import { BuildingPermitIssuingServiceSelect } from './BuildingPermitIssuingServiceSelect';
import { useIsMobile } from '@/hooks/use-mobile';
// FIX #27: Lazy import confetti to avoid loading it for every session
const lazyConfetti = () => import('canvas-confetti').then(m => m.default);
import WhatsAppFloatingButton from './WhatsAppFloatingButton';
import { QuickAuthDialog } from './QuickAuthDialog';
import { useContributionConfig } from '@/hooks/useContributionConfig';
import { ParcelMapPreview } from './ParcelMapPreview';
import { useMapConfig } from '@/hooks/useMapConfig';
import SuggestivePicklist from './SuggestivePicklist';
import { useCCCFormPicklists } from '@/hooks/useCCCFormPicklists';

interface CadastralContributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcelNumber: string;
  editingContributionId?: string; // ID of contribution being edited (for update mode)
}

const CadastralContributionDialog: React.FC<CadastralContributionDialogProps> = ({
  open,
  onOpenChange,
  parcelNumber,
  editingContributionId
}) => {
  const { submitContribution, updateContribution, loading } = useCadastralContribution();
  const { getConfig } = useContributionConfig();
  const { config: mapConfig, loading: mapConfigLoading } = useMapConfig();
  const { getOptions: getPicklistOptions, getDependentOptions: getPicklistDependentOptions } = useCCCFormPicklists();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const dialogContentRef = React.useRef<HTMLDivElement>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const formDirtyRef = useRef(false);
  const isClosingAfterSuccessRef = useRef(false);
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
  const [customTitleName, setCustomTitleName] = useState('');
  
  // Fonction pour obtenir les champs manquants avec détails pour la navigation
  const getMissingFields = () => {
    const missing: Array<{ field: string; label: string; tab: string }> = [];
    
    // ===== ONGLET GÉNÉRAL (Infos) =====
    // Vérifier Type de titre de propriété (obligatoire)
    if (!formData.propertyTitleType || formData.propertyTitleType.trim() === '') {
      missing.push({ field: 'propertyTitleType', label: 'Type de titre de propriété', tab: 'general' });
    }
    // Si "Autre" est sélectionné, le nom personnalisé est obligatoire
    if (formData.propertyTitleType === 'Autre' && (!customTitleName || customTitleName.trim() === '')) {
      missing.push({ field: 'customTitleName', label: 'Nom du titre de propriété (Autre)', tab: 'general' });
    }
    
    // Vérifier qu'au moins un propriétaire actuel a lastName et firstName (obligatoire)
    const hasValidOwner = currentOwners.some(owner => 
      owner.lastName && owner.lastName.trim() !== '' && 
      owner.firstName && owner.firstName.trim() !== ''
    );
    if (!hasValidOwner) {
      missing.push({ field: 'currentOwner', label: 'Nom et prénom du propriétaire', tab: 'general' });
    }
    
    // Validation de la date "Propriétaire depuis" si le titre n'est pas au nom du propriétaire actuel
    if (formData.isTitleInCurrentOwnerName === false && formData.titleIssueDate) {
      const firstOwner = currentOwners[0];
      if (firstOwner?.since && new Date(firstOwner.since) < new Date(formData.titleIssueDate)) {
        missing.push({ field: 'ownerSince', label: 'Date "Propriétaire depuis" doit être ≥ date de délivrance', tab: 'general' });
      }
    }
    
    // Validation: Ancien #1 "Date début" ≤ date délivrance/renouvellement si titre au nom du propriétaire actuel
    if (formData.isTitleInCurrentOwnerName === true && formData.titleIssueDate) {
      const firstPreviousOwner = previousOwners[0];
      if (firstPreviousOwner?.startDate && new Date(firstPreviousOwner.startDate) > new Date(formData.titleIssueDate)) {
        missing.push({ field: 'previousOwnerStartDate', label: `Date début Ancien #1 doit être ≤ date de ${formData.leaseType === 'renewal' ? 'renouvellement' : 'délivrance'}`, tab: 'history' });
      }
    }
    
    // ===== ONGLET LOCALISATION =====
    // Province toujours obligatoire
    if (!formData.province || formData.province.trim() === '') {
      missing.push({ field: 'province', label: 'Province', tab: 'location' });
    }
    
    // Superficie obligatoire
    if (!formData.areaSqm || Number(formData.areaSqm) <= 0) {
      missing.push({ field: 'areaSqm', label: 'Superficie (m²)', tab: 'location' });
    }
    
    // Type de section obligatoire - vérifier si vide ou non défini
    const isSectionTypeEmpty = !sectionType || (sectionType !== 'urbaine' && sectionType !== 'rurale');
    if (isSectionTypeEmpty) {
      missing.push({ field: 'sectionType', label: 'Type de section (Urbaine/Rurale)', tab: 'location' });
    }
    
    // Champs conditionnels selon le type de section
    if (sectionType === 'urbaine') {
      if (!formData.ville || formData.ville.trim() === '') missing.push({ field: 'ville', label: 'Ville', tab: 'location' });
      if (!formData.commune || formData.commune.trim() === '') missing.push({ field: 'commune', label: 'Commune', tab: 'location' });
      if (!formData.quartier || formData.quartier.trim() === '') missing.push({ field: 'quartier', label: 'Quartier', tab: 'location' });
      if (!formData.avenue || formData.avenue.trim() === '') missing.push({ field: 'avenue', label: 'Avenue', tab: 'location' });
    } else if (sectionType === 'rurale') {
      if (!formData.territoire || formData.territoire.trim() === '') missing.push({ field: 'territoire', label: 'Territoire', tab: 'location' });
      if (!formData.collectivite || formData.collectivite.trim() === '') missing.push({ field: 'collectivite', label: 'Collectivité', tab: 'location' });
    }
    
    // ===== VALIDATION DE L'AUTORISATION DE BÂTIR =====
    // LOGIQUE DE DÉPENDANCE:
    // 1. Si constructionType === "Terrain nu" → Pas de validation permis (terrain nu = valide sans permis)
    // 2. Si constructionType !== "Terrain nu" ET permitMode === "request" (Pas de permis) → Valide, "Pas de permis" est une donnée valide
    // 3. Si constructionType !== "Terrain nu" ET permitMode === "existing" (J'ai un permis) → Valider les données du permis existant
    
    const isTerrainNu = formData.constructionType === 'Terrain nu';
    const hasNoPermitSelected = permitMode === 'request'; // "Pas de permis" button = permitMode 'request' 
    
    // Validation uniquement si: pas terrain nu ET l'utilisateur a dit "J'ai un permis"
    if (!isTerrainNu && permitMode === 'existing') {
      // Vérifier que les données du permis existant sont renseignées
      const hasValidExistingPermit = buildingPermits.some(permit => 
        permit.permitNumber && permit.permitNumber.trim() !== '' &&
        permit.issuingService && permit.issuingService.trim() !== '' &&
        permit.issueDate && permit.issueDate.trim() !== ''
      );
      
      if (!hasValidExistingPermit) {
        missing.push({ field: 'buildingPermit', label: 'Informations du permis existant', tab: 'general' });
      }

      // Validation: année de délivrance du permis ≤ année de construction
      if (formData.constructionYear) {
        const invalidPermit = buildingPermits.find(permit => {
          if (!permit.issueDate) return false;
          const permitYear = new Date(permit.issueDate).getFullYear();
          return permitYear > formData.constructionYear!;
        });
        if (invalidPermit) {
          missing.push({ field: 'permitIssueDate', label: `Date de l'autorisation doit être ≤ année de construction (${formData.constructionYear})`, tab: 'general' });
        }
      }
    }
    
    // NOTE: Si "Pas de permis" (permitMode === 'request') est sélectionné,
    // aucune validation n'est requise - c'est une donnée valide en soi
    
    return missing;
  };

  // Fonction pour vérifier si le formulaire est valide pour soumission
  const isFormValidForSubmission = () => {
    return getMissingFields().length === 0;
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
    entityType: string;
    entitySubType: string;
    entitySubTypeOther: string;
    stateExploitedBy: string;
    startDate: string;
    endDate: string;
    mutationType: string;
  }>>([{
    name: '',
    legalStatus: 'Personne physique',
    entityType: '',
    entitySubType: '',
    entitySubTypeOther: '',
    stateExploitedBy: '',
    startDate: '',
    endDate: '',
    mutationType: 'Vente'
  }]);

  // État pour gérer plusieurs propriétaires actuels (copropriété)
  // État pour le mode de propriété (unique ou multiple)
  const [ownershipMode, setOwnershipMode] = useState<'unique' | 'multiple'>('unique');
  const [leaseYears, setLeaseYears] = useState<number>(0);

  const [currentOwners, setCurrentOwners] = useState<Array<{
    lastName: string;
    middleName: string;
    firstName: string;
    legalStatus: string;
    gender: string;
    entityType: string;
    entitySubType: string;
    entitySubTypeOther: string;
    stateExploitedBy: string;
    rightType: string;
    since: string;
  }>>([{
    lastName: '',
    middleName: '',
    firstName: '',
    legalStatus: 'Personne physique',
    gender: '',
    entityType: '',
    entitySubType: '',
    entitySubTypeOther: '',
    stateExploitedBy: '',
    rightType: '',
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
  
  // État pour le mode d'autorisation de bâtir
  const [permitMode, setPermitMode] = useState<'existing' | 'request'>('existing');
  
  // État pour gérer les autorisations de bâtir existantes
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
    // Champs spécifiques autorisation de bâtir
    numberOfFloors: '',
    buildingMaterials: '',
    architecturalPlanImages: [] as File[],
    // Champs spécifiques autorisation de régularisation
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
  const saveFormDataToStorage = useCallback(() => {
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
      // Champs manquants ajoutés
      hasMortgage,
      ownershipMode,
      leaseYears,
      roadSides,
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
  }, [formData, currentOwners, previousOwners, taxRecords, mortgageRecords, permitMode, buildingPermits, permitRequest, gpsCoordinates, parcelSides, obligationType, sectionType, hasMortgage, ownershipMode, leaseYears, roadSides, STORAGE_KEY]);

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
        // Restaurer les champs manquants
        if (parsed.hasMortgage !== undefined) setHasMortgage(parsed.hasMortgage);
        if (parsed.ownershipMode) setOwnershipMode(parsed.ownershipMode);
        if (parsed.leaseYears !== undefined) setLeaseYears(parsed.leaseYears);
        if (parsed.roadSides) setRoadSides(parsed.roadSides);
        
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
  // En mode édition, on skip le localStorage car les données viennent de Supabase
  useEffect(() => {
    if (open && !editingContributionId) {
      loadFormDataFromStorage();
    }
  }, [open, editingContributionId]);

  // FIX #3: En mode édition, charger la contribution depuis Supabase si pas de données localStorage
  useEffect(() => {
    if (!open || !editingContributionId) return;

    const fetchContribution = async () => {
      try {
        const { data: contrib, error } = await supabase
          .from('cadastral_contributions')
          .select('*')
          .eq('id', editingContributionId)
          .maybeSingle();

        if (error || !contrib) {
          console.error('Erreur chargement contribution:', error);
          toast({ title: "Erreur", description: "Impossible de charger la contribution à modifier", variant: "destructive" });
          return;
        }

        // Remplir formData avec les données de la contribution
        setFormData(prev => ({
          ...prev,
          parcelNumber: contrib.parcel_number,
          propertyTitleType: contrib.property_title_type || undefined,
          leaseType: contrib.lease_type as any || undefined,
          titleReferenceNumber: contrib.title_reference_number || undefined,
          titleIssueDate: contrib.title_issue_date || undefined,
          constructionType: contrib.construction_type || undefined,
          constructionNature: contrib.construction_nature || undefined,
          constructionMaterials: contrib.construction_materials || undefined,
          declaredUsage: contrib.declared_usage || undefined,
          constructionYear: contrib.construction_year || undefined,
          areaSqm: contrib.area_sqm || undefined,
          province: contrib.province || undefined,
          ville: contrib.ville || undefined,
          commune: contrib.commune || undefined,
          quartier: contrib.quartier || undefined,
          avenue: contrib.avenue || undefined,
          houseNumber: (contrib as any).house_number || undefined,
          territoire: contrib.territoire || undefined,
          collectivite: contrib.collectivite || undefined,
          groupement: contrib.groupement || undefined,
          village: contrib.village || undefined,
          
          whatsappNumber: contrib.whatsapp_number || undefined,
          previousPermitNumber: contrib.previous_permit_number || undefined,
        }));

        // Remplir les propriétaires actuels
        const ownersDetails = contrib.current_owners_details as any[];
        if (ownersDetails && Array.isArray(ownersDetails) && ownersDetails.length > 0) {
          setCurrentOwners(ownersDetails.map((o: any) => ({
            lastName: o.last_name || o.lastName || '',
            middleName: o.middle_name || o.middleName || '',
            firstName: o.first_name || o.firstName || '',
            legalStatus: o.legal_status || o.legalStatus || 'Personne physique',
            gender: o.gender || '',
            entityType: o.entity_type || o.entityType || '',
            entitySubType: o.entity_sub_type || o.entitySubType || '',
            entitySubTypeOther: o.entity_sub_type_other || o.entitySubTypeOther || '',
            stateExploitedBy: o.state_exploited_by || o.stateExploitedBy || '',
            rightType: o.right_type || o.rightType || '',
            since: o.since || ''
          })));
          if (ownersDetails.length > 1) {
            setOwnershipMode('multiple');
          }
        } else if (contrib.current_owner_name) {
          setCurrentOwners([{
            lastName: contrib.current_owner_name,
            middleName: '',
            firstName: '',
            legalStatus: contrib.current_owner_legal_status || 'Personne physique',
            gender: '',
            entityType: '',
            entitySubType: '',
            entitySubTypeOther: '',
            stateExploitedBy: '',
            rightType: '',
            since: contrib.current_owner_since || ''
          }]);
        }

        // Remplir les anciens propriétaires (ownership_history)
        const ownerHistory = contrib.ownership_history as any[];
        if (ownerHistory && Array.isArray(ownerHistory) && ownerHistory.length > 0) {
          setPreviousOwners(ownerHistory.map((o: any) => ({
            name: o.owner_name || '',
            legalStatus: o.legal_status || 'Personne physique',
            entityType: '',
            entitySubType: '',
            entitySubTypeOther: '',
            stateExploitedBy: '',
            startDate: o.ownership_start_date || '',
            endDate: o.ownership_end_date || '',
            mutationType: o.mutation_type || 'Vente'
          })));
        }

        // Remplir les coordonnées GPS
        const gpsCoords = contrib.gps_coordinates as any[];
        if (gpsCoords && Array.isArray(gpsCoords) && gpsCoords.length > 0) {
          setGpsCoordinates(gpsCoords.map((c: any) => ({
            borne: c.borne || '',
            lat: String(c.lat || ''),
            lng: String(c.lng || ''),
            mode: 'manual' as const,
            detected: true,
            detecting: false
          })));
        }

        // Remplir les côtés de la parcelle
        const sides = contrib.parcel_sides as any[];
        if (sides && Array.isArray(sides) && sides.length > 0) {
          setParcelSides(sides.map((s: any) => ({
            name: s.name || '',
            length: String(s.length || '')
          })));
        }

        // Remplir les permis de construire
        const permits = contrib.building_permits as any[];
        if (permits && Array.isArray(permits) && permits.length > 0) {
          setPermitMode('existing');
          setBuildingPermits(permits.map((p: any) => ({
            permitType: p.permit_type || 'construction',
            permitNumber: p.permit_number || '',
            issuingService: p.issuing_service || '',
            issueDate: p.issue_date || '',
            validityMonths: String(p.validity_period_months || '36'),
            administrativeStatus: p.administrative_status || 'En attente',
            issuingServiceContact: p.issuing_service_contact || '',
            attachmentFile: null
          })));
        } else if (contrib.permit_request_data) {
          setPermitMode('request');
          const prd = contrib.permit_request_data as any;
          setPermitRequest(prev => ({
            ...prev,
            permitType: prd.permitType || 'construction',
            hasExistingConstruction: prd.hasExistingConstruction || false,
            constructionDescription: prd.constructionDescription || '',
            plannedUsage: prd.plannedUsage || '',
            estimatedArea: prd.estimatedArea ? String(prd.estimatedArea) : '',
            applicantName: prd.applicantName || '',
            applicantPhone: prd.applicantPhone || '',
            applicantEmail: prd.applicantEmail || '',
            numberOfFloors: prd.numberOfFloors || '',
            buildingMaterials: prd.buildingMaterials || '',
            constructionYear: prd.constructionYear || '',
            regularizationReason: prd.regularizationReason || '',
            originalPermitNumber: prd.originalPermitNumber || '',
            previousPermitNumber: prd.previousPermitNumber || contrib.previous_permit_number || '',
          }));
        }

        // Remplir les taxes
        const taxes = contrib.tax_history as any[];
        if (taxes && Array.isArray(taxes) && taxes.length > 0) {
          setTaxRecords(taxes.map((t: any) => ({
            taxType: t.tax_type || 'Taxe foncière',
            taxYear: String(t.tax_year || ''),
            taxAmount: String(t.amount_usd || ''),
            paymentStatus: t.payment_status || 'Non payée',
            paymentDate: t.payment_date || '',
            receiptFile: null
          })));
        }

        // Remplir les hypothèques
        const mortgages = contrib.mortgage_history as any[];
        if (mortgages && Array.isArray(mortgages) && mortgages.length > 0) {
          setHasMortgage(true);
          setMortgageRecords(mortgages.map((m: any) => ({
            mortgageAmount: String(m.mortgage_amount_usd || ''),
            duration: String(m.duration_months || ''),
            creditorName: m.creditor_name || '',
            creditorType: m.creditor_type || 'Banque',
            contractDate: m.contract_date || '',
            mortgageStatus: m.mortgage_status || 'Active',
            receiptFile: null
          })));
        } else {
          setHasMortgage(false);
        }

        // Détecter le type de section
        if (contrib.parcel_type === 'SU') {
          setSectionType('urbaine');
        } else if (contrib.parcel_type === 'SR') {
          setSectionType('rurale');
        }

        // Historique de bornage
        const boundaries = contrib.boundary_history as any[];
        if (boundaries && Array.isArray(boundaries) && boundaries.length > 0) {
          console.log('Boundary history loaded:', boundaries.length, 'records');
        }

        console.log('Contribution chargée depuis la base de données pour édition');
      } catch (err) {
        console.error('Erreur lors du chargement de la contribution:', err);
      }
    };

    fetchContribution();
  }, [open, editingContributionId]);

  // FIX #2/#3: Single auto-save with debounce, ALL states included in deps, works for all users
  useEffect(() => {
    if (open && formData.parcelNumber) {
      const timeoutId = setTimeout(() => {
        saveFormDataToStorage();
      }, 1500); // Debounce 1.5s
      
      return () => clearTimeout(timeoutId);
    }
  }, [open, formData, currentOwners, previousOwners, taxRecords, mortgageRecords, 
      buildingPermits, gpsCoordinates, parcelSides, permitMode, permitRequest, 
      hasMortgage, ownershipMode, leaseYears, roadSides, obligationType, sectionType, saveFormDataToStorage]);

  // NOTE: Draft is saved BEFORE resetting state in handleClose/handleAttemptClose.
  // We no longer save on !open to avoid the race condition where reset state overwrites the draft.

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

  // Auto-remplir le premier ancien propriétaire quand le titre n'est pas au nom du propriétaire actuel
  // Ceci aide l'utilisateur à documenter correctement la chaîne de propriété
  useEffect(() => {
    if (formData.isTitleInCurrentOwnerName === false && formData.titleIssueDate) {
      const firstOwnerSince = currentOwners[0]?.since;
      
      // Vérifier si le premier ancien propriétaire n'a pas encore de dates renseignées
      if (previousOwners.length > 0 && previousOwners[0]) {
        const shouldAutoFill = !previousOwners[0].startDate || !previousOwners[0].endDate;
        
        if (shouldAutoFill) {
          const updated = [...previousOwners];
          updated[0] = {
            ...updated[0],
            // La date de début est la date de délivrance du titre (quand le vendeur a acquis)
            startDate: formData.titleIssueDate,
            // La date de fin est la date "Propriétaire depuis" du premier propriétaire actuel (quand il a vendu)
            endDate: firstOwnerSince || ''
          };
          setPreviousOwners(updated);
        }
      }
    }
  }, [formData.isTitleInCurrentOwnerName, formData.titleIssueDate, currentOwners[0]?.since]);

  // Auto-remplir "Ancien #2" avec le nom du propriétaire actuel quand le titre n'est pas à son nom
  // Le propriétaire actuel est aussi l'ancien propriétaire #2 dans la chaîne (il a acquis du vendeur inscrit sur le titre)
  // NOTE: Only auto-creates/updates if the second entry is empty or was auto-filled.
  // This avoids overwriting user-deleted entries.
  useEffect(() => {
    if (formData.isTitleInCurrentOwnerName === false) {
      const firstCurrentOwner = currentOwners[0];
      if (firstCurrentOwner?.lastName && firstCurrentOwner?.firstName) {
        const currentOwnerFullName = [firstCurrentOwner.lastName, firstCurrentOwner.middleName, firstCurrentOwner.firstName].filter(Boolean).join(' ');
        
        // Only create the 2nd entry if exactly 1 exists (initial state)
        if (previousOwners.length === 1) {
          setPreviousOwners(prev => [...prev, {
            name: currentOwnerFullName,
            legalStatus: firstCurrentOwner.legalStatus || 'Personne physique',
            entityType: firstCurrentOwner.entityType || '',
            entitySubType: firstCurrentOwner.entitySubType || '',
            entitySubTypeOther: firstCurrentOwner.entitySubTypeOther || '',
            stateExploitedBy: firstCurrentOwner.stateExploitedBy || '',
            startDate: firstCurrentOwner.since || '',
            endDate: '',
            mutationType: 'Vente'
          }]);
        } else if (previousOwners.length >= 2 && previousOwners[1]) {
          // Only update if the name matches what we would have auto-filled (don't overwrite manual edits)
          const existingName = previousOwners[1].name;
          const wasAutoFilled = !existingName || existingName === currentOwnerFullName || 
            existingName === [firstCurrentOwner.lastName, firstCurrentOwner.middleName, firstCurrentOwner.firstName].filter(Boolean).join(' ');
          
          if (wasAutoFilled) {
            const updated = [...previousOwners];
            updated[1] = {
              ...updated[1],
              name: currentOwnerFullName,
              legalStatus: firstCurrentOwner.legalStatus || 'Personne physique',
              startDate: firstCurrentOwner.since || '',
            };
            setPreviousOwners(updated);
          }
        }
      }
    }
  }, [formData.isTitleInCurrentOwnerName, currentOwners[0]?.lastName, currentOwners[0]?.firstName, currentOwners[0]?.middleName, currentOwners[0]?.since]);
  // FIX #12: Improved surface calculation with better 2-side handling
  useEffect(() => {
    const sides = parcelSides.filter(s => s.length && parseFloat(s.length) > 0);
    
    if (sides.length < 3) return; // FIX: Need at least 3 sides for a valid area calc
    
    // Pour 3 côtés (triangle) : formule de Héron
    if (sides.length === 3) {
      const lengths = sides.map(s => parseFloat(s.length));
      const s = (lengths[0] + lengths[1] + lengths[2]) / 2;
      const heronValue = s * (s - lengths[0]) * (s - lengths[1]) * (s - lengths[2]);
      if (heronValue <= 0) return; // Triangle invalide
      const area = Math.sqrt(heronValue);
      handleInputChange('areaSqm', parseFloat(area.toFixed(2)));
      return;
    }

    // Pour 4 côtés
    if (sides.length === 4) {
      const lengths = sides.map(s => parseFloat(s.length));
      
      // Pour un rectangle : Nord/Sud sont opposés et Est/Ouest sont opposés
      const isRectangle = (
        Math.abs(lengths[0] - lengths[1]) < 0.1 &&
        Math.abs(lengths[2] - lengths[3]) < 0.1
      );
      
      if (isRectangle) {
        const area = lengths[0] * lengths[2];
        handleInputChange('areaSqm', parseFloat(area.toFixed(2)));
        return;
      }
      
      // Formule de Brahmagupta (approximation quadrilatère cyclique)
      const a = lengths[0], b = lengths[2], c = lengths[1], d = lengths[3];
      const s = (a + b + c + d) / 2;
      const brahmVal = (s - a) * (s - b) * (s - c) * (s - d);
      if (brahmVal <= 0) return;
      const area = Math.sqrt(brahmVal);
      handleInputChange('areaSqm', parseFloat(area.toFixed(2)));
      return;
    }
    
    // Pour plus de 4 côtés, utiliser une approximation polygone régulier
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

    const natureMap = getPicklistDependentOptions('picklist_construction_nature');
    const natures = natureMap[formData.constructionType] || [];
    
    setAvailableConstructionNatures(natures);
    
    // Réinitialiser la nature si elle n'est plus valide
    if (formData.constructionNature && !natures.includes(formData.constructionNature)) {
      handleInputChange('constructionNature', undefined);
    }
  }, [formData.constructionType, getPicklistDependentOptions]);

  // Logique de dépendance: Type + Nature -> Usage déclaré
  useEffect(() => {
    if (!formData.constructionType || !formData.constructionNature) {
      setAvailableDeclaredUsages([]);
      handleInputChange('declaredUsage', undefined);
      return;
    }

    const usageMap = getPicklistDependentOptions('picklist_declared_usage');
    
    // Try specific key first (e.g. "Résidentielle_Durable"), then nature-only key (e.g. "Non bâti")
    const specificKey = `${formData.constructionType}_${formData.constructionNature}`;
    const usages = usageMap[specificKey] || usageMap[formData.constructionNature] || [];
    
    setAvailableDeclaredUsages(usages);
    
    // Réinitialiser l'usage si il n'est plus valide
    if (formData.declaredUsage && !usages.includes(formData.declaredUsage)) {
      handleInputChange('declaredUsage', undefined);
    }
  }, [formData.constructionType, formData.constructionNature, getPicklistDependentOptions]);

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
    formDirtyRef.current = true;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // ✅ FIX P1-1: Helper to mark form as dirty for sub-array changes
  const markDirty = useCallback(() => {
    formDirtyRef.current = true;
  }, []);

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

      const { data: signedData, error: signedError } = await supabase.storage
        .from('cadastral-documents')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

      if (signedError || !signedData?.signedUrl) {
        console.error('Signed URL error:', signedError);
        return null;
      }

      return signedData.signedUrl;
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

    // Vérification de contribution dupliquée (même parcelle, en attente)
    if (!editingContributionId) {
      const authenticatedUserId = user?.id || session?.user?.id;
      if (authenticatedUserId) {
        const { data: existingContribs } = await supabase
          .from('cadastral_contributions')
          .select('id, status')
          .eq('parcel_number', formData.parcelNumber)
          .eq('user_id', authenticatedUserId)
          .in('status', ['pending', 'returned'])
          .limit(1);
        
        const existingContrib = existingContribs?.[0];
        if (existingContrib) {
          toast({
            title: "Contribution existante",
            description: `Vous avez déjà une contribution ${existingContrib.status === 'returned' ? 'à corriger' : 'en attente'} pour cette parcelle. Veuillez la modifier depuis votre tableau de bord.`,
            variant: "destructive"
          });
          return;
        }
      }
    }

    // Validation centralisée - utilise getMissingFields() pour cohérence
    const missingFields = getMissingFields();
    if (missingFields.length > 0) {
      // Regrouper les champs manquants par onglet pour un message clair
      const fieldsByTab: { [key: string]: string[] } = {};
      missingFields.forEach(f => {
        if (!fieldsByTab[f.tab]) fieldsByTab[f.tab] = [];
        fieldsByTab[f.tab].push(f.label);
      });
      
      const tabNames: { [key: string]: string } = {
        general: 'Infos',
        location: 'Lieu',
        permits: 'Permis'
      };
      
      const summary = Object.entries(fieldsByTab)
        .map(([tab, fields]) => `${tabNames[tab] || tab}: ${fields.join(', ')}`)
        .join(' | ');
      
      toast({
        title: "Champs requis manquants",
        description: summary.length > 100 ? `${missingFields.length} champs manquants. Voir les détails dans l'onglet Envoi.` : summary,
        variant: "destructive"
      });
      return;
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

      // Upload tax receipt files and transform data - filter out empty/invalid records
      const taxHistoryData = (await Promise.all(
        taxRecords
          .filter(tax => tax.taxYear && tax.taxAmount) // Skip empty records
          .map(async (tax) => {
            let receiptUrl = null;
            if (tax.receiptFile) {
              receiptUrl = await uploadFile(tax.receiptFile, 'tax-receipts');
              if (!receiptUrl) {
                throw new Error('Erreur lors du téléchargement du reçu de taxe');
              }
            }
            const parsedYear = parseInt(tax.taxYear);
            const parsedAmount = parseFloat(tax.taxAmount);
            // Guard against NaN values
            if (isNaN(parsedYear) || isNaN(parsedAmount)) return null;
            return {
              taxYear: parsedYear,
              amountUsd: parsedAmount,
              paymentStatus: tax.paymentStatus,
              paymentDate: tax.paymentDate || undefined,
              receiptUrl: receiptUrl || undefined,
              taxType: tax.taxType
            };
          })
      )).filter(Boolean); // Remove nulls

      // Upload mortgage receipt files and transform data - filter out empty/invalid records
      const mortgageHistoryData = (await Promise.all(
        mortgageRecords
          .filter(m => m.mortgageAmount && m.duration && m.creditorName) // Skip empty records
          .map(async (mortgage) => {
            let receiptUrl = null;
            if (mortgage.receiptFile) {
              receiptUrl = await uploadFile(mortgage.receiptFile, 'mortgage-documents');
              if (!receiptUrl) {
                throw new Error('Erreur lors du téléchargement du document d\'hypothèque');
              }
            }
            const parsedAmount = parseFloat(mortgage.mortgageAmount);
            const parsedDuration = parseInt(mortgage.duration);
            // Guard against NaN values
            if (isNaN(parsedAmount) || isNaN(parsedDuration)) return null;
            return {
              mortgageAmountUsd: parsedAmount,
              durationMonths: parsedDuration,
              creditorName: mortgage.creditorName,
              creditorType: mortgage.creditorType,
              contractDate: mortgage.contractDate,
              mortgageStatus: mortgage.mortgageStatus,
              receiptUrl: receiptUrl || undefined
            };
          })
      )).filter(Boolean); // Remove nulls
      
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
                throw new Error('Erreur lors du téléchargement de l\'autorisation de bâtir');
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
      
      // Transform GPS coordinates data - filter out invalid/empty coordinates
      const validGpsCoordinates = gpsCoordinates.filter(coord => {
        const lat = parseFloat(coord.lat);
        const lng = parseFloat(coord.lng);
        // Only include coordinates that are valid numbers within valid ranges
        return !isNaN(lat) && !isNaN(lng) && 
               lat >= -90 && lat <= 90 && 
               lng >= -180 && lng <= 180 &&
               coord.lat !== '' && coord.lng !== '';
      });
      
      const gpsCoordinatesData = validGpsCoordinates.length > 0 ? validGpsCoordinates.map(coord => ({
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
        // For "Autre", store the custom title name as the effective property_title_type
        propertyTitleType: getEffectiveTitleName(formData.propertyTitleType, customTitleName) || formData.propertyTitleType,
        parcelType: sectionType === 'urbaine' ? 'SU' as const : sectionType === 'rurale' ? 'SR' as const : undefined, // Type de parcelle (Section Urbaine/Rurale)
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

      // Use update if editing, otherwise insert
      const result = editingContributionId 
        ? await updateContribution(editingContributionId, dataToSubmit)
        : await submitContribution(dataToSubmit);
      
      if (result?.success) {
        // Effacer les données sauvegardées après une soumission réussie
        clearSavedFormData();
        formDirtyRef.current = false;
        isClosingAfterSuccessRef.current = true;
        
        // Afficher le succès directement (pas de page de paiement permis)
        setShowSuccess(true);
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
      entityType: '',
      entitySubType: '',
      entitySubTypeOther: '',
      stateExploitedBy: '',
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
    markDirty();
  };

  const removePreviousOwner = (index: number) => {
    setPreviousOwners(previousOwners.filter((_, i) => i !== index));
    markDirty();
  };

  const updatePreviousOwner = (index: number, field: string | Record<string, string>, value?: string) => {
    markDirty();
    setPreviousOwners(prev => {
      const updated = [...prev];
      if (typeof field === 'string') {
        updated[index] = { ...updated[index], [field]: value };
        if (field === 'startDate' && value && index < updated.length - 1) {
          updated[index + 1] = { ...updated[index + 1], endDate: value };
        }
      } else {
        updated[index] = { ...updated[index], ...field };
      }
      return updated;
    });
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
      gender: '',
      entityType: '',
      entitySubType: '',
      entitySubTypeOther: '',
      stateExploitedBy: '',
      rightType: '',
      since: ''
    }]);
    markDirty();
  };

  const removeCurrentOwner = (index: number) => {
    if (currentOwners.length > 1) {
      setCurrentOwners(currentOwners.filter((_, i) => i !== index));
      markDirty();
    }
  };

  const updateCurrentOwner = (index: number, field: string | Record<string, string>, value?: string) => {
    markDirty();
    setCurrentOwners(prev => {
      const updated = [...prev];
      if (typeof field === 'string') {
        updated[index] = { ...updated[index], [field]: value };
      } else {
        updated[index] = { ...updated[index], ...field };
      }
      return updated;
    });
  };

  // Fonctions pour gérer les taxes
  const addTaxRecord = () => {
    const firstTax = taxRecords[0];
    
    // FIX #10: Relaxed validation - don't require paymentDate if status is unpaid
    if (!firstTax?.taxType || !firstTax?.taxYear || !firstTax?.taxAmount || !firstTax?.paymentStatus) {
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
    markDirty();
  };

  const removeTaxRecord = (index: number) => {
    setTaxRecords(taxRecords.filter((_, i) => i !== index));
    markDirty();
  };

  const updateTaxRecord = (index: number, field: string, value: string) => {
    const updated = [...taxRecords];
    updated[index] = { ...updated[index], [field]: value };
    setTaxRecords(updated);
    markDirty();
  };

  // FIX #21: Shared file validation for taxes and mortgages
  const validateAttachmentFile = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Type de fichier non valide",
        description: "Seuls les fichiers JPG, PNG, WEBP et PDF sont acceptés",
        variant: "destructive"
      });
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale est de 5 MB",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const handleTaxFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!validateAttachmentFile(file)) return;
      const updated = [...taxRecords];
      updated[index] = { ...updated[index], receiptFile: file };
      setTaxRecords(updated);
    }
    e.target.value = '';
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
    markDirty();
  };

  const updateMortgageRecord = (index: number, field: string, value: string) => {
    const updated = [...mortgageRecords];
    updated[index] = { ...updated[index], [field]: value };
    setMortgageRecords(updated);
    markDirty();
  };

  const handleMortgageFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!validateAttachmentFile(file)) return;
      const updated = [...mortgageRecords];
      updated[index] = { ...updated[index], receiptFile: file };
      setMortgageRecords(updated);
    }
    e.target.value = '';
  };

  const removeMortgageFile = (index: number) => {
    const updated = [...mortgageRecords];
    updated[index] = { ...updated[index], receiptFile: null };
    setMortgageRecords(updated);
  };
  
  // Fonctions pour gérer les autorisations de bâtir
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
    markDirty();
  };
  
  const updateBuildingPermit = (index: number, field: string, value: string) => {
    const updated = [...buildingPermits];
    updated[index] = { ...updated[index], [field]: value };
    setBuildingPermits(updated);
    markDirty();
  };

  const updateBuildingPermitFile = (index: number, file: File | null) => {
    const updated = [...buildingPermits];
    updated[index] = { ...updated[index], attachmentFile: file };
    setBuildingPermits(updated);
    markDirty();
  };

  const removeBuildingPermitFile = (index: number) => {
    const updated = [...buildingPermits];
    updated[index] = { ...updated[index], attachmentFile: null };
    setBuildingPermits(updated);
    markDirty();
  };

  // Logiques dépendantes pour les autorisations de bâtir
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
      restrictions.messageExisting = `Vous avez indiqué dans "Type de construction" que c'est un terrain nu. Un terrain nu n'a pas besoin d'une autorisation de régularisation, mais plutôt d'une autorisation de bâtir.`;
      restrictions.messageRequest = `Vous avez indiqué dans "Type de construction" que c'est un "terrain nu". Un terrain nu n'a pas besoin d'une autorisation de régularisation, mais plutôt d'une autorisation de bâtir.`;
      restrictions.dateMinExisting = threeYearsAgo.toISOString().split('T')[0];
      restrictions.dateMaxExisting = today.toISOString().split('T')[0];
      return restrictions;
    }

    // Logique 2: Si nature de construction = "Précaire"
    if (formData.constructionNature === 'Précaire') {
      restrictions.blockedInExisting = 'regularization';
      restrictions.blockedInRequest = 'regularization';
      restrictions.messageExisting = `Vous avez indiqué dans "Nature de construction" que c'est une construction précaire. Une construction précaire n'a pas besoin d'une autorisation de régularisation, mais plutôt d'une autorisation de bâtir.`;
      restrictions.messageRequest = `Vous avez indiqué dans "Nature de construction" que c'est une construction "Précaire". Une construction précaire n'a pas besoin d'une autorisation de régularisation, mais plutôt d'une autorisation de bâtir.`;
      restrictions.dateMinExisting = threeYearsAgo.toISOString().split('T')[0];
      restrictions.dateMaxExisting = today.toISOString().split('T')[0];
      return restrictions;
    }

    // Logique 3: Si type de construction ≠ "terrain nu"
    // Les deux options (Autorisation de bâtir et Autorisation de régularisation) restent disponibles
    if (formData.constructionType && formData.constructionType !== 'Terrain nu') {
      // Dates pour autorisation de bâtir: 3 ans passé - 1 mois avant aujourd'hui
      restrictions.dateMinExisting = threeYearsAgo.toISOString().split('T')[0];
      restrictions.dateMaxExisting = oneMonthAgo.toISOString().split('T')[0];
      
      // Dates pour autorisation de régularisation: 3 ans passé - aujourd'hui
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
    markDirty();
  };
  
  const removeGPSCoordinate = (index: number) => {
    setGpsCoordinates(gpsCoordinates.filter((_, i) => i !== index));
    
    // Supprimer automatiquement le côté correspondant
    if (parcelSides.length > 2 && index < parcelSides.length) {
      setParcelSides(parcelSides.filter((_, i) => i !== index));
    }
    markDirty();
  };
  
  const updateGPSCoordinate = (index: number, field: string, value: any) => {
    const updated = [...gpsCoordinates];
    updated[index] = { ...updated[index], [field]: value };
    setGpsCoordinates(updated);
    markDirty();
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
    
    // Marquer comme en cours de détection via callback pour éviter les stale closures
    setGpsCoordinates(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], detecting: true };
      return updated;
    });
    
    toast({
      title: "Détection en cours...",
      description: "Veuillez patienter pendant que nous obtenons votre position GPS",
    });
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Utiliser le callback de setState pour toujours avoir l'état le plus récent
        setGpsCoordinates(prev => {
          const finalUpdate = [...prev];
          finalUpdate[index] = {
            ...finalUpdate[index],
            lat: position.coords.latitude.toFixed(6),
            lng: position.coords.longitude.toFixed(6),
            detected: true,
            detecting: false
          };
          return finalUpdate;
        });
        
        toast({
          title: "Borne détectée",
          description: `Coordonnées enregistrées avec succès (précision: ±${Math.round(position.coords.accuracy)}m)`,
        });
      },
      (error) => {
        // Utiliser le callback pour éviter le stale closure
        setGpsCoordinates(prev => {
          const errorUpdate = [...prev];
          errorUpdate[index] = { ...errorUpdate[index], detecting: false };
          return errorUpdate;
        });
        
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
        timeout: 30000,
        maximumAge: 5000
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
    const newSides = [...parcelSides, {
      name: `Côté ${sideNumber}`,
      length: ''
    }];
    setParcelSides(newSides);
    
    // Ajouter automatiquement une borne GPS correspondante
    const borneNumber = gpsCoordinates.length + 1;
    setGpsCoordinates([...gpsCoordinates, {
      borne: `Borne ${borneNumber}`,
      lat: '',
      lng: ''
    }]);
    markDirty();
  };

  // FIX #9: Remove the correct GPS borne at the same index, not always the last one
  const removeParcelSide = (index: number) => {
    if (parcelSides.length > 2) {
      setParcelSides(parcelSides.filter((_, i) => i !== index));
      
      // Remove the corresponding GPS coordinate at the same index
      if (index < gpsCoordinates.length) {
        setGpsCoordinates(gpsCoordinates.filter((_, i) => i !== index));
      }
      markDirty();
    }
  };

  const updateParcelSide = (index: number, field: 'name' | 'length', value: string) => {
    const updated = [...parcelSides];
    updated[index] = { ...updated[index], [field]: value };
    setParcelSides(updated);
    markDirty();
  };


  // Calculer la valeur CCC estimée (similaire au backend calculate_ccc_value)
  const calculateCCCValue = useMemo(() => {
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
    
    // SECTION 3: Autorisation de bâtir (3 champs)
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
    
    // boundaryHistory n'a pas d'UI de saisie - toujours 0 en front-end
    // Le backend vérifie boundary_history dans la contribution
    
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
  }, [formData, currentOwners, buildingPermits, permitRequest, gpsCoordinates, previousOwners, taxRecords, mortgageRecords, ownerDocFile, titleDocFiles]);

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

  // FIX #27: Lazy confetti trigger
  const triggerConfetti = async () => {
    const confetti = await lazyConfetti();
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

  // Attempt to close: check for unsaved changes first
  const handleAttemptClose = useCallback(() => {
    // If closing after success or no dirty data, close immediately
    if (isClosingAfterSuccessRef.current || showSuccess || !formDirtyRef.current) {
      handleClose();
      return;
    }
    
    // Check if any meaningful data was entered
    const hasData = Object.keys(formData).length > 1 || 
                   currentOwners.some(o => o.lastName || o.firstName) ||
                   previousOwners.some(o => o.name) ||
                   taxRecords.some(t => t.taxAmount) ||
                   mortgageRecords.some(m => m.mortgageAmount) ||
                   buildingPermits.some(p => p.permitNumber) ||
                   gpsCoordinates.some(g => g.lat || g.lng);
    
    if (hasData) {
      // Save draft before showing confirmation
      saveFormDataToStorage();
      setShowExitConfirmation(true);
    } else {
      handleClose();
    }
  }, [formData, currentOwners, previousOwners, taxRecords, mortgageRecords, buildingPermits, gpsCoordinates, showSuccess, saveFormDataToStorage]);

  const handleClose = () => {
    // Reset dirty flag
    formDirtyRef.current = false;
    isClosingAfterSuccessRef.current = false;
    
    // Reset form data
    setFormData({ parcelNumber: parcelNumber });
    setShowSuccess(false);
    setShowQuickAuth(false);
    setPendingSubmission(false);
    setUploading(false);
    setOwnerDocFile(null);
    setTitleDocFiles([]);
    setSectionType('');
    setSectionTypeAutoDetected(false);
    setActiveTab('general');
    setHasShownConfetti(false);
    setShowExitConfirmation(false);
    
    // Reset ownership
    setOwnershipMode('unique');
    setLeaseYears(0);
    setPreviousOwners([{
      name: '',
      legalStatus: 'Personne physique',
      entityType: '',
      entitySubType: '',
      entitySubTypeOther: '',
      stateExploitedBy: '',
      startDate: '',
      endDate: '',
      mutationType: 'Vente'
    }]);
    setCurrentOwners([{
      lastName: '',
      middleName: '',
      firstName: '',
      legalStatus: 'Personne physique',
      gender: '',
      entityType: '',
      entitySubType: '',
      entitySubTypeOther: '',
      stateExploitedBy: '',
      rightType: '',
      since: ''
    }]);
    
    // Reset obligations
    setHasMortgage(null);
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
    
    // Reset location
    setParcelSides([
      { name: 'Côté Nord', length: '' },
      { name: 'Côté Sud', length: '' },
      { name: 'Côté Est', length: '' },
      { name: 'Côté Ouest', length: '' }
    ]);
    setAvailableVilles([]);
    setAvailableCommunes([]);
    setAvailableTerritoires([]);
    setAvailableCollectivites([]);
    setAvailableQuartiers([]);
    setAvailableAvenues([]);
    setAvailableConstructionNatures([]);
    setAvailableDeclaredUsages([]);
    setRoadSides([]);
    
    // Reset permits
    setPermitMode('existing');
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
    setPermitRequest({
      permitType: 'construction',
      hasExistingConstruction: false,
      constructionDescription: '',
      plannedUsage: '',
      estimatedArea: '',
      applicantName: '',
      applicantPhone: '',
      applicantEmail: '',
      selectedOwnerIndex: -1,
      numberOfFloors: '',
      buildingMaterials: '',
      architecturalPlanImages: [],
      constructionYear: '',
      regularizationReason: '',
      originalPermitNumber: '',
      previousPermitNumber: '',
      constructionPhotos: []
    });
    
    // Reset GPS
    setGpsCoordinates([]);
    
    // Reset all warning states
    setShowRequiredFieldsPopover(false);
    setHighlightRequiredFields(false);
    setShowOwnerWarning(false);
    setHighlightIncompleteOwner(false);
    setShowPermitWarning(false);
    setHighlightIncompletePermit(false);
    setShowPreviousOwnerWarning(false);
    setHighlightIncompletePreviousOwner(false);
    setHighlightSuperficie(false);
    setShowGPSWarning(false);
    setShowTaxWarning(false);
    setHighlightIncompleteTax(false);
    setShowMortgageWarning(false);
    setHighlightIncompleteMortgage(false);
    setShowCurrentOwnerRequiredWarning(false);
    setShowPermitTypeBlockedWarning(false);
    setPermitTypeBlockedMessage('');
    setShowAreaMismatchWarning(false);
    setAreaMismatchMessage('');
    setShouldBlinkSuperficie(false);
    setShowUsageLockedWarning(false);
    
    onOpenChange(false);
  };


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
      <Dialog open={open} onOpenChange={handleAttemptClose}>
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
              onValueChange={(value) => {
                handleInputChange('propertyTitleType', value);
                if (value !== 'Autre') setCustomTitleName('');
              }}
              leaseType={formData.leaseType}
              onLeaseTypeChange={(type) => handleInputChange('leaseType', type)}
              leaseYears={leaseYears}
              onLeaseYearsChange={setLeaseYears}
              customTitleName={customTitleName}
              onCustomTitleNameChange={setCustomTitleName}
            />

            {formData.propertyTitleType && formData.propertyTitleType !== 'Autre' && (
              <Card className="max-w-[360px] mx-auto rounded-2xl shadow-md border-border/50 overflow-hidden animate-fade-in">
                <CardContent className="p-3 space-y-3">
                  {/* Numéro de référence et Date de délivrance - côte-à-côte */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="titleReference" className="text-sm font-medium">
                        N° {formData.propertyTitleType ? (() => {
                          const titleType = formData.propertyTitleType;
                          const abbreviations: Record<string, string> = {
                            "Certificat d'enregistrement": "Cert. d'enreg.",
                            "Contrat de location (Contrat d'occupation provisoire)": "Contr. de loc.",
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
                        {formData.leaseType === 'renewal' ? 'Date renouvellement' : 'Date délivrance'}
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
                        Images ou pdf du {getEffectiveTitleName(formData.propertyTitleType, customTitleName)?.toLowerCase() || 'titre de propriété'} <span className="text-destructive">*</span>
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

            {/* Card for "Autre" title type - reference, date and document */}
            {formData.propertyTitleType === 'Autre' && customTitleName?.trim() && (
              <Card className="max-w-[360px] mx-auto rounded-2xl shadow-md border-border/50 overflow-hidden animate-fade-in">
                <CardContent className="p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="titleReference" className="text-sm font-medium">
                        N° {customTitleName.length > 15 ? customTitleName.substring(0, 15) + '…' : customTitleName}
                      </Label>
                      <InputWithPopover
                        id="titleReference"
                        placeholder="Numéro de référence"
                        value={formData.titleReferenceNumber || ''}
                        onChange={(e) => handleInputChange('titleReferenceNumber', e.target.value)}
                        helpTitle="Référence"
                        helpText="Numéro figurant sur votre document"
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
                </CardContent>
              </Card>
            )}

            {/* Le titre foncier est-il au nom du propriétaire actuel? - Affiché uniquement si N° Titre foncier est rempli */}
            {formData.titleReferenceNumber && formData.titleReferenceNumber.trim() !== '' && (
              <Card className="max-w-[360px] mx-auto rounded-2xl shadow-md border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 overflow-hidden">
                <CardContent className="p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-amber-900 dark:text-amber-100">
                      Ce titre de type "{getEffectiveTitleName(formData.propertyTitleType, customTitleName) || 'non sélectionné'}" est-il au nom du propriétaire actuel ?
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
                        ? `Ajouter le/la propriétaire figurant sur le ${getEffectiveTitleName(formData.propertyTitleType, customTitleName) || 'titre de propriété'}`
                        : formData.isTitleInCurrentOwnerName === false
                        ? "Alors, indiquer le nom du propriétaire actuel tel qu'il figure dans tout document prouvant son droit sur la parcelle."
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
                    {/* Étiquette copropriétaire */}
                    <div className="flex items-center justify-between">
                      {ownershipMode === 'multiple' && (
                        <span className="text-sm font-semibold text-primary">Copropriétaire {index + 1}</span>
                      )}
                      {/* Bouton supprimer si plusieurs propriétaires */}
                      {currentOwners.length > 1 && index > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCurrentOwner(index)}
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 rounded-xl ml-auto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Statut juridique - en premier pour conditionner les champs */}
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Statut juridique</Label>
                      {index > 0 ? (
                        // Copropriétaires sont bloqués sur Personne physique
                        <Input 
                          value="Personne physique" 
                          readOnly 
                          className="h-10 text-sm rounded-xl bg-muted cursor-not-allowed"
                        />
                      ) : (
                        <Select 
                          value={owner.legalStatus}
                          onValueChange={(value) => {
                            updateCurrentOwner(index, {
                              legalStatus: value,
                              entityType: '',
                              entitySubType: '',
                              entitySubTypeOther: '',
                              stateExploitedBy: '',
                              rightType: '',
                              gender: '',
                              ...(value !== 'Personne physique' ? { middleName: '' } : {}),
                            });
                            // Reset ownership mode if not personne physique
                            if (value !== 'Personne physique' && index === 0) {
                              setOwnershipMode('unique');
                              // Remove extra owners if switching away from personne physique
                              if (currentOwners.length > 1) {
                                setCurrentOwners(prev => [prev[0]]);
                              }
                            }
                          }}
                        >
                          <SelectTrigger className="h-10 text-sm rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {getPicklistOptions('picklist_legal_status').map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {owner.legalStatus === 'Personne physique' && (
                      <div className="space-y-1 animate-fade-in">
                        <Label className="text-sm font-medium">Genre *</Label>
                        <Select
                          value={owner.gender || ''}
                          onValueChange={(value) => updateCurrentOwner(index, { gender: value })}
                        >
                          <SelectTrigger className="h-10 text-sm rounded-xl">
                            <SelectValue placeholder="Sélectionner le genre" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {getPicklistOptions('picklist_gender').map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {owner.legalStatus === 'Personne morale' ? (
                      <div className="space-y-2">
                        {/* Type d'entreprise */}
                        <div className="space-y-1">
                          <Label className="text-sm font-medium">Type d'entreprise *</Label>
                          <Select
                            value={owner.entityType || ''}
                            onValueChange={(value) => {
                              updateCurrentOwner(index, { entityType: value, entitySubType: '', entitySubTypeOther: '' });
                            }}
                          >
                            <SelectTrigger className="h-10 text-sm rounded-xl">
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {getPicklistOptions('picklist_entity_type').map(opt => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Sous-type dépendant */}
                        {owner.entityType === 'Société' && (
                          <div className="space-y-1 animate-fade-in">
                            <Label className="text-sm font-medium">Forme juridique *</Label>
                            <Select
                              value={owner.entitySubType || ''}
                              onValueChange={(value) => {
                                updateCurrentOwner(index, { entitySubType: value, ...(value !== 'Autre' ? { entitySubTypeOther: '' } : {}) });
                              }}
                            >
                              <SelectTrigger className="h-10 text-sm rounded-xl">
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {getPicklistOptions('picklist_entity_subtype_societe').map(opt => (
                                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {owner.entitySubType === 'Autre' && (
                              <Input
                                placeholder="Précisez la forme juridique"
                                value={owner.entitySubTypeOther || ''}
                                onChange={(e) => updateCurrentOwner(index, 'entitySubTypeOther', e.target.value)}
                                className="h-10 text-sm rounded-xl mt-1"
                              />
                            )}
                          </div>
                        )}

                        {owner.entityType === 'Association' && (
                          <div className="space-y-1 animate-fade-in">
                            <Label className="text-sm font-medium">Type d'association *</Label>
                            <Select
                              value={owner.entitySubType || ''}
                              onValueChange={(value) => {
                                updateCurrentOwner(index, { entitySubType: value, ...(value !== 'Autre' ? { entitySubTypeOther: '' } : {}) });
                              }}
                            >
                              <SelectTrigger className="h-10 text-sm rounded-xl">
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {getPicklistOptions('picklist_entity_subtype_association').map(opt => (
                                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {owner.entitySubType === 'Autre' && (
                              <Input
                                placeholder="Précisez le type d'association"
                                value={owner.entitySubTypeOther || ''}
                                onChange={(e) => updateCurrentOwner(index, 'entitySubTypeOther', e.target.value)}
                                className="h-10 text-sm rounded-xl mt-1"
                              />
                            )}
                          </div>
                        )}

                        {/* Raison sociale / Dénomination + N° RCCM / Arrêté */}
                        {owner.entityType && (
                          <div className="space-y-2 animate-fade-in">
                            <div className="space-y-1">
                              <Label className="text-sm font-medium">
                                {owner.entityType === 'Association' ? 'Dénomination *' : 'Raison sociale *'}
                              </Label>
                              <Input
                                placeholder={owner.entityType === 'Association' ? "Dénomination de l'association" : "Dénomination officielle"}
                                value={owner.lastName}
                                onChange={(e) => updateCurrentOwner(index, 'lastName', e.target.value)}
                                className="h-10 text-sm rounded-xl"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-sm font-medium">
                                {owner.entityType === 'Association' ? "Numéro d'Arrêté ministériel d'autorisation *" : "N° d'identification (RCCM) *"}
                              </Label>
                              <Input
                                placeholder={owner.entityType === 'Association' ? "Ex: 0XX/CAB/MIN/..." : "Ex: CD/KIN/RCCM/XX-X-XXXXX"}
                                value={owner.firstName}
                                onChange={(e) => updateCurrentOwner(index, 'firstName', e.target.value)}
                                className="h-10 text-sm rounded-xl"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : owner.legalStatus === 'État' ? (
                      <div className="space-y-2">
                        {/* Type de droit */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Label className="text-sm font-medium">Type de droit *</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-4 w-4 p-0 rounded-full">
                                  <Info className="h-3 w-3 text-muted-foreground" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 rounded-xl text-xs">
                                <p className="text-muted-foreground">
                                  Il s'agit de déterminer la nature du droit d'exploitation que détient l'occupant de cette parcelle.
                                </p>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <Select
                            value={owner.rightType || ''}
                            onValueChange={(value) => {
                              updateCurrentOwner(index, 'rightType', value);
                            }}
                          >
                            <SelectTrigger className="h-10 text-sm rounded-xl">
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {getPicklistOptions('picklist_right_type').map(opt => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-sm font-medium">Exploitée par *</Label>
                          <SuggestivePicklist
                            picklistKey="state_agencies_drc"
                            label=""
                            placeholder="Rechercher un service ou agence de l'État..."
                            maxSelection={1}
                            selectedValues={owner.stateExploitedBy ? [owner.stateExploitedBy] : []}
                            onSelectionChange={(values) => {
                              const val = values[0] || '';
                              updateCurrentOwner(index, { stateExploitedBy: val, lastName: val, firstName: 'État' });
                            }}
                          />
                        </div>
                      </div>
                    ) : (
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
                    )}

                    <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Label className="text-sm font-medium">
                            {owner.legalStatus === 'État' && owner.rightType === 'Concession' ? 'Concédé depuis' 
                              : owner.legalStatus === 'État' && owner.rightType === 'Affectation' ? 'Affecté depuis'
                              : 'Propriétaire depuis'}
                          </Label>
                          {formData.isTitleInCurrentOwnerName === false && formData.titleIssueDate && index === 0 && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-4 w-4 p-0 rounded-full">
                                  <Info className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-72 rounded-xl text-xs">
                                <p className="text-muted-foreground">
                                  <strong>⚠️ Règle de cohérence :</strong> Le propriétaire actuel a acquis la parcelle après la délivrance du titre à l'ancien propriétaire. Cette date doit donc être postérieure ou égale à la date de délivrance du titre ({formData.titleIssueDate ? new Date(formData.titleIssueDate).toLocaleDateString('fr-FR') : 'non définie'}).
                                </p>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                        <Input
                          type="date"
                          max={new Date().toISOString().split('T')[0]}
                          min={formData.isTitleInCurrentOwnerName === false && formData.titleIssueDate && index === 0 ? formData.titleIssueDate : undefined}
                          value={index > 0 && ownershipMode === 'multiple' ? currentOwners[0]?.since || '' : owner.since}
                          onChange={(e) => updateCurrentOwner(index, 'since', e.target.value)}
                          className={`h-10 text-sm rounded-xl ${formData.isTitleInCurrentOwnerName === true && index === 0 ? 'cursor-not-allowed opacity-70' : ''} ${
                            index > 0 && ownershipMode === 'multiple' ? 'cursor-not-allowed opacity-70 bg-muted' : ''
                          } ${
                            formData.isTitleInCurrentOwnerName === false && formData.titleIssueDate && owner.since && index === 0 && new Date(owner.since) < new Date(formData.titleIssueDate) 
                              ? 'border-destructive ring-1 ring-destructive' 
                              : ''
                          }`}
                          disabled={(formData.isTitleInCurrentOwnerName === true && index === 0) || (index > 0 && ownershipMode === 'multiple')}
                          title={index > 0 && ownershipMode === 'multiple' ? 'Date synchronisée avec le copropriétaire 1' : formData.isTitleInCurrentOwnerName === true && index === 0 ? 'Cette date est synchronisée avec la date de délivrance du titre' : undefined}
                        />
                        {formData.isTitleInCurrentOwnerName === true && index === 0 && (
                          <p className="text-xs text-muted-foreground">
                            Synchronisée avec la date de délivrance
                          </p>
                        )}
                        {index > 0 && ownershipMode === 'multiple' && (
                          <p className="text-xs text-muted-foreground">
                            Synchronisée avec le copropriétaire 1
                          </p>
                        )}
                        {formData.isTitleInCurrentOwnerName === false && formData.titleIssueDate && owner.since && index === 0 && new Date(owner.since) < new Date(formData.titleIssueDate) && (
                          <p className="text-xs text-destructive">
                            ⚠️ Date invalide : doit être ≥ {new Date(formData.titleIssueDate).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>

                    {/* Pièce d'identité / Document juridique */}
                    <div className="space-y-1.5 pt-2 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium">
                          {currentOwners[0]?.legalStatus === 'Personne morale' && currentOwners[0]?.entityType === 'Association'
                            ? "Arrêté ministériel d'autorisation de fonctionnement"
                            : currentOwners[0]?.legalStatus === 'Personne morale' && currentOwners[0]?.entityType === 'Société'
                              ? "Certificat d'immatriculation au RCCM"
                              : currentOwners[0]?.legalStatus === 'État' && currentOwners[0]?.rightType === 'Concession'
                                ? "Titre de concession"
                                : currentOwners[0]?.legalStatus === 'État' && currentOwners[0]?.rightType === 'Affectation'
                                  ? "Acte d'affectation"
                                  : "Pièce d'identité (optionnel)"}
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-4 w-4 p-0 rounded-full">
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 rounded-xl text-xs">
                            <p className="text-muted-foreground">
                              {currentOwners[0]?.legalStatus === 'Personne morale' && currentOwners[0]?.entityType === 'Association'
                                ? "Joignez une copie de l'arrêté ministériel autorisant le fonctionnement de l'association. Ce document atteste de son existence légale."
                                : currentOwners[0]?.legalStatus === 'Personne morale' && currentOwners[0]?.entityType === 'Société'
                                  ? "Joignez une copie du certificat d'immatriculation au Registre du Commerce et du Crédit Mobilier (RCCM) de la société."
                                  : currentOwners[0]?.legalStatus === 'État' && currentOwners[0]?.rightType === 'Concession'
                                    ? "Joignez une copie du titre de concession délivré par l'autorité compétente."
                                    : currentOwners[0]?.legalStatus === 'État' && currentOwners[0]?.rightType === 'Affectation'
                                      ? "Joignez une copie de l'acte d'affectation délivré par l'autorité compétente."
                                      : "La pièce d'identité renforce la crédibilité de votre contribution."}
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
                          {currentOwners[0]?.legalStatus === 'Personne morale' && currentOwners[0]?.entityType === 'Association'
                            ? "Ajouter l'arrêté ministériel"
                            : currentOwners[0]?.legalStatus === 'Personne morale' && currentOwners[0]?.entityType === 'Société'
                              ? "Ajouter le certificat RCCM"
                              : currentOwners[0]?.legalStatus === 'État' && currentOwners[0]?.rightType === 'Concession'
                                ? "Ajouter le titre de concession"
                                : currentOwners[0]?.legalStatus === 'État' && currentOwners[0]?.rightType === 'Affectation'
                                  ? "Ajouter l'acte d'affectation"
                                  : "Ajouter la pièce d'identité"}
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

                {/* Unique/Plusieurs propriétaires - uniquement pour Personne physique */}
                {currentOwners[0]?.legalStatus === 'Personne physique' && (
                  <div className="space-y-2">
                    <RadioGroup
                      value={ownershipMode}
                      onValueChange={(value: 'unique' | 'multiple') => {
                        setOwnershipMode(value);
                        if (value === 'unique' && currentOwners.length > 1) {
                          setCurrentOwners(prev => [prev[0]]);
                        }
                      }}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="unique" id="ownership-unique" />
                        <Label htmlFor="ownership-unique" className="text-sm cursor-pointer">Unique propriétaire</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="multiple" id="ownership-multiple" />
                        <Label htmlFor="ownership-multiple" className="text-sm cursor-pointer">Plusieurs propriétaires</Label>
                      </div>
                    </RadioGroup>

                    {ownershipMode === 'multiple' && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addCurrentOwner}
                        className="w-full h-10 gap-2 text-sm font-medium rounded-2xl border-2 border-dashed hover:bg-primary/5 hover:border-primary transition-all"
                      >
                        <Plus className="h-4 w-4" />
                        Ajouter un copropriétaire
                      </Button>
                    )}
                  </div>
                )}
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
                          Catégorie de construction de votre parcelle : Résidentielle, Commerciale, Industrielle, Agricole ou Terrain nu.
                        </p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Type et Nature - côte-à-côte */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Type d'exploitation */}
                  <div className={`space-y-1.5 ${highlightRequiredFields && !formData.constructionType ? 'ring-2 ring-primary rounded-xl p-2 bg-primary/5 animate-pulse' : ''}`}>
                    <Label className="text-sm font-medium flex items-center gap-1">
                      Type d'exploitation
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
                          handleInputChange('constructionYear', undefined);
                        }
                        setHighlightRequiredFields(false);
                      }}
                    >
                      <SelectTrigger className="h-10 rounded-xl text-sm">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {getPicklistOptions('picklist_construction_type').map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
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
                          {getPicklistOptions('picklist_construction_materials').map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
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

                {/* Année de construction - visible sauf Terrain nu */}
                {formData.constructionType && formData.constructionType !== 'Terrain nu' && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Année de construction</Label>
                    <Select
                      value={formData.constructionYear?.toString() || ''}
                      onValueChange={(value) => handleInputChange('constructionYear', parseInt(value))}
                    >
                      <SelectTrigger className="h-10 rounded-xl text-sm">
                        <SelectValue placeholder="Sélectionner l'année" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl max-h-60">
                        {Array.from({ length: new Date().getFullYear() - 1950 + 1 }, (_, i) => new Date().getFullYear() - i).map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            
            {/* Section Autorisation de bâtir - Simplifié - Masquée si Terrain nu */}
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
                      Avez-vous obtenu une autorisation de bâtir pour votre construction {formData.constructionType?.toLowerCase() || ''}
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
                    Oui
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
                    Non
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
                            <span className="text-sm font-semibold text-foreground">Dernière autorisation de bâtir ou de régularisation délivrée</span>
                          </div>
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
                            Bâtir
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
                            <Label className="text-sm font-medium text-foreground">N° de l'autorisation</Label>
                            <Input
                              placeholder="PC-2024-001"
                              value={permit.permitNumber}
                              onChange={(e) => updateBuildingPermit(index, 'permitNumber', e.target.value)}
                              className="h-10 text-sm rounded-xl"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1">
                              <Label className="text-sm font-medium text-foreground">Date</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button type="button" className="inline-flex items-center justify-center h-4 w-4 rounded-full text-muted-foreground hover:text-primary transition-colors">
                                    <Info className="h-3 w-3" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 rounded-xl text-xs" align="start" sideOffset={5}>
                                  <div className="space-y-1">
                                    <h4 className="font-semibold text-sm">Date de délivrance</h4>
                                    <p className="text-muted-foreground leading-relaxed">
                                      L'autorisation de bâtir est délivrée <strong>avant</strong> le début des travaux. Sa date doit donc être antérieure ou égale à l'année de construction.
                                    </p>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                            <Input
                              type="date"
                              value={permit.issueDate}
                              max={formData.constructionYear ? `${formData.constructionYear}-12-31` : undefined}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (formData.constructionYear && value) {
                                  const permitYear = new Date(value).getFullYear();
                                  if (permitYear > formData.constructionYear) {
                                    toast({ title: "Date invalide", description: `L'autorisation doit être antérieure ou égale à l'année de construction (${formData.constructionYear}).`, variant: "destructive" });
                                    return;
                                  }
                                }
                                updateBuildingPermit(index, 'issueDate', value);
                              }}
                              className={cn("h-10 text-sm rounded-xl", permit.issueDate && formData.constructionYear && new Date(permit.issueDate).getFullYear() > formData.constructionYear && "border-destructive")}
                            />
                            {permit.issueDate && formData.constructionYear && new Date(permit.issueDate).getFullYear() > formData.constructionYear && (
                              <p className="text-[10px] text-destructive">Doit être ≤ {formData.constructionYear}</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-foreground">Service émetteur de l'autorisation</Label>
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
                          ⚠️ Complétez les informations de l'autorisation.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Mode: Pas de permis */}
                {permitMode === 'request' && (
                  <div className="animate-fade-in">
                    <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-3">
                      <p className="text-sm text-green-800 dark:text-green-200 text-center">
                        ✓ Pas de souci ! Vous pourrez faire une demande d'<strong>autorisation de régularisation</strong> pour votre construction plus tard, dès que votre parcelle sera ajoutée au cadastre numérique.
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

                  {/* Champ Numéro de la maison - visible uniquement si l'avenue est renseignée */}
                  {formData.avenue && formData.avenue.trim() !== '' && (
                    <div className="space-y-1.5 animate-fade-in">
                      <div className="flex items-center gap-1">
                        <Label htmlFor="houseNumber" className="text-sm">N° de la maison</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button type="button" variant="ghost" size="sm" className="h-4 w-4 p-0 rounded-full">
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 rounded-xl text-xs">
                            <p className="text-muted-foreground">
                              Il s'agit du numéro placardé devant la parcelle, près de l'entrée, utilisé pour faciliter la localisation de la maison dans le découpage administratif de la ville.
                            </p>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <Input
                        id="houseNumber"
                        className="h-9 text-sm rounded-xl"
                        placeholder="ex: 12, 45B"
                        value={formData.houseNumber || ''}
                        onChange={(e) => handleInputChange('houseNumber', e.target.value)}
                      />
                    </div>
                  )}
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
            {/* Alerte d'auto-remplissage si le titre n'est pas au nom du propriétaire actuel */}
            {formData.isTitleInCurrentOwnerName === false && formData.titleIssueDate && (
              <Card className="max-w-[360px] mx-auto rounded-2xl shadow-md border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                        Remplissage automatique activé
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        Conformément à votre indication que le titre foncier n'est pas au nom du propriétaire actuel, 
                        le premier ancien propriétaire correspond à la personne qui a cédé le bien. Les dates sont 
                        pré-remplies automatiquement :
                      </p>
                      <ul className="text-xs text-blue-700 dark:text-blue-300 list-disc list-inside space-y-0.5">
                        <li><strong>Date début</strong> : Date de délivrance du titre ({formData.titleIssueDate ? new Date(formData.titleIssueDate).toLocaleDateString('fr-FR') : 'Non renseignée'})</li>
                        <li><strong>Date fin</strong> : Date d'acquisition par le propriétaire actuel ({currentOwners[0]?.since ? new Date(currentOwners[0].since).toLocaleDateString('fr-FR') : 'Non renseignée'})</li>
                      </ul>
                      <p className="text-xs text-blue-600 dark:text-blue-400 italic">
                        Vous pouvez modifier ces informations si nécessaire.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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
                    <PopoverContent className="w-80 rounded-xl" align="end">
                      <div className="space-y-2 text-xs">
                        <h4 className="font-semibold text-sm">Historique des propriétaires</h4>
                        <p className="text-muted-foreground">
                          Documentez les anciens propriétaires pour établir la chaîne de propriété complète.
                        </p>
                        {formData.isTitleInCurrentOwnerName === false && (
                          <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-blue-700 dark:text-blue-300">
                              <strong>📋 Auto-remplissage :</strong> Le premier ancien propriétaire est la personne 
                              inscrite sur le titre foncier qui a vendu au propriétaire actuel. Les dates sont 
                              calculées automatiquement.
                            </p>
                          </div>
                        )}
                        <p className="text-muted-foreground">
                          <strong>💡</strong> Ordonnez du plus récent au plus ancien (le 1er = le vendeur au propriétaire actuel).
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

                    {/* Statut juridique */}
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Statut</Label>
                      <Select
                        value={owner.legalStatus}
                        onValueChange={(value) => {
                          updatePreviousOwner(index, {
                            legalStatus: value,
                            entityType: '',
                            entitySubType: '',
                            entitySubTypeOther: '',
                            stateExploitedBy: '',
                          });
                        }}
                        disabled={formData.isTitleInCurrentOwnerName === false && index === 1}
                      >
                        <SelectTrigger className="h-10 text-sm rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {getPicklistOptions('picklist_legal_status').map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Champs dépendants du statut juridique */}
                    {owner.legalStatus === 'Personne morale' ? (
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <Label className="text-sm font-medium">Type d'entreprise *</Label>
                          <Select
                            value={owner.entityType || ''}
                            onValueChange={(value) => {
                              updatePreviousOwner(index, { entityType: value, entitySubType: '', entitySubTypeOther: '' });
                            }}
                            disabled={formData.isTitleInCurrentOwnerName === false && index === 1}
                          >
                            <SelectTrigger className="h-10 text-sm rounded-xl">
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="Société">Société</SelectItem>
                              <SelectItem value="Association">Association</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {owner.entityType === 'Société' && (
                          <div className="space-y-1 animate-fade-in">
                            <Label className="text-sm font-medium">Forme juridique *</Label>
                            <Select
                              value={owner.entitySubType || ''}
                              onValueChange={(value) => {
                                updatePreviousOwner(index, { entitySubType: value, ...(value !== 'Autre' ? { entitySubTypeOther: '' } : {}) });
                              }}
                              disabled={formData.isTitleInCurrentOwnerName === false && index === 1}
                            >
                              <SelectTrigger className="h-10 text-sm rounded-xl">
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="Entreprise individuelle (Ets)">Entreprise individuelle (Ets)</SelectItem>
                                <SelectItem value="Société en Participation (SEP)">SEP</SelectItem>
                                <SelectItem value="Société à Responsabilité Limitée (SARL)">SARL</SelectItem>
                                <SelectItem value="Société Anonyme (SA)">SA</SelectItem>
                                <SelectItem value="Société par Actions Simplifiée (SAS)">SAS</SelectItem>
                                <SelectItem value="Société en Nom Collectif (SNC)">SNC</SelectItem>
                                <SelectItem value="Société en Commandite Simple (SCS)">SCS</SelectItem>
                                <SelectItem value="Groupement d'Intérêt Économique (GIE)">GIE</SelectItem>
                                <SelectItem value="Autre">Autre</SelectItem>
                              </SelectContent>
                            </Select>
                            {owner.entitySubType === 'Autre' && (
                              <Input
                                placeholder="Précisez la forme juridique"
                                value={owner.entitySubTypeOther || ''}
                                onChange={(e) => updatePreviousOwner(index, 'entitySubTypeOther', e.target.value)}
                                className="h-10 text-sm rounded-xl mt-1"
                                disabled={formData.isTitleInCurrentOwnerName === false && index === 1}
                              />
                            )}
                          </div>
                        )}

                        {owner.entityType === 'Association' && (
                          <div className="space-y-1 animate-fade-in">
                            <Label className="text-sm font-medium">Type d'association *</Label>
                            <Select
                              value={owner.entitySubType || ''}
                              onValueChange={(value) => {
                                updatePreviousOwner(index, { entitySubType: value, ...(value !== 'Autre' ? { entitySubTypeOther: '' } : {}) });
                              }}
                              disabled={formData.isTitleInCurrentOwnerName === false && index === 1}
                            >
                              <SelectTrigger className="h-10 text-sm rounded-xl">
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {getPicklistOptions('picklist_entity_subtype_association').map(opt => (
                                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {owner.entitySubType === 'Autre' && (
                              <Input
                                placeholder="Précisez le type d'association"
                                value={owner.entitySubTypeOther || ''}
                                onChange={(e) => updatePreviousOwner(index, 'entitySubTypeOther', e.target.value)}
                                className="h-10 text-sm rounded-xl mt-1"
                                disabled={formData.isTitleInCurrentOwnerName === false && index === 1}
                              />
                            )}
                          </div>
                        )}

                        {/* Raison sociale / Dénomination */}
                        {owner.entityType && (
                          <div className="space-y-1 animate-fade-in">
                            <div className="flex items-center gap-1">
                              <Label className="text-sm font-medium">
                                {owner.entityType === 'Association' ? 'Dénomination' : 'Raison sociale'}
                              </Label>
                              {formData.isTitleInCurrentOwnerName === false && index === 1 && (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button type="button" variant="ghost" size="sm" className="h-4 w-4 p-0 rounded-full">
                                      <Info className="h-3 w-3 text-primary" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-64 rounded-xl text-xs">
                                    <p className="text-muted-foreground">
                                      Pré-rempli depuis l'onglet "Infos". Pour modifier, rendez-vous dans l'onglet "Infos".
                                    </p>
                                  </PopoverContent>
                                </Popover>
                              )}
                            </div>
                            <Input
                              placeholder={owner.entityType === 'Association' ? "Dénomination de l'association" : "Dénomination officielle"}
                              value={owner.name}
                              onChange={(e) => updatePreviousOwner(index, 'name', e.target.value)}
                              disabled={formData.isTitleInCurrentOwnerName === false && index === 1}
                              className={cn("h-10 text-sm rounded-xl", formData.isTitleInCurrentOwnerName === false && index === 1 && "cursor-not-allowed opacity-70")}
                            />
                          </div>
                        )}
                      </div>
                    ) : owner.legalStatus === 'État' ? (
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <Label className="text-sm font-medium">Exploitée par</Label>
                          <SuggestivePicklist
                            picklistKey="state_agencies_drc"
                            label=""
                            placeholder="Rechercher un service de l'État..."
                            maxSelection={1}
                            selectedValues={owner.stateExploitedBy ? [owner.stateExploitedBy] : []}
                            onSelectionChange={(values) => {
                              const val = values[0] || '';
                              updatePreviousOwner(index, { stateExploitedBy: val, name: val });
                            }}
                            disabled={formData.isTitleInCurrentOwnerName === false && index === 1}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Label className="text-sm font-medium">Nom complet</Label>
                          {formData.isTitleInCurrentOwnerName === false && index === 1 && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button type="button" variant="ghost" size="sm" className="h-4 w-4 p-0 rounded-full">
                                  <Info className="h-3 w-3 text-primary" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 rounded-xl text-xs">
                                <p className="text-muted-foreground">
                                  Pré-rempli avec le nom du propriétaire actuel. Pour modifier, rendez-vous dans l'onglet "Infos".
                                </p>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                        <Input
                          placeholder="ex: Jean Mukendi"
                          value={owner.name}
                          onChange={(e) => updatePreviousOwner(index, 'name', e.target.value)}
                          disabled={formData.isTitleInCurrentOwnerName === false && index === 1}
                          className={cn("h-10 text-sm rounded-xl", formData.isTitleInCurrentOwnerName === false && index === 1 && "cursor-not-allowed opacity-70")}
                        />
                      </div>
                    )}

                    {/* Mutation */}
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
                          {getPicklistOptions('picklist_mutation_type').map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Label className="text-sm font-medium">Date début</Label>
                          {formData.isTitleInCurrentOwnerName === true && formData.titleIssueDate && index === 0 && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button type="button" variant="ghost" size="sm" className="h-4 w-4 p-0 rounded-full">
                                  <Info className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 rounded-xl text-xs">
                                <p className="text-muted-foreground">
                                  <strong>⚠️ Règle :</strong> Le renouvellement d'un titre foncier suppose que la parcelle appartenait déjà au même propriétaire. La date de début doit donc être antérieure ou égale à la date de {formData.leaseType === 'renewal' ? 'renouvellement' : 'délivrance'} ({formData.titleIssueDate ? new Date(formData.titleIssueDate).toLocaleDateString('fr-FR') : 'non définie'}).
                                </p>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                        <Input
                          type="date"
                          max={formData.isTitleInCurrentOwnerName === true && formData.titleIssueDate && index === 0 
                            ? formData.titleIssueDate 
                            : (owner.endDate || (index === 0 ? currentOwners[0]?.since : previousOwners[index - 1]?.startDate) || new Date().toISOString().split('T')[0])}
                          value={owner.startDate}
                          onChange={(e) => updatePreviousOwner(index, 'startDate', e.target.value)}
                          className="h-10 text-sm rounded-xl"
                        />
                        {formData.isTitleInCurrentOwnerName === true && formData.titleIssueDate && owner.startDate && index === 0 && new Date(owner.startDate) > new Date(formData.titleIssueDate) && (
                          <p className="text-xs text-destructive">
                            ⚠️ Date invalide : doit être ≤ {new Date(formData.titleIssueDate).toLocaleDateString('fr-FR')}
                          </p>
                        )}
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
                              {getPicklistOptions('picklist_tax_type').map(opt => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
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
                              {getPicklistOptions('picklist_tax_payment_status').map(opt => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
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
                                  {getPicklistOptions('picklist_creditor_type').map(opt => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                  ))}
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
                                  {getPicklistOptions('picklist_mortgage_status').map(opt => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                  ))}
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
                onClick={() => {
                  if (obligationType === 'taxes') {
                    setObligationType('mortgages');
                  } else {
                    handleTabChange('review');
                  }
                }}
                className="gap-2 bg-gradient-to-r from-seloger-red to-seloger-red-dark hover:from-seloger-red-dark hover:to-red-700 transition-all hover:scale-105 shadow-lg hover:shadow-xl animate-fade-in text-white text-sm sm:text-base h-10 sm:h-11 rounded-xl"
              >
                {obligationType === 'taxes' ? 'Suivant' : 'Reviser'}
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
                          ${calculateCCCValue.value.toFixed(2)}
                        </span>
                        <span className="text-xs text-amber-700 dark:text-amber-300">/ $5.00</span>
                      </div>
                    </div>
                  </div>
                  {calculateCCCValue.value < 5 && (
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
                      <div className="pt-1 border-t border-border/50">
                        <span className="font-medium">Construction:</span> {formData.constructionType}
                        {formData.constructionType === 'Terrain nu' && (
                          <span className="ml-2 text-xs text-muted-foreground italic">(permis non requis)</span>
                        )}
                      </div>
                    )}
                    {formData.declaredUsage && (
                      <div><span className="font-medium">Usage:</span> {formData.declaredUsage}</div>
                    )}
                    {/* Affichage du statut du permis */}
                    {formData.constructionType !== 'Terrain nu' && (
                      <div className="pt-1 border-t border-border/50">
                        <div className="font-medium">Autorisation de bâtir:</div>
                        {permitMode === 'existing' && buildingPermits.some(p => p.permitNumber) ? (
                          // L'utilisateur a des permis existants
                          buildingPermits.filter(p => p.permitNumber).map((permit, idx) => (
                            <div key={idx} className="ml-2 text-muted-foreground">
                              • N° {permit.permitNumber} ({permit.permitType === 'regularization' ? 'Régularisation' : 'Construction'})
                            </div>
                          ))
                        ) : permitMode === 'request' ? (
                          // L'utilisateur a choisi "Pas de permis" - c'est une donnée valide
                          <div className="ml-2 text-muted-foreground flex items-center gap-1">
                            <span className="text-amber-600 dark:text-amber-400">⚠</span> Pas de permis
                            <span className="text-xs italic">(demande possible après soumission)</span>
                          </div>
                        ) : (
                          // Mode existing mais pas de permis renseigné
                          <div className="ml-2 text-destructive text-xs italic">Non renseigné</div>
                        )}
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
                      <span>{currentOwners[0]?.legalStatus === 'Personne morale' && currentOwners[0]?.entityType === 'Association'
                        ? "Arrêté ministériel"
                        : currentOwners[0]?.legalStatus === 'Personne morale' && currentOwners[0]?.entityType === 'Société'
                          ? "Certificat RCCM"
                          : currentOwners[0]?.legalStatus === 'État' && currentOwners[0]?.rightType === 'Concession'
                            ? "Titre de concession"
                            : currentOwners[0]?.legalStatus === 'État' && currentOwners[0]?.rightType === 'Affectation'
                              ? "Acte d'affectation"
                              : "Pièce d'identité"}: {ownerDocFile ? "✓" : "Non"}</span>
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

              {/* Notification d'expiration du titre foncier */}
              {(() => {
                const selectedTitle = PROPERTY_TITLE_TYPES.find(t => t.value === formData.propertyTitleType);
                if (!selectedTitle?.isRenewable || !formData.titleIssueDate || !leaseYears || leaseYears <= 0) return null;
                
                const issueDate = new Date(formData.titleIssueDate);
                const expirationDate = new Date(issueDate);
                expirationDate.setFullYear(expirationDate.getFullYear() + leaseYears);
                const now = new Date();
                const remainingMs = expirationDate.getTime() - now.getTime();
                const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
                const remainingMonths = Math.round(remainingDays / 30.44);
                const isExpired = remainingDays <= 0;
                const isExpiringSoon = !isExpired && remainingMonths <= 3;
                const isInitial = formData.leaseType === 'initial' || !formData.leaseType;
                
                if (!isExpired && !isExpiringSoon) return null;

                const expirationDateStr = expirationDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                const guidanceText = "Pour soumettre une demande de titre foncier, rendez-vous dans le Cadastre numérique, puis cliquez sur le bouton « Demander un titre foncier » dans la barre de recherche cadastrale.";

                let message = '';
                if (isExpired && isInitial) {
                  message = `D'après la date de délivrance et le délai accordé, votre titre foncier « ${formData.propertyTitleType} » a expiré le ${expirationDateStr}. Après la soumission de votre parcelle au cadastre numérique, nous vous recommandons de demander un renouvellement du titre foncier existant ou un titre définitif dans un bref délai, sous réserve que les conditions établies par le titre expiré aient été respectées. ${guidanceText}`;
                } else if (isExpired && formData.leaseType === 'renewal') {
                  message = `Le délai légal de validité accordé à votre titre foncier « ${formData.propertyTitleType} » est dépassé : ce titre a expiré le ${expirationDateStr}. Après la soumission de votre parcelle au cadastre numérique, nous vous recommandons de demander un titre définitif dans un bref délai, sous réserve que toutes les conditions établies dans le titre expiré aient été respectées. ${guidanceText}`;
                } else if (isExpiringSoon && isInitial) {
                  message = `Le délai légal de votre titre foncier « ${formData.propertyTitleType} » arrive bientôt à expiration (le ${expirationDateStr}, soit dans environ ${remainingMonths > 0 ? remainingMonths + ' mois' : remainingDays + ' jours'}). Après la soumission de votre parcelle au cadastre numérique, nous vous recommandons de demander un renouvellement ou un titre définitif avant l'expiration, sous réserve que les conditions établies par le titre aient été respectées, afin d'éviter des complications administratives ou des frais complémentaires. ${guidanceText}`;
                } else if (isExpiringSoon && formData.leaseType === 'renewal') {
                  message = `Le délai légal de validité accordé à votre titre foncier « ${formData.propertyTitleType} » tend à expirer (le ${expirationDateStr}, soit dans environ ${remainingMonths > 0 ? remainingMonths + ' mois' : remainingDays + ' jours'}). Après la soumission de votre parcelle au cadastre numérique, nous vous recommandons de demander un titre définitif dans un bref délai avant l'expiration, sous réserve que toutes les conditions établies par ce titre actuel aient été respectées. ${guidanceText}`;
                }

                return message ? (
                  <Card className={`rounded-2xl shadow-sm ${isExpired ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20' : 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20'}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <Info className={`h-4 w-4 mt-0.5 flex-shrink-0 ${isExpired ? 'text-amber-600' : 'text-blue-600'}`} />
                        <p className={`text-xs leading-relaxed ${isExpired ? 'text-amber-800 dark:text-amber-200' : 'text-blue-800 dark:text-blue-200'}`}>
                          {message}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : null;
              })()}

              {/* Message de motivation */}
              {calculateCCCValue.value < 5 && (
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
                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
                      <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-2">
                        Champs requis manquants :
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {getMissingFields().map((field, idx) => (
                          <Button
                            key={idx}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleTabChange(field.tab)}
                            className="h-6 px-2 text-xs font-normal text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg gap-1"
                          >
                            {field.label}
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        ))}
                      </div>
                    </div>
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
                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
                      <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-2">
                        Champs requis manquants :
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {getMissingFields().map((field, idx) => (
                          <Button
                            key={idx}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleTabChange(field.tab)}
                            className="h-6 px-2 text-xs font-normal text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg gap-1"
                          >
                            {field.label}
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        ))}
                      </div>
                    </div>
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

    {/* Dialog de confirmation de fermeture */}
    <AlertDialog open={showExitConfirmation} onOpenChange={setShowExitConfirmation}>
      <AlertDialogContent className="z-[100000]">
        <AlertDialogHeader>
          <AlertDialogTitle>Modifications non enregistrées</AlertDialogTitle>
          <AlertDialogDescription>
            Vous avez des données non soumises. Vos données ont été sauvegardées en brouillon et seront restaurées à votre prochaine visite.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Continuer l'édition</AlertDialogCancel>
          <AlertDialogAction onClick={handleClose}>
            Fermer quand même
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default CadastralContributionDialog;
