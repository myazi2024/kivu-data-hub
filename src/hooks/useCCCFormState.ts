import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useFormPersistence } from '@/hooks/ccc/useFormPersistence';
import { supabase } from '@/integrations/supabase/client';
import { useCadastralContribution, CadastralContributionData } from '@/hooks/useCadastralContribution';
import { useContributionConfig } from '@/hooks/useContributionConfig';
import { useMapConfig } from '@/hooks/useMapConfig';
import { useCCCFormPicklists } from '@/hooks/useCCCFormPicklists';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { AdditionalConstruction } from '@/components/cadastral/AdditionalConstructionBlock';
import { PROPERTY_TITLE_TYPES, getEffectiveTitleName } from '@/components/cadastral/PropertyTitleTypeSelect';
import { CurrentOwner, BuildingPermit } from '@/components/cadastral/ccc-tabs/GeneralTab';
import { PreviousOwner } from '@/components/cadastral/ccc-tabs/HistoryTab';
import { TaxRecord, MortgageRecord } from '@/components/cadastral/ccc-tabs/ObligationsTab';
import { resolveAvailableUsages } from '@/utils/constructionUsageResolver';
import { normalizeConstructionNature } from '@/utils/constructionNatureNormalizer';
import {
  getAllProvinces,
  getVillesForProvince,
  getCommunesForVille,
  getTerritoiresForProvince,
  getCollectivitesForTerritoire,
  getQuartiersForCommune,
  getAvenuesForQuartier
} from '@/lib/geographicData';

// FIX #27: Lazy import confetti to avoid loading it for every session
const lazyConfetti = () => import('canvas-confetti').then(m => m.default);

interface UseCCCFormStateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcelNumber: string;
  editingContributionId?: string;
  dialogContentRef: React.RefObject<HTMLDivElement>;
}

