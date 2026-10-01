import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createLongLivedSignedUrl } from '@/utils/storageSignedUrl';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import WhatsAppFloatingButton from './WhatsAppFloatingButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, FileSearch, MapPin, Building, Droplets, Zap, Wifi, 
  Shield, Car, Trees, AlertTriangle, Upload, X, FileText, Image, CheckCircle2,
  CreditCard, Smartphone, ArrowLeft, Receipt, DollarSign, Phone, Home,
  Volume2, Layers, Building2, Camera, Info, Mic, MicOff, Fence, Warehouse, DoorOpen, FileCheck
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRealEstateExpertise } from '@/hooks/useRealEstateExpertise';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import FormIntroDialog, { FORM_INTRO_CONFIGS } from './FormIntroDialog';
import SuggestivePicklist from './SuggestivePicklist';
import SectionHelpPopover from './SectionHelpPopover';
import { openExpertiseCertificate } from '@/utils/expertiseCertificateUrl';
import { useCCCFormPicklists } from '@/hooks/useCCCFormPicklists';
import { resolveAvailableUsages } from '@/utils/constructionUsageResolver';
import { BuildingPermitIssuingServiceSelect } from './BuildingPermitIssuingServiceSelect';
import { cn } from '@/lib/utils';
import BuildingTargetSelector, { type KnownBuilding } from './expertise/BuildingTargetSelector';
import CadastralContextBlock from './expertise/CadastralContextBlock';
import ExpertiseScopeSelector, { type ValuationTarget } from './expertise/ExpertiseScopeSelector';
import ExpertiseTargetMap, { type ExpertiseSelectionMode, type MapBuilding } from './expertise/ExpertiseTargetMap';
import { useParcelExpertisePrefill } from '@/hooks/useParcelExpertisePrefill';
import { useExpertiseFeeQuote } from '@/hooks/useExpertiseFeeQuote';


