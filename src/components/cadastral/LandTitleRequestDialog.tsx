import { PROPERTY_CATEGORY_OPTIONS as SHARED_PROPERTY_CATEGORY_OPTIONS } from '@/lib/ccc/propertyCategories';
import { useParcelNumberSearch } from './land-title-request/useParcelNumberSearch';
import { useLandTitleConstruction } from './land-title-request/useLandTitleConstruction';
import { LandTitlePaymentView, LandTitleSuccessView } from './land-title-request/LandTitleResultViews';
import type { ParcelOwnerData, ParcelLocationData, ParcelValorisationData, ParcelBuildingPermit } from './land-title-request/types';
import DocumentsTab from './land-title-request/DocumentsTab';
import ApplicantTab from './land-title-request/ApplicantTab';
import LocationTab from './land-title-request/LocationTab';
import ValorisationTab from './land-title-request/ValorisationTab';
import PaymentTab from './land-title-request/PaymentTab';
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
import { Loader2, CheckCircle2, Upload, X, Info, ChevronRight, User, MapPin, FileText, CreditCard, Building, Home, Award, AlertCircle, Check, ClipboardCheck, TrendingUp, Search, Plus, AlertTriangle, RefreshCw } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useTestEnvironment, applyTestFilter } from '@/hooks/useTestEnvironment';
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
  validateDeductionInput
} from '@/utils/landTitleDeduction';
import { QuickAuthDialog } from './QuickAuthDialog';
import { ParcelMapPreview } from './ParcelMapPreview';
import { useMapConfig } from '@/hooks/useMapConfig';
import LandTitleReviewTab from './LandTitleReviewTab';
import SectionHelpPopover from './SectionHelpPopover';
import { supabase } from '@/integrations/supabase/client';
import { validateLandTitleFile } from '@/types/landTitleRequest';
import { saveDraft, loadDraft, clearDraft, hasDraft } from '@/utils/landTitleDraftStorage';
import { BuildingPermitIssuingServiceSelect } from './BuildingPermitIssuingServiceSelect';
import { fetchLandTitleParcelPrefill } from './land-title-request/parcelPrefill';

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
  } = useLandTitleRequest();
  
  // Frais dynamiques
  const {
    loading: loadingDynamicFees,
    calculateFees: calculateDynamicFees
  } = useLandTitleDynamicFees();
  
  const { isTestRoute } = useTestEnvironment();
  const [activeTab, setActiveTab] = useState('requester');
  const [showQuickAuth, setShowQuickAuth] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [valorisationChoice, setValorisationChoice] = useState<null | 'exact' | 'update'>(null);
  const showValorisationUpdate = valorisationChoice === 'update';
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedReferenceNumber, setSavedReferenceNumber] = useState<string>('');
  const [savedRequestId, setSavedRequestId] = useState<string>('');
  const [serverAmountDue, setServerAmountDue] = useState<number>(0);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  
  // Request type state
  const [requestType, setRequestType] = useState<'initial' | 'renouvellement' | 'conversion' | ''>('');
  const [hasFicheParcellaire, setHasFicheParcellaire] = useState<'yes' | 'no' | ''>('');
  const [knowsParcelNumber, setKnowsParcelNumber] = useState<'yes' | 'no' | ''>('');
  const [parcelNumberSearch, setParcelNumberSearch] = useState('');
  const [selectedParcelNumber, setSelectedParcelNumber] = useState('');
  const [parcelValidated, setParcelValidated] = useState(false);
  const [showParcelDropdown, setShowParcelDropdown] = useState(false);
  // Données de parcelle préremplies par le serveur (l'identité du propriétaire n'est jamais préremplie)
  const [parcelOwnerData, setParcelOwnerData] = useState<ParcelOwnerData | null>(null);
  const [parcelLocationData, setParcelLocationData] = useState<ParcelLocationData | null>(null);
  const [parcelValorisationData, setParcelValorisationData] = useState<ParcelValorisationData | null>(null);
  const [parcelBuildingPermits, setParcelBuildingPermits] = useState<ParcelBuildingPermit[]>([]);
  // Building permit update form states
  const [hasPermitUpdate, setHasPermitUpdate] = useState<'yes' | 'no' | ''>('');
  const [permitUpdateType, setPermitUpdateType] = useState<'construction' | 'regularization'>('construction');
  const [permitUpdateNumber, setPermitUpdateNumber] = useState('');
  const [permitUpdateDate, setPermitUpdateDate] = useState('');
  const [permitUpdateService, setPermitUpdateService] = useState('');
  const [permitUpdateFile, setPermitUpdateFile] = useState<File | null>(null);
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

  const {
    skipCascadeRef,
    propertyCategory, setPropertyCategory, constructionType, setConstructionType,
    constructionNature, setConstructionNature, constructionMaterials, setConstructionMaterials,
    declaredUsage, setDeclaredUsage, standing, setStanding, constructionYear, setConstructionYear,
    floorNumber, setFloorNumber, availableConstructionTypes, availableConstructionNatures, availableDeclaredUsages,
  } = useLandTitleConstruction();
  const PROPERTY_CATEGORY_OPTIONS = SHARED_PROPERTY_CATEGORY_OPTIONS as unknown as string[];
  
  // New fields for land title deduction
  const [nationality, setNationality] = useState<'congolais' | 'etranger' | ''>('');
  
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
      hasBuildingPermit: parcelBuildingPermits.length > 0 || hasPermitUpdate === 'yes'
    });

    if (!validation.isValid) {
      toast({
        title: "Données incomplètes",
        description: `Veuillez remplir: ${validation.missingFields.join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    if (!nationality) {
      toast({
        title: "Données incomplètes",
        description: "Veuillez indiquer votre nationalité",
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
      hasBuildingPermit: parcelBuildingPermits.length > 0 || hasPermitUpdate === 'yes',
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

  // Computed: parcel-linked mode is always active once a request type is selected
  const isParcelLinkedMode = !!requestType;

  // Computed: form is blocked until a valid parcel is selected
  const isFormBlocked = !requestType || !parcelValidated;

  const { results: parcelSearchResults, setResults: setParcelSearchResults, loading: parcelSearchLoading } =
    useParcelNumberSearch(parcelNumberSearch, isParcelLinkedMode, isTestRoute);

  // Reset parcel validation when request type or fiche parcellaire changes
  useEffect(() => {
    setParcelNumberSearch('');
    setSelectedParcelNumber('');
    setParcelValidated(false);
    setParcelSearchResults([]);
    setParcelOwnerData(null);
    setParcelLocationData(null);
    setParcelValorisationData(null);
    setParcelBuildingPermits([]);
    setHasPermitUpdate('');
    setPermitUpdateNumber('');
    setPermitUpdateDate('');
    setPermitUpdateService('');
    setPermitUpdateFile(null);
    // Reset requesterType when not in parcel-linked mode
    if (!isParcelLinkedMode) {
      setFormData(prev => ({ ...prev, requesterType: 'owner', isOwnerSameAsRequester: true }));
    }
    // Force back to requester tab when form is blocked
    if (((requestType === 'initial' || requestType === 'conversion') && hasFicheParcellaire === 'no') || (requestType === 'renouvellement' && knowsParcelNumber === 'no')) {
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
  }, [constructionType, constructionNature, declaredUsage, nationality, formData.sectionType, hasPermitUpdate, parcelBuildingPermits]);

  // Auto-fill construction states when "Ces données sont exactes" is selected
  useEffect(() => {
    if (valorisationChoice === 'exact' && parcelValorisationData) {
      skipCascadeRef.current = true;
      setPropertyCategory(parcelValorisationData.propertyCategory || '');
      setConstructionType(parcelValorisationData.constructionType || '');
      setConstructionNature(parcelValorisationData.constructionNature || '');
      setConstructionMaterials(parcelValorisationData.constructionMaterials || '');
      setDeclaredUsage(parcelValorisationData.declaredUsage || '');
      setStanding(parcelValorisationData.standing || '');
      setFloorNumber(parcelValorisationData.floorNumber || '');
      setConstructionYear(parcelValorisationData.constructionYear ? String(parcelValorisationData.constructionYear) : '');
      setTimeout(() => { skipCascadeRef.current = false; }, 0);
    }
  }, [valorisationChoice, parcelValorisationData]);

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
      setPropertyCategory(draft.propertyCategory || '');
      setConstructionType(draft.constructionType || '');
      setConstructionNature(draft.constructionNature || '');
      setConstructionMaterials(draft.constructionMaterials || '');
      setDeclaredUsage(draft.declaredUsage || '');
      setStanding(draft.standing || '');
      setFloorNumber(draft.floorNumber || '');
      setConstructionYear(draft.constructionYear || '');
      setNationality(draft.nationality as any || '');
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
          propertyCategory,
          constructionType,
          constructionNature,
          constructionMaterials,
          declaredUsage,
          standing,
          floorNumber,
          constructionYear,
          nationality,
          requestType,
          selectedParcelNumber,
          gpsCoordinates,
          parcelSides
        });
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [open, formData, constructionType, constructionNature, constructionMaterials, declaredUsage, nationality, requestType, selectedParcelNumber, gpsCoordinates, parcelSides]);

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
      // Reset requester entity fields when legal status changes
      if (field === 'requesterLegalStatus') {
        updated.requesterEntityType = '';
        updated.requesterEntitySubType = '';
        updated.requesterEntitySubTypeOther = '';
        updated.requesterRightType = '';
        if (value !== 'Personne physique') {
          updated.requesterGender = '';
          updated.requesterMiddleName = '';
        }
      }
      // Reset owner entity fields when legal status changes
      if (field === 'ownerLegalStatus') {
        updated.ownerEntityType = '';
        updated.ownerEntitySubType = '';
        updated.ownerEntitySubTypeOther = '';
        updated.ownerRightType = '';
        if (value !== 'Personne physique') {
          updated.ownerGender = '';
          updated.ownerMiddleName = '';
        }
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

  const handleSelectParcel = async (parcel: { parcel_number: string; id: string }) => {
    setSelectedParcelNumber(parcel.parcel_number);
    setParcelNumberSearch(parcel.parcel_number);
    setParcelValidated(true);
    setShowParcelDropdown(false);
    // L'identité du propriétaire n'est jamais préremplie (donnée réservée après paiement).
    setParcelOwnerData(null);
    setLoadingOwnerData(true);
    try {
      const prefill = await fetchLandTitleParcelPrefill(parcel.parcel_number);
      if (!prefill) return;
      const loc = prefill.location;
      setParcelLocationData(loc);
      setFormData(prev => ({
        ...prev,
        sectionType: loc.sectionType as 'urbaine' | 'rurale',
        province: loc.province || '',
        ville: loc.ville, commune: loc.commune, quartier: loc.quartier, avenue: loc.avenue,
        territoire: loc.territoire, collectivite: loc.collectivite, groupement: loc.groupement, village: loc.village,
        areaSqm: prefill.areaSqm ?? prev.areaSqm,
      }));
      const v = prefill.valorisation;
      if (v) {
        setParcelValorisationData(v);
        if (v.propertyCategory) setPropertyCategory(v.propertyCategory);
        if (v.constructionType) setConstructionType(v.constructionType);
        if (v.constructionNature) setConstructionNature(v.constructionNature);
        if (v.constructionMaterials) setConstructionMaterials(v.constructionMaterials);
        if (v.declaredUsage) setDeclaredUsage(v.declaredUsage);
        if (v.standing) setStanding(v.standing);
        if (v.constructionYear) setConstructionYear(String(v.constructionYear));
        if (v.floorNumber) setFloorNumber(v.floorNumber);
      }
      setParcelBuildingPermits(prefill.permits);
    } catch (err) {
      console.error('Error fetching parcel prefill:', err);
      toast({ title: 'Préremplissage indisponible', description: 'Complétez les informations manuellement.', variant: 'destructive' });
    } finally {
      setLoadingOwnerData(false);
    }
  };


  const isFormValid = (): boolean => {
    // Check request type
    if (!requestType) return false;
    if (!parcelValidated) return false;
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
      // Validate personne morale required fields (F3)
      if (rLegalStatus === 'Personne morale') {
        if (!formData.requesterEntityType) return false;
        if (!formData.requesterEntitySubType) return false;
        if (!formData.requesterLastName || !formData.requesterFirstName) return false; // raison sociale + RCCM
      }
      // Validate État required fields (F3)
      if (rLegalStatus === 'État' && !formData.requesterRightType) {
        return false;
      }
    }
    
    // Check owner info if different (skip for renewal with auto-loaded owner data)
    const isParcelWithAutoOwner = isParcelLinkedMode && parcelValidated && parcelOwnerData;
    if (!formData.isOwnerSameAsRequester && !isParcelWithAutoOwner) {
      if (!formData.ownerLastName || !formData.ownerFirstName) {
        return false;
      }
      // Validate owner legal status conditional fields (F4)
      const oLegalStatus = formData.ownerLegalStatus || 'Personne physique';
      if (oLegalStatus === 'Personne morale') {
        if (!formData.ownerEntityType || !formData.ownerEntitySubType) return false;
      }
      if (oLegalStatus === 'État' && !formData.ownerRightType) return false;
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

    // Le serveur crée la demande et fixe le montant dû avant le paiement.
    const result = await createPendingRequest({
      ...formData,
      requestType,
      selectedParcelNumber,
      isOwnerSameAsRequester: formData.requesterType === 'owner',
      constructionType,
      constructionNature,
      constructionMaterials,
      declaredUsage,
      standing,
      constructionYear: constructionYear ? parseInt(constructionYear, 10) : undefined,
      floorNumber,
      deducedTitleType: deducedTitleType?.type || '',
      nationality,
      requesterIdDocumentFile: requesterIdFile,
      ownerIdDocumentFile: ownerIdFile,
      proofOfOwnershipFile: proofOfOwnershipFile,
      procurationDocumentFile: procurationFile,
      gpsCoordinates: gpsCoordinates,
      parcelSides: parcelSides,
      roadBorderingSides: roadSides,
      // Proposed building permit data
      proposedPermitType: showValorisationUpdate && hasPermitUpdate === 'yes' ? (permitUpdateType === 'construction' ? 'Autorisation de bâtir' : 'Régularisation') : undefined,
      proposedPermitNumber: showValorisationUpdate && hasPermitUpdate === 'yes' ? permitUpdateNumber : undefined,
      proposedPermitDate: showValorisationUpdate && hasPermitUpdate === 'yes' ? permitUpdateDate : undefined,
      proposedPermitService: showValorisationUpdate && hasPermitUpdate === 'yes' ? permitUpdateService : undefined,
      proposedPermitDocumentFile: showValorisationUpdate && hasPermitUpdate === 'yes' ? permitUpdateFile : undefined,
    });

    setIsSubmitting(false);

    if (result.success && result.requestId) {
      setSavedRequestId(result.requestId);
      setSavedReferenceNumber(result.referenceNumber || '');
      const serverTotal = result.totalAmountUsd ?? 0;
      setServerAmountDue(serverTotal);
      if (Math.round(serverTotal * 100) !== Math.round(totalAmount * 100)) {
        toast({
          title: 'Montant mis à jour',
          description: `Le montant fixé par le serveur est de ${serverTotal} USD (estimation affichée : ${totalAmount} USD).`,
        });
      }
      setShowPayment(true);
      // Clear draft on successful creation
      clearDraft();
    }
  };

  const handlePaymentSuccess = async () => {
    // Le paiement est confirmé côté serveur (fonction de paiement / webhook) :
    // le client ne modifie jamais lui-même l'état de paiement.
    setShowPayment(false);
    setShowSuccess(true);
  };

  const handlePaymentCancel = useCallback(() => {
    // La demande reste « en attente de paiement » : reprise ou annulation depuis l'espace utilisateur.
    if (savedRequestId) {
      toast({ title: 'Demande en attente de paiement', description: 'Vous pourrez la payer ou l\'annuler depuis votre espace utilisateur.' });
    }
    setShowPayment(false);
    setSavedRequestId('');
    setSavedReferenceNumber('');
  }, [savedRequestId, toast]);

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
    // Clear draft
    clearDraft();
    // Reset ALL form state
    setServerAmountDue(0);
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
    setPropertyCategory('');
    setConstructionType('');
    setConstructionNature('');
    setConstructionMaterials('');
    setDeclaredUsage('');
    setStanding('');
    setFloorNumber('');
    setConstructionYear('');
    setNationality('');
    setValorisationValidated(false);
    setDeducedTitleType(null);
    // Reset valorisation update states
    setValorisationChoice(null);
    setHasPermitUpdate('');
    setPermitUpdateType('construction');
    setPermitUpdateNumber('');
    setPermitUpdateDate('');
    setPermitUpdateService('');
    setPermitUpdateFile(null);
    setParcelBuildingPermits([]);
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


  if (showPayment) {
    return (
      <LandTitlePaymentView open={open} isMobile={isMobile} province={formData.province}
        amountDue={serverAmountDue} requestId={savedRequestId}
        onClose={handleConfirmClose} onSuccess={handlePaymentSuccess} onCancel={handlePaymentCancel} />
    );
  }

  if (showSuccess) {
    return (
      <LandTitleSuccessView open={open} isMobile={isMobile} referenceNumber={savedReferenceNumber} onClose={handleConfirmClose} />
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
          <DialogContent className={`${isMobile ? 'w-[92vw] max-w-[360px] max-h-[88vh] rounded-2xl' : 'max-w-md rounded-2xl'} p-4 overflow-hidden`}>
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
                <ApplicantTab
                  formData={formData}
                  handleInputChange={handleInputChange}
                  parcelSearch={{
                    requestType,
                    setRequestType,
                    parcelNumberSearch,
                    setParcelNumberSearch,
                    parcelSearchResults,
                    parcelSearchLoading,
                    showParcelDropdown,
                    setShowParcelDropdown,
                    selectedParcelNumber,
                    setSelectedParcelNumber,
                    parcelValidated,
                    setParcelValidated,
                    onSelectParcel: handleSelectParcel,
                    onOpenChange,
                  }}
                  parcelOwnerData={parcelOwnerData}
                  loadingOwnerData={loadingOwnerData}
                  isParcelLinkedMode={isParcelLinkedMode}
                  isFormBlocked={isFormBlocked}
                  setActiveTab={setActiveTab}
                />

                {/* Tab: Location */}
                <LocationTab
                  isParcelLinkedMode={isParcelLinkedMode}
                  parcelValidated={parcelValidated}
                  parcelLocationData={parcelLocationData}
                  formData={formData}
                  handleInputChange={handleInputChange}
                  availableVilles={availableVilles}
                  availableCommunes={availableCommunes}
                  availableQuartiers={availableQuartiers}
                  availableTerritoires={availableTerritoires}
                  availableCollectivites={availableCollectivites}
                  gpsCoordinates={gpsCoordinates}
                  setGpsCoordinates={setGpsCoordinates}
                  mapConfig={mapConfig}
                  parcelSides={parcelSides}
                  setParcelSides={setParcelSides}
                  roadSides={roadSides}
                  setRoadSides={setRoadSides}
                  setActiveTab={setActiveTab}
                />

                {/* Tab: Valorisation */}
                <ValorisationTab
                  isParcelLinkedMode={isParcelLinkedMode}
                  parcelValidated={parcelValidated}
                  parcelValorisationData={parcelValorisationData}
                  selectedParcelNumber={selectedParcelNumber}
                  parcelBuildingPermits={parcelBuildingPermits}
                  valorisationChoice={valorisationChoice}
                  setValorisationChoice={setValorisationChoice}
                  showValorisationUpdate={showValorisationUpdate}
                  formData={formData}
                  propertyCategory={propertyCategory}
                  setPropertyCategory={setPropertyCategory}
                  PROPERTY_CATEGORY_OPTIONS={PROPERTY_CATEGORY_OPTIONS}
                  constructionType={constructionType}
                  setConstructionType={setConstructionType}
                  availableConstructionTypes={availableConstructionTypes}
                  constructionMaterials={constructionMaterials}
                  setConstructionMaterials={setConstructionMaterials}
                  constructionNature={constructionNature}
                  setConstructionNature={setConstructionNature}
                  availableConstructionNatures={availableConstructionNatures}
                  declaredUsage={declaredUsage}
                  setDeclaredUsage={setDeclaredUsage}
                  availableDeclaredUsages={availableDeclaredUsages}
                  standing={standing}
                  setStanding={setStanding}
                  floorNumber={floorNumber}
                  setFloorNumber={setFloorNumber}
                  constructionYear={constructionYear}
                  setConstructionYear={setConstructionYear}
                  hasPermitUpdate={hasPermitUpdate}
                  setHasPermitUpdate={setHasPermitUpdate}
                  permitUpdateType={permitUpdateType}
                  setPermitUpdateType={setPermitUpdateType}
                  permitUpdateNumber={permitUpdateNumber}
                  setPermitUpdateNumber={setPermitUpdateNumber}
                  permitUpdateDate={permitUpdateDate}
                  setPermitUpdateDate={setPermitUpdateDate}
                  permitUpdateService={permitUpdateService}
                  setPermitUpdateService={setPermitUpdateService}
                  permitUpdateFile={permitUpdateFile}
                  setPermitUpdateFile={setPermitUpdateFile}
                  nationality={nationality}
                  setNationality={setNationality}
                  handleValidateValorisation={handleValidateValorisation}
                  valorisationValidated={valorisationValidated}
                  deducedTitleType={deducedTitleType}
                  requestType={requestType}
                  setActiveTab={setActiveTab}
                />

                {/* Tab: Documents */}
                <DocumentsTab formData={formData} requesterIdFile={requesterIdFile} setRequesterIdFile={setRequesterIdFile} ownerIdFile={ownerIdFile} setOwnerIdFile={setOwnerIdFile} proofOfOwnershipFile={proofOfOwnershipFile} setProofOfOwnershipFile={setProofOfOwnershipFile} procurationFile={procurationFile} setProcurationFile={setProcurationFile} setActiveTab={setActiveTab} />

                {/* Tab: Payment */}
                <PaymentTab formData={formData} deducedTitleType={deducedTitleType} valorisationValidated={valorisationValidated} loadingDynamicFees={loadingDynamicFees} calculatedFeesResult={calculatedFeesResult} totalAmount={totalAmount} loading={loading} setActiveTab={setActiveTab} />

                  {/* Tab: Review / Envoi */}
                  <TabsContent value="review" className="space-y-4">
                    <LandTitleReviewTab
                      formData={formData}
                      propertyCategory={propertyCategory}
                      constructionType={constructionType}
                      constructionNature={constructionNature}
                      constructionMaterials={constructionMaterials}
                      declaredUsage={declaredUsage}
                      standing={standing}
                      floorNumber={floorNumber}
                      constructionYear={constructionYear}
                      nationality={nationality}
                      hasBuildingPermit={parcelBuildingPermits.length > 0 || hasPermitUpdate === 'yes'}
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
                      hasPermitUpdate={hasPermitUpdate}
                      permitUpdateType={permitUpdateType}
                      permitUpdateNumber={permitUpdateNumber}
                      permitUpdateDate={permitUpdateDate}
                      permitUpdateService={permitUpdateService}
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