export const useCCCFormState = ({
  open,
  onOpenChange,
  parcelNumber,
  editingContributionId,
  dialogContentRef,
}: UseCCCFormStateProps) => {
  const { submitContribution, updateContribution, loading } = useCadastralContribution();
  const { getConfig } = useContributionConfig();
  const { config: mapConfig, loading: mapConfigLoading } = useMapConfig();
  const { getOptions: getPicklistOptions, getDependentOptions: getPicklistDependentOptions } = useCCCFormPicklists();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // ─── State declarations ───
  const [showSuccess, setShowSuccess] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const formDirtyRef = useRef(false);
  const isLoadingFromDbRef = useRef(false);
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
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());
  const [customTitleName, setCustomTitleName] = useState('');
  const [hasShownConfetti, setHasShownConfetti] = useState(false);
  const [roadSides, setRoadSides] = useState<any[]>([]);
  const [servitude, setServitude] = useState<{ hasServitude: boolean; width?: number }>({ hasServitude: false });
  const [buildingShapes, setBuildingShapes] = useState<any[]>([]);
  const [disputeFormData, setDisputeFormData] = useState<any>(null);

  const [previousOwners, setPreviousOwners] = useState<PreviousOwner[]>([{
    name: '', legalStatus: 'Personne physique', entityType: '', entitySubType: '',
    entitySubTypeOther: '', stateExploitedBy: '', startDate: '', endDate: '', mutationType: 'Vente'
  }]);

  const [ownershipMode, setOwnershipMode] = useState<'unique' | 'multiple'>('unique');
  const [leaseYears, setLeaseYears] = useState<number>(0);

  const [currentOwners, setCurrentOwners] = useState<CurrentOwner[]>([{
    lastName: '', middleName: '', firstName: '', legalStatus: 'Personne physique',
    gender: '', entityType: '', entitySubType: '', entitySubTypeOther: '',
    stateExploitedBy: '', rightType: '', since: '', nationality: '', previousTitleType: '', previousTitleCustomName: ''
  }]);

  const [taxRecords, setTaxRecords] = useState<TaxRecord[]>([{
    taxType: 'Impôt foncier annuel', taxYear: '', taxAmount: '', paymentStatus: 'Payé',
    paymentDate: '', receiptFile: null
  }]);

  const [hasMortgage, setHasMortgage] = useState<boolean | null>(null);
  const [hasDispute, setHasDispute] = useState<boolean | null>(null);

  const [mortgageRecords, setMortgageRecords] = useState<MortgageRecord[]>([{
    mortgageAmount: '', duration: '', creditorName: '', creditorType: 'Banque',
    contractDate: '', mortgageStatus: 'Active', receiptFile: null
  }]);

  const [permitMode, setPermitMode] = useState<'existing' | 'request' | null>(null);
  const [constructionMode, setConstructionMode] = useState<'unique' | 'multiple'>('unique');
  const [additionalConstructions, setAdditionalConstructions] = useState<AdditionalConstruction[]>([]);

  const [buildingPermits, setBuildingPermits] = useState<BuildingPermit[]>([{
    permitType: 'construction', permitNumber: '', issueDate: '',
    validityMonths: '36', administrativeStatus: 'En attente', issuingService: '', attachmentFile: null
  }]);

  const [permitRequest, setPermitRequest] = useState({
    permitType: 'construction' as 'construction' | 'regularization',
    hasExistingConstruction: false, constructionDescription: '', plannedUsage: '',
    estimatedArea: '', applicantName: '', applicantPhone: '', applicantEmail: '',
    selectedOwnerIndex: -1, numberOfFloors: '', buildingMaterials: '',
    architecturalPlanImages: [] as File[], constructionYear: '', regularizationReason: '',
    originalPermitNumber: '', previousPermitNumber: '', constructionPhotos: [] as File[]
  });

  const [gpsCoordinates, setGpsCoordinates] = useState<Array<{
    borne: string; lat: string; lng: string; mode?: 'auto' | 'manual'; detected?: boolean; detecting?: boolean;
  }>>([]);

  const [obligationType, setObligationType] = useState<'taxes' | 'mortgages' | 'disputes'>('taxes');

  const PROPERTY_CATEGORY_OPTIONS = [
    'Appartement', 'Villa', 'Maison', 'Local commercial',
    'Immeuble/Bâtiment', 'Entrepôt/Hangar', 'Terrain nu',
  ];

  const CATEGORY_TO_CONSTRUCTION_TYPES: Record<string, string[]> = {
    'Appartement': ['Résidentielle'], 'Villa': ['Résidentielle'], 'Maison': ['Résidentielle'],
    'Local commercial': ['Commerciale'], 'Immeuble/Bâtiment': ['Résidentielle', 'Commerciale', 'Industrielle'],
    'Entrepôt/Hangar': ['Industrielle', 'Agricole'], 'Terrain nu': ['Terrain nu'],
  };

  const [availableConstructionTypes, setAvailableConstructionTypes] = useState<string[]>([]);
  const [availableConstructionNatures, setAvailableConstructionNatures] = useState<string[]>([]);
  const [availableDeclaredUsages, setAvailableDeclaredUsages] = useState<string[]>([]);
  const [availableConstructionMaterials, setAvailableConstructionMaterials] = useState<string[]>([]);
  const [availableStandings, setAvailableStandings] = useState<string[]>([]);

  const [formData, setFormData] = useState<CadastralContributionData>({ parcelNumber });

  const [parcelSides, setParcelSides] = useState<Array<{ name: string; length: string }>>([
    { name: 'Côté 1', length: '' }, { name: 'Côté 2', length: '' }, { name: 'Côté 3', length: '' }
  ]);

  const [availableVilles, setAvailableVilles] = useState<string[]>([]);
  const [availableCommunes, setAvailableCommunes] = useState<string[]>([]);
  const [availableTerritoires, setAvailableTerritoires] = useState<string[]>([]);
  const [availableCollectivites, setAvailableCollectivites] = useState<string[]>([]);
  const [availableQuartiers, setAvailableQuartiers] = useState<string[]>([]);
  const [availableAvenues, setAvailableAvenues] = useState<string[]>([]);

  const [sectionType, setSectionType] = useState<'urbaine' | 'rurale' | ''>('');
  const [sectionTypeAutoDetected, setSectionTypeAutoDetected] = useState(false);

  // Note: STORAGE_KEY/SCHEMA/TTL gérés dans useFormPersistence (sous-hook).

  // ─── Helper: mark form dirty ───
  const markDirty = useCallback(() => { formDirtyRef.current = true; }, []);

  const handleInputChange = useCallback((field: keyof CadastralContributionData, value: any) => {
    formDirtyRef.current = true;
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (dialogContentRef.current) {
      dialogContentRef.current.scrollTop = 0;
    }
  };

  const handleSectionTypeChange = (type: 'urbaine' | 'rurale') => {
    setSectionType(type);
    setFormData(prev => ({
      ...prev,
      ville: undefined, commune: undefined, quartier: undefined, avenue: undefined,
      territoire: undefined, collectivite: undefined, groupement: undefined, village: undefined
    }));
    setAvailableQuartiers([]);
    setAvailableAvenues([]);
  };

  // ─── Storage: save/load/clear (extrait dans useFormPersistence) ───
  // Sound environment state
  const [soundEnvironment, setSoundEnvironment] = useState('');
  const [nearbySoundSources, setNearbySoundSources] = useState('');

  const STORAGE_KEY = `cadastral_contribution_${parcelNumber}`;

  const {
    saveFormDataToStorage,
    clearSavedFormData,
    trackUploadedPath,
    rollbackUploadedFiles,
    resetUploadedTracker,
  } = useFormPersistence({
    open, parcelNumber, editingContributionId, isLoadingFromDbRef,
    formData, currentOwners, previousOwners, taxRecords, mortgageRecords,
    permitMode, buildingPermits, permitRequest, gpsCoordinates, parcelSides,
    obligationType, sectionType, hasMortgage, hasDispute, ownershipMode, leaseYears,
    roadSides, servitude, customTitleName, constructionMode, additionalConstructions,
    buildingShapes, disputeFormData, soundEnvironment, nearbySoundSources,
    setFormData, setCurrentOwners, setPreviousOwners, setTaxRecords, setMortgageRecords,
    setPermitMode, setBuildingPermits, setPermitRequest, setGpsCoordinates, setParcelSides,
    setObligationType, setSectionType, setHasMortgage, setHasDispute, setOwnershipMode,
    setLeaseYears, setRoadSides, setServitude, setCustomTitleName, setConstructionMode,
    setAdditionalConstructions, setBuildingShapes, setDisputeFormData,
    setSoundEnvironment, setNearbySoundSources,
  });

  // ─── File handling ───
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'owner' | 'title') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateAttachmentFile(file)) return;
    if (type === 'owner') {
      setOwnerDocFile(file);
    } else {
      if (titleDocFiles.length >= 5) {
        toast({ title: "Limite atteinte", description: "Vous ne pouvez ajouter que 5 pièces jointes maximum", variant: "destructive" });
        return;
      }
      setTitleDocFiles(prev => [...prev, file]);
    }
    e.target.value = '';
  };

  const removeFile = (type: 'owner' | 'title', index?: number) => {
    if (type === 'owner') setOwnerDocFile(null);
    else if (index !== undefined) setTitleDocFiles(prev => prev.filter((_, i) => i !== index));
  };

  const validateAttachmentFile = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Type de fichier non valide", description: "Seuls les fichiers JPG, PNG, WEBP et PDF sont acceptés", variant: "destructive" });
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: "La taille maximale est de 10 MB", variant: "destructive" });
      return false;
    }
    return true;
  };

  // Tracker des fichiers uploadés (extrait dans useFormPersistence — exposé via trackUploadedPath/rollbackUploadedFiles/resetUploadedTracker)
  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${path}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('cadastral-documents').upload(filePath, file);
      if (uploadError) { console.error('Upload error:', uploadError); return null; }
      // Tracker pour rollback éventuel
      trackUploadedPath(filePath);
      const { data: signedData, error: signedError } = await supabase.storage.from('cadastral-documents').createSignedUrl(filePath, 60 * 60 * 24 * 365 * 10);
      if (signedError || !signedData?.signedUrl) { console.error('Signed URL error:', signedError); return null; }
      return signedData.signedUrl;
    } catch (error) { console.error('Error uploading file:', error); return null; }
  };

  // ─── CRUD: Previous owners ───
  const addPreviousOwner = () => {
    const firstCurrentOwner = currentOwners[0];
    if (!firstCurrentOwner?.lastName || !firstCurrentOwner?.firstName) {
      setShowCurrentOwnerRequiredWarning(true);
      setTimeout(() => setShowCurrentOwnerRequiredWarning(false), 5000);
      return;
    }
    const lastOwner = previousOwners[previousOwners.length - 1];
    if (!lastOwner?.name || !lastOwner?.legalStatus || !lastOwner?.mutationType) {
      setShowPreviousOwnerWarning(true);
      setHighlightIncompletePreviousOwner(true);
      setTimeout(() => setShowPreviousOwnerWarning(false), 5000);
      setTimeout(() => setHighlightIncompletePreviousOwner(false), 3000);
      return;
    }
    setShowPreviousOwnerWarning(false);
    setHighlightIncompletePreviousOwner(false);
    const newOwner: PreviousOwner = {
      name: '', legalStatus: 'Personne physique', entityType: '', entitySubType: '',
      entitySubTypeOther: '', stateExploitedBy: '', startDate: '', endDate: '', mutationType: 'Vente'
    };
    if (previousOwners.length > 0) {
      const lastOwner = previousOwners[previousOwners.length - 1];
      if (lastOwner.startDate) newOwner.endDate = lastOwner.startDate;
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

  // ─── CRUD: Current owners ───
  const addCurrentOwner = () => {
    const lastOwner = currentOwners[currentOwners.length - 1];
    if (!lastOwner?.lastName || !lastOwner?.firstName) {
      setShowOwnerWarning(true);
      setHighlightIncompleteOwner(true);
      setTimeout(() => setShowOwnerWarning(false), 5000);
      setTimeout(() => setHighlightIncompleteOwner(false), 3000);
      return;
    }
    setShowOwnerWarning(false);
    setHighlightIncompleteOwner(false);
    setCurrentOwners([...currentOwners, {
      lastName: '', middleName: '', firstName: '', legalStatus: 'Personne physique',
      gender: '', entityType: '', entitySubType: '', entitySubTypeOther: '',
      stateExploitedBy: '', rightType: '', since: '', nationality: '', previousTitleType: '', previousTitleCustomName: ''
    }]);
    markDirty();
  };

  const removeCurrentOwner = (index: number) => {
    if (currentOwners.length > 1) { setCurrentOwners(currentOwners.filter((_, i) => i !== index)); markDirty(); }
  };

  const updateCurrentOwner = (index: number, field: string | Record<string, string>, value?: string) => {
    markDirty();
    setCurrentOwners(prev => {
      const updated = [...prev];
      if (typeof field === 'string') updated[index] = { ...updated[index], [field]: value };
      else updated[index] = { ...updated[index], ...field };
      return updated;
    });
  };

  // ─── CRUD: Tax records ───
  const addTaxRecord = () => {
    const lastTax = taxRecords[taxRecords.length - 1];
    if (!lastTax?.taxType || !lastTax?.taxYear || !lastTax?.taxAmount || !lastTax?.paymentStatus) {
      setShowTaxWarning(true); setHighlightIncompleteTax(true);
      setTimeout(() => setShowTaxWarning(false), 5000);
      setTimeout(() => setHighlightIncompleteTax(false), 3000);
      return;
    }
    setShowTaxWarning(false); setHighlightIncompleteTax(false);
    setTaxRecords([...taxRecords, { taxType: 'Impôt foncier annuel', taxYear: '', taxAmount: '', paymentStatus: 'Payé', paymentDate: '', receiptFile: null }]);
    markDirty();
  };

  const removeTaxRecord = (index: number) => { setTaxRecords(taxRecords.filter((_, i) => i !== index)); markDirty(); };

  const updateTaxRecord = (index: number, field: string, value: string) => {
    const updated = [...taxRecords];
    updated[index] = { ...updated[index], [field]: value };
    // Auto-assign / clear constructionRef on taxType change
    if (field === 'taxType') {
      if (value === 'Impôt sur les revenus locatifs') {
        // Auto-assign first available rentalRef if none yet
        const usedRefs = new Set(
          updated
            .filter((t, i) => i !== index && t.taxType === 'Impôt sur les revenus locatifs' && t.constructionRef)
            .map(t => t.constructionRef as string)
        );
        const available: string[] = [];
        if (formData.declaredUsage === 'Location') available.push('main');
        additionalConstructions.forEach((c, idx) => {
          if (c.declaredUsage === 'Location') available.push(`additional:${idx}`);
        });
        const free = available.find(r => !usedRefs.has(r));
        if (free && !updated[index].constructionRef) {
          updated[index] = { ...updated[index], constructionRef: free };
        }
      } else {
        // Non-IRL : clear constructionRef
        updated[index] = { ...updated[index], constructionRef: undefined };
      }
    }
    setTaxRecords(updated);
    markDirty();
  };

  const handleTaxFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { if (!validateAttachmentFile(file)) return; const updated = [...taxRecords]; updated[index] = { ...updated[index], receiptFile: file }; setTaxRecords(updated); }
    e.target.value = '';
  };

  const removeTaxFile = (index: number) => {
    const updated = [...taxRecords]; updated[index] = { ...updated[index], receiptFile: null }; setTaxRecords(updated);
  };

  // ─── CRUD: Mortgage records ───
  const addMortgageRecord = () => {
    const lastMortgage = mortgageRecords[mortgageRecords.length - 1];
    if (!lastMortgage?.mortgageAmount || !lastMortgage?.duration || !lastMortgage?.creditorName || !lastMortgage?.creditorType || !lastMortgage?.contractDate || !lastMortgage?.mortgageStatus) {
      setShowMortgageWarning(true); setHighlightIncompleteMortgage(true);
      setTimeout(() => setShowMortgageWarning(false), 5000);
      setTimeout(() => setHighlightIncompleteMortgage(false), 3000);
      return;
    }
    setShowMortgageWarning(false); setHighlightIncompleteMortgage(false);
    setMortgageRecords([...mortgageRecords, { mortgageAmount: '', duration: '', creditorName: '', creditorType: 'Banque', contractDate: '', mortgageStatus: 'Active', receiptFile: null }]);
    markDirty();
  };

  const removeMortgageRecord = (index: number) => { setMortgageRecords(mortgageRecords.filter((_, i) => i !== index)); markDirty(); };

  const updateMortgageRecord = (index: number, field: string, value: string) => {
    const updated = [...mortgageRecords]; updated[index] = { ...updated[index], [field]: value }; setMortgageRecords(updated); markDirty();
  };

  const handleMortgageFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { if (!validateAttachmentFile(file)) return; const updated = [...mortgageRecords]; updated[index] = { ...updated[index], receiptFile: file }; setMortgageRecords(updated); }
    e.target.value = '';
  };

  const removeMortgageFile = (index: number) => {
    const updated = [...mortgageRecords]; updated[index] = { ...updated[index], receiptFile: null }; setMortgageRecords(updated);
  };

  // ─── CRUD: Building permits ───
  const addBuildingPermit = () => {
    const lastPermit = buildingPermits[buildingPermits.length - 1];
    if (!lastPermit?.permitNumber || !lastPermit?.issueDate) {
      setShowPermitWarning(true); setHighlightIncompletePermit(true);
      setTimeout(() => setShowPermitWarning(false), 5000);
      setTimeout(() => setHighlightIncompletePermit(false), 3000);
      return;
    }
    setShowPermitWarning(false); setHighlightIncompletePermit(false);
    setBuildingPermits([...buildingPermits, { permitType: 'construction', permitNumber: '', issueDate: '', validityMonths: '36', administrativeStatus: 'En attente', issuingService: '', attachmentFile: null }]);
    markDirty();
  };

  const removeBuildingPermit = (index: number) => { setBuildingPermits(buildingPermits.filter((_, i) => i !== index)); markDirty(); };

  const updateBuildingPermit = (index: number, field: string, value: string) => {
    const updated = [...buildingPermits]; updated[index] = { ...updated[index], [field]: value }; setBuildingPermits(updated); markDirty();
  };

  const updateBuildingPermitFile = (index: number, file: File | null) => {
    const updated = [...buildingPermits]; updated[index] = { ...updated[index], attachmentFile: file }; setBuildingPermits(updated); markDirty();
  };

  const removeBuildingPermitFile = (index: number) => {
    const updated = [...buildingPermits]; updated[index] = { ...updated[index], attachmentFile: null }; setBuildingPermits(updated); markDirty();
  };

  // ─── Permit type restrictions ───
  const getPermitTypeRestrictions = () => {
    const restrictions = {
      blockedInExisting: null as 'construction' | 'regularization' | null,
      blockedInRequest: null as 'construction' | 'regularization' | null,
      messageExisting: '', messageRequest: '',
      dateMinExisting: '', dateMaxExisting: '', dateMinRegularization: '', dateMaxRegularization: ''
    };
    const today = new Date();
    const threeYearsAgo = new Date(today); threeYearsAgo.setFullYear(today.getFullYear() - 3);
    const oneMonthAgo = new Date(today); oneMonthAgo.setMonth(today.getMonth() - 1);

    if (formData.propertyCategory === 'Terrain nu' || formData.constructionType === 'Terrain nu') {
      restrictions.blockedInExisting = 'regularization'; restrictions.blockedInRequest = 'regularization';
      restrictions.messageExisting = `Vous avez indiqué dans "Catégorie de bien" que c'est un terrain nu. Un terrain nu n'a pas besoin d'une autorisation de régularisation, mais plutôt d'une autorisation de bâtir.`;
      restrictions.messageRequest = restrictions.messageExisting;
      restrictions.dateMinExisting = threeYearsAgo.toISOString().split('T')[0];
      restrictions.dateMaxExisting = today.toISOString().split('T')[0];
      return restrictions;
    }
    if (formData.constructionNature === 'Précaire' || formData.constructionNature === 'Construction précaire') {
      restrictions.blockedInExisting = 'regularization'; restrictions.blockedInRequest = 'regularization';
      restrictions.messageExisting = `Construction précaire : pas besoin d'autorisation de régularisation.`;
      restrictions.messageRequest = restrictions.messageExisting;
      restrictions.dateMinExisting = threeYearsAgo.toISOString().split('T')[0];
      restrictions.dateMaxExisting = today.toISOString().split('T')[0];
      return restrictions;
    }
    if (formData.constructionType && formData.constructionType !== 'Terrain nu') {
      restrictions.dateMinExisting = threeYearsAgo.toISOString().split('T')[0];
      restrictions.dateMaxExisting = oneMonthAgo.toISOString().split('T')[0];
      restrictions.dateMinRegularization = threeYearsAgo.toISOString().split('T')[0];
      restrictions.dateMaxRegularization = today.toISOString().split('T')[0];
    }
    return restrictions;
  };

  // ─── GPS coordinates ───
  const addGPSCoordinate = () => {
    const filledSides = parcelSides.filter(s => s.length && parseFloat(s.length) > 0);
    if (gpsCoordinates.length >= filledSides.length) return;
    setGpsCoordinates([...gpsCoordinates, { borne: `Borne ${gpsCoordinates.length + 1}`, lat: '', lng: '', mode: 'auto', detected: false, detecting: false }]);
    markDirty();
  };

  const removeGPSCoordinate = (index: number) => {
    setGpsCoordinates(gpsCoordinates.filter((_, i) => i !== index));
    if (parcelSides.length > 2 && index < parcelSides.length) setParcelSides(parcelSides.filter((_, i) => i !== index));
    markDirty();
  };

  const updateGPSCoordinate = (index: number, field: string, value: any) => {
    const updated = [...gpsCoordinates]; updated[index] = { ...updated[index], [field]: value }; setGpsCoordinates(updated); markDirty();
  };

  const captureCurrentLocation = (index: number) => {
    if (!navigator.geolocation) {
      toast({ title: "Erreur", description: "La géolocalisation n'est pas supportée par votre navigateur", variant: "destructive" });
      return;
    }
    setGpsCoordinates(prev => { const updated = [...prev]; updated[index] = { ...updated[index], detecting: true }; return updated; });
    toast({ title: "Détection en cours...", description: "Veuillez patienter pendant que nous obtenons votre position GPS" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsCoordinates(prev => {
          const finalUpdate = [...prev];
          finalUpdate[index] = { ...finalUpdate[index], lat: position.coords.latitude.toFixed(6), lng: position.coords.longitude.toFixed(6), detected: true, detecting: false };
          return finalUpdate;
        });
        toast({ title: "Borne détectée", description: `Coordonnées enregistrées (précision: ±${Math.round(position.coords.accuracy)}m)` });
      },
      (error) => {
        setGpsCoordinates(prev => { const errorUpdate = [...prev]; errorUpdate[index] = { ...errorUpdate[index], detecting: false }; return errorUpdate; });
        let errorMessage = "Impossible de récupérer votre position";
        switch (error.code) {
          case error.PERMISSION_DENIED: errorMessage = "Veuillez autoriser l'accès à votre position"; break;
          case error.POSITION_UNAVAILABLE: errorMessage = "Position indisponible. Assurez-vous que le GPS est activé"; break;
          case error.TIMEOUT: errorMessage = "La détection a pris trop de temps. Réessayez"; break;
        }
        toast({ title: "Erreur de géolocalisation", description: errorMessage, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 }
    );
  };

  const resetGPSCoordinate = (index: number) => {
    const updated = [...gpsCoordinates]; updated[index] = { ...updated[index], lat: '', lng: '', detected: false, detecting: false }; setGpsCoordinates(updated);
    toast({ title: "Borne réinitialisée", description: "Vous pouvez à nouveau détecter cette borne" });
  };

  // ─── Parcel sides ───
  const addParcelSide = () => {
    const sideNumber = parcelSides.length + 1;
    setParcelSides([...parcelSides, { name: `Côté ${sideNumber}`, length: '' }]);
    setGpsCoordinates([...gpsCoordinates, { borne: `Borne ${gpsCoordinates.length + 1}`, lat: '', lng: '' }]);
    markDirty();
  };

  const removeParcelSide = (index: number) => {
    if (parcelSides.length > 2) {
      setParcelSides(parcelSides.filter((_, i) => i !== index));
      if (index < gpsCoordinates.length) setGpsCoordinates(gpsCoordinates.filter((_, i) => i !== index));
      markDirty();
    }
  };

  const updateParcelSide = (index: number, field: 'name' | 'length', value: string) => {
    const updated = [...parcelSides]; updated[index] = { ...updated[index], [field]: value }; setParcelSides(updated); markDirty();
  };

  // ─── Validation: getMissingFields ───
  // FIX audit 3.8: mémoïsation via useMemo. Le tableau résultat est calculé
  // une seule fois par changement de deps, puis getMissingFields() retourne la
  // référence stable. Évite la ré-évaluation O(n²) sur chaque render.
  const missingFieldsList = useMemo(() => {
    const missing: Array<{ field: string; label: string; tab: string }> = [];
    const isTerrainNu = formData.constructionType === 'Terrain nu';
    const isAppartement = formData.propertyCategory === 'Appartement';

    // GENERAL
    if (!formData.propertyTitleType || formData.propertyTitleType.trim() === '') missing.push({ field: 'propertyTitleType', label: 'Type de titre de propriété', tab: 'general' });
    if (formData.propertyTitleType === 'Autre' && (!customTitleName || customTitleName.trim() === '')) missing.push({ field: 'customTitleName', label: 'Nom du titre de propriété (Autre)', tab: 'general' });
    if (formData.titleReferenceNumber && formData.titleReferenceNumber.trim() !== '' && formData.isTitleInCurrentOwnerName === undefined) missing.push({ field: 'isTitleInCurrentOwnerName', label: 'Ce titre est-il au nom du propriétaire actuel ?', tab: 'general' });
    if (!ownerDocFile && !(editingContributionId && formData.ownerDocumentUrl)) missing.push({ field: 'ownerDocFile', label: 'Pièce jointe du propriétaire', tab: 'general' });
    if (titleDocFiles.length === 0 && !(editingContributionId && formData.titleDocumentUrl)) missing.push({ field: 'titleDocFiles', label: 'Pièce jointe du titre de propriété', tab: 'general' });

    const firstOwner = currentOwners[0];
    if (firstOwner?.legalStatus === 'Personne physique') {
      if (!firstOwner.lastName || firstOwner.lastName.trim() === '') missing.push({ field: 'ownerLastName', label: 'Nom du propriétaire', tab: 'general' });
      if (!firstOwner.firstName || firstOwner.firstName.trim() === '') missing.push({ field: 'ownerFirstName', label: 'Prénom du propriétaire', tab: 'general' });
      if (!firstOwner.gender) missing.push({ field: 'ownerGender', label: 'Sexe du propriétaire', tab: 'general' });
    } else if (firstOwner?.legalStatus === 'Personne morale') {
      if (!firstOwner.entityType) missing.push({ field: 'ownerEntityType', label: "Type d'entreprise du propriétaire", tab: 'general' });
    }
    if (!firstOwner?.since) missing.push({ field: 'ownerSince', label: 'Date "Propriétaire depuis"', tab: 'general' });
    if (!firstOwner?.nationality) missing.push({ field: 'ownerNationality', label: 'Nationalité du propriétaire', tab: 'general' });

    if (formData.isTitleInCurrentOwnerName === false && formData.titleIssueDate) {
      if (firstOwner?.since && new Date(firstOwner.since) < new Date(formData.titleIssueDate)) missing.push({ field: 'ownerSinceDate', label: 'Date "Propriétaire depuis" doit être ≥ date de délivrance', tab: 'general' });
    }
    if (formData.isTitleInCurrentOwnerName === true && formData.titleIssueDate) {
      // If owner.since < titleIssueDate, require previousTitleType
      if (firstOwner?.since && new Date(firstOwner.since) < new Date(formData.titleIssueDate) && !firstOwner.previousTitleType) {
        missing.push({ field: 'previousTitleType', label: 'Titre de propriété antérieur', tab: 'general' });
      }
      // If previousTitleType is "Autre", require custom name
      if (firstOwner?.previousTitleType === 'Autre' && !firstOwner.previousTitleCustomName?.trim()) {
        missing.push({ field: 'previousTitleCustomName', label: 'Nom du titre antérieur', tab: 'general' });
      }
      const firstPreviousOwner = previousOwners[0];
      if (firstPreviousOwner?.startDate && new Date(firstPreviousOwner.startDate) > new Date(formData.titleIssueDate)) missing.push({ field: 'previousOwnerStartDate', label: `Date début Ancien #1 doit être ≤ date de ${formData.leaseType === 'renewal' ? 'renouvellement' : 'délivrance'}`, tab: 'history' });
    }

    if (!formData.propertyCategory) missing.push({ field: 'propertyCategory', label: 'Catégorie de bien', tab: 'general' });
    if (!formData.constructionType) missing.push({ field: 'constructionType', label: 'Type de construction', tab: 'general' });
    if (!formData.constructionNature) missing.push({ field: 'constructionNature', label: 'Nature de construction', tab: 'general' });
    if (!formData.declaredUsage) missing.push({ field: 'declaredUsage', label: 'Usage déclaré', tab: 'general' });
    // Si usage = Location, exiger la date de mise en location ≥ 01/01/constructionYear
    if (formData.declaredUsage === 'Location') {
      if (!formData.rentalStartDate) {
        missing.push({ field: 'rentalStartDate', label: 'En location depuis quand ? (construction principale)', tab: 'general' });
      } else if (formData.constructionYear) {
        const min = new Date(formData.constructionYear, 0, 1);
        if (new Date(formData.rentalStartDate) < min) {
          missing.push({ field: 'rentalStartDate', label: `Date de mise en location < 01/01/${formData.constructionYear}`, tab: 'general' });
        }
      }
    }
    // Constructions additionnelles : même règle
    additionalConstructions.forEach((c, idx) => {
      if (c.declaredUsage === 'Location') {
        if (!c.rentalStartDate) {
          missing.push({ field: `additionalRentalStartDate_${idx}`, label: `En location depuis quand ? (construction #${idx + 2})`, tab: 'general' });
        } else if (c.constructionYear) {
          const min = new Date(c.constructionYear, 0, 1);
          if (new Date(c.rentalStartDate) < min) {
            missing.push({ field: `additionalRentalStartDate_${idx}`, label: `Date de mise en location < 01/01/${c.constructionYear} (construction #${idx + 2})`, tab: 'general' });
          }
        }
      }
    });
    const normalizedNature = formData.constructionNature ? normalizeConstructionNature(formData.constructionNature) : '';
    const isPrecaireOrUnbuilt = normalizedNature === 'Précaire' || normalizedNature === 'Non bâti';
    if (!isTerrainNu && formData.constructionNature && !isPrecaireOrUnbuilt && !formData.constructionMaterials) missing.push({ field: 'constructionMaterials', label: 'Matériaux de construction', tab: 'general' });
    if (!isTerrainNu && formData.constructionNature && !isPrecaireOrUnbuilt && !formData.standing) missing.push({ field: 'standing', label: 'Standing', tab: 'general' });
    if (!isTerrainNu && formData.propertyCategory && formData.propertyCategory !== 'Terrain nu' && !formData.constructionYear) missing.push({ field: 'constructionYear', label: 'Année de construction', tab: 'general' });
    if (isAppartement) {
      if (!formData.apartmentNumber) missing.push({ field: 'apartmentNumber', label: "Numéro de l'appartement", tab: 'general' });
      if (!formData.floorNumber) missing.push({ field: 'floorNumber', label: "Numéro de l'étage", tab: 'general' });
    }

    // LOCATION
    if (!formData.province || formData.province.trim() === '') missing.push({ field: 'province', label: 'Province', tab: 'location' });
    if (!isAppartement && (!formData.areaSqm || Number(formData.areaSqm) <= 0)) missing.push({ field: 'areaSqm', label: 'Superficie (m²)', tab: 'location' });
    if (!sectionType || (sectionType !== 'urbaine' && sectionType !== 'rurale')) missing.push({ field: 'sectionType', label: 'Type de section (Urbaine/Rurale)', tab: 'location' });
    if (sectionType === 'urbaine') {
      if (!formData.ville || formData.ville.trim() === '') missing.push({ field: 'ville', label: 'Ville', tab: 'location' });
      if (!formData.commune || formData.commune.trim() === '') missing.push({ field: 'commune', label: 'Commune', tab: 'location' });
      if (!formData.quartier || formData.quartier.trim() === '') missing.push({ field: 'quartier', label: 'Quartier', tab: 'location' });
    } else if (sectionType === 'rurale') {
      if (!formData.territoire || formData.territoire.trim() === '') missing.push({ field: 'territoire', label: 'Territoire', tab: 'location' });
      if (!formData.collectivite || formData.collectivite.trim() === '') missing.push({ field: 'collectivite', label: 'Collectivité', tab: 'location' });
      if (!formData.groupement || formData.groupement.trim() === '') missing.push({ field: 'groupement', label: 'Groupement', tab: 'location' });
      if (!formData.village || formData.village.trim() === '') missing.push({ field: 'village', label: 'Village', tab: 'location' });
    }
    if (!isAppartement) {
      const filledSides = parcelSides.filter(s => s.length && parseFloat(s.length) > 0);
      if (filledSides.length < 3) missing.push({ field: 'parcelSides', label: 'Dimensions de la parcelle (au moins 3 côtés)', tab: 'location' });
    }
    if (isAppartement) {
      if (!formData.apartmentLength || formData.apartmentLength <= 0) missing.push({ field: 'apartmentLength', label: "Longueur de l'appartement", tab: 'location' });
      if (!formData.apartmentWidth || formData.apartmentWidth <= 0) missing.push({ field: 'apartmentWidth', label: "Largeur de l'appartement", tab: 'location' });
      if (!formData.apartmentOrientation) missing.push({ field: 'apartmentOrientation', label: "Orientation de l'appartement", tab: 'location' });
    }

    // LOCATION - BUILDING SHAPES (correspondance avec constructions déclarées)
    if (!isTerrainNu && !isAppartement) {
      const expectedBuildingCount = constructionMode === 'multiple' ? 1 + additionalConstructions.length : 1;
      if (buildingShapes.length < expectedBuildingCount) {
        missing.push({ field: 'buildingShapes', label: `Tracés de construction dans le croquis (${buildingShapes.length}/${expectedBuildingCount})`, tab: 'location' });
      }
      const missingHeight = buildingShapes.some((s: any) => !s.heightM || s.heightM <= 0);
      if (buildingShapes.length > 0 && missingHeight) {
        missing.push({ field: 'buildingHeight', label: 'Hauteur de construction manquante', tab: 'location' });
      }
      const tooShort = buildingShapes.some((s: any) => s.heightM != null && s.heightM > 0 && s.heightM < 3);
      if (buildingShapes.length > 0 && tooShort) {
        missing.push({ field: 'buildingHeightMin', label: 'Hauteur de construction inférieure à 3 m (minimum requis)', tab: 'location' });
      }
    }

    // HISTORY
    const hasValidPreviousOwner = previousOwners.some(o => o.name && o.name.trim() !== '');
    if (!hasValidPreviousOwner) missing.push({ field: 'previousOwner', label: 'Historique de propriété (au moins un ancien propriétaire)', tab: 'history' });

    // OBLIGATIONS - TAXES (non-bloquant : les 3 années précédentes sont encouragées mais pas obligatoires)
    // Seuls les reçus des taxes déjà renseignées sont obligatoires
    taxRecords.forEach((tax, idx) => {
      if (tax.taxAmount && tax.taxYear && !tax.receiptFile && !tax.existingReceiptUrl) missing.push({ field: `taxReceipt_${idx}`, label: `Reçu de ${tax.taxType} ${tax.taxYear}`, tab: 'obligations' });
    });

    // OBLIGATIONS - IRL × Constructions en location (cohérence stricte 1:1 par construction)
    const rentalRefs: string[] = [];
    const rentalLabels: Record<string, string> = {};
    if (formData.declaredUsage === 'Location') {
      rentalRefs.push('main');
      rentalLabels['main'] = 'Construction principale';
    }
    additionalConstructions.forEach((c, idx) => {
      if (c.declaredUsage === 'Location') {
        const ref = `additional:${idx}`;
        rentalRefs.push(ref);
        const parts = [c.propertyCategory || c.constructionType || 'Construction', c.constructionYear ? String(c.constructionYear) : null].filter(Boolean);
        rentalLabels[ref] = `Construction #${idx + 2} (${parts.join(', ')})`;
      }
    });

    if (rentalRefs.length > 0) {
      const irlRecords = taxRecords.filter(t => t.taxType === 'Impôt sur les revenus locatifs' && t.taxAmount && t.taxYear);
      const irlRefs = irlRecords.map(t => t.constructionRef).filter(Boolean) as string[];

      // Manquants : constructions Location sans IRL
      const missingRefs = rentalRefs.filter(r => !irlRefs.includes(r));
      missingRefs.forEach(r => {
        missing.push({
          field: `irlMissing_${r}`,
          label: `IRL manquant pour : ${rentalLabels[r]}`,
          tab: 'obligations',
        });
      });

      // Orphelins : IRL avec ref qui n'existe plus / n'est plus en Location
      const orphanRefs = irlRefs.filter(r => !rentalRefs.includes(r));
      orphanRefs.forEach(r => {
        missing.push({
          field: `irlOrphan_${r}`,
          label: `IRL orphelin (la construction associée n'est plus en Location) — à supprimer`,
          tab: 'obligations',
        });
      });

      // IRL sans ref renseignée
      const unassignedCount = irlRecords.filter(t => !t.constructionRef).length;
      if (unassignedCount > 0) {
        missing.push({
          field: 'irlUnassigned',
          label: `${unassignedCount} déclaration(s) IRL sans construction rattachée`,
          tab: 'obligations',
        });
      }

      // Doublons : 2 IRL pour la même construction
      const refCounts = irlRefs.reduce<Record<string, number>>((acc, r) => { acc[r] = (acc[r] || 0) + 1; return acc; }, {});
      Object.entries(refCounts).filter(([, n]) => n > 1).forEach(([r, n]) => {
        missing.push({
          field: `irlDuplicate_${r}`,
          label: `${n} IRL déclarés pour la même construction (${rentalLabels[r] || r})`,
          tab: 'obligations',
        });
      });
    }

    // OBLIGATIONS - MORTGAGE
    if (hasMortgage === null) missing.push({ field: 'hasMortgage', label: 'Statut hypothécaire (Oui/Non)', tab: 'obligations' });
    if (hasMortgage === true) {
      const hasValidMortgage = mortgageRecords.some(m => m.mortgageAmount && m.creditorName);
      if (!hasValidMortgage) missing.push({ field: 'mortgageDetails', label: "Détails de l'hypothèque (montant et créancier)", tab: 'obligations' });
      mortgageRecords.forEach((m, idx) => {
        if (m.mortgageAmount && m.creditorName && !m.receiptFile && !m.existingReceiptUrl) missing.push({ field: `mortgageReceipt_${idx}`, label: `Document hypothèque #${idx + 1}`, tab: 'obligations' });
      });
    }

    // OBLIGATIONS - DISPUTE
    if (hasDispute === null) missing.push({ field: 'hasDispute', label: 'Statut litige foncier (Oui/Non)', tab: 'obligations' });

    // LOCATION - ENTRANCE & SERVITUDE (obligatoire pour les parcelles, pas les appartements)
    if (!isAppartement && roadSides.length > 0) {
      const hasEntrance = roadSides.some((s: any) => s.hasEntrance === true);
      if (!hasEntrance) missing.push({ field: 'parcelEntrance', label: "Entrée de la parcelle (cochez le côté ayant une porte d'accès)", tab: 'location' });

      // Si aucun côté n'est bordé par une route, la servitude de passage est obligatoire
      const hasRoadSide = roadSides.some((s: any) => s.bordersRoad === true);
      if (!hasRoadSide && (!servitude.hasServitude || !servitude.width || servitude.width <= 0)) {
        missing.push({ field: 'servitudeWidth', label: "Largeur de la servitude de passage (aucune route ne borde la parcelle)", tab: 'location' });
      }
    }

    // PERMIT MODE MANDATORY (must answer OUI or NON)
    if (!isTerrainNu && !isAppartement && formData.constructionType !== 'Terrain nu' && permitMode === null) {
      missing.push({ field: 'permitMode', label: "Avez-vous obtenu une autorisation de bâtir ?", tab: 'general' });
    }

    // SOUND ENVIRONMENT MANDATORY
    if (!soundEnvironment || soundEnvironment.trim() === '') {
      missing.push({ field: 'soundEnvironment', label: 'Environnement sonore', tab: 'location' });
    }
    // Noise sources mandatory when not very quiet
    if (soundEnvironment && soundEnvironment !== 'tres_calme' && (!nearbySoundSources || nearbySoundSources.trim() === '')) {
      missing.push({ field: 'nearbySoundSources', label: 'Sources de bruit à proximité', tab: 'location' });
    }

    // BUILDING PERMITS
    if (!isTerrainNu && !isAppartement && formData.constructionType !== 'Terrain nu' && permitMode === 'existing') {
      const hasValidExistingPermit = buildingPermits.some(permit => permit.permitNumber && permit.permitNumber.trim() !== '' && permit.issueDate && permit.issueDate.trim() !== '');
      if (!hasValidExistingPermit) missing.push({ field: 'buildingPermit', label: 'Informations du permis existant', tab: 'general' });
      buildingPermits.forEach((permit, idx) => {
        if (permit.permitNumber && permit.permitNumber.trim() !== '' && !permit.attachmentFile && !permit.existingAttachmentUrl) missing.push({ field: `permitAttachment_${idx}`, label: `Pièce jointe du permis #${idx + 1}`, tab: 'general' });
      });
      if (formData.constructionYear) {
        const invalidPermit = buildingPermits.find(permit => {
          if (!permit.issueDate) return false;
          const permitYear = new Date(permit.issueDate).getFullYear();
          if (permit.permitType === 'construction') return permitYear > formData.constructionYear! || permitYear < formData.constructionYear! - 3;
          else return permitYear < formData.constructionYear! || new Date(permit.issueDate) > new Date();
        });
        if (invalidPermit) {
          const msg = invalidPermit.permitType === 'construction'
            ? `Date de l'autorisation de bâtir doit être entre ${formData.constructionYear - 3} et ${formData.constructionYear}`
            : `Date de l'autorisation de régularisation doit être ≥ ${formData.constructionYear} et ≤ date actuelle`;
          missing.push({ field: 'permitIssueDate', label: msg, tab: 'general' });
        }
      }
    }

    return missing;
  }, [formData, customTitleName, currentOwners, previousOwners, sectionType, permitMode, buildingPermits, parcelSides, taxRecords, hasMortgage, hasDispute, mortgageRecords, ownerDocFile, titleDocFiles, editingContributionId, roadSides, servitude, buildingShapes, constructionMode, additionalConstructions, soundEnvironment, nearbySoundSources]);

  // Function wrapper preserves the public API (callers expect to invoke getMissingFields()).
  const getMissingFields = useCallback(() => missingFieldsList, [missingFieldsList]);

  const getMissingFieldsForTab = useCallback(
    (tab: string) => missingFieldsList.filter(f => f.tab === tab),
    [missingFieldsList],
  );
  const isTabComplete = useCallback(
    (tab: string) => missingFieldsList.every(f => f.tab !== tab),
    [missingFieldsList],
  );
  const tabOrder = ['general', 'location', 'history', 'obligations', 'review'];
  const isTabAccessible = useCallback((tab: string) => {
    const tabIndex = tabOrder.indexOf(tab);
    if (tabIndex <= 0) return true;
    for (let i = 0; i < tabIndex; i++) { if (!isTabComplete(tabOrder[i])) return false; }
    return true;
  }, [isTabComplete]);

  const handleNextTab = useCallback((currentTab: string, nextTab: string) => {
    const missingFields = getMissingFieldsForTab(currentTab);
    if (missingFields.length > 0) {
      setHighlightRequiredFields(true);
      setInvalidFields(new Set(missingFields.map(f => f.field)));
      const maxShow = 5;
      const fieldNames = missingFields.slice(0, maxShow).map(f => `• ${f.label}`).join('\n');
      const extra = missingFields.length > maxShow ? `\n... et ${missingFields.length - maxShow} autre(s)` : '';
      toast({ title: '⚠️ Champs obligatoires manquants', description: `Veuillez compléter les champs suivants :\n${fieldNames}${extra}`, variant: 'destructive' });
      setTimeout(() => {
        const firstHighlighted = dialogContentRef.current?.querySelector('.ring-destructive');
        if (firstHighlighted) firstHighlighted.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    } else {
      setHighlightRequiredFields(false);
      setInvalidFields(new Set());
      handleTabChange(nextTab);
    }
  }, [getMissingFieldsForTab, toast, handleTabChange]);

  const isFormValidForSubmission = useCallback(() => getMissingFields().length === 0, [getMissingFields]);

  // ─── CCC Value calculation ───
  const calculateCCCValue = useMemo(() => {
    let totalFields = 0;
    let filledFields = 0;
    totalFields += 1; filledFields += 1; // parcelNumber always filled
    totalFields += 14;
    if (formData.propertyTitleType) filledFields += 1;
    if (formData.propertyTitleType === 'Contrat de location (Contrat d\'occupation provisoire)') { totalFields += 1; if (formData.leaseType) filledFields += 1; }
    if (formData.titleReferenceNumber) filledFields += 1;
    const hasValidOwners = currentOwners.some(o => o.lastName && o.firstName && o.legalStatus);
    if (hasValidOwners) filledFields += 3;
    const hasOwnerSince = currentOwners.some(o => o.since);
    if (hasOwnerSince) filledFields += 1;
    if (formData.areaSqm) filledFields += 1;
    if (formData.propertyCategory) filledFields += 1;
    if (formData.constructionType) filledFields += 1;
    if (formData.constructionNature) filledFields += 1;
    if (formData.constructionMaterials) filledFields += 1;
    if (formData.declaredUsage) filledFields += 1;
    if (formData.standing) filledFields += 1;
    totalFields += 3;
    const hasValidPermits = buildingPermits.some(p => p.permitNumber && p.issueDate);
    if (hasValidPermits) filledFields += 1;
    const hasPermitAttachments = buildingPermits.some(p => p.attachmentFile);
    if (hasPermitAttachments) filledFields += 1;
    if (permitRequest.applicantName && permitRequest.constructionDescription) filledFields += 1;
    if (formData.previousPermitNumber || permitRequest.previousPermitNumber) { totalFields += 1; filledFields += 1; }
    const isUrban = sectionType === 'urbaine' || formData.parcelType === 'SU';
    totalFields += 7;
    if (formData.province) filledFields += 1;
    if (isUrban) {
      if (formData.ville) filledFields += 1;
      if (formData.commune) filledFields += 1;
      if (formData.quartier) filledFields += 1;
      if (formData.avenue) filledFields += 1;
    } else {
      if (formData.territoire) filledFields += 1;
      if (formData.collectivite) filledFields += 1;
      if (formData.groupement) filledFields += 1;
      if (formData.village) filledFields += 1;
    }
    // GPS scoring: aligned with backend SQL (2 points for >=3 coords, 1 for partial)
    const validGps = gpsCoordinates.filter(c => c.lat && c.lng);
    if (validGps.length >= 3) filledFields += 2;
    else if (validGps.length > 0) filledFields += 1;
    // WhatsApp: always count (aligned with backend SQL)
    totalFields += 1;
    if (formData.whatsappNumber) filledFields += 1;
    // Previous owners: aligned with backend (1 point for having any)
    totalFields += 2;
    const validPreviousOwners = previousOwners.filter(o => o.name);
    if (validPreviousOwners.length > 0) filledFields += 1;
    // Tax history: aligned with backend (1 point for having any)
    totalFields += 2;
    const validTaxes = taxRecords.filter(t => t.taxAmount && t.taxYear);
    if (validTaxes.length > 0) filledFields += 1;
    // Mortgage
    totalFields += 3;
    if (hasMortgage !== null) filledFields += 1;
    if (hasMortgage === true) {
      const validMortgages = mortgageRecords.filter(m => m.mortgageAmount && m.creditorName);
      if (validMortgages.length > 0) filledFields += Math.min(validMortgages.length * 2, 2);
    } else if (hasMortgage === false) { filledFields += 2; }
    // Dispute scoring
    totalFields += 1;
    if (hasDispute !== null) filledFields += 1;
    // Building shapes scoring
    totalFields += 1;
    if (buildingShapes.length > 0) filledFields += 1;
    // Sound environment scoring
    totalFields += 1;
    if (soundEnvironment) filledFields += 1;
    if (soundEnvironment && soundEnvironment !== 'tres_calme' && nearbySoundSources) filledFields += 1;
    if (soundEnvironment && soundEnvironment !== 'tres_calme') totalFields += 1;
    // Hosting capacity scoring (only if not Terrain nu)
    const isNotTerrainNuForCapacity = formData.propertyCategory && formData.propertyCategory !== 'Terrain nu';
    if (isNotTerrainNuForCapacity) {
      totalFields += 1;
      if (formData.isOccupied !== undefined && formData.isOccupied !== null) filledFields += 1;
      if (formData.isOccupied !== undefined && formData.isOccupied !== null) {
        totalFields += 1;
        if (formData.hostingCapacity && formData.hostingCapacity > 0) filledFields += 1;
      }
    }
    const percentage = totalFields > 0 ? (filledFields / totalFields) * 100 : 0;
    const value = (percentage / 100) * 5;
    return { value: Math.min(value, 5), percentage: Math.min(percentage, 100), filledFields, totalFields };
  }, [formData, currentOwners, previousOwners, taxRecords, mortgageRecords, hasMortgage, hasDispute, buildingPermits, permitRequest, gpsCoordinates, parcelSides, sectionType, buildingShapes, soundEnvironment, nearbySoundSources]);

  // ─── Confetti ───
  const triggerConfetti = async () => {
    const confetti = await lazyConfetti();
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  // ─── Submit ───
  const handleSubmit = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!user && !session) {
      saveFormDataToStorage();
      setShowQuickAuth(true);
      setPendingSubmission(true);
      return;
    }
    if (!editingContributionId) {
      const authenticatedUserId = user?.id || session?.user?.id;
      if (authenticatedUserId) {
        const { data: existingContribs } = await supabase.from('cadastral_contributions').select('id, status').eq('parcel_number', formData.parcelNumber).eq('user_id', authenticatedUserId).in('status', ['pending', 'returned']).limit(1);
        const existingContrib = existingContribs?.[0];
        if (existingContrib) {
          toast({ title: "Contribution existante", description: `Vous avez déjà une contribution ${existingContrib.status === 'returned' ? 'à corriger' : 'en attente'} pour cette parcelle.`, variant: "destructive" });
          return;
        }
      }
    }
    const missingFields = getMissingFields();
    if (missingFields.length > 0) {
      const fieldsByTab: { [key: string]: string[] } = {};
      missingFields.forEach(f => { if (!fieldsByTab[f.tab]) fieldsByTab[f.tab] = []; fieldsByTab[f.tab].push(f.label); });
      const tabNames: { [key: string]: string } = { general: 'Infos', location: 'Localisation', history: 'Passé', obligations: 'Obligations', review: 'Récapitulatif' };
      const summary = Object.entries(fieldsByTab).map(([tab, fields]) => `${tabNames[tab] || tab}: ${fields.join(', ')}`).join(' | ');
      toast({ title: "Champs requis manquants", description: summary.length > 100 ? `${missingFields.length} champs manquants.` : summary, variant: "destructive" });
      return;
    }

    setUploading(true);
    resetUploadedTracker(); // reset tracker pour ce cycle
    try {
      let ownerDocUrl = null;
      let titleDocUrls: string[] = [];
      if (ownerDocFile) {
        ownerDocUrl = await uploadFile(ownerDocFile, 'owner-documents');
        if (!ownerDocUrl) { await rollbackUploadedFiles(); toast({ title: "Erreur de téléchargement", description: "Impossible de télécharger le document du propriétaire", variant: "destructive" }); setUploading(false); return; }
      }
      if (titleDocFiles.length > 0) {
        for (const file of titleDocFiles) {
          const url = await uploadFile(file, 'title-documents');
          if (!url) { await rollbackUploadedFiles(); toast({ title: "Erreur de téléchargement", description: "Impossible de télécharger un document de titre", variant: "destructive" }); setUploading(false); return; }
          titleDocUrls.push(url);
        }
      }

      const taxHistoryData = (await Promise.all(taxRecords.filter(tax => tax.taxYear && tax.taxAmount).map(async (tax) => {
        let receiptUrl = null;
        if (tax.receiptFile) { receiptUrl = await uploadFile(tax.receiptFile, 'tax-receipts'); if (!receiptUrl) throw new Error('Erreur téléchargement reçu taxe'); }
        const parsedYear = parseInt(tax.taxYear); const parsedAmount = parseFloat(tax.taxAmount);
        if (isNaN(parsedYear) || isNaN(parsedAmount)) return null;
        return { taxYear: parsedYear, amountUsd: parsedAmount, paymentStatus: tax.paymentStatus, paymentDate: tax.paymentDate || undefined, receiptUrl: receiptUrl || tax.existingReceiptUrl || undefined, taxType: tax.taxType, remainingAmount: tax.remainingAmount ? parseFloat(tax.remainingAmount) : undefined, constructionRef: tax.constructionRef || undefined };
      }))).filter(Boolean);

      const mortgageHistoryData = (await Promise.all(mortgageRecords.filter(m => m.mortgageAmount && m.duration && m.creditorName).map(async (mortgage) => {
        let receiptUrl = null;
        if (mortgage.receiptFile) { receiptUrl = await uploadFile(mortgage.receiptFile, 'mortgage-documents'); if (!receiptUrl) throw new Error('Erreur téléchargement document hypothèque'); }
        const parsedAmount = parseFloat(mortgage.mortgageAmount); const parsedDuration = parseInt(mortgage.duration);
        if (isNaN(parsedAmount) || isNaN(parsedDuration)) return null;
        return { mortgageAmountUsd: parsedAmount, durationMonths: parsedDuration, creditorName: mortgage.creditorName, creditorType: mortgage.creditorType, contractDate: mortgage.contractDate, mortgageStatus: mortgage.mortgageStatus, receiptUrl: receiptUrl || mortgage.existingReceiptUrl || undefined };
      }))).filter(Boolean);

      let buildingPermitsDataFinal = undefined;
      let permitRequestData = undefined;
      if (permitMode === 'existing') {
        const buildingPermitsData = await Promise.all(buildingPermits.map(async (permit) => {
          let attachmentUrl = null;
          if (permit.attachmentFile) { attachmentUrl = await uploadFile(permit.attachmentFile, 'building-permits'); if (!attachmentUrl) throw new Error('Erreur téléchargement autorisation bâtir'); }
          return { permitType: permit.permitType, permitNumber: permit.permitNumber, issueDate: permit.issueDate, validityMonths: parseInt(permit.validityMonths), administrativeStatus: permit.administrativeStatus, issuingService: permit.issuingService, attachmentUrl: attachmentUrl || permit.existingAttachmentUrl || undefined };
        }));
        buildingPermitsDataFinal = buildingPermitsData.length > 0 ? buildingPermitsData : undefined;
      } else if (permitMode === 'request') {
        let uploadedImages: string[] = [];
        if (permitRequest.permitType === 'construction' && permitRequest.architecturalPlanImages.length > 0) {
          for (const file of permitRequest.architecturalPlanImages) { const url = await uploadFile(file, 'permit-request-plans'); if (!url) throw new Error('Erreur téléchargement plans'); uploadedImages.push(url); }
        } else if (permitRequest.permitType === 'regularization' && permitRequest.constructionPhotos.length > 0) {
          for (const file of permitRequest.constructionPhotos) { const url = await uploadFile(file, 'permit-request-photos'); if (!url) throw new Error('Erreur téléchargement photos'); uploadedImages.push(url); }
        }
        permitRequestData = {
          permitType: permitRequest.permitType, hasExistingConstruction: permitRequest.hasExistingConstruction,
          constructionDescription: permitRequest.constructionDescription, plannedUsage: permitRequest.plannedUsage,
          estimatedArea: permitRequest.estimatedArea ? parseFloat(permitRequest.estimatedArea) : undefined,
          applicantName: permitRequest.applicantName, applicantPhone: permitRequest.applicantPhone, applicantEmail: permitRequest.applicantEmail || undefined,
          ...(permitRequest.permitType === 'construction' ? { numberOfFloors: permitRequest.numberOfFloors || undefined, buildingMaterials: permitRequest.buildingMaterials || undefined, architecturalPlanImages: uploadedImages.length > 0 ? uploadedImages : undefined }
            : { constructionYear: permitRequest.constructionYear || undefined, regularizationReason: permitRequest.regularizationReason || undefined, originalPermitNumber: permitRequest.originalPermitNumber || undefined, constructionPhotos: uploadedImages.length > 0 ? uploadedImages : undefined })
        };
      }

      const validGpsCoordinates = gpsCoordinates.filter(coord => { const lat = parseFloat(coord.lat); const lng = parseFloat(coord.lng); return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && coord.lat !== '' && coord.lng !== ''; });
      const gpsCoordinatesData = validGpsCoordinates.length > 0 ? validGpsCoordinates.map(coord => ({ borne: coord.borne, lat: parseFloat(coord.lat), lng: parseFloat(coord.lng) })) : undefined;
      const ownershipHistoryData = previousOwners.filter(owner => owner.name && owner.startDate).map(owner => ({ ownerName: owner.name, legalStatus: owner.legalStatus, entityType: owner.entityType || undefined, entitySubType: owner.entitySubType || undefined, entitySubTypeOther: owner.entitySubTypeOther || undefined, stateExploitedBy: owner.stateExploitedBy || undefined, startDate: owner.startDate, endDate: owner.endDate || undefined, mutationType: owner.mutationType || undefined }));
      const existingOwnerDocUrl = editingContributionId ? formData.ownerDocumentUrl : undefined;
      const existingTitleDocUrl = editingContributionId ? formData.titleDocumentUrl : undefined;

      const dataToSubmit = {
        ...formData,
        leaseYears: leaseYears > 0 ? leaseYears : undefined,
        propertyTitleType: getEffectiveTitleName(formData.propertyTitleType, customTitleName) || formData.propertyTitleType,
        parcelType: sectionType === 'urbaine' ? 'SU' as const : sectionType === 'rurale' ? 'SR' as const : undefined,
        currentOwners: currentOwners.filter(o => o.lastName && (o.firstName || o.legalStatus === 'Personne morale')),
        ownershipHistory: ownershipHistoryData.length > 0 ? ownershipHistoryData as any : undefined,
        ownerDocumentUrl: ownerDocUrl || existingOwnerDocUrl || undefined,
        titleDocumentUrl: titleDocUrls.length > 0 ? titleDocUrls.join(',') : (existingTitleDocUrl || undefined),
        taxHistory: taxHistoryData.length > 0 ? taxHistoryData as any : undefined,
        mortgageHistory: mortgageHistoryData.length > 0 ? mortgageHistoryData as any : undefined,
        buildingPermits: buildingPermitsDataFinal,
        permitRequest: permitRequestData,
        previousPermitNumber: formData.previousPermitNumber || permitRequest.previousPermitNumber || undefined,
        gpsCoordinates: gpsCoordinatesData,
        parcelSides: parcelSides.filter(s => s.length && parseFloat(s.length) > 0).length > 0 ? parcelSides.filter(s => s.length && parseFloat(s.length) > 0) : undefined,
        additionalConstructions: constructionMode === 'multiple' && additionalConstructions.length > 0
          ? additionalConstructions.map(c => ({ ...c, permit: c.permit ? { ...c.permit, attachmentFile: undefined } : undefined })) : undefined,
        roadSides: roadSides.length > 0 ? roadSides : undefined,
        servitudeData: servitude.hasServitude ? servitude : undefined,
        hasDispute: hasDispute ?? undefined,
        disputeData: disputeFormData || undefined,
        buildingShapes: buildingShapes.length > 0 ? buildingShapes : undefined,
        soundEnvironment: soundEnvironment || undefined,
        nearbySoundSources: nearbySoundSources || undefined,
        isOccupied: formData.isOccupied ?? undefined,
        occupantCount: formData.occupantCount || undefined,
        hostingCapacity: formData.hostingCapacity || undefined,
      };

      const result = editingContributionId ? await updateContribution(editingContributionId, dataToSubmit) : await submitContribution(dataToSubmit);
      if (result?.success) {
        clearSavedFormData();
        resetUploadedTracker(); // succès → on garde les fichiers
        formDirtyRef.current = false;
        isClosingAfterSuccessRef.current = true;
        setShowSuccess(true);
      } else if (result && !result.success) {
        console.error('Échec de la soumission');
        await rollbackUploadedFiles();
      }
    } catch (error) {
      await rollbackUploadedFiles();
      toast({ title: "Erreur", description: error instanceof Error ? error.message : "Une erreur est survenue", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // ─── Close/Reset ───
  const handleClose = () => {
    formDirtyRef.current = false;
    isClosingAfterSuccessRef.current = false;
    setCustomTitleName('');
    setFormData({ parcelNumber });
    setShowSuccess(false); setShowQuickAuth(false); setPendingSubmission(false); setUploading(false);
    setOwnerDocFile(null); setTitleDocFiles([]);
    setSectionType(''); setSectionTypeAutoDetected(false); setActiveTab('general'); setHasShownConfetti(false); setShowExitConfirmation(false);
    setOwnershipMode('unique'); setLeaseYears(0);
    setPreviousOwners([{ name: '', legalStatus: 'Personne physique', entityType: '', entitySubType: '', entitySubTypeOther: '', stateExploitedBy: '', startDate: '', endDate: '', mutationType: 'Vente' }]);
    setCurrentOwners([{ lastName: '', middleName: '', firstName: '', legalStatus: 'Personne physique', gender: '', entityType: '', entitySubType: '', entitySubTypeOther: '', stateExploitedBy: '', rightType: '', since: '', nationality: '', previousTitleType: '', previousTitleCustomName: '' }]);
    setHasMortgage(null);
    setHasDispute(null);
    setTaxRecords([{ taxType: 'Impôt foncier annuel', taxYear: '', taxAmount: '', paymentStatus: 'Payé', paymentDate: '', receiptFile: null }]);
    setMortgageRecords([{ mortgageAmount: '', duration: '', creditorName: '', creditorType: 'Banque', contractDate: '', mortgageStatus: 'Active', receiptFile: null }]);
    setObligationType('taxes');
    setParcelSides([{ name: 'Côté 1', length: '' }, { name: 'Côté 2', length: '' }, { name: 'Côté 3', length: '' }]);
    setAvailableVilles([]); setAvailableCommunes([]); setAvailableTerritoires([]); setAvailableCollectivites([]); setAvailableQuartiers([]); setAvailableAvenues([]);
    setAvailableConstructionNatures([]); setAvailableDeclaredUsages([]); setAvailableConstructionMaterials([]); setAvailableStandings([]);
    setRoadSides([]);
    setServitude({ hasServitude: false });
    setBuildingShapes([]);
    setDisputeFormData(null);
    setPermitMode(null);
    setBuildingPermits([{ permitType: 'construction', permitNumber: '', issueDate: '', validityMonths: '36', administrativeStatus: 'En attente', issuingService: '', attachmentFile: null }]);
    setPermitRequest({ permitType: 'construction', hasExistingConstruction: false, constructionDescription: '', plannedUsage: '', estimatedArea: '', applicantName: '', applicantPhone: '', applicantEmail: '', selectedOwnerIndex: -1, numberOfFloors: '', buildingMaterials: '', architecturalPlanImages: [], constructionYear: '', regularizationReason: '', originalPermitNumber: '', previousPermitNumber: '', constructionPhotos: [] });
    setGpsCoordinates([]);
    setSoundEnvironment('');
    setNearbySoundSources('');
    setShowRequiredFieldsPopover(false); setHighlightRequiredFields(false); setShowOwnerWarning(false); setHighlightIncompleteOwner(false);
    setShowPermitWarning(false); setHighlightIncompletePermit(false); setShowPreviousOwnerWarning(false); setHighlightIncompletePreviousOwner(false);
    setHighlightSuperficie(false); setShowGPSWarning(false); setShowTaxWarning(false); setHighlightIncompleteTax(false);
    setShowMortgageWarning(false); setHighlightIncompleteMortgage(false); setShowCurrentOwnerRequiredWarning(false);
    setShowPermitTypeBlockedWarning(false); setPermitTypeBlockedMessage(''); setShowAreaMismatchWarning(false); setAreaMismatchMessage('');
    setShouldBlinkSuperficie(false); setShowUsageLockedWarning(false);
    onOpenChange(false);
  };

  const handleAttemptClose = useCallback(() => {
    if (isClosingAfterSuccessRef.current || showSuccess || !formDirtyRef.current) { handleClose(); return; }
    const hasData = Object.keys(formData).length > 1 || currentOwners.some(o => o.lastName || o.firstName) || previousOwners.some(o => o.name) || taxRecords.some(t => t.taxAmount) || mortgageRecords.some(m => m.mortgageAmount) || buildingPermits.some(p => p.permitNumber) || gpsCoordinates.some(g => g.lat || g.lng);
    if (hasData) { saveFormDataToStorage(); setShowExitConfirmation(true); } else { handleClose(); }
  }, [formData, currentOwners, previousOwners, taxRecords, mortgageRecords, buildingPermits, gpsCoordinates, showSuccess, saveFormDataToStorage]);

  // ─── Effects ───

  // Init GPS bornes
  useEffect(() => {
    if (gpsCoordinates.length === 0 && parcelSides.length > 0) {
      setGpsCoordinates(parcelSides.map((_, index) => ({ borne: `Borne ${index + 1}`, lat: '', lng: '', mode: 'auto' as const, detected: false, detecting: false })));
    }
  }, []);

  // Purge / nettoyage des IRL orphelins quand l'usage des constructions change
  useEffect(() => {
    const validRefs = new Set<string>();
    if (formData.declaredUsage === 'Location') validRefs.add('main');
    additionalConstructions.forEach((c, idx) => {
      if (c.declaredUsage === 'Location') validRefs.add(`additional:${idx}`);
    });

    const orphans = taxRecords.filter(t =>
      t.taxType === 'Impôt sur les revenus locatifs' &&
      t.constructionRef &&
      !validRefs.has(t.constructionRef)
    );

    if (validRefs.size === 0) {
      // Plus aucune Location → purger tous les IRL
      const hasIrl = taxRecords.some(t => t.taxType === 'Impôt sur les revenus locatifs');
      if (hasIrl) {
        setTaxRecords(prev => prev.filter(t => t.taxType !== 'Impôt sur les revenus locatifs'));
        toast({
          title: 'IRL retiré',
          description: "Les entrées « Impôt sur les revenus locatifs » ont été retirées car aucune construction n'est en location.",
        });
      }
    } else if (orphans.length > 0) {
      // Purger seulement les IRL dont la construction n'est plus en Location
      setTaxRecords(prev => prev.filter(t =>
        !(t.taxType === 'Impôt sur les revenus locatifs' && t.constructionRef && !validRefs.has(t.constructionRef))
      ));
      toast({
        title: 'IRL mis à jour',
        description: `${orphans.length} déclaration(s) IRL retirée(s) : la construction associée n'est plus en location.`,
      });
    }
  }, [formData.declaredUsage, additionalConstructions, taxRecords, toast]);

  // Load from localStorage: géré dans useFormPersistence

  // Load from DB in edit mode
  useEffect(() => {
    if (!open || !editingContributionId) return;
    const fetchContribution = async () => {
      isLoadingFromDbRef.current = true;
      try {
        const { data: contrib, error } = await supabase.from('cadastral_contributions').select('*').eq('id', editingContributionId).maybeSingle();
        if (error || !contrib) { toast({ title: "Erreur", description: "Impossible de charger la contribution", variant: "destructive" }); return; }

        const knownTitleValues = PROPERTY_TITLE_TYPES.map(t => t.value);
        const storedTitleType = contrib.property_title_type || undefined;
        let effectiveTitleType = storedTitleType;
        if (storedTitleType && !knownTitleValues.includes(storedTitleType)) { effectiveTitleType = 'Autre'; setCustomTitleName(storedTitleType); }

        setFormData(prev => ({
          ...prev, parcelNumber: contrib.parcel_number, propertyTitleType: effectiveTitleType,
          leaseType: contrib.lease_type as any || undefined, titleReferenceNumber: contrib.title_reference_number || undefined,
          titleIssueDate: contrib.title_issue_date || undefined, constructionType: contrib.construction_type || undefined,
          propertyCategory: (contrib as any).property_category || (() => {
            const ct = contrib.construction_type; if (!ct) return undefined;
            const matches: string[] = [];
            for (const [cat, types] of Object.entries(CATEGORY_TO_CONSTRUCTION_TYPES)) { if (types.includes(ct)) matches.push(cat); }
            return matches.length === 1 ? matches[0] : undefined;
          })(),
          constructionNature: contrib.construction_nature || undefined, constructionMaterials: contrib.construction_materials || undefined,
          declaredUsage: contrib.declared_usage || undefined, standing: contrib.standing || undefined,
          constructionYear: contrib.construction_year || undefined,
          rentalStartDate: (contrib as any).rental_start_date || undefined,
          isOccupied: (contrib as any).is_occupied ?? undefined,
          occupantCount: (contrib as any).occupant_count || undefined,
          hostingCapacity: (contrib as any).hosting_capacity || undefined,
          apartmentNumber: (contrib as any).apartment_number || undefined, floorNumber: (contrib as any).floor_number || undefined,
          areaSqm: contrib.area_sqm || undefined, province: contrib.province || undefined,
          ville: contrib.ville || undefined, commune: contrib.commune || undefined,
          quartier: contrib.quartier || undefined, avenue: contrib.avenue || undefined,
          houseNumber: (contrib as any).house_number || undefined, territoire: contrib.territoire || undefined,
          collectivite: contrib.collectivite || undefined, groupement: contrib.groupement || undefined, village: contrib.village || undefined,
          whatsappNumber: contrib.whatsapp_number || undefined, previousPermitNumber: contrib.previous_permit_number || undefined,
          ownerDocumentUrl: contrib.owner_document_url || undefined, titleDocumentUrl: contrib.property_title_document_url || undefined,
        }));

        const ownersDetails = contrib.current_owners_details as any[];
        if (ownersDetails && Array.isArray(ownersDetails) && ownersDetails.length > 0) {
          setCurrentOwners(ownersDetails.map((o: any) => ({ lastName: o.last_name || o.lastName || '', middleName: o.middle_name || o.middleName || '', firstName: o.first_name || o.firstName || '', legalStatus: o.legal_status || o.legalStatus || 'Personne physique', gender: o.gender || '', entityType: o.entity_type || o.entityType || '', entitySubType: o.entity_sub_type || o.entitySubType || '', entitySubTypeOther: o.entity_sub_type_other || o.entitySubTypeOther || '', stateExploitedBy: o.state_exploited_by || o.stateExploitedBy || '', rightType: o.right_type || o.rightType || '', since: o.since || '', nationality: o.nationality || '', previousTitleType: o.previous_title_type || o.previousTitleType || '', previousTitleCustomName: o.previous_title_custom_name || o.previousTitleCustomName || '' })));
          if (ownersDetails.length > 1) setOwnershipMode('multiple');
        } else if (contrib.current_owner_name) {
          setCurrentOwners([{ lastName: contrib.current_owner_name, middleName: '', firstName: '', legalStatus: contrib.current_owner_legal_status || 'Personne physique', gender: '', entityType: '', entitySubType: '', entitySubTypeOther: '', stateExploitedBy: '', rightType: '', since: contrib.current_owner_since || '', nationality: '', previousTitleType: '', previousTitleCustomName: '' }]);
        }

        const ownerHistory = contrib.ownership_history as any[];
        if (ownerHistory && Array.isArray(ownerHistory) && ownerHistory.length > 0) {
          setPreviousOwners(ownerHistory.map((o: any) => ({ name: o.owner_name || o.ownerName || '', legalStatus: o.legal_status || o.legalStatus || 'Personne physique', entityType: o.entity_type || o.entityType || '', entitySubType: o.entity_sub_type || o.entitySubType || '', entitySubTypeOther: o.entity_sub_type_other || o.entitySubTypeOther || '', stateExploitedBy: o.state_exploited_by || o.stateExploitedBy || '', startDate: o.ownership_start_date || o.startDate || '', endDate: o.ownership_end_date || o.endDate || '', mutationType: o.mutation_type || o.mutationType || 'Vente' })));
        }

        const gpsCoords = contrib.gps_coordinates as any[];
        if (gpsCoords && Array.isArray(gpsCoords) && gpsCoords.length > 0) {
          setGpsCoordinates(gpsCoords.map((c: any) => ({ borne: c.borne || '', lat: String(c.lat || ''), lng: String(c.lng || ''), mode: 'manual' as const, detected: true, detecting: false })));
        }

        const sides = contrib.parcel_sides as any[];
        if (sides && Array.isArray(sides) && sides.length > 0) setParcelSides(sides.map((s: any) => ({ name: s.name || '', length: String(s.length || '') })));

        const permits = contrib.building_permits as any[];
        if (permits && Array.isArray(permits) && permits.length > 0) {
          setPermitMode('existing');
          setBuildingPermits(permits.map((p: any) => ({ permitType: p.permit_type || p.permitType || 'construction', permitNumber: p.permit_number || p.permitNumber || '', issueDate: p.issue_date || p.issueDate || '', validityMonths: String(p.validity_period_months || p.validityMonths || '36'), administrativeStatus: p.administrative_status || p.administrativeStatus || 'En attente', issuingService: p.issuing_service || p.issuingService || '', attachmentFile: null, existingAttachmentUrl: p.permit_document_url || p.attachmentUrl || undefined })));
        } else if (contrib.permit_request_data) {
          setPermitMode('request');
          const prd = contrib.permit_request_data as any;
          setPermitRequest(prev => ({ ...prev, permitType: prd.permitType || 'construction', hasExistingConstruction: prd.hasExistingConstruction || false, constructionDescription: prd.constructionDescription || '', plannedUsage: prd.plannedUsage || '', estimatedArea: prd.estimatedArea ? String(prd.estimatedArea) : '', applicantName: prd.applicantName || '', applicantPhone: prd.applicantPhone || '', applicantEmail: prd.applicantEmail || '', numberOfFloors: prd.numberOfFloors || '', buildingMaterials: prd.buildingMaterials || '', constructionYear: prd.constructionYear || '', regularizationReason: prd.regularizationReason || '', originalPermitNumber: prd.originalPermitNumber || '', previousPermitNumber: prd.previousPermitNumber || contrib.previous_permit_number || '' }));
        }

        const taxes = contrib.tax_history as any[];
        if (taxes && Array.isArray(taxes) && taxes.length > 0) {
          setTaxRecords(taxes.map((t: any) => ({ taxType: t.tax_type || 'Impôt foncier annuel', taxYear: String(t.tax_year || ''), taxAmount: String(t.amount_usd || ''), paymentStatus: t.payment_status || 'Payé', paymentDate: t.payment_date || '', remainingAmount: t.remaining_amount ? String(t.remaining_amount) : undefined, receiptFile: null, existingReceiptUrl: t.receipt_document_url || undefined, constructionRef: t.constructionRef || t.construction_ref || (t.tax_type === 'Impôt sur les revenus locatifs' ? 'main' : undefined) })));
        }

        const mortgages = contrib.mortgage_history as any[];
        if (mortgages && Array.isArray(mortgages) && mortgages.length > 0) {
          setHasMortgage(true);
          setMortgageRecords(mortgages.map((m: any) => ({ mortgageAmount: String(m.mortgage_amount_usd || ''), duration: String(m.duration_months || ''), creditorName: m.creditor_name || '', creditorType: m.creditor_type || 'Banque', contractDate: m.contract_date || '', mortgageStatus: m.mortgage_status || 'Active', receiptFile: null, existingReceiptUrl: m.receipt_url || undefined })));
        } else { setHasMortgage(false); }

        if (contrib.parcel_type === 'SU' || contrib.parcel_type === 'urbain') setSectionType('urbaine');
        else if (contrib.parcel_type === 'SR' || contrib.parcel_type === 'rural') setSectionType('rurale');

        const additionalConstr = (contrib as any).additional_constructions as any[];
        if (additionalConstr && Array.isArray(additionalConstr) && additionalConstr.length > 0) {
          setConstructionMode('multiple');
          setAdditionalConstructions(additionalConstr.map((c: any) => ({ propertyCategory: c.propertyCategory || '', constructionType: c.constructionType || '', constructionNature: c.constructionNature || '', constructionMaterials: c.constructionMaterials || '', declaredUsage: c.declaredUsage || '', standing: c.standing || '', constructionYear: c.constructionYear || undefined, rentalStartDate: c.rentalStartDate || undefined, apartmentNumber: c.apartmentNumber || undefined, floorNumber: c.floorNumber || undefined, isOccupied: c.isOccupied ?? undefined, occupantCount: c.occupantCount ?? undefined, hostingCapacity: c.hostingCapacity ?? undefined, permitMode: c.permitMode || undefined, permit: c.permit || undefined })));
        }

        // Restore roadSides, servitude, hasDispute, disputeData, buildingShapes from DB
        const savedRoadSides = (contrib as any).road_sides as any[];
        if (savedRoadSides && Array.isArray(savedRoadSides)) setRoadSides(savedRoadSides);

        const savedServitude = (contrib as any).servitude_data as any;
        if (savedServitude) setServitude(savedServitude);

        if ((contrib as any).has_dispute !== null && (contrib as any).has_dispute !== undefined) {
          setHasDispute((contrib as any).has_dispute);
        }

        const savedDisputeData = (contrib as any).dispute_data as any;
        if (savedDisputeData) setDisputeFormData(savedDisputeData);

        const savedBuildingShapes = (contrib as any).building_shapes as any[];
        if (savedBuildingShapes && Array.isArray(savedBuildingShapes)) setBuildingShapes(savedBuildingShapes);

        // Restore sound environment
        if ((contrib as any).sound_environment) setSoundEnvironment((contrib as any).sound_environment);
        if ((contrib as any).nearby_noise_sources) setNearbySoundSources((contrib as any).nearby_noise_sources);
      } catch (err) { console.error('Erreur chargement contribution:', err); }
      finally { setTimeout(() => { isLoadingFromDbRef.current = false; }, 500); }
    };
    fetchContribution();
  }, [open, editingContributionId]);

  // Auto-save debounced: géré dans useFormPersistence

  // Auto-detect section type from parcel number
  useEffect(() => {
    if (parcelNumber) {
      const upper = parcelNumber.toUpperCase().trim();
      if (upper.startsWith('SU')) { setSectionType('urbaine'); setSectionTypeAutoDetected(true); }
      else if (upper.startsWith('SR')) { setSectionType('rurale'); setSectionTypeAutoDetected(true); }
      else { setSectionType(''); setSectionTypeAutoDetected(false); }
    }
  }, [parcelNumber]);

  // Sync LAST previous owner end date with current owner since (only if not manually set)
  // FIX audit 3.5: dépendre uniquement de currentOwners[0]?.since (string) au lieu de
  // l'array complet. Évite la ré-exécution à chaque frappe sur firstName/lastName/etc.
  const firstOwnerSince = currentOwners[0]?.since;
  useEffect(() => {
    if (isLoadingFromDbRef.current) return;
    if (firstOwnerSince && previousOwners.length > 0) {
      const lastIdx = previousOwners.length - 1;
      const lastPreviousOwner = previousOwners[lastIdx];
      // Only auto-fill if endDate is empty (don't overwrite manual entries)
      if (!lastPreviousOwner.endDate) {
        setPreviousOwners(prev => {
          const updated = [...prev];
          updated[lastIdx] = { ...updated[lastIdx], endDate: firstOwnerSince };
          return updated;
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstOwnerSince]);

  // Surface calculation from parcel sides
  // Sides order: [Nord, Sud, Est, Ouest] → opposite pairs: Nord↔Sud (0↔1), Est↔Ouest (2↔3)
  useEffect(() => {
    if (isLoadingFromDbRef.current) return;
    const sides = parcelSides.filter(s => s.length && parseFloat(s.length) > 0);
    if (sides.length < 3) return;
    if (sides.length === 3) {
      const lengths = sides.map(s => parseFloat(s.length));
      const s = (lengths[0] + lengths[1] + lengths[2]) / 2;
      const heronValue = s * (s - lengths[0]) * (s - lengths[1]) * (s - lengths[2]);
      if (heronValue <= 0) return;
      handleInputChange('areaSqm', parseFloat(Math.sqrt(heronValue).toFixed(2)));
      return;
    }
    if (sides.length === 4) {
      const lengths = sides.map(s => parseFloat(s.length));
      const tolerance = (side: number) => Math.max(0.5, side * 0.01);
      // FIX: Compare opposite sides (Nord↔Sud = 0↔1, Est↔Ouest = 2↔3)
      const isRectangle = Math.abs(lengths[0] - lengths[1]) < tolerance(lengths[0]) && Math.abs(lengths[2] - lengths[3]) < tolerance(lengths[2]);
      // FIX: For rectangle, area = side_a * side_b where a and b are adjacent (Nord * Est)
      if (isRectangle) { handleInputChange('areaSqm', parseFloat((lengths[0] * lengths[2]).toFixed(2))); return; }
      // FIX: Brahmagupta for cyclic quadrilateral — sides must be in order (adjacent): Nord, Est, Sud, Ouest
      const a = lengths[0], b = lengths[2], c = lengths[1], d = lengths[3];
      const total = a + b + c + d;
      if (a >= total - a || b >= total - b || c >= total - c || d >= total - d) return;
      const s = total / 2;
      const brahmVal = (s - a) * (s - b) * (s - c) * (s - d);
      if (brahmVal <= 0) return;
      handleInputChange('areaSqm', parseFloat(Math.sqrt(brahmVal).toFixed(2)));
      return;
    }
    if (sides.length > 4) {
      const lengths = sides.map(s => parseFloat(s.length));
      const perimeter = lengths.reduce((a, b) => a + b, 0);
      const area = (perimeter * perimeter) / (4 * sides.length * Math.tan(Math.PI / sides.length));
      handleInputChange('areaSqm', parseFloat(area.toFixed(2)));
    }
  }, [parcelSides]);

  // Area mismatch validation
  useEffect(() => {
    if (permitMode !== 'request') { setShowAreaMismatchWarning(false); setShouldBlinkSuperficie(false); return; }
    const superficieCalculee = formData.areaSqm ? parseFloat(formData.areaSqm.toString()) : 0;
    const surfaceConstruction = permitRequest.estimatedArea ? parseFloat(permitRequest.estimatedArea) : 0;
    if (superficieCalculee > 0 && surfaceConstruction > 0 && superficieCalculee < surfaceConstruction) {
      setShouldBlinkSuperficie(true);
      setAreaMismatchMessage(`La superficie totale (${superficieCalculee} m²) ne peut pas être inférieure à la surface de construction (${surfaceConstruction} m²).`);
      setShowAreaMismatchWarning(true);
    } else { setShouldBlinkSuperficie(false); setShowAreaMismatchWarning(false); }
  }, [formData.areaSqm, permitRequest.estimatedArea, permitRequest.permitType, permitMode]);

  // Geographic cascade effects
  useEffect(() => {
    if (isLoadingFromDbRef.current) return;
    if (formData.province) {
      setAvailableVilles(getVillesForProvince(formData.province));
      setAvailableTerritoires(getTerritoiresForProvince(formData.province));
      if (!getVillesForProvince(formData.province).includes(formData.ville || '')) { handleInputChange('ville', undefined); setAvailableCommunes([]); handleInputChange('commune', undefined); }
      if (!getTerritoiresForProvince(formData.province).includes(formData.territoire || '')) { handleInputChange('territoire', undefined); setAvailableCollectivites([]); handleInputChange('collectivite', undefined); }
    } else { setAvailableVilles([]); setAvailableCommunes([]); setAvailableTerritoires([]); setAvailableCollectivites([]); }
  }, [formData.province]);

  useEffect(() => {
    if (isLoadingFromDbRef.current) return;
    if (formData.province && formData.ville) {
      const communes = getCommunesForVille(formData.province, formData.ville); setAvailableCommunes(communes);
      if (!communes.includes(formData.commune || '')) { handleInputChange('commune', undefined); setAvailableQuartiers([]); handleInputChange('quartier', undefined); setAvailableAvenues([]); handleInputChange('avenue', undefined); }
    } else { setAvailableCommunes([]); setAvailableQuartiers([]); setAvailableAvenues([]); }
  }, [formData.province, formData.ville]);

  useEffect(() => {
    if (isLoadingFromDbRef.current) return;
    if (formData.province && formData.ville && formData.commune) {
      const quartiers = getQuartiersForCommune(formData.province, formData.ville, formData.commune); setAvailableQuartiers(quartiers);
      if (!quartiers.includes(formData.quartier || '')) { handleInputChange('quartier', undefined); setAvailableAvenues([]); handleInputChange('avenue', undefined); }
    } else { setAvailableQuartiers([]); setAvailableAvenues([]); }
  }, [formData.province, formData.ville, formData.commune]);

  useEffect(() => {
    if (isLoadingFromDbRef.current) return;
    if (formData.province && formData.ville && formData.commune && formData.quartier) {
      const avenues = getAvenuesForQuartier(formData.province, formData.ville, formData.commune, formData.quartier); setAvailableAvenues(avenues);
      if (!avenues.includes(formData.avenue || '')) handleInputChange('avenue', undefined);
    } else { setAvailableAvenues([]); }
  }, [formData.province, formData.ville, formData.commune, formData.quartier]);

  useEffect(() => {
    if (isLoadingFromDbRef.current) return;
    if (formData.province && formData.territoire) {
      const collectivites = getCollectivitesForTerritoire(formData.province, formData.territoire); setAvailableCollectivites(collectivites);
      if (!collectivites.includes(formData.collectivite || '')) handleInputChange('collectivite', undefined);
    } else { setAvailableCollectivites([]); }
  }, [formData.province, formData.territoire]);

  // Construction cascade effects
  useEffect(() => {
    if (!formData.propertyCategory) { setAvailableConstructionTypes([]); handleInputChange('constructionType', undefined); return; }
    const allowedTypes = CATEGORY_TO_CONSTRUCTION_TYPES[formData.propertyCategory] || [];
    setAvailableConstructionTypes(allowedTypes);
    if (allowedTypes.length === 1) { if (formData.constructionType !== allowedTypes[0]) handleInputChange('constructionType', allowedTypes[0]); }
    else if (formData.constructionType && !allowedTypes.includes(formData.constructionType)) handleInputChange('constructionType', undefined);
  }, [formData.propertyCategory]);

  const MATERIALS_BY_NATURE_FALLBACK: Record<string, string[]> = {
    Durable: ['Béton armé', 'Briques cuites', 'Parpaings', 'Pierre naturelle'],
    'Semi-durable': ['Semi-dur', 'Briques adobes', 'Bois', 'Mixte'],
    Précaire: ['Tôles', 'Bois', 'Paille', 'Autre'],
  };
  const STANDING_BY_NATURE_FALLBACK: Record<string, string[]> = {
    Durable: ['Haut standing', 'Moyen standing', 'Économique'],
    'Semi-durable': ['Moyen standing', 'Économique'],
    Précaire: ['Économique'],
  };

  // Helper: build reverse mapping material -> nature
  const buildMaterialToNatureMap = useCallback((materialsMap: Record<string, string[]>): Record<string, string> => {
    const reverseMap: Record<string, string> = {};
    for (const [nature, materials] of Object.entries(materialsMap)) {
      for (const mat of materials) {
        if (!reverseMap[mat]) reverseMap[mat] = nature; // first match wins
      }
    }
    return reverseMap;
  }, []);

  // When constructionType changes: reset children, compute available materials (flattened from all natures)
  useEffect(() => {
    if (!formData.constructionType) {
      setAvailableConstructionNatures([]); handleInputChange('constructionNature', undefined);
      setAvailableDeclaredUsages([]); handleInputChange('declaredUsage', undefined);
      setAvailableConstructionMaterials([]); handleInputChange('constructionMaterials', undefined);
      setAvailableStandings([]); handleInputChange('standing', undefined);
      return;
    }
    // Compute natures for this type (still needed for usage/standing downstream)
    const natureMap = getPicklistDependentOptions('picklist_construction_nature');
    const natures = natureMap[formData.constructionType] || [];
    setAvailableConstructionNatures(natures);

    // Compute flattened materials from all natures of this type
    const dbMaterialsMap = getPicklistDependentOptions('picklist_construction_materials');
    const hasMaterialsInDb = Object.keys(dbMaterialsMap).length > 0;
    const allMaterials: string[] = [];
    const seen = new Set<string>();
    for (const nature of natures) {
      if (nature === 'Non bâti') continue;
      const mats = hasMaterialsInDb ? (dbMaterialsMap[nature] || []) : (MATERIALS_BY_NATURE_FALLBACK[nature] || []);
      for (const m of mats) {
        if (!seen.has(m)) { seen.add(m); allMaterials.push(m); }
      }
    }
    setAvailableConstructionMaterials(allMaterials);

    // Reset if current values are no longer valid
    if (formData.constructionMaterials && !allMaterials.includes(formData.constructionMaterials)) {
      handleInputChange('constructionMaterials', undefined);
      handleInputChange('constructionNature', undefined);
    }
    if (formData.constructionNature && !natures.includes(formData.constructionNature)) {
      handleInputChange('constructionNature', undefined);
    }
  }, [formData.constructionType, getPicklistDependentOptions]);

  // When constructionMaterials changes: auto-fill constructionNature via reverse lookup
  useEffect(() => {
    if (!formData.constructionMaterials || !formData.constructionType) {
      if (!formData.constructionMaterials) {
        handleInputChange('constructionNature', undefined);
        setAvailableStandings([]); handleInputChange('standing', undefined);
      }
      return;
    }
    const dbMaterialsMap = getPicklistDependentOptions('picklist_construction_materials');
    const hasMaterialsInDb = Object.keys(dbMaterialsMap).length > 0;
    const materialsMap = hasMaterialsInDb ? dbMaterialsMap : MATERIALS_BY_NATURE_FALLBACK;
    const reverseMap = buildMaterialToNatureMap(materialsMap);
    const deducedNature = reverseMap[formData.constructionMaterials];
    if (deducedNature && deducedNature !== formData.constructionNature) {
      handleInputChange('constructionNature', deducedNature);
    }
  }, [formData.constructionMaterials, formData.constructionType, getPicklistDependentOptions, buildMaterialToNatureMap]);

  // Usage depends on type + nature (shared logic via resolveAvailableUsages)
  useEffect(() => {
    if (!formData.constructionType || !formData.constructionNature) { setAvailableDeclaredUsages([]); handleInputChange('declaredUsage', undefined); return; }
    const usages = resolveAvailableUsages(formData.constructionType, formData.constructionNature, getPicklistDependentOptions);
    setAvailableDeclaredUsages(usages);
    if (formData.declaredUsage && !usages.includes(formData.declaredUsage)) handleInputChange('declaredUsage', undefined);
  }, [formData.constructionType, formData.constructionNature, getPicklistDependentOptions]);

  // Standing depends on nature
  useEffect(() => {
    if (!formData.constructionNature || formData.constructionNature === 'Non bâti') { setAvailableStandings([]); handleInputChange('standing', undefined); return; }
    const dbStandingMap = getPicklistDependentOptions('picklist_standing');
    const standings = (Object.keys(dbStandingMap).length > 0 ? dbStandingMap[formData.constructionNature] : STANDING_BY_NATURE_FALLBACK[formData.constructionNature]) || [];
    setAvailableStandings(standings);
    if (formData.standing && !standings.includes(formData.standing)) handleInputChange('standing', undefined);
  }, [formData.constructionNature, getPicklistDependentOptions]);

  useEffect(() => {
    if (permitMode === 'request' && formData.declaredUsage && !permitRequest.plannedUsage) setPermitRequest(prev => ({ ...prev, plannedUsage: formData.declaredUsage || '' }));
  }, [permitMode, formData.declaredUsage]);

  useEffect(() => {
    if (permitMode === 'request' && currentOwners.length === 1) {
      const owner = currentOwners[0];
      if (owner.lastName && owner.firstName && !permitRequest.applicantName) {
        const fullName = `${owner.lastName} ${owner.middleName ? owner.middleName + ' ' : ''}${owner.firstName}`.trim();
        setPermitRequest(prev => ({ ...prev, applicantName: fullName, selectedOwnerIndex: 0 }));
      }
    }
  }, [permitMode, currentOwners]);

  // Confetti on success
  useEffect(() => {
    if (showSuccess && !hasShownConfetti) { setHasShownConfetti(true); triggerConfetti(); }
  }, [showSuccess, hasShownConfetti]);

  // ─── Block reset handlers ───
  const resetTitleBlock = useCallback(() => {
    handleInputChange('propertyTitleType', undefined);
    handleInputChange('titleReferenceNumber', undefined);
    handleInputChange('titleIssueDate', undefined);
    handleInputChange('leaseType', undefined);
    setCustomTitleName('');
    setLeaseYears(0);
    setTitleDocFiles([]);
    markDirty();
  }, []);

  const resetOwnersBlock = useCallback(() => {
    setCurrentOwners([{
      lastName: '', middleName: '', firstName: '', legalStatus: 'Personne physique',
      gender: '', entityType: '', entitySubType: '', entitySubTypeOther: '',
      stateExploitedBy: '', rightType: '', since: '', nationality: '', previousTitleType: '', previousTitleCustomName: ''
    }]);
    setOwnershipMode('unique');
    setOwnerDocFile(null);
    handleInputChange('isTitleInCurrentOwnerName', undefined);
    markDirty();
  }, []);

  const resetConstructionBlock = useCallback(() => {
    handleInputChange('propertyCategory', undefined);
    handleInputChange('constructionType', undefined);
    handleInputChange('constructionNature', undefined);
    handleInputChange('constructionMaterials', undefined);
    handleInputChange('declaredUsage', undefined);
    handleInputChange('standing', undefined);
    handleInputChange('constructionYear', undefined);
    handleInputChange('isOccupied', undefined);
    handleInputChange('occupantCount', undefined);
    handleInputChange('hostingCapacity', undefined);
    handleInputChange('floorNumber', undefined);
    handleInputChange('apartmentNumber', undefined);
    setConstructionMode('unique');
    setAdditionalConstructions([]);
    setBuildingPermits([{
      permitType: 'construction', permitNumber: '', issueDate: '',
      validityMonths: '36', administrativeStatus: 'En attente', issuingService: '', attachmentFile: null
    }]);
    setPermitMode(null);
    markDirty();
  }, []);

  const resetLocationBlock = useCallback(() => {
    handleInputChange('province', undefined);
    handleInputChange('ville', undefined);
    handleInputChange('commune', undefined);
    handleInputChange('quartier', undefined);
    handleInputChange('avenue', undefined);
    handleInputChange('houseNumber', undefined);
    handleInputChange('territoire', undefined);
    handleInputChange('collectivite', undefined);
    handleInputChange('groupement', undefined);
    handleInputChange('village', undefined);
    handleInputChange('areaSqm', undefined);
    setGpsCoordinates([]);
    setParcelSides([
      { name: 'Côté Nord', length: '' }, { name: 'Côté Sud', length: '' },
      { name: 'Côté Est', length: '' }, { name: 'Côté Ouest', length: '' }
    ]);
    setRoadSides([]);
    setServitude({ hasServitude: false });
    setBuildingShapes([]);
    setSoundEnvironment('');
    setNearbySoundSources('');
    markDirty();
  }, []);

  const resetPreviousOwnersBlock = useCallback(() => {
    setPreviousOwners([{
      name: '', legalStatus: 'Personne physique', entityType: '', entitySubType: '',
      entitySubTypeOther: '', stateExploitedBy: '', startDate: '', endDate: '', mutationType: 'Vente'
    }]);
    markDirty();
  }, []);

  const resetTaxBlock = useCallback(() => {
    setTaxRecords([{
      taxType: 'Impôt foncier annuel', taxYear: '', taxAmount: '', paymentStatus: 'Payé',
      paymentDate: '', receiptFile: null
    }]);
    markDirty();
  }, []);

  const resetMortgageBlock = useCallback(() => {
    setHasMortgage(null);
    setMortgageRecords([{
      mortgageAmount: '', duration: '', creditorName: '', creditorType: 'Banque',
      contractDate: '', mortgageStatus: 'Active', receiptFile: null
    }]);
    markDirty();
  }, []);

  return {
    // Core hooks
    loading, uploading, user, toast, isMobile, mapConfig, mapConfigLoading,
    getPicklistOptions, getPicklistDependentOptions,
    // Form data
    formData, handleInputChange,
    // Tab navigation
    activeTab, handleTabChange, handleNextTab, isTabAccessible,
    // Title
    customTitleName, setCustomTitleName, leaseYears, setLeaseYears,
    // File handling
    ownerDocFile, titleDocFiles, handleFileChange, removeFile,
    // Current owners
    currentOwners, setCurrentOwners, ownershipMode, setOwnershipMode,
    updateCurrentOwner, addCurrentOwner, removeCurrentOwner,
    showOwnerWarning, highlightIncompleteOwner,
    // Previous owners
    previousOwners, updatePreviousOwner, addPreviousOwner, removePreviousOwner,
    highlightIncompletePreviousOwner, showCurrentOwnerRequiredWarning, showPreviousOwnerWarning,
    // Construction
    PROPERTY_CATEGORY_OPTIONS, availableConstructionTypes, availableConstructionNatures,
    availableConstructionMaterials, availableDeclaredUsages, availableStandings,
    constructionMode, setConstructionMode, additionalConstructions, setAdditionalConstructions,
    // Permits
    permitMode, setPermitMode, buildingPermits, addBuildingPermit, removeBuildingPermit, updateBuildingPermit, updateBuildingPermitFile, removeBuildingPermitFile,
    getPermitTypeRestrictions, showPermitWarning, highlightIncompletePermit,
    // Location
    sectionType, sectionTypeAutoDetected, handleSectionTypeChange,
    availableVilles, availableCommunes, availableTerritoires, availableCollectivites, availableQuartiers, availableAvenues,
    gpsCoordinates, setGpsCoordinates, parcelSides, setParcelSides,
    roadSides, setRoadSides, servitude, setServitude,
    buildingShapes, setBuildingShapes,
    soundEnvironment, setSoundEnvironment, nearbySoundSources, setNearbySoundSources,
    // Obligations
    obligationType, setObligationType,
    taxRecords, updateTaxRecord, addTaxRecord, removeTaxRecord, handleTaxFileChange, removeTaxFile,
    showTaxWarning, highlightIncompleteTax,
    hasMortgage, setHasMortgage, mortgageRecords, setMortgageRecords,
    updateMortgageRecord, addMortgageRecord, removeMortgageRecord, handleMortgageFileChange, removeMortgageFile,
    showMortgageWarning, highlightIncompleteMortgage,
    hasDispute, setHasDispute,
    disputeFormData, setDisputeFormData,
    // Validation
    highlightRequiredFields, setHighlightRequiredFields,
    getMissingFields, isFormValidForSubmission, calculateCCCValue,
    // Submit & close
    handleSubmit, handleClose, handleAttemptClose,
    showSuccess, showExitConfirmation, setShowExitConfirmation,
    showQuickAuth, setShowQuickAuth, pendingSubmission, setPendingSubmission,
    saveFormDataToStorage,
    // Misc warnings
    showAreaMismatchWarning, areaMismatchMessage, shouldBlinkSuperficie,
    showPermitTypeBlockedWarning, permitTypeBlockedMessage,
    // Block reset handlers
    resetTitleBlock, resetOwnersBlock, resetConstructionBlock,
    resetLocationBlock, resetPreviousOwnersBlock, resetTaxBlock, resetMortgageBlock,
  };
};