interface RealEstateExpertiseRequestDialogProps {
  parcelNumber: string;
  parcelId?: string;
  parcelData?: {
    province?: string;
    ville?: string;
    commune?: string;
    quartier?: string;
    area_sqm?: number;
    current_owner_name?: string;
    construction_type?: string;
    construction_nature?: string;
    construction_materials?: string;
    construction_year?: number;
    floor_number?: string;
    property_category?: string;
    property_title_type?: string;
    declared_usage?: string;
    additional_constructions?: Array<{
      type?: string;
      usage?: string;
      surface_sqm?: number;
      nature?: string;
      materials?: string;
      year?: number;
    }> | null;
  };
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

import type { ExpertiseFee, ExpertiseBuildingDetail } from '@/types/expertise';
import {
  PROPERTY_CONDITION_OPTIONS,
  ROAD_ACCESS_OPTIONS,
  WINDOW_TYPE_OPTIONS,
  FLOOR_MATERIAL_OPTIONS,
  ROOF_MATERIAL_OPTIONS,
  SOUND_ENVIRONMENT_OPTIONS,
  FACADE_ORIENTATION_OPTIONS,
  BUILDING_POSITION_OPTIONS,
  ACCESSIBILITY_OPTIONS,
  YEAR_OPTIONS,
} from './real-estate-expertise/constants';
import DocumentsTab from './real-estate-expertise/DocumentsTab';
import EnvironmentTab from './real-estate-expertise/EnvironmentTab';
import BuildingTab from './real-estate-expertise/BuildingTab';
import PaymentTab from './real-estate-expertise/PaymentTab';
import ConfirmationTab from './real-estate-expertise/ConfirmationTab';
import GeneralTab from './real-estate-expertise/GeneralTab';

import {
  CONDITION_LABELS,
  ROAD_LABELS, ROOF_LABELS,
  WINDOW_LABELS, FLOOR_LABELS, FACADE_ORIENTATION_LABELS,
  BUILDING_POSITION_LABELS, ACCESSIBILITY_LABELS
} from '@/constants/expertiseLabels';
const RealEstateExpertiseRequestDialog: React.FC<RealEstateExpertiseRequestDialogProps> = ({
  parcelNumber,
  parcelId,
  parcelData,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const onOpenChange = isControlled ? controlledOnOpenChange! : setInternalOpen;
  
  const isMobile = useIsMobile();
  const { user, profile } = useAuth();
  const { createExpertiseRequest, loading, checkExistingValidCertificate, checkCertificateValidity } = useRealEstateExpertise();
  const parcelDocsInputRef = useRef<HTMLInputElement>(null);
  const constructionImagesInputRef = useRef<HTMLInputElement>(null);
  const constructionGalleryInputRef = useRef<HTMLInputElement>(null);

  const [showIntro, setShowIntro] = useState(true);
  const [step, setStep] = useState<'form' | 'summary' | 'payment' | 'confirmation'>('form');
  const [activeTab, setActiveTabRaw] = useState('general');
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const setActiveTab = (tab: string) => {
    setActiveTabRaw(tab);
    setTimeout(() => {
      const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) viewport.scrollTop = 0;
    }, 50);
  };
  const [createdRequest, setCreatedRequest] = useState<any>(null);

  // Existing valid certificate state
  const [checkingCertificate, setCheckingCertificate] = useState(false);
  const [existingCertificate, setExistingCertificate] = useState<any>(null);
  const [certificateChecked, setCertificateChecked] = useState(false);
  const [showCertificatePayment, setShowCertificatePayment] = useState(false);
  const [certPaymentMethod, setCertPaymentMethod] = useState<'mobile_money' | 'bank_card'>('mobile_money');
  const [certPaymentProvider, setCertPaymentProvider] = useState('');
  const [certPaymentPhone, setCertPaymentPhone] = useState('');
  const [processingCertPayment, setProcessingCertPayment] = useState(false);
  const [certificateAccessFee, setCertificateAccessFee] = useState<number>(0);
  const [hasCertificateAccess, setHasCertificateAccess] = useState(false);
  const [checkingCertificateAccess, setCheckingCertificateAccess] = useState(false);

  // Payment state
  const [fees, setFees] = useState<ExpertiseFee[]>([]);
  const [loadingFees, setLoadingFees] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'bank_card'>('mobile_money');
  const [paymentProvider, setPaymentProvider] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [formData, setFormData] = useState<any>(null);

  // === CCC PICKLISTS ===
  const { getOptions, getDependentOptions, loading: picklistsLoading } = useCCCFormPicklists();
  
  // CCC construction categories
  const PROPERTY_CATEGORY_OPTIONS = useMemo(() => [
    'Appartement', 'Villa', 'Maison', 'Maison basse', 'Local commercial',
    'Immeuble/Bâtiment', 'Entrepôt/Hangar', 'Terrain nu',
  ], []);

  const CATEGORY_TO_CONSTRUCTION_TYPES: Record<string, string[]> = useMemo(() => ({
    'Appartement': ['Résidentielle'], 'Villa': ['Résidentielle'], 'Maison': ['Résidentielle'],
    'Maison basse': ['Résidentielle'],
    'Local commercial': ['Commerciale'], 'Immeuble/Bâtiment': ['Résidentielle', 'Commerciale', 'Industrielle'],
    'Entrepôt/Hangar': ['Industrielle', 'Agricole'], 'Terrain nu': ['Terrain nu'],
  }), []);

  const MATERIALS_BY_NATURE_FALLBACK: Record<string, string[]> = useMemo(() => ({
    Durable: ['Béton armé', 'Briques cuites', 'Parpaings', 'Pierre naturelle'],
    'Semi-durable': ['Semi-dur', 'Briques adobes', 'Bois', 'Mixte'],
    Précaire: ['Tôles', 'Bois', 'Paille', 'Autre'],
  }), []);

  const STANDING_BY_NATURE_FALLBACK: Record<string, string[]> = useMemo(() => ({
    Durable: ['Haut standing', 'Moyen standing', 'Économique'],
    'Semi-durable': ['Moyen standing', 'Économique'],
    Précaire: ['Économique'],
  }), []);

  // === GÉNÉRAL (CCC-aligned) ===
  const [propertyDescription, setPropertyDescription] = useState('');
  const [propertyCategory, setPropertyCategory] = useState('');
  const [constructionType, setConstructionType] = useState('');
  const [constructionMaterials, setConstructionMaterials] = useState('');
  const [constructionNature, setConstructionNature] = useState('');
  const [declaredUsage, setDeclaredUsage] = useState('');
  const [standing, setStanding] = useState('');
  const [constructionYear, setConstructionYear] = useState('');
  const [numberOfFloors, setNumberOfFloors] = useState('1');
  const [totalBuiltAreaSqm, setTotalBuiltAreaSqm] = useState('');
  const [propertyCondition, setPropertyCondition] = useState('bon');
  const [numberOfRooms, setNumberOfRooms] = useState('');
  const [numberOfBedrooms, setNumberOfBedrooms] = useState('');
  const [numberOfBathrooms, setNumberOfBathrooms] = useState('');

  // CCC construction cascade state
  const [availableConstructionTypes, setAvailableConstructionTypes] = useState<string[]>([]);
  const [availableConstructionMaterials, setAvailableConstructionMaterials] = useState<string[]>([]);
  const [availableConstructionNatures, setAvailableConstructionNatures] = useState<string[]>([]);
  const [availableDeclaredUsages, setAvailableDeclaredUsages] = useState<string[]>([]);
  const [availableStandings, setAvailableStandings] = useState<string[]>([]);

  // === MATÉRIAUX DE CONSTRUCTION (expertise-specific: roof, window, floor, finishes) ===
  const [roofMaterial, setRoofMaterial] = useState('tole_bac');
  const [windowType, setWindowType] = useState('aluminium');
  const [floorMaterial, setFloorMaterial] = useState('carrelage');
  const [hasPlaster, setHasPlaster] = useState(true);
  const [hasPainting, setHasPainting] = useState(true);
  const [hasCeiling, setHasCeiling] = useState(true);

  // === EMPLACEMENT & POSITION ===
  const [buildingPosition, setBuildingPosition] = useState('premiere_position');
  const [facadeOrientation, setFacadeOrientation] = useState('');
  const [distanceFromRoad, setDistanceFromRoad] = useState('');
  const [isCornerPlot, setIsCornerPlot] = useState(false);
  const [hasDirectStreetAccess, setHasDirectStreetAccess] = useState(true);
  
  // === APPARTEMENT / IMMEUBLE ===
  const [floorNumber, setFloorNumber] = useState('');
  const [totalBuildingFloors, setTotalBuildingFloors] = useState('');
  const [accessibility, setAccessibility] = useState('escalier');
  const [apartmentNumber, setApartmentNumber] = useState('');
  const [hasCommonAreas, setHasCommonAreas] = useState(false);
  const [monthlyCharges, setMonthlyCharges] = useState('');

   // === ENVIRONNEMENT SONORE (removed — now in CCC form) ===
  const [hasDoubleGlazing, setHasDoubleGlazing] = useState(false);

  // === ÉQUIPEMENTS ===
  const [hasWaterSupply, setHasWaterSupply] = useState(false);
  const [hasElectricity, setHasElectricity] = useState(false);
  const [hasSewageSystem, setHasSewageSystem] = useState(false);
  const [hasInternet, setHasInternet] = useState(false);
  const [internetProvider, setInternetProvider] = useState('');
  const [hasSecuritySystem, setHasSecuritySystem] = useState(false);
  const [hasParking, setHasParking] = useState(false);
  const [parkingSpaces, setParkingSpaces] = useState('');
  const [hasGarden, setHasGarden] = useState(false);
  const [gardenAreaSqm, setGardenAreaSqm] = useState('');
  const [hasPool, setHasPool] = useState(false);
  const [hasAirConditioning, setHasAirConditioning] = useState(false);
  const [hasSolarPanels, setHasSolarPanels] = useState(false);
  const [hasWaterTank, setHasWaterTank] = useState(false);
  const [hasGenerator, setHasGenerator] = useState(false);
  const [hasBorehole, setHasBorehole] = useState(false);
  const [hasElectricFence, setHasElectricFence] = useState(false);
  const [hasGarage, setHasGarage] = useState(false);
  const [hasCellar, setHasCellar] = useState(false);
  const [hasAutomaticGate, setHasAutomaticGate] = useState(false);

  // === ENVIRONNEMENT & ACCESSIBILITÉ ===
  const [roadAccessType, setRoadAccessType] = useState('asphalte');
  const [distanceToMainRoad, setDistanceToMainRoad] = useState('');
  const [distanceToHospital, setDistanceToHospital] = useState('');
  const [distanceToSchool, setDistanceToSchool] = useState('');
  const [distanceToMarket, setDistanceToMarket] = useState('');
  const [floodRiskZone, setFloodRiskZone] = useState(false);
  const [erosionRiskZone, setErosionRiskZone] = useState(false);
  const [nearbyAmenities, setNearbyAmenities] = useState<string[]>([]);

  // === AUTORISATION DE BÂTIR ===
  const [hasBuildingPermit, setHasBuildingPermit] = useState<'yes' | 'no' | null>(null);
  const [buildingPermitType, setBuildingPermitType] = useState<'construction' | 'regularization'>('construction');
  const [buildingPermitNumber, setBuildingPermitNumber] = useState('');
  const [buildingPermitIssueDate, setBuildingPermitIssueDate] = useState('');
  const [buildingPermitIssuingService, setBuildingPermitIssuingService] = useState('');
  const [buildingPermitFile, setBuildingPermitFile] = useState<File | null>(null);
  const permitFileInputRef = useRef<HTMLInputElement>(null);

  // === NOTES & DOCUMENTS ===
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [parcelDocuments, setParcelDocuments] = useState<File[]>([]);
   const [constructionImages, setConstructionImages] = useState<File[]>([]);
   const [constructionImageUrls, setConstructionImageUrls] = useState<string[]>([]);
   const [uploadingFiles, setUploadingFiles] = useState(false);

  // === BUILDING TARGET (multi-construction support) ===
  const [selectedBuildingRefs, setSelectedBuildingRefs] = useState<string[]>(['main']);
  const selectedBuildingRef = selectedBuildingRefs[0] || 'new';
  const setSelectedBuildingRef = useCallback((ref: string) => setSelectedBuildingRefs([ref]), []);
  const [cadastreDiscrepancies, setCadastreDiscrepancies] = useState('');

  // === PÉRIMÈTRE ET VALEURS DEMANDÉES ===
  const [expertiseScope, setExpertiseScope] = useState<'partial' | 'total'>('total');
  const [valuationTargets, setValuationTargets] = useState<ValuationTarget[]>(['market']);
  const [selectionMode, setSelectionMode] = useState<ExpertiseSelectionMode>('whole');
  const [drawnArea, setDrawnArea] = useState<{ lat: number; lng: number }[] | null>(null);


  // Contexte cadastral complet (RPC sécurisée) — la carte ne transmet que des colonnes publiques
  const { data: cadastralPrefill } = useParcelExpertisePrefill(parcelNumber, open);

  // Source unique : données RPC en priorité, sinon celles passées par la carte
  const cadastreSource = useMemo<any>(
    () => ({ ...(parcelData || {}), ...(cadastralPrefill || {}) }),
    [parcelData, cadastralPrefill],
  );

  // Aggregate buildings known to the cadastre for this parcel
  const knownBuildings = useMemo<KnownBuilding[]>(() => {
    const parcelData = cadastreSource;
    if (!parcelData || Object.keys(parcelData).length === 0) return [];
    const list: KnownBuilding[] = [];



    // Main construction (only if we actually have construction data)
    const hasMain = !!(parcelData.construction_type || parcelData.construction_materials || parcelData.construction_year);
    if (hasMain) {
      list.push({
        ref: 'main',
        label: 'Construction principale',
        type: parcelData.construction_type,
        nature: parcelData.construction_nature,
        materials: parcelData.construction_materials,
        year: parcelData.construction_year,
        usage: parcelData.declared_usage,
        surface_sqm: parcelData.area_sqm,
        floors: parcelData.floor_number,
        property_category: parcelData.property_category,
        standing: parcelData.standing,
        height_m: parcelData.building_height,
      });
    }

    const extras = Array.isArray(parcelData.additional_constructions) ? parcelData.additional_constructions : [];
    extras.forEach((c: any, i: number) => {
      if (!c) return;
      const labelParts = [c.type || `Construction ${i + 1}`];
      if (c.surface_sqm) labelParts.push(`${c.surface_sqm} m²`);
      list.push({
        ref: `extra-${i}`,
        label: labelParts.join(' — '),
        type: c.type,
        nature: c.nature,
        materials: c.materials,
        year: c.year,
        usage: c.usage,
        surface_sqm: c.surface_sqm,
        property_category: parcelData.property_category,
        standing: c.standing,
        height_m: c.height_m ?? c.building_height,
      });
    });

    return list;
  }, [cadastreSource]);

  // Default selection on first open: first known building, or 'new' if none.
  // On attend que la RPC de contexte cadastral soit résolue pour ne pas basculer
  // à tort sur « nouvelle construction ».
  const defaultRefDoneRef = useRef(false);
  useEffect(() => {
    if (!open || defaultRefDoneRef.current) return;
    if (cadastralPrefill === undefined) return; // requête en cours
    defaultRefDoneRef.current = true;
    setSelectedBuildingRef(knownBuildings.length > 0 ? knownBuildings[0].ref : 'new');
  }, [open, knownBuildings, cadastralPrefill, setSelectedBuildingRef]);

  // === PÉRIMÈTRE : géométrie sans mesures (RPC sécurisée, repli sur les données de la carte) ===
  const parcelVertices = useMemo(() => {
    const raw = (cadastralPrefill as any)?.gps_coordinates ?? (parcelData as any)?.gps_coordinates;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((c: any) => ({ lat: parseFloat(c?.lat), lng: parseFloat(c?.lng) }))
      .filter((v) => Number.isFinite(v.lat) && Number.isFinite(v.lng));
  }, [cadastralPrefill, parcelData]);

  const mapBuildings = useMemo<MapBuilding[]>(() => {
    const shapes = (cadastralPrefill as any)?.building_shapes ?? (parcelData as any)?.building_shapes;
    if (!Array.isArray(shapes)) return [];
    return shapes
      .map((s: any, i: number) => {
        const verts = Array.isArray(s?.vertices)
          ? s.vertices
              .map((v: any) => ({ lat: parseFloat(v?.lat), lng: parseFloat(v?.lng) }))
              .filter((v: any) => Number.isFinite(v.lat) && Number.isFinite(v.lng))
          : [];
        const known = knownBuildings[i];
        return {
          ref: known?.ref || `shape-${i}`,
          label: known?.label || `Construction ${i + 1}`,
          vertices: verts,
        };
      })
      .filter((b) => b.vertices.length >= 3);
  }, [cadastralPrefill, parcelData, knownBuildings]);

  /**
   * Parcelle enregistrée comme terrain vide : le cadastre a bien une fiche pour
   * cette parcelle, mais aucune construction n'y figure (ou la catégorie est
   * « Terrain nu »). Dans ce cas, cibler « Construction(s) » n'a aucun sens.
   */
  const isBareLandParcel = useMemo(() => {
    if (!cadastralPrefill) return false; // contexte cadastral inconnu → on ne bloque rien
    if ((cadastralPrefill as any)?.property_category === 'Terrain nu') return true;
    return knownBuildings.length === 0 && mapBuildings.length === 0;
  }, [cadastralPrefill, knownBuildings, mapBuildings]);

  const toggleBuildingRef = useCallback((ref: string) => {
    if (isBareLandParcel) return;
    setExpertiseScope((prev) => (prev === 'total' ? 'partial' : prev));
    setSelectionMode('buildings');
    setSelectedBuildingRefs((prev) => {
      if (ref === 'new') return prev.includes('new') ? [] : ['new'];
      const withoutNew = prev.filter((r) => r !== 'new');
      return withoutNew.includes(ref) ? withoutNew.filter((r) => r !== ref) : [...withoutNew, ref];
    });
  }, [isBareLandParcel]);

  const handleSelectionModeChange = useCallback((mode: ExpertiseSelectionMode) => {
    if (mode === 'buildings' && isBareLandParcel) return;
    setSelectionMode((prev) => {
      if (prev === mode) return prev;
      if (mode !== 'area') setDrawnArea(null);
      if (mode === 'whole') {
        setExpertiseScope('total');
        setSelectedBuildingRefs([]);
      } else {
        setExpertiseScope('partial');
      }
      return mode;
    });
  }, [isBareLandParcel]);

  const handleScopeChange = useCallback((scope: 'partial' | 'total') => {
    setExpertiseScope(scope);
    if (scope === 'total') {
      setSelectionMode('whole');
      setDrawnArea(null);
      setSelectedBuildingRefs([]);
    } else if (selectionMode === 'whole') {
      setSelectionMode(isBareLandParcel ? 'area' : 'buildings');
    }
  }, [selectionMode, isBareLandParcel]);



  const scopeSummary = useMemo(() => {
    const valLabel = valuationTargets.length === 2
      ? 'valeur marchande et valeur locative'
      : valuationTargets[0] === 'rental'
        ? 'valeur locative'
        : valuationTargets[0] === 'market'
          ? 'valeur marchande'
          : 'aucune valeur sélectionnée';
    if (selectionMode === 'whole') return `Expertise totale — toute la parcelle — ${valLabel}.`;
    if (selectionMode === 'area') {
      return drawnArea && drawnArea.length >= 3
        ? `Expertise partielle — zone tracée sur la parcelle — ${valLabel}.`
        : `Expertise partielle — tracez la zone à expertiser — ${valLabel}.`;
    }
    const labels = selectedBuildingRefs.map(
      (r) => (r === 'new' ? 'Autre / nouvelle construction' : knownBuildings.find((b) => b.ref === r)?.label || r),
    );
    return labels.length > 0
      ? `Expertise partielle — ${labels.join(' + ')} — ${valLabel}.`
      : `Expertise partielle — sélectionnez au moins une construction — ${valLabel}.`;
  }, [selectionMode, drawnArea, selectedBuildingRefs, knownBuildings, valuationTargets]);

  // Devis serveur des frais (jamais calculé côté client)
  const { data: feeQuote } = useExpertiseFeeQuote(expertiseScope, valuationTargets, open);




  // Standing / hauteur issus du cadastre pour le bâtiment sélectionné
  const [cadastreStanding, setCadastreStanding] = useState<string>('');
  const [cadastreHeightM, setCadastreHeightM] = useState<number | null>(null);

  // Helper: apply a known building's data to the form fields
  const applyBuildingPrefill = useCallback((b: KnownBuilding | null) => {
    if (!b) {
      // 'new' selection: clear cadastre-locked fields, let user enter freely
      setPropertyCategory('');
      setConstructionType('');
      setConstructionMaterials('');
      setConstructionNature('');
      setConstructionYear('');
      setNumberOfFloors('');
      setTotalBuiltAreaSqm('');
      setDeclaredUsage('');
      setCadastreStanding('');
      setCadastreHeightM(null);
      return;
    }
    if (b.property_category) setPropertyCategory(b.property_category);
    if (b.type) setConstructionType(b.type);
    if (b.materials) setConstructionMaterials(b.materials);
    if (b.nature) setConstructionNature(b.nature);
    if (b.year) setConstructionYear(b.year.toString());
    if (b.floors) setNumberOfFloors(b.floors);
    if (b.surface_sqm && b.surface_sqm > 0) setTotalBuiltAreaSqm(b.surface_sqm.toString());
    if (b.usage) setDeclaredUsage(b.usage);
    setCadastreStanding(b.standing || '');
    setCadastreHeightM(typeof b.height_m === 'number' ? b.height_m : null);
  }, []);

  // === FICHES PAR CONSTRUCTION ===
  // Chaque construction de la parcelle possède sa propre fiche (caractéristiques,
  // position, équipements, matériaux) et sa propre cascade de dépendances.
  const [buildingFiches, setBuildingFiches] = useState<Record<string, ExpertiseBuildingDetail>>({});
  const buildingFichesRef = useRef<Record<string, ExpertiseBuildingDetail>>({});
  useEffect(() => { buildingFichesRef.current = buildingFiches; }, [buildingFiches]);
  const [activeFicheRef, setActiveFicheRef] = useState<string>('main');

  /** Constructions à décrire, en fonction du périmètre choisi. */
  const buildingsToDescribe = useMemo<{ ref: string; label: string }[]>(() => {
    if (isBareLandParcel) return [];
    if (expertiseScope === 'partial' && selectionMode === 'area') return [];
    if (expertiseScope === 'partial' && selectionMode === 'buildings') {
      return selectedBuildingRefs.map((r) => ({
        ref: r,
        label: r === 'new'
          ? 'Autre / nouvelle construction'
          : knownBuildings.find((b) => b.ref === r)?.label || r,
      }));
    }
    if (knownBuildings.length > 0) return knownBuildings.map((b) => ({ ref: b.ref, label: b.label }));
    return [{ ref: 'new', label: 'Construction' }];
  }, [isBareLandParcel, expertiseScope, selectionMode, selectedBuildingRefs, knownBuildings]);

  const isMultiBuilding = buildingsToDescribe.length > 1;

  // Sauvegarde de la fiche en cours avant tout basculement automatique
  const collectFicheRef = useRef<(() => ExpertiseBuildingDetail) | null>(null);

  // La fiche active reste toujours dans le périmètre courant
  useEffect(() => {
    if (buildingsToDescribe.length === 0) return;
    if (!buildingsToDescribe.some((b) => b.ref === activeFicheRef)) {
      const current = collectFicheRef.current?.();
      if (current) setBuildingFiches((prev) => ({ ...prev, [current.ref]: current }));
      setActiveFicheRef(buildingsToDescribe[0].ref);
    }
  }, [buildingsToDescribe, activeFicheRef]);

  const collectFiche = (): ExpertiseBuildingDetail => ({
    ref: activeFicheRef,
    label: buildingsToDescribe.find((b) => b.ref === activeFicheRef)?.label || 'Construction',
    property_category: propertyCategory,
    construction_type: constructionType,
    construction_nature: constructionNature,
    construction_materials: constructionMaterials,
    declared_usage: declaredUsage,
    standing,
    construction_year: constructionYear,
    number_of_floors: numberOfFloors,
    total_built_area_sqm: totalBuiltAreaSqm,
    property_condition: propertyCondition,
    number_of_rooms: numberOfRooms,
    number_of_bedrooms: numberOfBedrooms,
    number_of_bathrooms: numberOfBathrooms,
    roof_material: roofMaterial,
    window_type: windowType,
    floor_material: floorMaterial,
    has_plaster: hasPlaster,
    has_painting: hasPainting,
    has_ceiling: hasCeiling,
    has_double_glazing: hasDoubleGlazing,
    building_position: buildingPosition,
    facade_orientation: facadeOrientation,
    distance_from_road_m: distanceFromRoad,
    is_corner_plot: isCornerPlot,
    has_direct_street_access: hasDirectStreetAccess,
    floor_number: floorNumber,
    total_building_floors: totalBuildingFloors,
    accessibility,
    apartment_number: apartmentNumber,
    has_common_areas: hasCommonAreas,
    monthly_charges: monthlyCharges,
    has_water_supply: hasWaterSupply,
    has_electricity: hasElectricity,
    has_sewage_system: hasSewageSystem,
    has_internet: hasInternet,
    internet_provider: internetProvider,
    has_security_system: hasSecuritySystem,
    has_parking: hasParking,
    parking_spaces: parkingSpaces,
    has_garden: hasGarden,
    garden_area_sqm: gardenAreaSqm,
    has_pool: hasPool,
    has_air_conditioning: hasAirConditioning,
    has_solar_panels: hasSolarPanels,
    has_water_tank: hasWaterTank,
    has_generator: hasGenerator,
    has_borehole: hasBorehole,
    has_electric_fence: hasElectricFence,
    has_garage: hasGarage,
    has_cellar: hasCellar,
    has_automatic_gate: hasAutomaticGate,
    cadastre_discrepancies: cadastreDiscrepancies,
  });
  collectFicheRef.current = collectFiche;



  const applyFiche = useCallback((f: ExpertiseBuildingDetail) => {
    setPropertyCategory(f.property_category || '');
    setConstructionType(f.construction_type || '');
    setConstructionNature(f.construction_nature || '');
    setConstructionMaterials(f.construction_materials || '');
    setDeclaredUsage(f.declared_usage || '');
    setStanding(f.standing || '');
    setConstructionYear(f.construction_year || '');
    setNumberOfFloors(f.number_of_floors || '1');
    setTotalBuiltAreaSqm(f.total_built_area_sqm || '');
    setPropertyCondition(f.property_condition || 'bon');
    setNumberOfRooms(f.number_of_rooms || '');
    setNumberOfBedrooms(f.number_of_bedrooms || '');
    setNumberOfBathrooms(f.number_of_bathrooms || '');
    setRoofMaterial(f.roof_material || 'tole_bac');
    setWindowType(f.window_type || 'aluminium');
    setFloorMaterial(f.floor_material || 'carrelage');
    setHasPlaster(!!f.has_plaster);
    setHasPainting(!!f.has_painting);
    setHasCeiling(!!f.has_ceiling);
    setHasDoubleGlazing(!!f.has_double_glazing);
    setBuildingPosition(f.building_position || 'premiere_position');
    setFacadeOrientation(f.facade_orientation || '');
    setDistanceFromRoad(f.distance_from_road_m || '');
    setIsCornerPlot(!!f.is_corner_plot);
    setHasDirectStreetAccess(!!f.has_direct_street_access);
    setFloorNumber(f.floor_number || '');
    setTotalBuildingFloors(f.total_building_floors || '');
    setAccessibility(f.accessibility || 'escalier');
    setApartmentNumber(f.apartment_number || '');
    setHasCommonAreas(!!f.has_common_areas);
    setMonthlyCharges(f.monthly_charges || '');
    setHasWaterSupply(!!f.has_water_supply);
    setHasElectricity(!!f.has_electricity);
    setHasSewageSystem(!!f.has_sewage_system);
    setHasInternet(!!f.has_internet);
    setInternetProvider(f.internet_provider || '');
    setHasSecuritySystem(!!f.has_security_system);
    setHasParking(!!f.has_parking);
    setParkingSpaces(f.parking_spaces || '');
    setHasGarden(!!f.has_garden);
    setGardenAreaSqm(f.garden_area_sqm || '');
    setHasPool(!!f.has_pool);
    setHasAirConditioning(!!f.has_air_conditioning);
    setHasSolarPanels(!!f.has_solar_panels);
    setHasWaterTank(!!f.has_water_tank);
    setHasGenerator(!!f.has_generator);
    setHasBorehole(!!f.has_borehole);
    setHasElectricFence(!!f.has_electric_fence);
    setHasGarage(!!f.has_garage);
    setHasCellar(!!f.has_cellar);
    setHasAutomaticGate(!!f.has_automatic_gate);
    setCadastreDiscrepancies(f.cadastre_discrepancies || '');
  }, []);

  /** Bascule d'une fiche à l'autre en conservant la saisie en cours. */
  const handleSelectFiche = (ref: string) => {
    if (ref === activeFicheRef) return;
    const current = collectFiche();
    setBuildingFiches((prev) => ({ ...prev, [current.ref]: current }));
    setActiveFicheRef(ref);
  };

  /** Fiches complètes de toutes les constructions du périmètre. */
  const buildAllBuildingDetails = (): ExpertiseBuildingDetail[] => {
    const current = collectFiche();
    return buildingsToDescribe.map((b) => {
      if (b.ref === current.ref) return current;
      const stored = buildingFiches[b.ref];
      if (stored) return { ...stored, label: b.label };
      const known = knownBuildings.find((k) => k.ref === b.ref);
      return {
        ref: b.ref,
        label: b.label,
        property_category: known?.property_category,
        construction_type: known?.type,
        construction_nature: known?.nature,
        construction_materials: known?.materials,
        declared_usage: known?.usage,
        standing: known?.standing,
        construction_year: known?.year ? String(known.year) : undefined,
        number_of_floors: known?.floors,
        total_built_area_sqm: known?.surface_sqm ? String(known.surface_sqm) : undefined,
      };
    });
  };

  // Chargement de la fiche active : saisie déjà faite, sinon données du cadastre
  useEffect(() => {
    if (!open) return;
    const stored = buildingFichesRef.current[activeFicheRef];
    if (stored) {
      applyFiche(stored);
      return;
    }
    if (activeFicheRef === 'new') {
      applyBuildingPrefill(null);
      return;
    }
    const b = knownBuildings.find((x) => x.ref === activeFicheRef);
    if (b) applyBuildingPrefill(b);
  }, [open, activeFicheRef, knownBuildings, applyBuildingPrefill, applyFiche]);

  // Le standing dépend de la cascade (nature → standings) : on l'applique dès
  // que la liste des standings disponibles contient la valeur cadastrale.
  useEffect(() => {
    if (!cadastreStanding || standing) return;
    if (availableStandings.includes(cadastreStanding)) setStanding(cadastreStanding);
  }, [cadastreStanding, availableStandings, standing]);


  // Set of fields that came from cadastre (locked unless user explicitly overrides)
  const lockedFromCadastre = useMemo<Set<string>>(() => {
    if (activeFicheRef === 'new') return new Set();
    const b = knownBuildings.find((x) => x.ref === activeFicheRef);
    if (!b) return new Set();
    const s = new Set<string>();
    if (b.property_category) s.add('property_category');
    if (b.type) s.add('construction_type');
    if (b.materials) s.add('construction_materials');
    if (b.year) s.add('construction_year');
    if (b.usage) s.add('declared_usage');
    if (b.surface_sqm) s.add('total_built_area');
    if (b.floors) s.add('number_of_floors');
    return s;
  }, [activeFicheRef, knownBuildings]);


  // === CCC CONSTRUCTION CASCADE EFFECTS ===
  // Helper: build reverse mapping material -> nature
  const buildMaterialToNatureMap = useCallback((materialsMap: Record<string, string[]>): Record<string, string> => {
    const reverseMap: Record<string, string> = {};
    for (const [nature, materials] of Object.entries(materialsMap)) {
      for (const mat of materials) {
        if (!reverseMap[mat]) reverseMap[mat] = nature;
      }
    }
    return reverseMap;
  }, []);

  // propertyCategory → constructionType
  useEffect(() => {
    if (!propertyCategory) { setAvailableConstructionTypes([]); setConstructionType(''); return; }
    const allowedTypes = CATEGORY_TO_CONSTRUCTION_TYPES[propertyCategory] || [];
    setAvailableConstructionTypes(allowedTypes);
    if (allowedTypes.length === 1) { if (constructionType !== allowedTypes[0]) setConstructionType(allowedTypes[0]); }
    else if (constructionType && !allowedTypes.includes(constructionType)) setConstructionType('');
  }, [propertyCategory]);

  // constructionType → materials, natures
  useEffect(() => {
    if (!constructionType) {
      setAvailableConstructionNatures([]); setConstructionNature('');
      setAvailableDeclaredUsages([]); setDeclaredUsage('');
      setAvailableConstructionMaterials([]); setConstructionMaterials('');
      setAvailableStandings([]); setStanding('');
      return;
    }
    const natureMap = getDependentOptions('picklist_construction_nature');
    const natures = natureMap[constructionType] || [];
    setAvailableConstructionNatures(natures);
    const dbMaterialsMap = getDependentOptions('picklist_construction_materials');
    const hasMaterialsInDb = Object.keys(dbMaterialsMap).length > 0;
    const allMaterials: string[] = [];
    const seen = new Set<string>();
    for (const nature of natures) {
      if (nature === 'Non bâti') continue;
      const mats = hasMaterialsInDb ? (dbMaterialsMap[nature] || []) : (MATERIALS_BY_NATURE_FALLBACK[nature] || []);
      for (const m of mats) { if (!seen.has(m)) { seen.add(m); allMaterials.push(m); } }
    }
    setAvailableConstructionMaterials(allMaterials);
    if (constructionMaterials && !allMaterials.includes(constructionMaterials)) { setConstructionMaterials(''); setConstructionNature(''); }
    if (constructionNature && !natures.includes(constructionNature)) setConstructionNature('');
  }, [constructionType, getDependentOptions]);

  // constructionMaterials → auto-fill constructionNature
  useEffect(() => {
    if (!constructionMaterials || !constructionType) {
      if (!constructionMaterials) { setConstructionNature(''); setAvailableStandings([]); setStanding(''); }
      return;
    }
    const dbMaterialsMap = getDependentOptions('picklist_construction_materials');
    const hasMaterialsInDb = Object.keys(dbMaterialsMap).length > 0;
    const materialsMap = hasMaterialsInDb ? dbMaterialsMap : MATERIALS_BY_NATURE_FALLBACK;
    const reverseMap = buildMaterialToNatureMap(materialsMap);
    const deducedNature = reverseMap[constructionMaterials];
    if (deducedNature && deducedNature !== constructionNature) setConstructionNature(deducedNature);
  }, [constructionMaterials, constructionType, getDependentOptions, buildMaterialToNatureMap]);

  // constructionType + constructionNature → declaredUsage
  useEffect(() => {
    if (!constructionType || !constructionNature) { setAvailableDeclaredUsages([]); setDeclaredUsage(''); return; }
    const usages = resolveAvailableUsages(constructionType, constructionNature, getDependentOptions);
    setAvailableDeclaredUsages(usages);
    if (declaredUsage && !usages.includes(declaredUsage)) setDeclaredUsage('');
  }, [constructionType, constructionNature, getDependentOptions]);

  // constructionNature → standing
  useEffect(() => {
    if (!constructionNature || constructionNature === 'Non bâti') { setAvailableStandings([]); setStanding(''); return; }
    const dbStandingMap = getDependentOptions('picklist_standing');
    const standings = (Object.keys(dbStandingMap).length > 0 ? dbStandingMap[constructionNature] : STANDING_BY_NATURE_FALLBACK[constructionNature]) || [];
    setAvailableStandings(standings);
    if (standing && !standings.includes(standing)) setStanding('');
  }, [constructionNature, getDependentOptions]);

  // Fetch expertise fees on mount
  useEffect(() => {
    const fetchFees = async () => {
      setLoadingFees(true);
      try {
        const { data, error } = await supabase
          .from('expertise_fees_config')
          .select('*')
          .eq('is_active', true)
          .order('display_order');

        if (error) throw error;
        setFees(data || []);

        // Also fetch certificate access fee
        const accessFee = (data || []).find((f: any) => f.fee_name?.toLowerCase().includes('accès') || f.fee_name?.toLowerCase().includes('certificat'));
        if (accessFee) {
          setCertificateAccessFee(accessFee.amount_usd);
        } else {
          // Default: use 20% of total fees as access price, or fallback to $5
          const total = (data || []).reduce((s: number, f: any) => s + f.amount_usd, 0);
          setCertificateAccessFee(total > 0 ? Math.round(total * 0.2 * 100) / 100 : 5);
        }
      } catch (error) {
        console.error('Error fetching expertise fees:', error);
      } finally {
        setLoadingFees(false);
      }
    };

    if (open) {
      fetchFees();
    }
  }, [open]);

  // Check for existing valid certificate when dialog opens (after intro)
  useEffect(() => {
    if (!open || showIntro || !parcelNumber || certificateChecked) return;

    const checkCertificate = async () => {
      setCheckingCertificate(true);
      try {
        const existing = await checkExistingValidCertificate(parcelNumber);
        setExistingCertificate(existing);
      } catch (e) {
        console.error('Certificate check error:', e);
      } finally {
        setCheckingCertificate(false);
        setCertificateChecked(true);
      }
    };

    checkCertificate();
  }, [open, showIntro, parcelNumber, certificateChecked, checkExistingValidCertificate]);

  // Check whether current user already has paid access to the certificate
  useEffect(() => {
    if (!open || showIntro || !user || !existingCertificate?.id) {
      return;
    }

    let cancelled = false;
    setCheckingCertificateAccess(true);

    const checkAccess = async () => {
      try {
        const { data, error } = await supabase
          .from('expertise_payments')
          .select('id')
          .eq('expertise_request_id', existingCertificate.id)
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .limit(1)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;
        if (cancelled) return;

        const hasAccess = Boolean(data);
        setHasCertificateAccess(hasAccess);
        if (hasAccess) {
          setShowCertificatePayment(false);
        }
      } catch (error) {
        console.error('Certificate access check error:', error);
        if (!cancelled) setHasCertificateAccess(false);
      } finally {
        if (!cancelled) setCheckingCertificateAccess(false);
      }
    };

    checkAccess();
    return () => { cancelled = true; };
  }, [open, showIntro, user?.id, existingCertificate?.id]);

   // Le total provient du devis serveur (RPC). Repli local uniquement si la RPC
   // n'a pas encore répondu.
   const quotedFees = useMemo(
     () =>
       feeQuote?.fee_items?.length
         ? feeQuote.fee_items
         : fees.filter((fee) => fee.is_mandatory).map((fee) => ({
             fee_name: fee.fee_name,
             amount_usd: fee.amount_usd,
             description: fee.description,
             is_mandatory: fee.is_mandatory,
           })),
     [feeQuote, fees],
   );

   const getTotalAmount = () => {
     if (feeQuote) return Math.max(feeQuote.total_amount_usd, 0);
     const total = quotedFees.reduce((sum, fee) => sum + Number(fee.amount_usd || 0), 0);
     return Math.max(total, 0);
   };

   const isPaymentValid = () => {
     return quotedFees.length > 0 && getTotalAmount() > 0;
   };


  // Sound measurement functions removed — now in CCC LocationTab

  // Keep a ref to constructionImageUrls so the cleanup effect always has current values
  const constructionImageUrlsRef = useRef<string[]>([]);
  useEffect(() => { constructionImageUrlsRef.current = constructionImageUrls; }, [constructionImageUrls]);

  // Cleanup Object URLs à la fermeture
  useEffect(() => {
    return () => {
      constructionImageUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  // Helper pour valider les valeurs non-négatives
  const handleNonNegativeChange = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || parseFloat(value) >= 0) {
      setter(value);
    }
  };

  const MAX_PARCEL_DOCS = 10;
  const MAX_CONSTRUCTION_IMAGES = 20;

  const handleParcelDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newFiles = Array.from(files);
    const remaining = MAX_PARCEL_DOCS - parcelDocuments.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_PARCEL_DOCS} documents autorisés`);
      if (parcelDocsInputRef.current) parcelDocsInputRef.current.value = '';
      return;
    }
    const validFiles = newFiles.slice(0, remaining).filter(file => {
      const isValid = file.type === 'application/pdf' || file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024;
      if (!isValid) toast.error(`${file.name}: Format non supporté (PDF ou image)`);
      if (!isValidSize) toast.error(`${file.name}: Fichier trop volumineux (max 10MB)`);
      return isValid && isValidSize;
    });
    
    setParcelDocuments(prev => [...prev, ...validFiles]);
    if (parcelDocsInputRef.current) parcelDocsInputRef.current.value = '';
  };

  const handleConstructionImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newFiles = Array.from(files);
    const remaining = MAX_CONSTRUCTION_IMAGES - constructionImages.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_CONSTRUCTION_IMAGES} photos autorisées`);
      if (constructionImagesInputRef.current) constructionImagesInputRef.current.value = '';
      if (constructionGalleryInputRef.current) constructionGalleryInputRef.current.value = '';
      return;
    }
    const validFiles = newFiles.slice(0, remaining).filter(file => {
      const isValid = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024;
      if (!isValid) toast.error(`${file.name}: Seules les images sont acceptées`);
      if (!isValidSize) toast.error(`${file.name}: Fichier trop volumineux (max 10MB)`);
      return isValid && isValidSize;
    });
    
    const newUrls = validFiles.map(f => URL.createObjectURL(f));
    setConstructionImages(prev => [...prev, ...validFiles]);
    setConstructionImageUrls(prev => [...prev, ...newUrls]);
    if (constructionImagesInputRef.current) constructionImagesInputRef.current.value = '';
    if (constructionGalleryInputRef.current) constructionGalleryInputRef.current.value = '';
  };

  const removeParcelDoc = (index: number) => {
    setParcelDocuments(prev => prev.filter((_, i) => i !== index));
  };

   const removeConstructionImage = (index: number) => {
     // Revoke object URL to prevent memory leak
     if (constructionImageUrls[index]) {
       URL.revokeObjectURL(constructionImageUrls[index]);
     }
     setConstructionImages(prev => prev.filter((_, i) => i !== index));
     setConstructionImageUrls(prev => prev.filter((_, i) => i !== index));
   };

  const uploadFiles = async (): Promise<{ parcelDocs: string[], constructionImages: string[], permitDocUrl: string | null }> => {
    const result = { parcelDocs: [] as string[], constructionImages: [] as string[], permitDocUrl: null as string | null };
    
    setUploadingFiles(true);
    
    try {
      // Upload parcel documents
      for (const file of parcelDocuments) {
        const fileExt = file.name.split('.').pop();
        const fileName = `parcel_doc_${Date.now()}_${crypto.randomUUID()}.${fileExt}`;
        const filePath = `expertise-documents/${user?.id}/parcels/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('cadastral-documents')
          .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
        const signed = await createLongLivedSignedUrl(filePath);
        if (!signed) throw new Error("Lien du document indisponible");
        result.parcelDocs.push(signed);
      }

      // Upload construction images
      for (const file of constructionImages) {
        const fileExt = file.name.split('.').pop();
        const fileName = `construction_${Date.now()}_${crypto.randomUUID()}.${fileExt}`;
        const filePath = `expertise-documents/${user?.id}/constructions/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('cadastral-documents')
          .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
        const signedImg = await createLongLivedSignedUrl(filePath);
        if (!signedImg) throw new Error("Lien de l'image indisponible");
        result.constructionImages.push(signedImg);
      }

      // Upload building permit document
      if (buildingPermitFile) {
        const fileExt = buildingPermitFile.name.split('.').pop();
        const fileName = `permit_${Date.now()}_${crypto.randomUUID()}.${fileExt}`;
        const filePath = `expertise-documents/${user?.id}/permits/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('cadastral-documents')
          .upload(filePath, buildingPermitFile);
        
        if (uploadError) throw uploadError;
        
        result.permitDocUrl = (await createLongLivedSignedUrl(filePath)) ?? undefined;
      }
      
      return result;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Erreur lors du téléchargement des fichiers');
      throw error;
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleProceedToSummary = async () => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    // Check for existing pending request to prevent duplicates
    try {
      const { data: existingPending } = await supabase
        .from('real_estate_expertise_requests')
        .select('id, reference_number')
        .eq('parcel_number', parcelNumber)
        .eq('user_id', user.id)
        .in('status', ['pending', 'assigned', 'in_progress'])
        .limit(1)
        .maybeSingle();

      if (existingPending) {
        toast.error(`Une demande est déjà en cours pour cette parcelle (Réf: ${existingPending.reference_number}). Veuillez attendre son traitement.`);
        return;
      }
    } catch (e) {
      console.error('Duplicate check error:', e);
    }

    setStep('summary');
  };

  const handleProceedToPayment = () => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    if (valuationTargets.length === 0) {
      toast.error('Sélectionnez au moins une valeur à déterminer (marchande ou locative)');
      setActiveTab('general');
      return;
    }

    if (expertiseScope === 'partial') {
      if (selectionMode === 'buildings' && selectedBuildingRefs.length === 0) {
        toast.error('Sélectionnez au moins une construction à expertiser');
        setActiveTab('general');
        return;
      }
      if (selectionMode === 'area' && (!drawnArea || drawnArea.length < 3)) {
        toast.error('Tracez la zone à expertiser sur la parcelle');
        setActiveTab('general');
        return;
      }
    }


    // Fiches par construction : les colonnes plates restent alignées sur la
    // première fiche (compatibilité), pas sur la fiche affichée à l'écran.
    const allBuildingDetails = buildAllBuildingDetails();
    const primary = allBuildingDetails[0];

    setFormData({
      parcel_number: parcelNumber,
      parcel_id: parcelId,
      property_description: propertyDescription || undefined,
      construction_year: primary?.construction_year ? parseInt(primary.construction_year) : undefined,
      construction_quality: primary?.standing || undefined,
      number_of_floors: primary?.number_of_floors ? parseInt(primary.number_of_floors) : undefined,
      total_built_area_sqm: primary?.total_built_area_sqm ? parseFloat(primary.total_built_area_sqm) : undefined,
      property_condition: primary?.property_condition || propertyCondition,
      has_water_supply: hasWaterSupply,
      has_electricity: hasElectricity,
      has_sewage_system: hasSewageSystem,
      has_internet: hasInternet,
      has_security_system: hasSecuritySystem,
      has_parking: hasParking,
      parking_spaces: parkingSpaces ? parseInt(parkingSpaces) : undefined,
      has_garden: hasGarden,
      garden_area_sqm: gardenAreaSqm ? parseFloat(gardenAreaSqm) : undefined,
      road_access_type: roadAccessType,
      distance_to_main_road_m: distanceToMainRoad ? parseFloat(distanceToMainRoad) : undefined,
      distance_to_hospital_km: distanceToHospital ? parseFloat(distanceToHospital) : undefined,
      distance_to_school_km: distanceToSchool ? parseFloat(distanceToSchool) : undefined,
      distance_to_market_km: distanceToMarket ? parseFloat(distanceToMarket) : undefined,
      flood_risk_zone: floodRiskZone,
      erosion_risk_zone: erosionRiskZone,
      additional_notes: additionalNotes || undefined,
      requester_name: profile?.full_name || user.email || 'Utilisateur',
      requester_phone: undefined,
      requester_email: profile?.email || user.email || undefined,
      // Extended columns — stored directly in DB columns
      wall_material: primary?.construction_materials || undefined,
      roof_material: primary?.roof_material || undefined,
      window_type: primary?.window_type || undefined,
      floor_material: primary?.floor_material || undefined,
      has_plaster: !!primary?.has_plaster,
      has_painting: !!primary?.has_painting,
      has_ceiling: !!primary?.has_ceiling,
      has_double_glazing: !!primary?.has_double_glazing,
      building_position: primary?.building_position || undefined,
      facade_orientation: primary?.facade_orientation || undefined,
      is_corner_plot: !!primary?.is_corner_plot,
      // sound_environment removed — now collected in CCC form
      has_pool: hasPool,
      has_air_conditioning: hasAirConditioning,
      has_solar_panels: hasSolarPanels,
      has_generator: hasGenerator,
      has_water_tank: hasWaterTank,
      has_borehole: hasBorehole,
      has_electric_fence: hasElectricFence,
      has_garage: hasGarage,
      has_cellar: hasCellar,
      has_automatic_gate: hasAutomaticGate,
      internet_provider: hasInternet && internetProvider ? internetProvider : undefined,
      number_of_rooms: numberOfRooms ? parseInt(numberOfRooms) : undefined,
      number_of_bedrooms: numberOfBedrooms ? parseInt(numberOfBedrooms) : undefined,
      number_of_bathrooms: numberOfBathrooms ? parseInt(numberOfBathrooms) : undefined,
      apartment_number: apartmentNumber || undefined,
      floor_number: floorNumber || undefined,
      total_building_floors: totalBuildingFloors ? parseInt(totalBuildingFloors) : undefined,
      accessibility: accessibility || undefined,
      monthly_charges: monthlyCharges ? parseFloat(monthlyCharges) : undefined,
      has_common_areas: hasCommonAreas,
      nearby_amenities: nearbyAmenities.length > 0 ? nearbyAmenities.join(', ') : undefined,
      // Building permit
      has_building_permit: hasBuildingPermit === 'yes',
      building_permit_number: hasBuildingPermit === 'yes' && buildingPermitNumber ? buildingPermitNumber : undefined,
      building_permit_type: hasBuildingPermit === 'yes' ? buildingPermitType : undefined,
      building_permit_issue_date: hasBuildingPermit === 'yes' && buildingPermitIssueDate ? buildingPermitIssueDate : undefined,
      building_permit_issuing_service: hasBuildingPermit === 'yes' && buildingPermitIssuingService ? buildingPermitIssuingService : undefined,
      // Périmètre et valeurs demandées
      expertise_scope: expertiseScope,
      valuation_targets: valuationTargets,
      target_building_refs: selectionMode === 'buildings' ? selectedBuildingRefs : [],
      target_area_geojson:
        selectionMode === 'area' && drawnArea && drawnArea.length >= 3
          ? { type: 'Polygon', coordinates: [[...drawnArea, drawnArea[0]].map((v) => [v.lng, v.lat])] }
          : undefined,
      // Fiche détaillée par construction expertisée
      building_details: allBuildingDetails,
      // Targeted building (multi-construction support)
      target_building_ref: selectedBuildingRef,
      target_building_label: selectionMode === 'whole'
        ? 'Toute la parcelle'
        : selectionMode === 'area'
          ? 'Zone tracée sur la parcelle'
          : selectedBuildingRefs
              .map((r) => (r === 'new'
                ? 'Autre / nouvelle construction'
                : knownBuildings.find((b) => b.ref === r)?.label || r))
              .join(' + ') || undefined,
      cadastre_discrepancies: (primary?.cadastre_discrepancies || cadastreDiscrepancies).trim() || undefined,

      // Nomenclature cadastrale saisie (auparavant perdue à l'enregistrement)
      property_category: primary?.property_category || propertyCategory || undefined,
      construction_type: primary?.construction_type || constructionType || undefined,
      construction_nature: primary?.construction_nature || undefined,
      construction_materials_declared: primary?.construction_materials || undefined,
      declared_usage: primary?.declared_usage || undefined,
      has_direct_street_access: hasDirectStreetAccess,
      distance_from_road_m: distanceFromRoad ? parseFloat(distanceFromRoad) : undefined,
      // Indicateurs CCC transmis à l'expert
      building_height_m: cadastreHeightM ?? undefined,
      is_rented: cadastralPrefill?.is_rented ?? undefined,
      monthly_rent_usd: cadastralPrefill?.monthly_rent_usd ?? undefined,
      hosting_capacity: cadastralPrefill?.hosting_capacity ?? undefined,
      occupant_count: cadastralPrefill?.occupant_count ?? undefined,
      parcel_sound_environment: cadastralPrefill?.sound_environment ?? undefined,
    });

    setStep('payment');
  };

  const handlePayment = async () => {
    if (!user || !formData || processingPayment) return;

    if (paymentMethod === 'mobile_money') {
      if (!paymentProvider || !paymentPhone) {
        toast.error('Veuillez sélectionner un opérateur et entrer votre numéro');
        return;
      }
      const phoneRegex = /^(\+?243|0)(8[1-9]|9[0-9])\d{7}$/;
      if (!phoneRegex.test(paymentPhone.replace(/\s/g, ''))) {
        toast.error('Numéro de téléphone invalide. Format attendu: +243XXXXXXXXX ou 0XXXXXXXXX');
        return;
      }
    }

    setProcessingPayment(true);

    try {
      // Upload files first
      const uploadedFiles = await uploadFiles();
      const allDocUrls = [...uploadedFiles.parcelDocs, ...uploadedFiles.constructionImages];

      // Create the expertise request
      const request = await createExpertiseRequest({
        ...formData,
        supporting_documents: allDocUrls,
        building_permit_document_url: uploadedFiles.permitDocUrl || undefined,
      });

      if (!request) {
        throw new Error('Erreur lors de la création de la demande');
      }

      // Frais et montant : issus du calcul serveur enregistré sur la demande
      const serverTotal = Number((request as any).total_amount_usd) || getTotalAmount();
      const feeItems = Array.isArray((request as any).computed_fee_items)
        ? (request as any).computed_fee_items
        : quotedFees.map((fee) => ({ fee_name: fee.fee_name, amount_usd: fee.amount_usd }));


      const { data: paymentRecord, error: paymentError } = await supabase
        .from('expertise_payments')
        .insert({
          expertise_request_id: request.id,
          user_id: user.id,
          fee_items: feeItems,
          total_amount_usd: serverTotal,
          payment_method: paymentMethod,
          payment_provider: paymentMethod === 'mobile_money' ? paymentProvider : 'stripe',
          phone_number: paymentMethod === 'mobile_money' ? paymentPhone : null,
          status: 'pending'
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Process payment
      if (paymentMethod === 'mobile_money') {
        const { processExpertiseMobileMoneyPayment } = await import('@/utils/expertisePaymentHelper');
        await processExpertiseMobileMoneyPayment({
          provider: paymentProvider,
          phone: paymentPhone,
          amountUsd: serverTotal,
          paymentType: 'expertise_fee',
          paymentRecordId: paymentRecord.id,
        });

        // Le statut de paiement est confirmé côté serveur (edge function
        // `process-mobile-money-payment`, service role). Le client ne l'écrit jamais.


      } else if (paymentMethod === 'bank_card') {
        const { processExpertiseStripePayment } = await import('@/utils/expertisePaymentHelper');
        const redirected = await processExpertiseStripePayment({
          paymentRecordId: paymentRecord.id,
          paymentType: 'expertise_fee',
          amountUsd: serverTotal,
        });
        if (redirected) return;
      }

      // Create notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'success',
        title: 'Demande d\'expertise soumise',
        message: `Votre demande d'expertise immobilière pour la parcelle ${parcelNumber} a été enregistrée. Un expert vous contactera prochainement.`,
        action_url: '/user-dashboard'
      });

      setCreatedRequest(request);
      setStep('confirmation');
      toast.success('Paiement réussi ! Votre demande a été enregistrée.');
      onSuccess?.();

    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Erreur lors du paiement');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleCertificateAccessPayment = async () => {
    if (!user || !existingCertificate || processingCertPayment) return;

    if (certPaymentMethod === 'mobile_money') {
      if (!certPaymentProvider || !certPaymentPhone) {
        toast.error('Veuillez sélectionner un opérateur et entrer votre numéro');
        return;
      }
      const phoneRegex = /^(\+?243|0)(8[1-9]|9[0-9])\d{7}$/;
      if (!phoneRegex.test(certPaymentPhone.replace(/\s/g, ''))) {
        toast.error('Numéro de téléphone invalide. Format attendu: +243XXXXXXXXX ou 0XXXXXXXXX');
        return;
      }
    }

    setProcessingCertPayment(true);
    try {
      // Create payment record for certificate access
      const { data: paymentRecord, error: paymentError } = await supabase
        .from('expertise_payments')
        .insert({
          expertise_request_id: existingCertificate.id,
          user_id: user.id,
          fee_items: [{ fee_name: 'Accès au certificat d\'expertise immobilière', amount_usd: certificateAccessFee }],
          total_amount_usd: certificateAccessFee,
          payment_method: certPaymentMethod,
          payment_provider: certPaymentMethod === 'mobile_money' ? certPaymentProvider : 'stripe',
          phone_number: certPaymentMethod === 'mobile_money' ? certPaymentPhone : null,
          status: 'pending'
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      if (certPaymentMethod === 'mobile_money') {
        const { processExpertiseMobileMoneyPayment } = await import('@/utils/expertisePaymentHelper');
        await processExpertiseMobileMoneyPayment({
          provider: certPaymentProvider,
          phone: certPaymentPhone,
          amountUsd: certificateAccessFee,
          paymentType: 'certificate_access',
          paymentRecordId: paymentRecord.id,
        });
      } else {
        const { processExpertiseStripePayment } = await import('@/utils/expertisePaymentHelper');
        const redirected = await processExpertiseStripePayment({
          paymentRecordId: paymentRecord.id,
          paymentType: 'certificate_access',
          amountUsd: certificateAccessFee,
        });
        if (redirected) return;
      }

      setHasCertificateAccess(true);

      // Open the certificate URL
      if (existingCertificate.certificate_url) {
        try {
          await openExpertiseCertificate(existingCertificate.id, existingCertificate.certificate_url);
          toast.success('Paiement réussi ! Vous pouvez accéder au certificat.');
        } catch (e: any) {
          toast.error(e?.message || 'Certificat indisponible');
        }
      } else {
        toast.success('Paiement réussi ! Le certificat sera disponible dès sa publication.');
      }

      handleClose();
    } catch (error: any) {
      console.error('Certificate access payment error:', error);
      toast.error(error.message || 'Erreur lors du paiement');
    } finally {
      setProcessingCertPayment(false);
    }
  };

  const handleClose = () => {
    // Navigation & flow

    // Navigation & flow
    setStep('form');
    setActiveTab('general');
    setShowIntro(true);
    setCreatedRequest(null);
    setFormData(null);

    // General (CCC-aligned)
    setPropertyDescription('');
    setPropertyCategory('');
    setConstructionType('');
    setConstructionMaterials('');
    setConstructionNature('');
    setDeclaredUsage('');
    setStanding('');
    setConstructionYear('');
    setNumberOfFloors('1');
    setTotalBuiltAreaSqm('');
    setPropertyCondition('bon');
    setNumberOfRooms('');
    setNumberOfBedrooms('');
    setNumberOfBathrooms('');

    // Materials (expertise-specific)
    setRoofMaterial('tole_bac');
    setWindowType('aluminium');
    setFloorMaterial('carrelage');
    setHasPlaster(true);
    setHasPainting(true);
    setHasCeiling(true);

    // Position
    setBuildingPosition('premiere_position');
    setFacadeOrientation('');
    setDistanceFromRoad('');
    setIsCornerPlot(false);
    setHasDirectStreetAccess(true);

    // Apartment
    setFloorNumber('');
    setTotalBuildingFloors('');
    setAccessibility('escalier');
    setApartmentNumber('');
    setHasCommonAreas(false);
    setMonthlyCharges('');

    // Sound (removed — now in CCC)
    setHasDoubleGlazing(false);

    // Equipment
    setHasWaterSupply(false);
    setHasElectricity(false);
    setHasSewageSystem(false);
    setHasInternet(false);
    setInternetProvider('');
    setHasSecuritySystem(false);
    setHasParking(false);
    setParkingSpaces('');
    setHasGarden(false);
    setGardenAreaSqm('');
    setHasPool(false);
    setHasAirConditioning(false);
    setHasSolarPanels(false);
    setHasWaterTank(false);
    setHasGenerator(false);
    setHasBorehole(false);
    setHasElectricFence(false);
    setHasGarage(false);
    setHasCellar(false);
    setHasAutomaticGate(false);

    // Environment
    setRoadAccessType('asphalte');
    setDistanceToMainRoad('');
    setDistanceToHospital('');
    setDistanceToSchool('');
    setDistanceToMarket('');
    setFloodRiskZone(false);
    setErosionRiskZone(false);
    setNearbyAmenities([]);

     // Documents - revoke all object URLs before clearing
     setAdditionalNotes('');
     setParcelDocuments([]);
     constructionImageUrls.forEach(url => URL.revokeObjectURL(url));
     setConstructionImages([]);
     setConstructionImageUrls([]);

    // Building permit
    setHasBuildingPermit(null);
    setBuildingPermitType('construction');
    setBuildingPermitNumber('');
    setBuildingPermitIssueDate('');
    setBuildingPermitIssuingService('');
    setBuildingPermitFile(null);

    // Payment
    setPaymentMethod('mobile_money');
    setPaymentProvider('');
    setPaymentPhone('');

    // Certificate
    setExistingCertificate(null);
    setCertificateChecked(false);
    setShowCertificatePayment(false);
    setCertPaymentMethod('mobile_money');
    setCertPaymentProvider('');
    setCertPaymentPhone('');
    setHasCertificateAccess(false);
    setCheckingCertificateAccess(false);
    setCertificateAccessFee(0);

    defaultRefDoneRef.current = false;
    setSelectedBuildingRef('main');
    setCadastreDiscrepancies('');
    setExpertiseScope('total');
    setValuationTargets(['market']);
    setSelectionMode('whole');
    setDrawnArea(null);

    onOpenChange(false);
  };

  const isTerrainNu = propertyCategory === 'Terrain nu';
  /** Y a-t-il au moins une construction à décrire dans le périmètre choisi ? */
  const showBuildingBlocks = buildingsToDescribe.length > 0;
  const isApartmentOrBuilding = propertyCategory === 'Appartement';

  const renderForm = () => (
    <div className="space-y-3">
      {/* Info parcelle */}
      <Card className="bg-primary/5 border-primary/20 rounded-xl shadow-sm">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono font-bold text-sm truncate">{parcelNumber}</p>
              {parcelData?.province && (
                <p className="text-xs text-muted-foreground truncate">
                  {parcelData.province} {parcelData.ville && `• ${parcelData.ville}`}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(tab) => {
        // Skip materiaux tab for terrain_nu
        if (tab === 'materiaux' && isTerrainNu) return;
        setActiveTab(tab);
      }} className="w-full">
        <TabsList className={`grid w-full ${isTerrainNu ? 'grid-cols-3' : 'grid-cols-4'} h-9 rounded-xl sticky top-0 z-10 bg-background/95 backdrop-blur-sm`}>
          <TabsTrigger value="general" className="text-xs rounded-lg">Général</TabsTrigger>
          {!isTerrainNu && <TabsTrigger value="materiaux" className="text-xs rounded-lg">Matériaux</TabsTrigger>}
          <TabsTrigger value="environnement" className="text-xs rounded-lg">Environ.</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs rounded-lg">Documents</TabsTrigger>
        </TabsList>

        <div className="mt-3">
          {/* === ONGLET GÉNÉRAL === */}
          <TabsContent value="general" className="space-y-3 pr-2 mt-0">
            <GeneralTab
              knownBuildings={knownBuildings}
              cadastralPrefill={cadastralPrefill}
              expertiseScope={expertiseScope}
              handleScopeChange={handleScopeChange}
              valuationTargets={valuationTargets}
              setValuationTargets={setValuationTargets}
              isBareLandParcel={isBareLandParcel}
              selectionMode={selectionMode}
              handleSelectionModeChange={handleSelectionModeChange}
              parcelVertices={parcelVertices}
              mapBuildings={mapBuildings}
              selectedBuildingRefs={selectedBuildingRefs}
              drawnArea={drawnArea}
              toggleBuildingRef={toggleBuildingRef}
              setDrawnArea={setDrawnArea}
              scopeSummary={scopeSummary}
              selectedBuildingRef={selectedBuildingRef}
              lockedFromCadastre={lockedFromCadastre}
              cadastreDiscrepancies={cadastreDiscrepancies}
              setCadastreDiscrepancies={setCadastreDiscrepancies}
              showBuildingBlocks={showBuildingBlocks}
              isMultiBuilding={isMultiBuilding}
              buildingsToDescribe={buildingsToDescribe}
              activeFicheRef={activeFicheRef}
              handleSelectFiche={handleSelectFiche}
              propertyCategory={propertyCategory}
              setPropertyCategory={setPropertyCategory}
              PROPERTY_CATEGORY_OPTIONS={PROPERTY_CATEGORY_OPTIONS}
              constructionType={constructionType}
              setConstructionType={setConstructionType}
              availableConstructionTypes={availableConstructionTypes}
              constructionMaterials={constructionMaterials}
              setConstructionMaterials={setConstructionMaterials}
              availableConstructionMaterials={availableConstructionMaterials}
              constructionNature={constructionNature}
              declaredUsage={declaredUsage}
              setDeclaredUsage={setDeclaredUsage}
              availableDeclaredUsages={availableDeclaredUsages}
              standing={standing}
              setStanding={setStanding}
              availableStandings={availableStandings}
              isTerrainNu={isTerrainNu}
              hasBuildingPermit={hasBuildingPermit}
              setHasBuildingPermit={setHasBuildingPermit}
              buildingPermitType={buildingPermitType}
              setBuildingPermitType={setBuildingPermitType}
              buildingPermitNumber={buildingPermitNumber}
              setBuildingPermitNumber={setBuildingPermitNumber}
              buildingPermitIssueDate={buildingPermitIssueDate}
              setBuildingPermitIssueDate={setBuildingPermitIssueDate}
              constructionYear={constructionYear}
              setConstructionYear={setConstructionYear}
              buildingPermitIssuingService={buildingPermitIssuingService}
              setBuildingPermitIssuingService={setBuildingPermitIssuingService}
              buildingPermitFile={buildingPermitFile}
              setBuildingPermitFile={setBuildingPermitFile}
              permitFileInputRef={permitFileInputRef}
              propertyDescription={propertyDescription}
              setPropertyDescription={setPropertyDescription}
              numberOfFloors={numberOfFloors}
              setNumberOfFloors={setNumberOfFloors}
              handleNonNegativeChange={handleNonNegativeChange}
              totalBuiltAreaSqm={totalBuiltAreaSqm}
              setTotalBuiltAreaSqm={setTotalBuiltAreaSqm}
              numberOfRooms={numberOfRooms}
              setNumberOfRooms={setNumberOfRooms}
              numberOfBedrooms={numberOfBedrooms}
              setNumberOfBedrooms={setNumberOfBedrooms}
              numberOfBathrooms={numberOfBathrooms}
              setNumberOfBathrooms={setNumberOfBathrooms}
              propertyCondition={propertyCondition}
              setPropertyCondition={setPropertyCondition}
              isApartmentOrBuilding={isApartmentOrBuilding}
              floorNumber={floorNumber}
              setFloorNumber={setFloorNumber}
              totalBuildingFloors={totalBuildingFloors}
              setTotalBuildingFloors={setTotalBuildingFloors}
              accessibility={accessibility}
              setAccessibility={setAccessibility}
              apartmentNumber={apartmentNumber}
              setApartmentNumber={setApartmentNumber}
              monthlyCharges={monthlyCharges}
              setMonthlyCharges={setMonthlyCharges}
              hasCommonAreas={hasCommonAreas}
              setHasCommonAreas={setHasCommonAreas}
              buildingPosition={buildingPosition}
              setBuildingPosition={setBuildingPosition}
              facadeOrientation={facadeOrientation}
              setFacadeOrientation={setFacadeOrientation}
              distanceFromRoad={distanceFromRoad}
              setDistanceFromRoad={setDistanceFromRoad}
              isCornerPlot={isCornerPlot}
              setIsCornerPlot={setIsCornerPlot}
              hasDirectStreetAccess={hasDirectStreetAccess}
              setHasDirectStreetAccess={setHasDirectStreetAccess}
              hasWaterSupply={hasWaterSupply}
              setHasWaterSupply={setHasWaterSupply}
              hasElectricity={hasElectricity}
              setHasElectricity={setHasElectricity}
              hasSewageSystem={hasSewageSystem}
              setHasSewageSystem={setHasSewageSystem}
              hasInternet={hasInternet}
              setHasInternet={setHasInternet}
              internetProvider={internetProvider}
              setInternetProvider={setInternetProvider}
              hasSecuritySystem={hasSecuritySystem}
              setHasSecuritySystem={setHasSecuritySystem}
              hasGarden={hasGarden}
              setHasGarden={setHasGarden}
              hasPool={hasPool}
              setHasPool={setHasPool}
              hasAirConditioning={hasAirConditioning}
              setHasAirConditioning={setHasAirConditioning}
              hasSolarPanels={hasSolarPanels}
              setHasSolarPanels={setHasSolarPanels}
              hasGenerator={hasGenerator}
              setHasGenerator={setHasGenerator}
              hasWaterTank={hasWaterTank}
              setHasWaterTank={setHasWaterTank}
              hasBorehole={hasBorehole}
              setHasBorehole={setHasBorehole}
              hasElectricFence={hasElectricFence}
              setHasElectricFence={setHasElectricFence}
              hasGarage={hasGarage}
              setHasGarage={setHasGarage}
              hasCellar={hasCellar}
              setHasCellar={setHasCellar}
              hasAutomaticGate={hasAutomaticGate}
              setHasAutomaticGate={setHasAutomaticGate}
              hasParking={hasParking}
              setHasParking={setHasParking}
              parkingSpaces={parkingSpaces}
              setParkingSpaces={setParkingSpaces}
              gardenAreaSqm={gardenAreaSqm}
              setGardenAreaSqm={setGardenAreaSqm}
            />
          </TabsContent>

          {/* === ONGLET MATÉRIAUX === */}
          <TabsContent value="materiaux" className="space-y-3 pr-2 mt-0">
            <BuildingTab
              showBuildingBlocks={showBuildingBlocks}
              isMultiBuilding={isMultiBuilding}
              buildingsToDescribe={buildingsToDescribe}
              activeFicheRef={activeFicheRef}
              onSelectFiche={handleSelectFiche}
              roofMaterial={roofMaterial}
              setRoofMaterial={setRoofMaterial}
              windowType={windowType}
              setWindowType={setWindowType}
              floorMaterial={floorMaterial}
              setFloorMaterial={setFloorMaterial}
              hasPlaster={hasPlaster}
              setHasPlaster={setHasPlaster}
              hasPainting={hasPainting}
              setHasPainting={setHasPainting}
              hasCeiling={hasCeiling}
              setHasCeiling={setHasCeiling}
              hasDoubleGlazing={hasDoubleGlazing}
              setHasDoubleGlazing={setHasDoubleGlazing}
            />
          </TabsContent>

          {/* === ONGLET ENVIRONNEMENT === */}
          <TabsContent value="environnement" className="space-y-3 pr-2 mt-0">
            <EnvironmentTab
              roadAccessType={roadAccessType}
              setRoadAccessType={setRoadAccessType}
              distanceToMainRoad={distanceToMainRoad}
              distanceToHospital={distanceToHospital}
              distanceToSchool={distanceToSchool}
              distanceToMarket={distanceToMarket}
              onNonNegativeChange={handleNonNegativeChange}
              setDistanceToMainRoad={setDistanceToMainRoad}
              setDistanceToHospital={setDistanceToHospital}
              setDistanceToSchool={setDistanceToSchool}
              setDistanceToMarket={setDistanceToMarket}
              nearbyAmenities={nearbyAmenities}
              setNearbyAmenities={setNearbyAmenities}
              floodRiskZone={floodRiskZone}
              setFloodRiskZone={setFloodRiskZone}
              erosionRiskZone={erosionRiskZone}
              setErosionRiskZone={setErosionRiskZone}
            />
          </TabsContent>

          {/* === ONGLET DOCUMENTS === */}
          <TabsContent value="documents" className="space-y-3 pr-2 mt-0">
            <DocumentsTab
              parcelDocsInputRef={parcelDocsInputRef}
              constructionImagesInputRef={constructionImagesInputRef}
              constructionGalleryInputRef={constructionGalleryInputRef}
              parcelDocuments={parcelDocuments}
              onParcelDocSelect={handleParcelDocSelect}
              onRemoveParcelDoc={removeParcelDoc}
              constructionImages={constructionImages}
              constructionImageUrls={constructionImageUrls}
              onConstructionImageSelect={handleConstructionImageSelect}
              onRemoveConstructionImage={removeConstructionImage}
              additionalNotes={additionalNotes}
              setAdditionalNotes={setAdditionalNotes}
            />
          </TabsContent>
        </div>
      </Tabs>

      <div className="flex gap-3 mt-3">
        {(() => {
          const tabOrder = isTerrainNu
            ? ['general', 'environnement', 'documents']
            : ['general', 'materiaux', 'environnement', 'documents'];
          const currentIndex = tabOrder.indexOf(activeTab);
          const isFirst = currentIndex === 0;
          const isLast = currentIndex === tabOrder.length - 1;

          return (
            <>
              {!isFirst && (
                <Button 
                  variant="outline"
                  onClick={() => setActiveTab(tabOrder[currentIndex - 1])}
                  className="flex-1 h-11 text-sm font-semibold rounded-xl"
                >
                  ← Précédent
                </Button>
              )}
              {isLast ? (
                <Button 
                  onClick={handleProceedToSummary} 
                  className="flex-1 h-11 text-sm font-semibold rounded-xl shadow-lg"
                  disabled={loading || uploadingFiles || loadingFees}
                >
                  {loadingFees ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Chargement...
                    </>
                  ) : (
                    <>
                      <Receipt className="h-4 w-4 mr-2" />
                      Récapitulatif
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={() => setActiveTab(tabOrder[currentIndex + 1])}
                  className="flex-1 h-11 text-sm font-semibold rounded-xl shadow-lg"
                >
                  Suivant →
                </Button>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );


  const renderSummary = () => {
    // Use imported centralized labels (no local duplicates)
    const POSITION_LABELS = BUILDING_POSITION_LABELS;

    // Validation des champs obligatoires et importants
    const getMissingFields = () => {
      const missing: Array<{ label: string; tab: string; required: boolean }> = [];
      const fiches = buildAllBuildingDetails();
      const multi = fiches.length > 1;

      if (fiches.length === 0) {
        // Terrain nu / zone tracée : aucune fiche de construction à compléter
        if (!propertyCategory) missing.push({ label: 'Catégorie de bien', tab: 'general', required: true });
      } else {
        fiches.forEach((f) => {
          const p = multi ? `${f.label} — ` : '';
          const bare = f.property_category === 'Terrain nu';
          if (!f.property_category) missing.push({ label: `${p}Catégorie de bien`, tab: 'general', required: true });
          if (!f.construction_type) missing.push({ label: `${p}Type de construction`, tab: 'general', required: true });
          if (!bare) {
            if (!f.construction_year) missing.push({ label: `${p}Année de construction`, tab: 'general', required: true });
            if (!f.total_built_area_sqm) missing.push({ label: `${p}Surface construite`, tab: 'general', required: true });
            if (!f.number_of_rooms) missing.push({ label: `${p}Nombre de pièces`, tab: 'general', required: false });
          }
        });
      }

      if (!roadAccessType) missing.push({ label: 'Type d\'accès routier', tab: 'environnement', required: true });
      if (constructionImages.length === 0 && !isTerrainNu && fiches.length > 0) {
        missing.push({ label: 'Photos de la construction', tab: 'documents', required: false });
      }

      return missing;
    };

    const missingFields = getMissingFields();
    const requiredMissing = missingFields.filter(f => f.required);
    const recommendedMissing = missingFields.filter(f => !f.required);

    // Comptage dynamique de la complétion
    const computeCompletion = () => {
      const baseFields = [propertyCategory, constructionType, roadAccessType];
      const builtFields = isTerrainNu ? [] : [
        constructionYear, standing, numberOfFloors, totalBuiltAreaSqm,
        propertyCondition, numberOfRooms, numberOfBedrooms, numberOfBathrooms,
        constructionMaterials, roofMaterial, windowType, floorMaterial, buildingPosition,
      ];
      // Equipment booleans: any defined response (true or false) counts as filled
      const equipCount = 7; // water, electricity, sewage, internet, security, parking, garden
      const filledEquip = equipCount; // All are always answered (initialized with defaults)
      const docScore = (parcelDocuments.length > 0 ? 1 : 0) + (constructionImages.length > 0 && !isTerrainNu ? 1 : 0);
      const filledBase = baseFields.filter(Boolean).length;
      const filledBuilt = builtFields.filter(Boolean).length;
      const totalPossible = baseFields.length + builtFields.length + equipCount + (isTerrainNu ? 1 : 2);
      return Math.round(((filledBase + filledBuilt + filledEquip + docScore) / totalPossible) * 100);
    };
    const completionPercentage = computeCompletion();

    // Liste des équipements sélectionnés (incluant les nouveaux)
    const selectedEquipments = [
      hasWaterSupply && 'Eau courante',
      hasElectricity && 'Électricité',
      hasSewageSystem && 'Assainissement',
      hasInternet && `Internet${internetProvider ? ` (${internetProvider === 'vsat' ? 'V-Sat' : internetProvider.charAt(0).toUpperCase() + internetProvider.slice(1)})` : ''}`,
      hasSecuritySystem && 'Système de sécurité',
      hasParking && `Parking${parkingSpaces ? ` (${parkingSpaces} places)` : ''}`,
      hasGarden && `Jardin${gardenAreaSqm ? ` (${gardenAreaSqm} m²)` : ''}`,
      hasPool && 'Piscine',
      hasAirConditioning && 'Climatisation',
      hasSolarPanels && 'Panneaux solaires',
      hasWaterTank && 'Citerne d\'eau',
      hasGenerator && 'Groupe électrogène',
      hasBorehole && 'Forage',
      hasElectricFence && 'Clôture électrique',
      hasGarage && 'Garage',
      hasCellar && 'Cave',
      hasAutomaticGate && 'Portail automatique'
    ].filter(Boolean) as string[];

    // Finitions sélectionnées
    const selectedFinishes = [
      hasPlaster && 'Crépissage',
      hasPainting && 'Peinture',
      hasCeiling && 'Plafond',
      hasDoubleGlazing && 'Double vitrage'
    ].filter(Boolean) as string[];

    // Risques
    const selectedRisks = [
      floodRiskZone && 'Zone inondable',
      erosionRiskZone && 'Zone d\'érosion'
    ].filter(Boolean) as string[];

    // Use centralized labels (no local duplicate)

    return (
      <div className="space-y-2">
        {/* En-tête compact */}
        <div className="space-y-2 pb-2">
          <div className="bg-gradient-to-br from-primary/15 to-primary/5 rounded-xl p-2.5 border border-primary/20">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center shrink-0">
                <Receipt className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm leading-tight">Récapitulatif</h3>
                <p className="text-[10px] text-muted-foreground truncate">Vérifiez avant de continuer</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-base font-bold text-primary">{completionPercentage}%</div>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-1 mt-1.5">
              <div 
                className={`h-1 rounded-full transition-all duration-500 ${
                  completionPercentage >= 80 ? 'bg-green-500' : completionPercentage >= 50 ? 'bg-amber-500' : 'bg-primary'
                }`}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Avertissement - compact on mobile */}
          <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 rounded-lg py-2 px-3">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            <AlertDescription className="text-[11px] text-amber-700 dark:text-amber-300">
              Vérifiez les informations. Une fois soumise, la demande ne pourra plus être modifiée.
            </AlertDescription>
          </Alert>

          {/* Erreurs de validation obligatoires */}
          {requiredMissing.length > 0 && (
            <Alert className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 rounded-xl">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-xs text-red-700 dark:text-red-300">
                <p className="font-medium mb-1.5">Données obligatoires manquantes ({requiredMissing.length}) :</p>
                <ul className="space-y-1">
                  {requiredMissing.map((field, index) => (
                    <li key={index} className="flex items-center justify-between py-1 border-b border-red-200/50 last:border-0">
                      <span>• {field.label}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setActiveTab(field.tab); setStep('form'); }}
                        className="h-6 px-2 text-xs text-red-600 border-red-300 hover:bg-red-100"
                      >
                        Compléter
                      </Button>
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Recommandations */}
          {recommendedMissing.length > 0 && requiredMissing.length === 0 && (
            <Alert className="bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 rounded-xl">
              <Info className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-xs text-orange-700 dark:text-orange-300">
                <p className="font-medium mb-1.5">Recommandé pour une expertise plus précise ({recommendedMissing.length}) :</p>
                <ul className="space-y-1">
                  {recommendedMissing.slice(0, 3).map((field, index) => (
                    <li key={index} className="flex items-center justify-between py-1 border-b border-orange-200/50 last:border-0">
                      <span>• {field.label}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setActiveTab(field.tab); setStep('form'); }}
                        className="h-6 px-2 text-xs text-orange-600 border-orange-300 hover:bg-orange-100"
                      >
                        Ajouter
                      </Button>
                    </li>
                  ))}
                  {recommendedMissing.length > 3 && (
                    <li className="text-xs text-muted-foreground pt-1">
                      Et {recommendedMissing.length - 3} autre(s)...
                    </li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Contenu */}
          <div className="space-y-2 pb-4">
            {/* Section Parcelle */}
            <Card className="rounded-xl border-border/50 shadow-sm">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <h4 className="text-xs font-semibold">Parcelle</h4>
                  </div>
                </div>
                <div className="divide-y divide-border/30">
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Numéro de parcelle</span>
                    <span className="font-mono font-bold text-primary">{parcelNumber}</span>
                  </div>
                  {parcelData?.province && (
                    <div className="flex justify-between text-xs py-1.5">
                      <span className="text-muted-foreground">Province</span>
                      <span className="font-medium">{parcelData.province}</span>
                    </div>
                  )}
                  {parcelData?.ville && (
                    <div className="flex justify-between text-xs py-1.5">
                      <span className="text-muted-foreground">Ville</span>
                      <span className="font-medium">{parcelData.ville}</span>
                    </div>
                  )}
                  {parcelData?.commune && (
                    <div className="flex justify-between text-xs py-1.5">
                      <span className="text-muted-foreground">Commune</span>
                      <span className="font-medium">{parcelData.commune}</span>
                    </div>
                  )}
                  {parcelData?.quartier && (
                    <div className="flex justify-between text-xs py-1.5">
                      <span className="text-muted-foreground">Quartier</span>
                      <span className="font-medium">{parcelData.quartier}</span>
                    </div>
                  )}
                  {parcelData?.area_sqm && (
                    <div className="flex justify-between text-xs py-1.5">
                      <span className="text-muted-foreground">Superficie parcelle</span>
                      <span className="font-medium">{parcelData.area_sqm.toLocaleString()} m²</span>
                    </div>
                  )}
                  {parcelData?.current_owner_name && (
                    <div className="flex justify-between text-xs py-1.5">
                      <span className="text-muted-foreground">Propriétaire</span>
                      <span className="font-medium">{parcelData.current_owner_name}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Section Construction - hidden for terrain_nu */}
            {!isTerrainNu && (
            <Card className="rounded-xl border-border/50 shadow-sm">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-green-600" />
                    <h4 className="text-xs font-semibold">Construction</h4>
                    <Badge variant="outline" className="text-[10px] h-5">
                      {(() => {
                        const fiches = buildAllBuildingDetails();
                        const per = 6;
                        const filled = fiches.reduce((n, f) => n + [f.property_category, f.construction_type, f.construction_materials, f.construction_nature, f.standing, f.construction_year].filter(Boolean).length, 0);
                        return `${filled}/${Math.max(per, fiches.length * per)}`;
                      })()}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setActiveTab('general'); setStep('form'); }} className="h-6 px-2 text-xs text-muted-foreground hover:text-primary">
                    Modifier
                  </Button>
                </div>
                <div className="divide-y divide-border/30">
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Catégorie</span>
                    <span className="font-medium">{propertyCategory || <span className="text-orange-600">Non renseigné</span>}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Type de construction</span>
                    <span className="font-medium">{constructionType || <span className="text-muted-foreground">—</span>}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Matériaux</span>
                    <span className="font-medium">{constructionMaterials || <span className="text-muted-foreground">—</span>}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Nature</span>
                    <span className="font-medium">{constructionNature ? `Construction ${constructionNature.toLowerCase()}` : <span className="text-muted-foreground">—</span>}</span>
                  </div>
                  {declaredUsage && (
                    <div className="flex justify-between text-xs py-1.5">
                      <span className="text-muted-foreground">Usage</span>
                      <span className="font-medium">{declaredUsage}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Standing</span>
                    <span className="font-medium">{standing || <span className="text-muted-foreground">—</span>}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Année de construction</span>
                    <span className="font-medium">{constructionYear || <span className="text-muted-foreground">—</span>}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Surface construite</span>
                    <span className="font-medium">{totalBuiltAreaSqm ? `${totalBuiltAreaSqm} m²` : <span className="text-muted-foreground">—</span>}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Nombre d'étages</span>
                    <span className="font-medium">{numberOfFloors || <span className="text-muted-foreground">—</span>}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">État général</span>
                    <span className="font-medium">{CONDITION_LABELS[propertyCondition] || propertyCondition}</span>
                  </div>
                  {propertyDescription && (
                    <div className="flex justify-between text-xs py-1.5">
                      <span className="text-muted-foreground">Description</span>
                      <span className="font-medium text-right max-w-[60%] truncate">{propertyDescription}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            )}

            {/* Section Autorisation de bâtir - summary */}
            {!isTerrainNu && propertyCategory !== 'Appartement' && hasBuildingPermit !== null && (
              <Card className="rounded-xl border-border/50 shadow-sm">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-primary" />
                      <h4 className="text-xs font-semibold">Autorisation de bâtir</h4>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setActiveTab('general'); setStep('form'); }} className="h-6 px-2 text-xs text-muted-foreground hover:text-primary">
                      Modifier
                    </Button>
                  </div>
                  <div className="divide-y divide-border/30">
                    <div className="flex justify-between text-xs py-1.5">
                      <span className="text-muted-foreground">Possède une autorisation</span>
                      <Badge variant={hasBuildingPermit === 'yes' ? "default" : "secondary"} className="text-[10px]">
                        {hasBuildingPermit === 'yes' ? 'Oui' : 'Non'}
                      </Badge>
                    </div>
                    {hasBuildingPermit === 'yes' && (
                      <>
                        <div className="flex justify-between text-xs py-1.5">
                          <span className="text-muted-foreground">Type</span>
                          <span className="font-medium">{buildingPermitType === 'construction' ? 'Bâtir' : 'Régularisation'}</span>
                        </div>
                        {buildingPermitNumber && (
                          <div className="flex justify-between text-xs py-1.5">
                            <span className="text-muted-foreground">N° autorisation</span>
                            <span className="font-medium font-mono">{buildingPermitNumber}</span>
                          </div>
                        )}
                        {buildingPermitIssueDate && (
                          <div className="flex justify-between text-xs py-1.5">
                            <span className="text-muted-foreground">Date de délivrance</span>
                            <span className="font-medium">{new Date(buildingPermitIssueDate).toLocaleDateString('fr-FR')}</span>
                          </div>
                        )}
                        {buildingPermitIssuingService && (
                          <div className="flex justify-between text-xs py-1.5">
                            <span className="text-muted-foreground">Service émetteur</span>
                            <span className="font-medium text-right max-w-[55%] truncate">{buildingPermitIssuingService}</span>
                          </div>
                        )}
                        {buildingPermitFile && (
                          <div className="flex justify-between text-xs py-1.5">
                            <span className="text-muted-foreground">Document</span>
                            <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">
                              <FileText className="h-3 w-3 mr-1" />
                              {buildingPermitFile.name}
                            </Badge>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Section Pièces - hidden for terrain_nu */}
            {!isTerrainNu && (
            <Card className="rounded-xl border-border/50 shadow-sm">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-purple-600" />
                    <h4 className="text-xs font-semibold">Composition</h4>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setActiveTab('general'); setStep('form'); }} className="h-6 px-2 text-xs text-muted-foreground hover:text-primary">
                    Modifier
                  </Button>
                </div>
                <div className="divide-y divide-border/30">
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Nombre de pièces</span>
                    <span className="font-medium">{numberOfRooms || <span className="text-muted-foreground">—</span>}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Chambres</span>
                    <span className="font-medium">{numberOfBedrooms || <span className="text-muted-foreground">—</span>}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Salles de bain</span>
                    <span className="font-medium">{numberOfBathrooms || <span className="text-muted-foreground">—</span>}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            )}

            {/* Section Matériaux - hidden for terrain_nu */}
            {!isTerrainNu && (
            <Card className="rounded-xl border-border/50 shadow-sm">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-amber-600" />
                    <h4 className="text-xs font-semibold">Matériaux de construction</h4>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setActiveTab('materiaux'); setStep('form'); }} className="h-6 px-2 text-xs text-muted-foreground hover:text-primary">
                    Modifier
                  </Button>
                </div>
                <div className="divide-y divide-border/30">
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Toiture</span>
                    <span className="font-medium">{ROOF_LABELS[roofMaterial] || roofMaterial}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Revêtement de sol</span>
                    <span className="font-medium">{FLOOR_LABELS[floorMaterial] || floorMaterial}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Type de fenêtres</span>
                    <span className="font-medium">{WINDOW_LABELS[windowType] || windowType}</span>
                  </div>
                </div>
                {selectedFinishes.length > 0 && (
                  <div className="pt-1.5">
                    <span className="text-xs text-muted-foreground">Finitions :</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedFinishes.map((finish, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[10px]">{finish}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            )}

            {/* Section Emplacement */}
            <Card className="rounded-xl border-border/50 shadow-sm">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-cyan-600" />
                    <h4 className="text-xs font-semibold">Emplacement & Position</h4>
                  </div>
                   <Button variant="ghost" size="sm" onClick={() => { setActiveTab('general'); setStep('form'); }} className="h-6 px-2 text-xs text-muted-foreground hover:text-primary">
                    Modifier
                  </Button>
                </div>
                <div className="divide-y divide-border/30">
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Position du bâtiment</span>
                    <span className="font-medium text-right max-w-[55%]">{POSITION_LABELS[buildingPosition] || buildingPosition}</span>
                  </div>
                  {facadeOrientation && (
                    <div className="flex justify-between text-xs py-1.5">
                      <span className="text-muted-foreground">Orientation façade</span>
                      <span className="font-medium">{FACADE_ORIENTATION_LABELS[facadeOrientation] || facadeOrientation}</span>
                    </div>
                  )}
                  {distanceFromRoad && (
                    <div className="flex justify-between text-xs py-1.5">
                      <span className="text-muted-foreground">Distance route</span>
                      <span className="font-medium">{distanceFromRoad} m</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Parcelle en coin</span>
                    <Badge variant={isCornerPlot ? "default" : "secondary"} className="text-[10px]">
                      {isCornerPlot ? 'Oui' : 'Non'}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Accès direct rue</span>
                    <Badge variant={hasDirectStreetAccess ? "default" : "secondary"} className="text-[10px]">
                      {hasDirectStreetAccess ? 'Oui' : 'Non'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section Appartement (si applicable) */}
            {isApartmentOrBuilding && (
              <Card className="rounded-xl border-border/50 shadow-sm">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-indigo-600" />
                      <h4 className="text-xs font-semibold">Détails Appartement / Immeuble</h4>
                    </div>
                     <Button variant="ghost" size="sm" onClick={() => { setActiveTab('general'); setStep('form'); }} className="h-6 px-2 text-xs text-muted-foreground hover:text-primary">
                      Modifier
                    </Button>
                  </div>
                  <div className="divide-y divide-border/30">
                    {apartmentNumber && (
                      <div className="flex justify-between text-xs py-1.5">
                        <span className="text-muted-foreground">N° Appartement</span>
                        <span className="font-medium">{apartmentNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs py-1.5">
                      <span className="text-muted-foreground">Étage</span>
                      <span className="font-medium">{floorNumber || <span className="text-muted-foreground">—</span>}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1.5">
                      <span className="text-muted-foreground">Total étages immeuble</span>
                      <span className="font-medium">{totalBuildingFloors || <span className="text-muted-foreground">—</span>}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1.5">
                      <span className="text-muted-foreground">Accessibilité</span>
                      <span className="font-medium">{ACCESSIBILITY_LABELS[accessibility] || accessibility}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1.5">
                      <span className="text-muted-foreground">Parties communes</span>
                      <Badge variant={hasCommonAreas ? "default" : "secondary"} className="text-[10px]">
                        {hasCommonAreas ? 'Oui' : 'Non'}
                      </Badge>
                    </div>
                    {monthlyCharges && (
                      <div className="flex justify-between text-xs py-1.5">
                        <span className="text-muted-foreground">Charges mensuelles</span>
                        <span className="font-medium text-primary">{monthlyCharges} USD</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Section Équipements */}
            <Card className="rounded-xl border-border/50 shadow-sm">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-600" />
                    <h4 className="text-xs font-semibold">Équipements</h4>
                    <Badge variant="outline" className="text-[10px] h-5">
                      {selectedEquipments.length} sélectionné(s)
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setActiveTab('general'); setStep('form'); }} className="h-6 px-2 text-xs text-muted-foreground hover:text-primary">
                    Modifier
                  </Button>
                </div>
                {selectedEquipments.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEquipments.map((equip, idx) => (
                      <Badge key={idx} variant="secondary" className="text-[10px]">{equip}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Aucun équipement renseigné</p>
                )}
              </CardContent>
            </Card>

            {/* Section Environnement */}
            <Card className="rounded-xl border-border/50 shadow-sm">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trees className="h-4 w-4 text-green-600" />
                    <h4 className="text-xs font-semibold">Environnement & Accessibilité</h4>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setActiveTab('environnement'); setStep('form'); }} className="h-6 px-2 text-xs text-muted-foreground hover:text-primary">
                    Modifier
                  </Button>
                </div>
                <div className="divide-y divide-border/30">
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Type de route</span>
                    <span className="font-medium">{ROAD_LABELS[roadAccessType] || roadAccessType}</span>
                  </div>
                  {/* Sound environment removed — now in CCC */}
                  {distanceToMainRoad && (
                    <div className="flex justify-between text-xs py-1.5">
                      <span className="text-muted-foreground">Distance route principale</span>
                      <span className="font-medium">{distanceToMainRoad} m</span>
                    </div>
                  )}
                  {distanceToHospital && (
                    <div className="flex justify-between text-xs py-1.5">
                      <span className="text-muted-foreground">Distance hôpital</span>
                      <span className="font-medium">{distanceToHospital} km</span>
                    </div>
                  )}
                  {distanceToSchool && (
                    <div className="flex justify-between text-xs py-1.5">
                      <span className="text-muted-foreground">Distance école</span>
                      <span className="font-medium">{distanceToSchool} km</span>
                    </div>
                  )}
                  {distanceToMarket && (
                    <div className="flex justify-between text-xs py-1.5">
                      <span className="text-muted-foreground">Distance marché</span>
                      <span className="font-medium">{distanceToMarket} km</span>
                    </div>
                  )}
                  {nearbyAmenities.length > 0 && (
                    <div className="py-1.5">
                      <span className="text-muted-foreground text-xs">Commodités</span>
                      <div className="flex flex-wrap gap-1 mt-1 justify-end">
                        {nearbyAmenities.map((item, idx) => (
                          <Badge key={idx} variant="secondary" className="text-[10px]">{item}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Section Risques */}
            {selectedRisks.length > 0 && (
              <Card className="rounded-xl border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/20 shadow-sm">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400">Zones à risque</h4>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRisks.map((risk, idx) => (
                      <Badge key={idx} variant="outline" className="text-[10px] text-amber-700 border-amber-300">{risk}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Section Documents */}
            <Card className="rounded-xl border-border/50 shadow-sm">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <h4 className="text-xs font-semibold">Documents</h4>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setActiveTab('documents'); setStep('form'); }} className="h-6 px-2 text-xs text-muted-foreground hover:text-primary">
                    Modifier
                  </Button>
                </div>
                <div className="divide-y divide-border/30">
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Documents parcelle</span>
                    {parcelDocuments.length > 0 ? (
                      <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">
                        <FileText className="h-3 w-3 mr-1" />
                        {parcelDocuments.length} fichier(s)
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">Aucun</span>
                    )}
                  </div>
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Photos construction</span>
                    {constructionImages.length > 0 ? (
                      <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">
                        <Camera className="h-3 w-3 mr-1" />
                        {constructionImages.length} photo(s)
                      </Badge>
                    ) : (
                      <span className="text-orange-600 text-xs">⚠️ Recommandé</span>
                    )}
                  </div>
                  {hasBuildingPermit === 'yes' && buildingPermitFile && (
                    <div className="flex justify-between text-xs py-1.5">
                      <span className="text-muted-foreground">Document permis</span>
                      <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">
                        <FileCheck className="h-3 w-3 mr-1" />
                        {buildingPermitFile.name}
                      </Badge>
                    </div>
                  )}
                </div>
                {additionalNotes && (
                  <div className="pt-1.5 border-t border-border/30">
                    <span className="text-xs text-muted-foreground">Notes additionnelles :</span>
                    <p className="text-xs mt-1 bg-muted/30 p-2 rounded-lg">{additionalNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        {/* Pied */}
        <div className="pt-2 space-y-2 border-t border-border/50 mt-1">
          {/* Montant total */}
          <div className="flex items-center justify-between px-2 py-1.5 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">Frais d'expertise</span>
            </div>
            <span className="text-base font-bold text-primary">{getTotalAmount()} USD</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setStep('form')}
              className="flex-1 h-10 rounded-xl text-sm"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Modifier
            </Button>
            <Button
              onClick={handleProceedToPayment}
              disabled={requiredMissing.length > 0 || loadingFees || !isPaymentValid()}
              className="flex-1 h-10 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 shadow-md text-sm"
            >
              <DollarSign className="h-4 w-4 mr-1" />
              Payer
            </Button>
          </div>

          {requiredMissing.length === 0 && (
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-green-600 pb-0.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="font-medium">Prêt pour le paiement</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPayment = () => (
    <PaymentTab
      parcelNumber={parcelNumber}
      quotedFees={quotedFees}
      getTotalAmount={getTotalAmount}
      paymentMethod={paymentMethod}
      setPaymentMethod={setPaymentMethod}
      paymentProvider={paymentProvider}
      setPaymentProvider={setPaymentProvider}
      paymentPhone={paymentPhone}
      setPaymentPhone={setPaymentPhone}
      processingPayment={processingPayment}
      isPaymentValid={isPaymentValid}
      handlePayment={handlePayment}
      onBack={() => setStep('summary')}
    />
  );

  const renderConfirmation = () => (
    <ConfirmationTab
      parcelNumber={parcelNumber}
      createdRequest={createdRequest}
      onClose={handleClose}
    />
  );

  // Reset showIntro when dialog opens
  useEffect(() => {
    if (open) {
      setShowIntro(true);
    }
  }, [open]);

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  if (showIntro && open) {
    return (
      <FormIntroDialog
        open={open}
        onOpenChange={onOpenChange}
        onContinue={handleIntroComplete}
        config={FORM_INTRO_CONFIGS.expertise}
      />
    );
  }

  const renderExistingCertificateBlock = () => {
    if (checkingCertificate) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Vérification en cours...</span>
        </div>
      );
    }

    if (!certificateChecked) return null;

    if (existingCertificate) {
      const validity = checkCertificateValidity(existingCertificate.certificate_issue_date, existingCertificate.certificate_expiry_date);
      const issueDate = existingCertificate.certificate_issue_date
        ? new Date(existingCertificate.certificate_issue_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'N/A';

      if (!showCertificatePayment) {
        return (
          <div className="space-y-4">
            <Alert className="rounded-xl border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <AlertDescription className="text-sm space-y-2">
                <p className="font-semibold text-green-800 dark:text-green-300">
                  Certificat d'expertise immobilière valide
                </p>
                <p className="text-green-700 dark:text-green-400">
                  Un certificat d'expertise immobilière est en cours de validité pour cette parcelle, 
                  délivré le <strong>{issueDate}</strong>.
                </p>
                <p className="text-xs text-green-600 dark:text-green-500">
                  Référence : <span className="font-mono">{existingCertificate.reference_number}</span> 
                  — Expire dans {validity.daysRemaining} jour{validity.daysRemaining > 1 ? 's' : ''}
                </p>
              </AlertDescription>
            </Alert>

            {existingCertificate.market_value_usd && (
              <Card className="rounded-xl border-primary/20">
                <CardContent className="p-3 flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Valeur vénale estimée</p>
                    <p className="font-bold text-lg">${existingCertificate.market_value_usd.toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {checkingCertificateAccess ? (
              <div className="flex items-center justify-center py-3 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Vérification de vos droits d'accès...
              </div>
            ) : hasCertificateAccess ? (
              <>
                <Button
                  variant="seloger"
                  onClick={async () => {
                    if (existingCertificate.certificate_url) {
                      try {
                        await openExpertiseCertificate(existingCertificate.id, existingCertificate.certificate_url);
                        toast.success('Certificat ouvert avec succès.');
                      } catch (e: any) {
                        toast.error(e?.message || 'Certificat indisponible');
                      }
                    } else {
                      toast.info('Le certificat sera disponible dès sa publication.');
                    }
                  }}
                  className="w-full h-11 rounded-2xl text-sm font-semibold"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Ouvrir le certificat
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  Accès déjà autorisé pour votre compte.
                </p>
              </>
            ) : (
              <>
                <Button
                  variant="seloger"
                  onClick={() => setShowCertificatePayment(true)}
                  className="w-full h-11 rounded-2xl text-sm font-semibold"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Accéder au certificat — ${certificateAccessFee}
                </Button>

                <p className="text-[11px] text-muted-foreground text-center">
                  Un paiement est requis pour consulter le certificat complet.
                </p>
              </>
            )}
          </div>
        );
      }

      // Certificate access payment form
      return (
        <div className="space-y-3">
          <Button variant="ghost" size="sm" onClick={() => setShowCertificatePayment(false)} className="h-8 gap-1 text-xs rounded-xl">
            <ArrowLeft className="h-3.5 w-3.5" /> Retour
          </Button>

          <Card className="rounded-xl border-primary/20">
            <CardContent className="p-3 space-y-1">
              <p className="text-sm font-semibold">Accès au certificat d'expertise immobilière</p>
              <p className="text-xs text-muted-foreground">Parcelle {parcelNumber}</p>
              <Separator className="my-2" />
              <div className="flex justify-between text-sm">
                <span>Accès au certificat</span>
                <span className="font-bold">${certificateAccessFee}</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Mode de paiement</Label>
            <RadioGroup value={certPaymentMethod} onValueChange={(v) => setCertPaymentMethod(v as any)} className="flex gap-3">
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="mobile_money" id="cert-mm" />
                <Label htmlFor="cert-mm" className="text-xs cursor-pointer flex items-center gap-1">
                  <Smartphone className="h-3.5 w-3.5" /> Mobile Money
                </Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="bank_card" id="cert-bc" />
                <Label htmlFor="cert-bc" className="text-xs cursor-pointer flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5" /> Carte bancaire
                </Label>
              </div>
            </RadioGroup>
          </div>

          {certPaymentMethod === 'mobile_money' && (
            <div className="space-y-2">
              <Select value={certPaymentProvider} onValueChange={setCertPaymentProvider}>
                <SelectTrigger className="h-9 rounded-xl text-sm"><SelectValue placeholder="Opérateur" /></SelectTrigger>
                 <SelectContent>
                  <SelectItem value="airtel_money">Airtel Money</SelectItem>
                  <SelectItem value="orange_money">Orange Money</SelectItem>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                </SelectContent>
              </Select>
              <Input value={certPaymentPhone} onChange={(e) => setCertPaymentPhone(e.target.value)} placeholder="+243 ..." className="h-9 rounded-xl text-sm" />
            </div>
          )}

          {certPaymentMethod === 'bank_card' && (
            <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-2xl border">
              <CreditCard className="h-4 w-4 text-primary flex-shrink-0" />
              <p className="text-xs text-muted-foreground">Redirection vers Stripe pour un paiement sécurisé.</p>
            </div>
          )}

          <Button
            variant="seloger"
            onClick={handleCertificateAccessPayment}
            disabled={processingCertPayment || (certPaymentMethod === 'mobile_money' && (!certPaymentProvider || !certPaymentPhone))}
            className="w-full h-10 rounded-2xl text-sm font-semibold"
          >
            {processingCertPayment ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Traitement...</>
            ) : (
              <><CheckCircle2 className="h-4 w-4 mr-1.5" /> Payer ${certificateAccessFee}</>
            )}
          </Button>
        </div>
      );
    }

    // No valid certificate exists
    return null;
  };

  // Insert a "no certificate" info block at top of the form
  const renderNoCertificateInfo = () => {
    if (!certificateChecked || existingCertificate || checkingCertificate) return null;
    return (
      <Alert className="rounded-xl border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
        <Info className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-xs text-amber-800 dark:text-amber-300">
          Il n'existe pas de certificat d'expertise immobilière valide pour cette parcelle. 
          Veuillez renseigner ce formulaire pour en demander un.
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) { handleClose(); } else { onOpenChange(true); } }}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-[95vw] sm:max-w-[420px] max-h-[90vh] p-4 rounded-2xl">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-primary" />
            {existingCertificate && step === 'form' ? 'Certificat existant' : (
              <>
                {step === 'form' && 'Expertise immobilière'}
                {step === 'summary' && 'Récapitulatif'}
                {step === 'payment' && 'Paiement'}
                {step === 'confirmation' && 'Confirmation'}
              </>
            )}
          </DialogTitle>
          {step === 'form' && !existingCertificate && (
            <DialogDescription className="text-xs">
              Renseignez les détails pour obtenir un certificat de valeur vénale
            </DialogDescription>
          )}
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-120px)]" ref={scrollAreaRef}>
          {step === 'form' && existingCertificate ? renderExistingCertificateBlock() : (
            <>
              {step === 'form' && (
                <div className="space-y-3">
                  {renderNoCertificateInfo()}
                  {checkingCertificate ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : renderForm()}
                </div>
              )}
              {step === 'summary' && renderSummary()}
              {step === 'payment' && renderPayment()}
              {step === 'confirmation' && renderConfirmation()}
            </>
          )}
        </ScrollArea>
      </DialogContent>
      {open && <WhatsAppFloatingButton message="Bonjour, j'ai besoin d'aide avec la demande d'expertise immobilière." />}
    </Dialog>
  );
};

export default RealEstateExpertiseRequestDialog;
