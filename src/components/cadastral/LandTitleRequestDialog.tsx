import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, CheckCircle2, Upload, X, Info, ChevronRight, User, MapPin, FileText, CreditCard, Building, Home, Award, AlertCircle, Check, ClipboardCheck, TrendingUp, Search, Plus, AlertTriangle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { useLandTitleRequest, LandTitleRequestData, validatePhone } from '@/hooks/useLandTitleRequest';
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
import SectionHelpPopover from './SectionHelpPopover';
import { supabase } from '@/integrations/supabase/client';
import { validateLandTitleFile } from '@/types/landTitleRequest';
import { saveDraft, loadDraft, clearDraft, hasDraft } from '@/utils/landTitleDraftStorage';

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
    createPendingRequest,
    markRequestPaid,
    cancelPendingRequest
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedReferenceNumber, setSavedReferenceNumber] = useState<string>('');
  const [savedRequestId, setSavedRequestId] = useState<string>('');
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  
  // Request type state
  const [requestType, setRequestType] = useState<'initial' | 'renouvellement' | ''>('');
  const [hasFicheParcellaire, setHasFicheParcellaire] = useState<'yes' | 'no' | ''>('');
  const [knowsParcelNumber, setKnowsParcelNumber] = useState<'yes' | 'no' | ''>('');
  const [parcelNumberSearch, setParcelNumberSearch] = useState('');
  const [parcelSearchResults, setParcelSearchResults] = useState<Array<{ parcel_number: string; id: string }>>([]);
  const [selectedParcelNumber, setSelectedParcelNumber] = useState('');
  const [parcelValidated, setParcelValidated] = useState(false);
  const [parcelSearchLoading, setParcelSearchLoading] = useState(false);
  const [showParcelDropdown, setShowParcelDropdown] = useState(false);
  // Owner data loaded from parcel for renewal mode
  const [parcelOwnerData, setParcelOwnerData] = useState<{
    legalStatus?: string;
    gender?: string;
    lastName?: string;
    firstName?: string;
    middleName?: string;
    phone?: string;
    email?: string;
  } | null>(null);
  // Location data loaded from parcel for renewal mode (masked display)
  const [parcelLocationData, setParcelLocationData] = useState<{
    province?: string;
    sectionType?: string;
    ville?: string;
    commune?: string;
    quartier?: string;
    avenue?: string;
    territoire?: string;
    collectivite?: string;
    groupement?: string;
    village?: string;
    parcelSides?: any[];
    gpsCoordinates?: any[];
  } | null>(null);
  // Valorisation data loaded from parcel for renewal mode (auto-display)
  const [parcelValorisationData, setParcelValorisationData] = useState<{
    constructionType?: string;
    constructionNature?: string;
    constructionMaterials?: string;
    declaredUsage?: string;
  } | null>(null);
  const [loadingOwnerData, setLoadingOwnerData] = useState(false);
  
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
  const [procurationFile, setProcurationFile] = useState<File | null>(null);
  
  // Draft restore prompt
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  
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

  // Parcel number search for renewal/definitive requests
  const searchParcels = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setParcelSearchResults([]);
      return;
    }
    setParcelSearchLoading(true);
    try {
      const { data, error } = await supabase
        .from('cadastral_parcels')
        .select('parcel_number, id')
        .ilike('parcel_number', `%${query}%`)
        .is('deleted_at', null)
        .limit(10);
      if (error) throw error;
      setParcelSearchResults(data || []);
    } catch (err) {
      console.error('Error searching parcels:', err);
      setParcelSearchResults([]);
    } finally {
      setParcelSearchLoading(false);
    }
  }, []);

  // Computed: is the form in "parcel-linked" mode (renewal OR initial with fiche parcellaire)
  const isParcelLinkedMode = (requestType === 'renouvellement' && knowsParcelNumber === 'yes') || (requestType === 'initial' && hasFicheParcellaire === 'yes');

  // Computed: form is blocked when user has no fiche parcellaire for initial request OR doesn't know parcel number for renewal
  const isFormBlocked = (requestType === 'initial' && hasFicheParcellaire === 'no') || (requestType === 'renouvellement' && knowsParcelNumber === 'no');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (parcelNumberSearch && isParcelLinkedMode) {
        searchParcels(parcelNumberSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [parcelNumberSearch, isParcelLinkedMode, searchParcels]);

  // Reset parcel validation when request type or fiche parcellaire changes
  useEffect(() => {
    setParcelNumberSearch('');
    setSelectedParcelNumber('');
    setParcelValidated(false);
    setParcelSearchResults([]);
    setParcelOwnerData(null);
    setParcelLocationData(null);
    setParcelValorisationData(null);
    // Reset requesterType when not in parcel-linked mode
    if (!isParcelLinkedMode) {
      setFormData(prev => ({ ...prev, requesterType: 'owner', isOwnerSameAsRequester: true }));
    }
    // Force back to requester tab when form is blocked
    if ((requestType === 'initial' && hasFicheParcellaire === 'no') || (requestType === 'renouvellement' && knowsParcelNumber === 'no')) {
      setActiveTab('requester');
    }
  }, [requestType, hasFicheParcellaire, knowsParcelNumber]);

  // Reset hasFicheParcellaire / knowsParcelNumber when requestType changes
  useEffect(() => {
    setHasFicheParcellaire('');
    setKnowsParcelNumber('');
  }, [requestType]);

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

  // Pre-fill with user info — only on mount (when dialog opens), not on every profile change
  const hasPrefilledRef = useRef(false);
  useEffect(() => {
    if (profile && open && !hasPrefilledRef.current) {
      hasPrefilledRef.current = true;
      const fullName = (profile.full_name || '').trim();
      const nameParts = fullName.split(/\s+/);
      const lastName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : nameParts[0] || '';
      const firstName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
      setFormData(prev => ({
        ...prev,
        requesterLastName: prev.requesterLastName || lastName,
        requesterFirstName: prev.requesterFirstName || firstName,
        requesterEmail: prev.requesterEmail || profile.email || ''
      }));
    }
    if (!open) {
      hasPrefilledRef.current = false;
    }
  }, [profile, open]);

  // Check for saved draft when dialog opens
  useEffect(() => {
    if (open && hasDraft()) {
      setShowDraftPrompt(true);
    }
  }, [open]);

  const restoreDraft = useCallback(() => {
    const draft = loadDraft();
    if (draft) {
      setFormData(prev => ({ ...prev, ...draft.formData }));
      setConstructionType(draft.constructionType || '');
      setConstructionNature(draft.constructionNature || '');
      setConstructionMaterials(draft.constructionMaterials || '');
      setDeclaredUsage(draft.declaredUsage || '');
      setNationality(draft.nationality as any || '');
      setOccupationDuration(draft.occupationDuration as any || '');
      setRequestType(draft.requestType as any || '');
      setSelectedParcelNumber(draft.selectedParcelNumber || '');
      if (draft.gpsCoordinates?.length) setGpsCoordinates(draft.gpsCoordinates);
      if (draft.parcelSides?.length) setParcelSides(draft.parcelSides);
    }
    setShowDraftPrompt(false);
  }, []);

  // Auto-save draft every 10 seconds when dialog is open and has data
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      const hasData = formData.requesterLastName || formData.province || constructionType || requestType;
      if (hasData) {
        saveDraft({
          formData,
          constructionType,
          constructionNature,
          constructionMaterials,
          declaredUsage,
          nationality,
          occupationDuration,
          requestType,
          selectedParcelNumber,
          gpsCoordinates,
          parcelSides
        });
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [open, formData, constructionType, constructionNature, constructionMaterials, declaredUsage, nationality, occupationDuration, requestType, selectedParcelNumber, gpsCoordinates, parcelSides]);

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
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Derive isOwnerSameAsRequester from requesterType
      if (field === 'requesterType') {
        updated.isOwnerSameAsRequester = value === 'owner';
      }
      return updated;
    });
    
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

  // toggleFee removed — fees are now fully dynamic and non-toggleable

  const isFormValid = (): boolean => {
    // Check request type
    if (!requestType) return false;
    if (requestType === 'renouvellement' && knowsParcelNumber !== 'yes') return false;
    if (requestType === 'renouvellement' && knowsParcelNumber === 'yes' && !parcelValidated) return false;
    if (requestType === 'initial' && hasFicheParcellaire === 'yes' && !parcelValidated) return false;
    if (requestType === 'initial' && hasFicheParcellaire !== 'yes') return false;
    // Renewal mode with owner as requester: skip requester identity fields
    const isParcelAsOwner = isParcelLinkedMode && parcelValidated && parcelOwnerData && formData.requesterType === 'owner';
    
    if (!isParcelAsOwner) {
      // Check requester info
      if (!formData.requesterLastName || !formData.requesterFirstName || !formData.requesterPhone) {
        return false;
      }
      
      // Validate phone number format
      if (!validatePhone(formData.requesterPhone)) {
        return false;
      }

      // Validate requester legal status & gender for personne physique
      const rLegalStatus = formData.requesterLegalStatus || 'Personne physique';
      if (rLegalStatus === 'Personne physique' && !formData.requesterGender) {
        return false;
      }
    }
    
    // Check owner info if different (skip for renewal with auto-loaded owner data)
    const isParcelWithAutoOwner = isParcelLinkedMode && parcelValidated && parcelOwnerData;
    if (!formData.isOwnerSameAsRequester && !isParcelWithAutoOwner) {
      if (!formData.ownerLastName || !formData.ownerFirstName) {
        return false;
      }
      // Procuration document required for representatives
      if (formData.requesterType === 'representative' && !procurationFile) {
        return false;
      }
    }
    
    // Procuration required for renewal mandataire
    if (isParcelWithAutoOwner && formData.requesterType === 'representative' && !procurationFile) {
      return false;
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

    // Check valorisation validated
    if (!valorisationValidated) return false;
    
    return true;
  };

  const handleProceedToPayment = async () => {
    if (!user) {
      setShowQuickAuth(true);
      return;
    }

    // Prevent double submission
    if (isSubmitting) return;

    if (!isFormValid()) {
      toast({
        title: "Formulaire incomplet",
        description: "Veuillez remplir tous les champs obligatoires (y compris genre, procuration si mandataire)",
        variant: "destructive",
      });
      return;
    }

    // Guard against $0 total
    if (totalAmount <= 0) {
      toast({
        title: "Erreur de frais",
        description: "Le montant total doit être supérieur à 0. Aucun frais configuré pour ce type de titre.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    // SECURE FLOW: Create DB record FIRST, then show payment
    const feeItems = calculatedFeesResult.fees.map(fee => ({
      id: fee.id,
      name: fee.fee_name,
      amount: fee.final_amount,
      is_mandatory: fee.is_mandatory
    }));

    const result = await createPendingRequest({
      ...formData,
      requestType,
      selectedParcelNumber,
      isOwnerSameAsRequester: formData.requesterType === 'owner',
      constructionType,
      constructionNature,
      constructionMaterials,
      declaredUsage,
      deducedTitleType: deducedTitleType?.type || '',
      nationality,
      occupationDuration,
      requesterIdDocumentFile: requesterIdFile,
      ownerIdDocumentFile: ownerIdFile,
      proofOfOwnershipFile: proofOfOwnershipFile,
      procurationDocumentFile: procurationFile,
      gpsCoordinates: gpsCoordinates,
      parcelSides: parcelSides,
      roadBorderingSides: roadSides,
      totalAmountOverride: totalAmount
    }, feeItems);

    setIsSubmitting(false);

    if (result.success && result.requestId) {
      setSavedRequestId(result.requestId);
      setSavedReferenceNumber(result.referenceNumber || '');
      setShowPayment(true);
      // Clear draft on successful creation
      clearDraft();
    }
  };

  const handlePaymentSuccess = async () => {
    // Payment succeeded — mark the pre-created request as paid
    if (savedRequestId) {
      await markRequestPaid(savedRequestId);
    }
    setShowPayment(false);
    setShowSuccess(true);
  };

  const handlePaymentCancel = useCallback(() => {
    // Cancel orphaned pending record when user cancels payment
    if (savedRequestId) {
      cancelPendingRequest(savedRequestId);
    }
    setShowPayment(false);
    setSavedRequestId('');
    setSavedReferenceNumber('');
  }, [savedRequestId, cancelPendingRequest]);

  const handleCloseRequest = () => {
    // Comprehensive check for any user-entered data
    const hasData = formData.requesterLastName || 
                   formData.requesterFirstName || 
                   formData.requesterPhone ||
                   formData.province ||
                   formData.sectionType ||
                   constructionType ||
                   nationality ||
                   requesterIdFile || 
                   ownerIdFile || 
                   proofOfOwnershipFile ||
                   procurationFile ||
                   gpsCoordinates.some(c => c.lat || c.lng) ||
                   requestType;
    
    if (hasData) {
      setShowCloseConfirmation(true);
    } else {
      handleConfirmClose();
    }
  };

  const handleConfirmClose = () => {
    setShowCloseConfirmation(false);
    // Cancel orphaned pending record if payment was in progress
    if (savedRequestId && !showSuccess) {
      cancelPendingRequest(savedRequestId);
    }
    // Clear draft
    clearDraft();
    // Reset ALL form state
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
    setProcurationFile(null);
    setActiveTab('requester');
    setShowPayment(false);
    setShowSuccess(false);
    setSavedRequestId('');
    setSavedReferenceNumber('');
    setIsSubmitting(false);
    setShowDraftPrompt(false);
    // Reset request type & parcel
    setRequestType('');
    setHasFicheParcellaire('');
    setKnowsParcelNumber('');
    setParcelNumberSearch('');
    setSelectedParcelNumber('');
    setParcelValidated(false);
    setParcelSearchResults([]);
    setParcelOwnerData(null);
    setParcelLocationData(null);
    setParcelValorisationData(null);
    setLoadingOwnerData(false);
    // Reset GPS & dimensions
    setGpsCoordinates([{ borne: 'Borne 1', lat: '', lng: '' }]);
    setParcelSides([
      { name: 'Côté Nord', length: '' },
      { name: 'Côté Sud', length: '' },
      { name: 'Côté Est', length: '' },
      { name: 'Côté Ouest', length: '' }
    ]);
    setRoadSides([]);
    // Reset valorisation
    setConstructionType('');
    setConstructionNature('');
    setConstructionMaterials('');
    setDeclaredUsage('');
    setNationality('');
    setOccupationDuration('');
    setValorisationValidated(false);
    setDeducedTitleType(null);
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
          <DialogContent className={`z-[1200] ${isMobile ? 'w-[92vw] max-w-[360px] max-h-[88vh] rounded-2xl' : 'max-w-md rounded-2xl'} p-4 overflow-hidden`}>
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
              onClick={handlePaymentCancel} 
              className="w-full h-8 text-xs rounded-xl mt-2"
            >
              Annuler
            </Button>
          </DialogContent>
      </Dialog>
    );
  }

  // Success view
  if (showSuccess) {
    return (
      <Dialog open={open} onOpenChange={handleConfirmClose}>
          <DialogContent className={`z-[1200] ${isMobile ? 'w-[92vw] max-w-[360px] max-h-[88vh] rounded-2xl' : 'max-w-md rounded-2xl'} p-4 overflow-hidden`}>
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
          <DialogContent className={`z-[1200] ${isMobile ? 'w-[92vw] max-w-[360px] max-h-[88vh] rounded-2xl' : 'max-w-md rounded-2xl'} p-4 overflow-hidden`}>
            <DialogHeader className="pb-2">
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <Building className="h-4 w-4 text-primary" />
                </div>
                Demande de titre foncier
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {deducedTitleType ? `Titre déduit : ${deducedTitleType.label}` : requestType === 'renouvellement' ? 'Renouvellement de votre titre foncier' : 'Obtenez votre titre foncier'}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="h-[65vh] sm:h-[70vh]">
              <div className="space-y-4 pr-2">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-6 mb-4 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
                    <TabsTrigger value="requester" className="text-xs gap-1.5">
                      <User className="h-4 w-4 stroke-[2.5]" />
                      <span className="hidden sm:inline">Demandeur</span>
                    </TabsTrigger>
                    <TabsTrigger value="location" disabled={isFormBlocked} className="text-xs gap-1.5">
                      <MapPin className="h-4 w-4 stroke-[2.5]" />
                      <span className="hidden sm:inline">Lieu</span>
                    </TabsTrigger>
                    <TabsTrigger value="valorisation" disabled={isFormBlocked} className="text-xs gap-1.5">
                      <Home className="h-4 w-4 stroke-[2.5]" />
                      <span className="hidden sm:inline">Mise en valeur</span>
                    </TabsTrigger>
                    <TabsTrigger value="documents" disabled={isFormBlocked} className="text-xs gap-1.5">
                      <FileText className="h-4 w-4 stroke-[2.5]" />
                      <span className="hidden sm:inline">Documents</span>
                    </TabsTrigger>
                    <TabsTrigger value="payment" disabled={isFormBlocked} className="text-xs gap-1.5">
                      <CreditCard className="h-4 w-4 stroke-[2.5]" />
                      <span className="hidden sm:inline">Frais</span>
                    </TabsTrigger>
                    <TabsTrigger value="review" disabled={isFormBlocked} className="text-xs gap-1.5">
                      <ClipboardCheck className="h-4 w-4 stroke-[2.5]" />
                      <span className="hidden sm:inline">Envoi</span>
                    </TabsTrigger>
                  </TabsList>


                {/* Tab: Requester */}
                <TabsContent value="requester" className="space-y-4">
                  {/* Informations sur la demande */}
                  <Card className="border-2 border-primary/30 rounded-lg">
                    <CardContent className="p-3 space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-primary/10 rounded-lg">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <Label className="text-sm font-semibold flex items-center gap-1.5">
                          Informations sur la demande *
                          <SectionHelpPopover
                            title="Type de demande"
                            description="Indiquez s'il s'agit d'une demande initiale de titre foncier ou d'un renouvellement d'un titre existant. Ce choix influence l'évaluation de votre dossier."
                          />
                        </Label>
                      </div>

                      <Select
                        value={requestType}
                        onValueChange={(value) => setRequestType(value as 'initial' | 'renouvellement')}
                      >
                        <SelectTrigger className="h-11 text-sm rounded-xl border-2 focus:border-primary">
                          <SelectValue placeholder="Sélectionnez le type de demande" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="initial" className="text-sm py-2">Demande initiale</SelectItem>
                          <SelectItem value="renouvellement" className="text-sm py-2">Renouvellement d'un titre foncier</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Radio buttons for initial: fiche parcellaire */}
                      {requestType === 'initial' && (
                        <div className="space-y-2 animate-fade-in">
                          <Label className="text-sm">Avez-vous une fiche parcellaire ? *</Label>
                          <RadioGroup
                            value={hasFicheParcellaire}
                            onValueChange={(value: string) => setHasFicheParcellaire(value as 'yes' | 'no')}
                            className="flex gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="yes" id="fiche-yes" />
                              <Label htmlFor="fiche-yes" className="text-sm cursor-pointer">J'ai une fiche parcellaire</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="no" id="fiche-no" />
                              <Label htmlFor="fiche-no" className="text-sm cursor-pointer">Je n'ai pas de fiche parcellaire</Label>
                            </div>
                          </RadioGroup>

                          {hasFicheParcellaire === 'no' && (
                            <Alert variant="destructive" className="mt-3 animate-fade-in">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertTitle>Fiche parcellaire requise</AlertTitle>
                              <AlertDescription className="text-xs space-y-2">
                                <p>
                                  La demande d'un titre foncier sur une parcelle nécessite au préalable une <strong>fiche parcellaire</strong> — un document administratif local délivré par les autorités compétentes qui atteste de l'occupation du terrain par la personne qui se déclare être le propriétaire.
                                </p>
                                <p>
                                  Veuillez vous adresser au <strong>bureau de la commune ou du quartier</strong> si votre parcelle se trouve dans une <strong>section urbaine</strong>, ou au <strong>bureau de la chefferie</strong> si elle se trouve dans une <strong>section rurale</strong>, afin d'obtenir ce document avant de soumettre votre demande.
                                </p>
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      )}

                      {/* Radio buttons for renewal: knows parcel number */}
                      {requestType === 'renouvellement' && (
                        <div className="space-y-2 animate-fade-in">
                          <Label className="text-sm">Connaissez-vous le numéro (SU ou SR) de la parcelle ? *</Label>
                          <RadioGroup
                            value={knowsParcelNumber}
                            onValueChange={(value: string) => setKnowsParcelNumber(value as 'yes' | 'no')}
                            className="flex gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="yes" id="parcel-num-yes" />
                              <Label htmlFor="parcel-num-yes" className="text-sm cursor-pointer">Je connais le numéro (SU ou SR) de la parcelle</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="no" id="parcel-num-no" />
                              <Label htmlFor="parcel-num-no" className="text-sm cursor-pointer">Je ne connais pas le numéro (SU ou SR) de la parcelle</Label>
                            </div>
                          </RadioGroup>

                          {knowsParcelNumber === 'no' && (
                            <Alert variant="destructive" className="mt-3 animate-fade-in">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertTitle>Numéro de parcelle requis</AlertTitle>
                              <AlertDescription className="text-xs space-y-2">
                                 <p>
                                   Le renouvellement d'un titre foncier nécessite le <strong>numéro (SU ou SR) de la parcelle</strong> concernée. Ce numéro figure sur votre <strong>titre de propriété</strong> délivrées par les autorités compétentes.
                                 </p>
                                 <p>
                                   Veuillez vérifier votre titre de propriété pour retrouver ce numéro avant de soumettre votre demande de renouvellement.
                                 </p>
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      )}

                      {/* Parcel number search for renewal OR initial with fiche parcellaire */}
                      {isParcelLinkedMode && (
                        <div className="space-y-2 animate-fade-in">
                          <Label className="text-sm">
                            {requestType === 'initial' ? 'Numéro de la fiche parcellaire (SU ou SR) *' : 'Numéro de la parcelle (SU ou SR) *'}
                          </Label>
                          <div className="relative">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                              <Input
                                value={parcelNumberSearch}
                                onChange={(e) => {
                                  setParcelNumberSearch(e.target.value);
                                  setParcelValidated(false);
                                  setSelectedParcelNumber('');
                                  setShowParcelDropdown(true);
                                }}
                                onFocus={() => setShowParcelDropdown(true)}
                                placeholder="Tapez le numéro SU ou SR..."
                                className="h-9 text-sm rounded-xl border-2 pl-8"
                              />
                              {parcelSearchLoading && (
                                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                              )}
                            </div>

                            {/* Search results dropdown */}
                            {showParcelDropdown && parcelNumberSearch.length >= 2 && (
                              <div className="absolute z-[1300] w-full mt-1 bg-background border rounded-xl shadow-lg max-h-[180px] overflow-y-auto">
                                {parcelSearchResults.length > 0 ? (
                                  parcelSearchResults.map((parcel) => (
                                     <button
                                      key={parcel.id}
                                      type="button"
                                      onClick={async () => {
                                        setSelectedParcelNumber(parcel.parcel_number);
                                        setParcelNumberSearch(parcel.parcel_number);
                                        setParcelValidated(true);
                                        setShowParcelDropdown(false);
                                        
                                        // Fetch owner data from parcel/contributions
                                        setLoadingOwnerData(true);
                                        try {
                                          // First try contributions for richer owner + location details
                                          const { data: contribData } = await supabase
                                            .from('cadastral_contributions')
                                            .select('current_owners_details, current_owner_name, current_owner_legal_status, province, parcel_type, ville, commune, quartier, avenue, territoire, collectivite, groupement, village, construction_type, construction_nature, declared_usage, area_sqm')
                                            .eq('parcel_number', parcel.parcel_number)
                                            .eq('status', 'approved')
                                            .order('created_at', { ascending: false })
                                            .limit(1)
                                            .maybeSingle();
                                          
                                          if (contribData?.current_owners_details) {
                                            const details = Array.isArray(contribData.current_owners_details) 
                                              ? contribData.current_owners_details 
                                              : [];
                                            const firstOwner = details[0] as any;
                                            if (firstOwner) {
                                              const ownerInfo = {
                                                legalStatus: firstOwner.legalStatus || '',
                                                gender: firstOwner.gender || '',
                                                lastName: firstOwner.lastName || '',
                                                firstName: firstOwner.firstName || '',
                                                middleName: firstOwner.middleName || '',
                                                phone: firstOwner.phone || '',
                                                email: firstOwner.email || '',
                                              };
                                              setParcelOwnerData(ownerInfo);
                                              // Don't force requesterType — let user choose owner vs representative
                                              setFormData(prev => ({
                                                ...prev,
                                                ownerLastName: ownerInfo.lastName,
                                                ownerFirstName: ownerInfo.firstName,
                                                ownerMiddleName: ownerInfo.middleName,
                                                ownerLegalStatus: ownerInfo.legalStatus || 'Personne physique',
                                                ownerGender: ownerInfo.gender,
                                                ownerPhone: ownerInfo.phone,
                                              }));
                                            }
                                          } else {
                                            // Fallback to parcel table
                                            const { data: parcelDetail } = await supabase
                                              .from('cadastral_parcels')
                                              .select('current_owner_name, current_owner_legal_status')
                                              .eq('id', parcel.id)
                                              .single();
                                            if (parcelDetail) {
                                              const nameParts = (parcelDetail.current_owner_name || '').split(/\s+/);
                                              const ownerInfo = {
                                                legalStatus: parcelDetail.current_owner_legal_status || 'Personne physique',
                                                lastName: nameParts[0] || '',
                                                firstName: nameParts.slice(1).join(' ') || '',
                                              };
                                              setParcelOwnerData(ownerInfo);
                                              setFormData(prev => ({
                                                ...prev,
                                                ownerLastName: ownerInfo.lastName,
                                                ownerFirstName: ownerInfo.firstName,
                                                ownerLegalStatus: ownerInfo.legalStatus || 'Personne physique',
                                              }));
                                            }
                                          }

                                          // Fetch location data: prioritize parcel table (source of truth)
                                          const { data: parcelLocData } = await supabase
                                            .from('cadastral_parcels')
                                            .select('province, parcel_type, ville, commune, quartier, avenue, territoire, collectivite, groupement, village, parcel_sides, gps_coordinates, construction_type, construction_nature, construction_materials, declared_usage, area_sqm')
                                            .eq('id', parcel.id)
                                            .single();
                                          
                                          // Use parcel data as base, then enrich with contribution data if available
                                          const locSource = parcelLocData || contribData;
                                          if (locSource) {
                                            const pType = locSource.parcel_type || '';
                                            const sType = pType === 'Urbain' || pType === 'urbaine' || pType === 'SU' ? 'urbaine' : 'rurale';
                                            const locationInfo = {
                                              province: parcelLocData?.province || contribData?.province || '',
                                              sectionType: sType,
                                              ville: parcelLocData?.ville || contribData?.ville || '',
                                              commune: parcelLocData?.commune || contribData?.commune || '',
                                              quartier: parcelLocData?.quartier || contribData?.quartier || '',
                                              avenue: parcelLocData?.avenue || contribData?.avenue || '',
                                              territoire: parcelLocData?.territoire || contribData?.territoire || '',
                                              collectivite: parcelLocData?.collectivite || contribData?.collectivite || '',
                                              groupement: parcelLocData?.groupement || contribData?.groupement || '',
                                              village: parcelLocData?.village || contribData?.village || '',
                                              parcelSides: parcelLocData?.parcel_sides && Array.isArray(parcelLocData.parcel_sides) ? parcelLocData.parcel_sides : (contribData as any)?.parcel_sides && Array.isArray((contribData as any).parcel_sides) ? (contribData as any).parcel_sides : [],
                                              gpsCoordinates: parcelLocData?.gps_coordinates && Array.isArray(parcelLocData.gps_coordinates) ? parcelLocData.gps_coordinates : (contribData as any)?.gps_coordinates && Array.isArray((contribData as any).gps_coordinates) ? (contribData as any).gps_coordinates : [],
                                            };
                                            setParcelLocationData(locationInfo);
                                            // Extract areaSqm
                                            const fetchedAreaSqm = parcelLocData?.area_sqm || (contribData as any)?.area_sqm || null;
                                            setFormData(prev => ({
                                              ...prev,
                                              sectionType: sType as 'urbaine' | 'rurale',
                                              province: locationInfo.province,
                                              ville: locationInfo.ville,
                                              commune: locationInfo.commune,
                                              quartier: locationInfo.quartier,
                                              avenue: locationInfo.avenue,
                                              territoire: locationInfo.territoire,
                                              collectivite: locationInfo.collectivite,
                                              groupement: locationInfo.groupement,
                                              village: locationInfo.village,
                                              areaSqm: fetchedAreaSqm ?? prev.areaSqm,
                                            }));
                                          }

                                          // Fetch valorisation data (construction info) from parcel/contribution
                                          const valoConstructionType = parcelLocData?.construction_type || contribData?.construction_type || '';
                                          const valoConstructionNature = parcelLocData?.construction_nature || contribData?.construction_nature || '';
                                          const valoConstructionMaterials = parcelLocData?.construction_materials || (contribData as any)?.construction_materials || '';
                                          const valoDeclaredUsage = parcelLocData?.declared_usage || contribData?.declared_usage || '';
                                          
                                          if (valoConstructionType || valoConstructionNature || valoDeclaredUsage) {
                                            const valoData = {
                                              constructionType: valoConstructionType,
                                              constructionNature: valoConstructionNature,
                                              constructionMaterials: valoConstructionMaterials,
                                              declaredUsage: valoDeclaredUsage,
                                            };
                                            setParcelValorisationData(valoData);
                                            // Auto-fill construction states
                                            if (valoConstructionType) setConstructionType(valoConstructionType);
                                            if (valoConstructionNature) setConstructionNature(valoConstructionNature);
                                            if (valoConstructionMaterials) setConstructionMaterials(valoConstructionMaterials);
                                            if (valoDeclaredUsage) setDeclaredUsage(valoDeclaredUsage);
                                          }
                                        } catch (err) {
                                          console.error('Error fetching owner data:', err);
                                        } finally {
                                          setLoadingOwnerData(false);
                                        }
                                      }}
                                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center gap-2"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                                      <span>{parcel.parcel_number}</span>
                                    </button>
                                  ))
                                ) : !parcelSearchLoading ? (
                                  <div className="px-3 py-2 text-xs text-muted-foreground">
                                    Aucune parcelle trouvée pour « {parcelNumberSearch} »
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </div>

                          {/* Validated parcel */}
                          {parcelValidated && selectedParcelNumber && (
                            <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/30 rounded-lg text-xs text-green-700 dark:text-green-400">
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                              <span>Parcelle <strong>{selectedParcelNumber}</strong> trouvée dans la base de données.</span>
                            </div>
                          )}

                          {/* Parcel not found message */}
                          {!parcelValidated && parcelNumberSearch.length >= 2 && !parcelSearchLoading && parcelSearchResults.length === 0 && (
                            <div className="space-y-2 animate-fade-in">
                              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-xs text-amber-800 dark:text-amber-300 space-y-2">
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                  <div className="space-y-1.5">
                                    <p>
                                      {requestType === 'renouvellement'
                                        ? "Une demande de renouvellement d'un titre foncier doit concerner une parcelle déjà enregistrée dans notre base de données afin de faciliter un suivi rigoureux avec les services cadastraux."
                                        : "Ce numéro de fiche parcellaire n'est pas trouvé dans notre base de données. Veuillez d'abord enregistrer votre parcelle via le formulaire CCC."}
                                    </p>
                                    <p>
                                      Nous vous invitons à commencer par ajouter cette parcelle au cadastre numérique, puis à revenir sur ce formulaire pour introduire votre demande.
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full h-9 text-xs rounded-xl gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                                onClick={() => {
                                  // Close this dialog and open CCC form
                                  onOpenChange(false);
                                  // Dispatch custom event to open CCC dialog
                                  window.dispatchEvent(new CustomEvent('open-ccc-dialog', { detail: { parcelNumber: parcelNumberSearch } }));
                                }}
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Ajouter la parcelle « {parcelNumberSearch} » au cadastre numérique
                              </Button>
                              <p className="text-[10px] text-muted-foreground text-center">
                                Cliquez sur le bouton ci-dessus pour commencer le processus d'enregistrement de votre parcelle.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {!isFormBlocked && (<>
                  <Card className="border-2 rounded-lg">
                    <CardContent className="p-3 space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-primary/10 rounded-lg">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <Label className="text-sm font-semibold flex items-center gap-1.5">
                          Informations du demandeur
                          <SectionHelpPopover
                            title="Informations du demandeur"
                            description="Renseignez votre identité complète telle qu'elle figure sur votre pièce d'identité. Ces informations seront utilisées pour le traitement administratif de votre demande."
                          />
                        </Label>
                      </div>

                      {/* PARCEL-LINKED MODE: Owner identified + role selection */}
                      {isParcelLinkedMode && parcelValidated && parcelOwnerData && (
                        <>
                          {/* Masked owner info */}
                          <div className="p-3 bg-muted/50 rounded-lg border border-border space-y-2 animate-fade-in">
                            <div className="flex items-center gap-2">
                              <div className="p-1 bg-primary/10 rounded">
                                <Info className="h-3.5 w-3.5 text-primary" />
                              </div>
                              <span className="text-xs font-semibold text-foreground">Propriétaire identifié</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                              {parcelOwnerData.legalStatus && (
                                <div><span className="text-muted-foreground">Statut :</span> <span className="font-medium">{parcelOwnerData.legalStatus}</span></div>
                              )}
                              {parcelOwnerData.gender && (
                                <div><span className="text-muted-foreground">Genre :</span> <span className="font-medium">{parcelOwnerData.gender}</span></div>
                              )}
                              <div><span className="text-muted-foreground">Nom :</span> <span className="font-medium">{parcelOwnerData.lastName ? parcelOwnerData.lastName.charAt(0) + '***' : '—'}</span></div>
                              <div><span className="text-muted-foreground">Prénom :</span> <span className="font-medium">{parcelOwnerData.firstName ? parcelOwnerData.firstName.charAt(0) + '***' : '—'}</span></div>
                              {parcelOwnerData.middleName && (
                                <div><span className="text-muted-foreground">Post-nom :</span> <span className="font-medium">{parcelOwnerData.middleName.charAt(0) + '***'}</span></div>
                              )}
                              {parcelOwnerData.phone && (
                                <div><span className="text-muted-foreground">Tél :</span> <span className="font-medium">+243 ** *** {parcelOwnerData.phone.slice(-3)}</span></div>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground italic">
                              Les informations du propriétaire sont chargées depuis la base cadastrale. L'accès complet est réservé aux services habilités.
                            </p>
                          </div>

                          {/* Radio: Propriétaire or Mandataire */}
                          <div className="space-y-2">
                            <Label className="text-sm">Vous êtes *</Label>
                            <RadioGroup
                              value={formData.requesterType}
                              onValueChange={(value: string) => {
                                handleInputChange('requesterType', value);
                                if (value === 'owner') {
                                  handleInputChange('isOwnerSameAsRequester', true);
                                } else {
                                  handleInputChange('isOwnerSameAsRequester', false);
                                }
                              }}
                              className="flex gap-4"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="owner" id="renewal-owner" />
                                <Label htmlFor="renewal-owner" className="text-sm cursor-pointer">Propriétaire</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="representative" id="renewal-representative" />
                                <Label htmlFor="renewal-representative" className="text-sm cursor-pointer">Mandataire</Label>
                              </div>
                            </RadioGroup>
                          </div>

                          {/* If Mandataire: show fields for representative identity */}
                          {formData.requesterType === 'representative' && (
                            <div className="space-y-3 animate-fade-in border-t border-border pt-3">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Informations du mandataire</h4>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1.5">
                                  <Label className="text-sm">Statut juridique *</Label>
                                  <Select
                                    value={formData.requesterLegalStatus || 'Personne physique'}
                                    onValueChange={(value) => {
                                      handleInputChange('requesterLegalStatus', value);
                                      if (value !== 'Personne physique') {
                                        handleInputChange('requesterGender', '');
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="h-9 text-sm rounded-lg border">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Personne physique">Personne physique</SelectItem>
                                      <SelectItem value="Société">Société</SelectItem>
                                      <SelectItem value="Association">Association</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                {(formData.requesterLegalStatus || 'Personne physique') === 'Personne physique' && (
                                  <div className="space-y-1.5">
                                    <Label className="text-sm">Genre *</Label>
                                    <Select
                                      value={formData.requesterGender || ''}
                                      onValueChange={(value) => handleInputChange('requesterGender', value)}
                                    >
                                      <SelectTrigger className="h-9 text-sm rounded-lg border">
                                        <SelectValue placeholder="Sélectionner" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Masculin">Masculin</SelectItem>
                                        <SelectItem value="Féminin">Féminin</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1.5">
                                  <Label className="text-sm">Nom *</Label>
                                  <Input
                                    value={formData.requesterLastName}
                                    onChange={(e) => handleInputChange('requesterLastName', e.target.value)}
                                    placeholder="Nom du mandataire"
                                    className="h-9 text-sm rounded-lg border"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-sm">Prénom *</Label>
                                  <Input
                                    value={formData.requesterFirstName}
                                    onChange={(e) => handleInputChange('requesterFirstName', e.target.value)}
                                    placeholder="Prénom du mandataire"
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
                                    className={cn(
                                      "h-9 text-sm rounded-lg border",
                                      formData.requesterPhone && !validatePhone(formData.requesterPhone) && "border-destructive"
                                    )}
                                  />
                                  {formData.requesterPhone && !validatePhone(formData.requesterPhone) && (
                                    <p className="text-[10px] text-destructive">Format: +243 suivi de 9 chiffres</p>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-sm">Email</Label>
                                <Input
                                  type="email"
                                  value={formData.requesterEmail}
                                  onChange={(e) => handleInputChange('requesterEmail', e.target.value)}
                                  placeholder="email@exemple.com"
                                  className="h-9 text-sm rounded-lg border"
                                />
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {loadingOwnerData && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Chargement des informations du propriétaire...
                        </div>
                      )}

                      {/* STANDARD MODE: Standard requester fields (no parcel linked or parcel not yet validated) */}
                      {!(isParcelLinkedMode && parcelValidated && parcelOwnerData) && (
                        <>
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
                              <Label className="text-sm">Statut juridique *</Label>
                              <Select
                                value={formData.requesterLegalStatus || 'Personne physique'}
                                onValueChange={(value) => {
                                  handleInputChange('requesterLegalStatus', value);
                                  if (value !== 'Personne physique') {
                                    handleInputChange('requesterGender', '');
                                  }
                                }}
                              >
                                <SelectTrigger className="h-9 text-sm rounded-lg border">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Personne physique">Personne physique</SelectItem>
                                  <SelectItem value="Société">Société</SelectItem>
                                  <SelectItem value="Association">Association</SelectItem>
                                  <SelectItem value="État">État</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {(formData.requesterLegalStatus || 'Personne physique') === 'Personne physique' && (
                              <div className="space-y-1.5">
                                <Label className="text-sm">Genre *</Label>
                                <Select
                                  value={formData.requesterGender || ''}
                                  onValueChange={(value) => handleInputChange('requesterGender', value)}
                                >
                                  <SelectTrigger className="h-9 text-sm rounded-lg border">
                                    <SelectValue placeholder="Sélectionner" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Masculin">Masculin</SelectItem>
                                    <SelectItem value="Féminin">Féminin</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
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
                                className={cn(
                                  "h-9 text-sm rounded-lg border",
                                  formData.requesterPhone && !validatePhone(formData.requesterPhone) && "border-destructive"
                                )}
                              />
                              {formData.requesterPhone && !validatePhone(formData.requesterPhone) && (
                                <p className="text-[10px] text-destructive">Format: +243 suivi de 9 chiffres</p>
                              )}
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
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {formData.requesterType === 'representative' && !(requestType === 'renouvellement' && parcelValidated && parcelOwnerData) && (
                    <Card className="border-2 border-dashed rounded-lg">
                      <CardContent className="p-3 space-y-3">
                        <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                          Informations du propriétaire
                          <SectionHelpPopover
                            title="Informations du propriétaire"
                            description="Si le demandeur n'est pas le propriétaire, renseignez l'identité du propriétaire de la parcelle. Le titre sera établi à son nom."
                          />
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
                            onValueChange={(value) => {
                              handleInputChange('ownerLegalStatus', value);
                              if (value !== 'Personne physique') {
                                handleInputChange('ownerGender', '');
                              }
                            }}
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

                        {(formData.ownerLegalStatus || 'Personne physique') === 'Personne physique' && (
                          <div className="space-y-1.5 animate-fade-in">
                            <Label className="text-sm">Genre *</Label>
                            <Select
                              value={formData.ownerGender || ''}
                              onValueChange={(value) => handleInputChange('ownerGender', value)}
                            >
                              <SelectTrigger className="h-9 text-sm rounded-lg border">
                                <SelectValue placeholder="Sélectionner le genre" />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg">
                                <SelectItem value="Masculin" className="text-sm py-2">Masculin</SelectItem>
                                <SelectItem value="Féminin" className="text-sm py-2">Féminin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                  </>)}

                  {!isFormBlocked && (
                    <div className="flex justify-end pt-4">
                      <Button onClick={() => setActiveTab('location')} className="h-8 text-xs rounded-xl gap-2">
                        Suivant <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* Tab: Location */}
                <TabsContent value="location" className="space-y-4">
                  {/* PARCEL-LINKED MODE: Masked location display (renewal or initial with fiche) */}
                  {isParcelLinkedMode && parcelValidated && parcelLocationData ? (
                    <>
                      <Card className="border-2 rounded-lg">
                        <CardContent className="p-3 space-y-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-primary/10 rounded-lg">
                              <MapPin className="h-4 w-4 text-primary" />
                            </div>
                            <Label className="text-sm font-semibold">
                              Localisation de la parcelle
                            </Label>
                          </div>

                          <Alert className="border-primary/20 bg-primary/5">
                            <Info className="h-4 w-4 text-primary" />
                            <AlertDescription className="text-xs text-muted-foreground">
                              Les données de localisation ont été chargées depuis la base de données. Ces informations sont masquées car leur accès détaillé est un service payant.
                            </AlertDescription>
                          </Alert>

                          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                            <div>
                              <span className="text-muted-foreground text-xs">Province :</span>
                              <p className="font-medium">{parcelLocationData.province || '—'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-xs">Zone :</span>
                              <p className="font-medium">{parcelLocationData.sectionType === 'urbaine' ? 'SU - Urbaine' : 'SR - Rurale'}</p>
                            </div>

                            {parcelLocationData.sectionType === 'urbaine' ? (
                              <>
                                <div>
                                  <span className="text-muted-foreground text-xs">Ville :</span>
                                  <p className="font-medium">{parcelLocationData.ville ? parcelLocationData.ville.charAt(0) + '***' : '—'}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs">Commune :</span>
                                  <p className="font-medium">{parcelLocationData.commune ? parcelLocationData.commune.charAt(0) + '***' : '—'}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs">Quartier :</span>
                                  <p className="font-medium">{parcelLocationData.quartier ? parcelLocationData.quartier.charAt(0) + '***' : '—'}</p>
                                </div>
                                {parcelLocationData.avenue && (
                                  <div>
                                    <span className="text-muted-foreground text-xs">Avenue :</span>
                                    <p className="font-medium">{parcelLocationData.avenue.charAt(0) + '***'}</p>
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                <div>
                                  <span className="text-muted-foreground text-xs">Territoire :</span>
                                  <p className="font-medium">{parcelLocationData.territoire ? parcelLocationData.territoire.charAt(0) + '***' : '—'}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs">Collectivité :</span>
                                  <p className="font-medium">{parcelLocationData.collectivite ? parcelLocationData.collectivite.charAt(0) + '***' : '—'}</p>
                                </div>
                                {parcelLocationData.groupement && (
                                  <div>
                                    <span className="text-muted-foreground text-xs">Groupement :</span>
                                    <p className="font-medium">{parcelLocationData.groupement.charAt(0) + '***'}</p>
                                  </div>
                                )}
                                {parcelLocationData.village && (
                                  <div>
                                    <span className="text-muted-foreground text-xs">Village :</span>
                                    <p className="font-medium">{parcelLocationData.village.charAt(0) + '***'}</p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Croquis de la parcelle - accès gratuit */}
                      {parcelLocationData.gpsCoordinates && parcelLocationData.gpsCoordinates.length >= 3 && (
                        <Card className="border-2 rounded-lg">
                          <CardContent className="p-3 space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="p-1.5 bg-primary/10 rounded-lg">
                                <MapPin className="h-4 w-4 text-primary" />
                              </div>
                              <Label className="text-sm font-semibold">
                                Croquis de la parcelle
                              </Label>
                            </div>

                            <div className="bg-muted/30 rounded-lg p-3 flex items-center justify-center">
                              {(() => {
                                const coords = parcelLocationData.gpsCoordinates!;
                                const sides = parcelLocationData.parcelSides || [];
                                const lats = coords.map((c: any) => c.lat);
                                const lngs = coords.map((c: any) => c.lng);
                                const minLat = Math.min(...lats);
                                const maxLat = Math.max(...lats);
                                const minLng = Math.min(...lngs);
                                const maxLng = Math.max(...lngs);
                                const padding = 30;
                                const svgW = 280;
                                const svgH = 220;
                                const rangeX = maxLng - minLng || 0.0001;
                                const rangeY = maxLat - minLat || 0.0001;
                                const scale = Math.min((svgW - padding * 2) / rangeX, (svgH - padding * 2) / rangeY);
                                
                                const points = coords.map((c: any) => {
                                  const x = padding + (c.lng - minLng) * scale;
                                  const y = svgH - padding - (c.lat - minLat) * scale;
                                  return { x, y };
                                });
                                
                                const polygonPoints = points.map((p: any) => `${p.x},${p.y}`).join(' ');
                                
                                // Compass rose position (top-right)
                                const compassX = svgW - 28;
                                const compassY = 28;
                                const compassR = 16;
                                
                                return (
                                  <svg width={svgW} height={svgH} className="border border-border rounded bg-background">
                                    {/* Compass rose */}
                                    <g>
                                      {/* Circle */}
                                      <circle cx={compassX} cy={compassY} r={compassR} fill="hsl(var(--muted) / 0.5)" stroke="hsl(var(--border))" strokeWidth="1" />
                                      {/* North arrow */}
                                      <polygon points={`${compassX},${compassY - compassR + 2} ${compassX - 4},${compassY - 2} ${compassX + 4},${compassY - 2}`} fill="hsl(var(--destructive))" />
                                      {/* South arrow */}
                                      <polygon points={`${compassX},${compassY + compassR - 2} ${compassX - 4},${compassY + 2} ${compassX + 4},${compassY + 2}`} fill="hsl(var(--muted-foreground) / 0.4)" />
                                      {/* East arrow */}
                                      <polygon points={`${compassX + compassR - 2},${compassY} ${compassX + 2},${compassY - 4} ${compassX + 2},${compassY + 4}`} fill="hsl(var(--muted-foreground) / 0.4)" />
                                      {/* West arrow */}
                                      <polygon points={`${compassX - compassR + 2},${compassY} ${compassX - 2},${compassY - 4} ${compassX - 2},${compassY + 4}`} fill="hsl(var(--muted-foreground) / 0.4)" />
                                      {/* Labels */}
                                      <text x={compassX} y={compassY - compassR - 3} fontSize="8" fill="hsl(var(--destructive))" textAnchor="middle" fontWeight="bold">N</text>
                                      <text x={compassX} y={compassY + compassR + 9} fontSize="7" fill="hsl(var(--muted-foreground))" textAnchor="middle">S</text>
                                      <text x={compassX + compassR + 6} y={compassY + 3} fontSize="7" fill="hsl(var(--muted-foreground))" textAnchor="middle">E</text>
                                      <text x={compassX - compassR - 6} y={compassY + 3} fontSize="7" fill="hsl(var(--muted-foreground))" textAnchor="middle">O</text>
                                    </g>
                                    {/* Parcel polygon */}
                                    <polygon
                                      points={polygonPoints}
                                      fill="hsl(var(--primary) / 0.1)"
                                      stroke="hsl(var(--primary))"
                                      strokeWidth="2"
                                    />
                                    {points.map((p: any, i: number) => (
                                      <g key={i}>
                                        <circle cx={p.x} cy={p.y} r="4" fill="hsl(var(--destructive))" />
                                        <text x={p.x + 6} y={p.y - 6} fontSize="9" fill="hsl(var(--foreground))" fontWeight="bold">
                                          B{i + 1}
                                        </text>
                                        {sides[i]?.length && (
                                          <text
                                            x={(p.x + points[(i + 1) % points.length].x) / 2}
                                            y={(p.y + points[(i + 1) % points.length].y) / 2 - 5}
                                            fontSize="8"
                                            fill="hsl(var(--muted-foreground))"
                                            textAnchor="middle"
                                          >
                                            {sides[i].length}m
                                          </text>
                                        )}
                                      </g>
                                    ))}
                                  </svg>
                                );
                              })()}
                            </div>

                            {parcelLocationData.parcelSides && parcelLocationData.parcelSides.length > 0 && (
                              <div className="grid grid-cols-2 gap-1.5 text-xs">
                                {parcelLocationData.parcelSides.map((side: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-1.5 p-1.5 bg-muted/50 rounded">
                                    <span className="font-medium">{side.name || `Côté ${idx + 1}`}:</span>
                                    <span className="text-muted-foreground">{side.length ? `${side.length}m` : '—'}</span>
                                    {side.borderType === 'route' && (
                                      <Badge variant="outline" className="text-[9px] h-4 px-1 border-blue-300 text-blue-700">Route</Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      <div className="flex gap-2 pt-4">
                        <Button variant="outline" onClick={() => setActiveTab('requester')} className="flex-1 h-8 text-xs rounded-xl">
                          Précédent
                        </Button>
                        <Button onClick={() => setActiveTab('valorisation')} className="flex-1 h-8 text-xs rounded-xl gap-2">
                          Suivant <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                  <Card className="border-2 rounded-lg">
                    <CardContent className="p-3 space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-primary/10 rounded-lg">
                          <MapPin className="h-4 w-4 text-primary" />
                        </div>
                        <Label className="text-sm font-semibold flex items-center gap-1.5">
                          Localisation de la parcelle
                          <SectionHelpPopover
                            title="Localisation de la parcelle"
                            description="Précisez l'emplacement exact de la parcelle : province, ville/territoire, commune/collectivité et quartier/village. Choisissez d'abord si la parcelle est en zone urbaine ou rurale."
                          />
                        </Label>
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
                    </>
                  )}
                </TabsContent>

                {/* Tab: Valorisation */}
                <TabsContent value="valorisation" className="space-y-4">
                  {/* PARCEL-LINKED MODE: Auto-loaded valorisation data displayed as read-only */}
                  {isParcelLinkedMode && parcelValidated && parcelValorisationData && (
                    <Card className="border-2 border-primary/20 rounded-xl bg-primary/5">
                      <CardContent className="p-3 space-y-3">
                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4 text-primary" />
                          <h4 className="text-sm font-semibold">Données de mise en valeur enregistrées</h4>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Ces informations sont extraites de la fiche parcellaire <strong>{selectedParcelNumber}</strong> disponible dans la base de données.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 rounded-lg bg-background border">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Type de construction</p>
                            <p className="text-sm font-medium">{parcelValorisationData.constructionType || '—'}</p>
                          </div>
                          <div className="p-2 rounded-lg bg-background border">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Nature</p>
                            <p className="text-sm font-medium">{parcelValorisationData.constructionNature || '—'}</p>
                          </div>
                          <div className="p-2 rounded-lg bg-background border">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Matériaux</p>
                            <p className="text-sm font-medium">{parcelValorisationData.constructionMaterials || '—'}</p>
                          </div>
                          <div className="p-2 rounded-lg bg-background border">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Usage déclaré</p>
                            <p className="text-sm font-medium">{parcelValorisationData.declaredUsage || '—'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Type de construction */}
                  <Card className="border rounded-xl">
                    <CardContent className="p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <Home className="h-4 w-4 text-muted-foreground" />
                          Mise en valeur
                          <SectionHelpPopover
                            title="Mise en valeur"
                            description="Décrivez comment la parcelle est mise en valeur : type de construction, nature, usage déclaré. Ces informations déterminent le type de titre foncier auquel vous avez droit."
                          />
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
                            disabled={isParcelLinkedMode && parcelValidated && !!parcelValorisationData?.constructionType}
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
                            disabled={!constructionType || (isParcelLinkedMode && parcelValidated && !!parcelValorisationData?.constructionNature)}
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
                              disabled={!constructionNature || (isParcelLinkedMode && parcelValidated && !!parcelValorisationData?.declaredUsage)}
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
                          <SectionHelpPopover
                            title="Éligibilité au titre foncier"
                            description="Indiquez votre nationalité et la durée d'occupation souhaitée. Ces critères déterminent automatiquement le type de titre foncier auquel vous êtes éligible selon la loi congolaise."
                          />
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
                        
                        {/* Contextual paragraph comparing request type with deduced title */}
                        {requestType && (
                          <div className={cn(
                            "p-3 rounded-lg text-sm leading-relaxed",
                            (() => {
                              const requestTypeLabel = requestType === 'initial' ? 'une demande initiale de titre foncier' 
                                : 'un renouvellement de titre foncier';
                              
                              // Check alignment
                              const isRenewalRequest = requestType === 'renouvellement';
                              const isTemporaryDeduced = deducedTitleType.type === 'Concession ordinaire' || deducedTitleType.type === 'Bail emphytéotique' || deducedTitleType.type === 'Bail foncier';
                              
                              const isAligned = (isRenewalRequest && isTemporaryDeduced) ||
                                requestType === 'initial';
                              
                              return isAligned 
                                ? "bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300" 
                                : "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300";
                            })()
                          )}>
                            {(() => {
                              const requestTypeLabel = requestType === 'initial' ? 'une demande initiale de titre foncier' 
                                : 'un renouvellement de titre foncier';
                              
                              const isRenewalRequest = requestType === 'renouvellement';
                              const isTemporaryDeduced = deducedTitleType.type === 'Concession ordinaire' || deducedTitleType.type === 'Bail emphytéotique' || deducedTitleType.type === 'Bail foncier';
                              
                              const isAligned = (isRenewalRequest && isTemporaryDeduced) ||
                                requestType === 'initial';

                              if (isAligned) {
                                return (
                                  <>
                                    <strong>Analyse favorable.</strong> Vous avez indiqué qu'il s'agit d'{requestTypeLabel}. Après vérification des données disponibles dans la base de données et de celles fournies dans ce formulaire, cette parcelle est éligible pour obtenir un <strong>{deducedTitleType.label}</strong>. {deducedTitleType.description}
                                  </>
                                );
                              } else {
                                return (
                                  <>
                                    <strong>Analyse divergente.</strong> Vous avez indiqué qu'il s'agit d'{requestTypeLabel}. Après vérification des données disponibles dans la base de données et de celles fournies dans ce formulaire, cette parcelle n'est pas éligible pour {requestTypeLabel === 'une demande initiale de titre foncier' ? requestTypeLabel : `un ${requestTypeLabel.replace("un ", "").replace("une ", "")}`}. Compte tenu des données disponibles et de celles renseignées dans ce formulaire, cette parcelle est éligible pour obtenir un <strong>{deducedTitleType.label}</strong>. {deducedTitleType.description}
                                  </>
                                );
                              }
                            })()}
                          </div>
                        )}

                        {!requestType && (
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {deducedTitleType.description}
                          </p>
                        )}

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
                        <SectionHelpPopover
                          title="Documents justificatifs"
                          description="Joignez les documents requis : pièce d'identité du demandeur, preuve de propriété (attestation de chef de terre, acte de vente, etc.). Formats acceptés : PDF et images (max 10MB)."
                        />
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
                              accept=".pdf,.jpg,.jpeg,.png,.webp"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 10 * 1024 * 1024) {
                                    toast({ title: "Fichier trop volumineux", description: "La taille maximale est de 10 MB", variant: "destructive" });
                                    return;
                                  }
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
                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 10 * 1024 * 1024) {
                                    toast({ title: "Fichier trop volumineux", description: "La taille maximale est de 10 MB", variant: "destructive" });
                                    return;
                                  }
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
                              accept=".pdf,.jpg,.jpeg,.png,.webp"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 10 * 1024 * 1024) {
                                    toast({ title: "Fichier trop volumineux", description: "La taille maximale est de 10 MB", variant: "destructive" });
                                    return;
                                  }
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

                        {/* Procuration document for mandataire */}
                        {formData.requesterType === 'representative' && (
                          <div className="space-y-1.5 animate-fade-in">
                            <Label className="text-sm">Procuration (document d'autorisation) *</Label>
                            {!procurationFile ? (
                              <Input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (file.size > 10 * 1024 * 1024) {
                                      toast({ title: "Fichier trop volumineux", description: "La taille maximale est de 10 MB", variant: "destructive" });
                                      return;
                                    }
                                    setProcurationFile(file);
                                  }
                                }}
                                className="h-9 text-sm rounded-lg border"
                              />
                            ) : (
                              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                                <span className="flex-1 truncate text-sm">{procurationFile.name}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setProcurationFile(null)}
                                  className="h-7 w-7 rounded-lg hover:bg-destructive/10"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                            <p className="text-[10px] text-muted-foreground">
                              Document attestant que vous êtes autorisé à agir au nom du propriétaire.
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={() => setActiveTab('valorisation')} className="flex-1 h-8 text-xs rounded-xl">
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
                        <Label className="text-sm font-semibold flex items-center gap-1.5">
                          Frais de dossier
                          <SectionHelpPopover
                            title="Frais de dossier"
                            description="Les frais de dossier sont calculés automatiquement en fonction du type de titre déduit, de la zone (urbaine/rurale) et de la superficie. Les frais obligatoires ne peuvent pas être désélectionnés."
                          />
                        </Label>
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
                      procurationFile={procurationFile}
                      gpsCoordinates={gpsCoordinates}
                      parcelSides={parcelSides}
                      totalAmount={totalAmount}
                      loading={loading}
                      requestType={requestType}
                      selectedParcelNumber={selectedParcelNumber}
                      onEditTab={(tabId) => setActiveTab(tabId)}
                      onProceedToPayment={handleProceedToPayment}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          </DialogContent>
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
