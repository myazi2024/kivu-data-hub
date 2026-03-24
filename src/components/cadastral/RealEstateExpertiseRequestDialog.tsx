import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Volume2, Layers, Building2, Camera, Info, Mic, MicOff, Fence, Warehouse, DoorOpen
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRealEstateExpertise } from '@/hooks/useRealEstateExpertise';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import FormIntroDialog, { FORM_INTRO_CONFIGS } from './FormIntroDialog';
import SuggestivePicklist from './SuggestivePicklist';
import SectionHelpPopover from './SectionHelpPopover';

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
  };
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

import type { ExpertiseFee } from '@/types/expertise';
import {
  CONSTRUCTION_TYPE_LABELS, QUALITY_LABELS, CONDITION_LABELS,
  ROAD_LABELS, WALL_LABELS, ROOF_LABELS, SOUND_LABELS,
  WINDOW_LABELS, FLOOR_LABELS, FACADE_ORIENTATION_LABELS,
  BUILDING_POSITION_LABELS, ACCESSIBILITY_LABELS
} from '@/constants/expertiseLabels';

// Derive select options from centralized labels
const toOptions = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

const CONSTRUCTION_TYPE_OPTIONS = toOptions(CONSTRUCTION_TYPE_LABELS);
const CONSTRUCTION_QUALITY_OPTIONS = toOptions(QUALITY_LABELS);
const PROPERTY_CONDITION_OPTIONS = toOptions(CONDITION_LABELS);
const ROAD_ACCESS_OPTIONS = toOptions(ROAD_LABELS);
const WALL_MATERIAL_OPTIONS = toOptions(WALL_LABELS);
const WINDOW_TYPE_OPTIONS = toOptions(WINDOW_LABELS);
const FLOOR_MATERIAL_OPTIONS = toOptions(FLOOR_LABELS);
const ROOF_MATERIAL_OPTIONS = toOptions(ROOF_LABELS);

const SOUND_ENVIRONMENT_OPTIONS = [
  { value: 'tres_calme', label: SOUND_LABELS.tres_calme + ' (< 40 dB)', minDb: 0, maxDb: 40 },
  { value: 'calme', label: SOUND_LABELS.calme + ' (40-55 dB)', minDb: 40, maxDb: 55 },
  { value: 'modere', label: SOUND_LABELS.modere + ' (55-70 dB)', minDb: 55, maxDb: 70 },
  { value: 'bruyant', label: SOUND_LABELS.bruyant + ' (70-85 dB)', minDb: 70, maxDb: 85 },
  { value: 'tres_bruyant', label: SOUND_LABELS.tres_bruyant + ' (> 85 dB)', minDb: 85, maxDb: 200 },
];

const FACADE_ORIENTATION_OPTIONS = toOptions(FACADE_ORIENTATION_LABELS);

const BUILDING_POSITION_OPTIONS = toOptions(BUILDING_POSITION_LABELS);

const ACCESSIBILITY_OPTIONS = toOptions(ACCESSIBILITY_LABELS);

// Générer les options d'année (1950 à année actuelle)
const YEAR_OPTIONS = Array.from(
  { length: new Date().getFullYear() - 1950 + 1 },
  (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: year.toString(), label: year.toString() };
  }
);

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

  // === GÉNÉRAL ===
  const [propertyDescription, setPropertyDescription] = useState('');
  const [constructionType, setConstructionType] = useState('villa');
  const [constructionYear, setConstructionYear] = useState('');
  const [constructionQuality, setConstructionQuality] = useState('standard');
  const [numberOfFloors, setNumberOfFloors] = useState('1');
  const [totalBuiltAreaSqm, setTotalBuiltAreaSqm] = useState('');
  const [propertyCondition, setPropertyCondition] = useState('bon');
  const [numberOfRooms, setNumberOfRooms] = useState('');
  const [numberOfBedrooms, setNumberOfBedrooms] = useState('');
  const [numberOfBathrooms, setNumberOfBathrooms] = useState('');

  // === MATÉRIAUX DE CONSTRUCTION ===
  const [wallMaterial, setWallMaterial] = useState('parpaings');
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

  // === ENVIRONNEMENT SONORE ===
  const [soundEnvironment, setSoundEnvironment] = useState('calme');
  const [nearbyNoiseSources, setNearbyNoiseSources] = useState<string[]>([]);
  const [hasDoubleGlazing, setHasDoubleGlazing] = useState(false);
  const [isOnSite, setIsOnSite] = useState<boolean | null>(null);
  const [isRecordingSound, setIsRecordingSound] = useState(false);
  const [measuredDecibels, setMeasuredDecibels] = useState<number | null>(null);
  const [microphoneError, setMicrophoneError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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

  // === NOTES & DOCUMENTS ===
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [parcelDocuments, setParcelDocuments] = useState<File[]>([]);
   const [constructionImages, setConstructionImages] = useState<File[]>([]);
   const [constructionImageUrls, setConstructionImageUrls] = useState<string[]>([]);
   const [uploadingFiles, setUploadingFiles] = useState(false);

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

   const getTotalAmount = () => {
     const total = fees.filter(fee => fee.is_mandatory).reduce((sum, fee) => sum + fee.amount_usd, 0);
     return Math.max(total, 0);
   };

   const isPaymentValid = () => {
     return fees.length > 0 && getTotalAmount() > 0;
   };

  // Fonctions pour la mesure du bruit avec microphone
  const getSoundLevelFromDecibels = useCallback((db: number): string => {
    const match = SOUND_ENVIRONMENT_OPTIONS.find(opt => db >= opt.minDb && db < opt.maxDb);
    return match?.value || 'modere';
  }, []);

  const startSoundMeasurement = async () => {
    try {
      setMicrophoneError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      setIsRecordingSound(true);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const measureSound = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        // Conversion approximative en dB (valeur normalisée 0-255 vers 0-100 dB)
        const estimatedDb = Math.round((average / 255) * 100);
        setMeasuredDecibels(estimatedDb);
        
        // Auto-déterminer le niveau sonore
        const detectedLevel = getSoundLevelFromDecibels(estimatedDb);
        setSoundEnvironment(detectedLevel);
        
        animationFrameRef.current = requestAnimationFrame(measureSound);
      };
      
      measureSound();
    } catch (error: any) {
      console.error('Microphone error:', error);
      setMicrophoneError('Impossible d\'accéder au microphone. Vérifiez les autorisations.');
      setIsOnSite(false);
    }
  };

  const stopSoundMeasurement = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsRecordingSound(false);
  };

  // Keep a ref to constructionImageUrls so the cleanup effect always has current values
  const constructionImageUrlsRef = useRef<string[]>([]);
  useEffect(() => { constructionImageUrlsRef.current = constructionImageUrls; }, [constructionImageUrls]);

  // Cleanup du microphone et Object URLs à la fermeture
  useEffect(() => {
    return () => {
      stopSoundMeasurement();
      // Revoke any outstanding Object URLs to prevent memory leaks
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

  const uploadFiles = async (): Promise<{ parcelDocs: string[], constructionImages: string[] }> => {
    const result = { parcelDocs: [] as string[], constructionImages: [] as string[] };
    
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
        
        const { data } = supabase.storage.from('cadastral-documents').getPublicUrl(filePath);
        result.parcelDocs.push(data.publicUrl);
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
        
        const { data } = supabase.storage.from('cadastral-documents').getPublicUrl(filePath);
        result.constructionImages.push(data.publicUrl);
      }
      
      return result;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Erreur lors du téléchargement des fichiers');
      throw error; // Propagate to block submission
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

    // Store form data for later submission (extended fields stored in additional_notes as JSON)
    const extendedData = {
      construction_type: constructionType,
      number_of_rooms: numberOfRooms ? parseInt(numberOfRooms) : undefined,
      number_of_bedrooms: numberOfBedrooms ? parseInt(numberOfBedrooms) : undefined,
      number_of_bathrooms: numberOfBathrooms ? parseInt(numberOfBathrooms) : undefined,
      wall_material: wallMaterial,
      roof_material: roofMaterial,
      window_type: windowType,
      floor_material: floorMaterial,
      has_plaster: hasPlaster,
      has_painting: hasPainting,
      has_ceiling: hasCeiling,
      building_position: buildingPosition,
      facade_orientation: facadeOrientation || undefined,
      distance_from_road: distanceFromRoad ? parseFloat(distanceFromRoad) : undefined,
      is_corner_plot: isCornerPlot,
      has_direct_street_access: hasDirectStreetAccess,
      floor_number: floorNumber ? parseInt(floorNumber) : undefined,
      total_building_floors: totalBuildingFloors ? parseInt(totalBuildingFloors) : undefined,
      accessibility: accessibility,
      apartment_number: apartmentNumber || undefined,
      has_common_areas: hasCommonAreas,
      monthly_charges: monthlyCharges ? parseFloat(monthlyCharges) : undefined,
      sound_environment: soundEnvironment,
      nearby_noise_sources: nearbyNoiseSources.length > 0 ? nearbyNoiseSources.join(', ') : undefined,
      has_double_glazing: hasDoubleGlazing,
      internet_provider: hasInternet && internetProvider ? internetProvider : undefined,
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
      nearby_amenities: nearbyAmenities.length > 0 ? nearbyAmenities.join(', ') : undefined,
    };

    setFormData({
      parcel_number: parcelNumber,
      parcel_id: parcelId,
      property_description: propertyDescription || undefined,
      construction_year: constructionYear ? parseInt(constructionYear) : undefined,
      construction_quality: constructionQuality,
      number_of_floors: numberOfFloors ? parseInt(numberOfFloors) : undefined,
      total_built_area_sqm: totalBuiltAreaSqm ? parseFloat(totalBuiltAreaSqm) : undefined,
      property_condition: propertyCondition,
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
      additional_notes: JSON.stringify({ 
        user_notes: additionalNotes,
        extended_data: extendedData 
      }),
      requester_name: profile?.full_name || user.email || 'Utilisateur',
      requester_phone: undefined,
      requester_email: profile?.email || user.email || undefined,
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
      });

      if (!request) {
        throw new Error('Erreur lors de la création de la demande');
      }

      const mandatoryFees = fees.filter(fee => fee.is_mandatory);
      const feeItems = mandatoryFees.map(fee => ({
        fee_id: fee.id,
        fee_name: fee.fee_name,
        amount_usd: fee.amount_usd
      }));

      const { data: paymentRecord, error: paymentError } = await supabase
        .from('expertise_payments')
        .insert({
          expertise_request_id: request.id,
          user_id: user.id,
          fee_items: feeItems,
          total_amount_usd: getTotalAmount(),
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
          amountUsd: getTotalAmount(),
          paymentType: 'expertise_fee',
          paymentRecordId: paymentRecord.id,
        });

        await supabase
          .from('real_estate_expertise_requests')
          .update({ payment_status: 'paid' })
          .eq('id', request.id);

      } else if (paymentMethod === 'bank_card') {
        const { processExpertiseStripePayment } = await import('@/utils/expertisePaymentHelper');
        const redirected = await processExpertiseStripePayment({
          paymentRecordId: paymentRecord.id,
          paymentType: 'expertise_fee',
          amountUsd: getTotalAmount(),
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
        window.open(existingCertificate.certificate_url, '_blank', 'noopener,noreferrer');
        toast.success('Paiement réussi ! Vous pouvez accéder au certificat.');
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
    // Stop any active sound measurement
    stopSoundMeasurement();

    // Navigation & flow
    setStep('form');
    setActiveTab('general');
    setShowIntro(true);
    setCreatedRequest(null);
    setFormData(null);

    // General
    setPropertyDescription('');
    setConstructionType('villa');
    setConstructionYear('');
    setConstructionQuality('standard');
    setNumberOfFloors('1');
    setTotalBuiltAreaSqm('');
    setPropertyCondition('bon');
    setNumberOfRooms('');
    setNumberOfBedrooms('');
    setNumberOfBathrooms('');

    // Materials
    setWallMaterial('parpaings');
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

    // Sound
    setSoundEnvironment('calme');
    setNearbyNoiseSources([]);
    setHasDoubleGlazing(false);
    setIsOnSite(null);
    setMeasuredDecibels(null);
    setMicrophoneError(null);

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

    onOpenChange(false);
  };

  const isApartmentOrBuilding = constructionType === 'appartement' || constructionType === 'immeuble' || constructionType === 'duplex' || constructionType === 'studio';
  const isTerrainNuLocal = constructionType === 'terrain_nu';

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
        if (tab === 'materiaux' && isTerrainNuLocal) return;
        setActiveTab(tab);
      }} className="w-full">
        <TabsList className={`grid w-full ${isTerrainNuLocal ? 'grid-cols-3' : 'grid-cols-4'} h-9 rounded-xl sticky top-0 z-10 bg-background/95 backdrop-blur-sm`}>
          <TabsTrigger value="general" className="text-xs rounded-lg">Général</TabsTrigger>
          {!isTerrainNuLocal && <TabsTrigger value="materiaux" className="text-xs rounded-lg">Matériaux</TabsTrigger>}
          <TabsTrigger value="environnement" className="text-xs rounded-lg">Environ.</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs rounded-lg">Documents</TabsTrigger>
        </TabsList>

        <div className="mt-3">
          {/* === ONGLET GÉNÉRAL === */}
          <TabsContent value="general" className="space-y-3 pr-2 mt-0">
            {/* Notification importance des données exactes */}
            <Alert className="border-amber-500/30 bg-amber-500/10 rounded-xl">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
                <strong>Important :</strong> Les informations que vous fournissez serviront de base à l'expert pour définir les facteurs clés de l'évaluation et organiser la visite terrain de votre construction. Veillez à leur exactitude.
              </AlertDescription>
            </Alert>
            
            {/* Type de construction */}
            <Card className="border rounded-xl">
              <CardContent className="p-3 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  Type de bien
                  <SectionHelpPopover
                    title="Type de bien"
                    description="Sélectionnez la catégorie qui correspond le mieux à votre construction. Ce choix orientera l'expert dans son évaluation et déterminera les critères d'analyse."
                  />
                </h4>
                
                <div className="space-y-1.5">
                  <Label className="text-xs">Type de construction</Label>
                  <Select value={constructionType} onValueChange={setConstructionType}>
                    <SelectTrigger className="h-10 text-sm rounded-xl border-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[1200]">
                      {CONSTRUCTION_TYPE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Description du bien</Label>
                  <Textarea
                    value={propertyDescription}
                    onChange={(e) => setPropertyDescription(e.target.value)}
                    placeholder="Décrivez brièvement le bien..."
                    className="min-h-[60px] text-sm rounded-xl border-2"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Infos construction - hidden for terrain nu */}
            {!isTerrainNuLocal && <Card className="border rounded-xl">
              <CardContent className="p-3 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  Caractéristiques
                  <SectionHelpPopover
                    title="Caractéristiques"
                    description="Renseignez les données techniques de votre bien : année de construction, surface, nombre de pièces et état général. Ces informations sont essentielles pour estimer la valeur vénale."
                  />
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Année construction</Label>
                    <Select value={constructionYear} onValueChange={setConstructionYear}>
                      <SelectTrigger className="h-9 text-sm rounded-xl border-2">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent className="z-[1200] max-h-[200px]">
                        {YEAR_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nombre d'étages</Label>
                    <Input
                      type="number"
                      min="0"
                      value={numberOfFloors}
                      onChange={handleNonNegativeChange(setNumberOfFloors)}
                      placeholder="1"
                      className="h-9 text-sm rounded-xl border-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Surface bâtie (m²)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={totalBuiltAreaSqm}
                      onChange={handleNonNegativeChange(setTotalBuiltAreaSqm)}
                      placeholder="Ex: 150"
                      className="h-9 text-sm rounded-xl border-2"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Qualité</Label>
                    <Select value={constructionQuality} onValueChange={setConstructionQuality}>
                      <SelectTrigger className="h-9 text-sm rounded-xl border-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[1200]">
                        {CONSTRUCTION_QUALITY_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Pièces</Label>
                    <Input
                      type="number"
                      min="0"
                      value={numberOfRooms}
                      onChange={handleNonNegativeChange(setNumberOfRooms)}
                      placeholder="5"
                      className="h-9 text-sm rounded-xl border-2"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Chambres</Label>
                    <Input
                      type="number"
                      min="0"
                      value={numberOfBedrooms}
                      onChange={handleNonNegativeChange(setNumberOfBedrooms)}
                      placeholder="3"
                      className="h-9 text-sm rounded-xl border-2"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">SDB</Label>
                    <Input
                      type="number"
                      min="0"
                      value={numberOfBathrooms}
                      onChange={handleNonNegativeChange(setNumberOfBathrooms)}
                      placeholder="2"
                      className="h-9 text-sm rounded-xl border-2"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">État du bien</Label>
                  <Select value={propertyCondition} onValueChange={setPropertyCondition}>
                    <SelectTrigger className="h-9 text-sm rounded-xl border-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[1200]">
                      {PROPERTY_CONDITION_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>}

            {/* Appartement / Immeuble - conditionnel */}
            {isApartmentOrBuilding && (
              <Card className="border rounded-xl border-blue-200 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-950/20">
                <CardContent className="p-3 space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    Détails appartement/immeuble
                    <SectionHelpPopover
                      title="Détails appartement/immeuble"
                      description="Précisez l'étage, l'accessibilité et les charges mensuelles. Ces informations spécifiques aux copropriétés influencent directement la valeur estimée du bien."
                    />
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">N° d'étage</Label>
                      <Input
                        type="number"
                        value={floorNumber}
                        onChange={(e) => setFloorNumber(e.target.value)}
                        placeholder="Ex: 2"
                        className="h-9 text-sm rounded-xl border-2"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Étages total</Label>
                      <Input
                        type="number"
                        value={totalBuildingFloors}
                        onChange={(e) => setTotalBuildingFloors(e.target.value)}
                        placeholder="Ex: 5"
                        className="h-9 text-sm rounded-xl border-2"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Accessibilité</Label>
                    <Select value={accessibility} onValueChange={setAccessibility}>
                      <SelectTrigger className="h-9 text-sm rounded-xl border-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[1200]">
                        {ACCESSIBILITY_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">N° appartement</Label>
                      <Input
                        value={apartmentNumber}
                        onChange={(e) => setApartmentNumber(e.target.value)}
                        placeholder="Ex: A12"
                        className="h-9 text-sm rounded-xl border-2"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Charges/mois ($)</Label>
                      <Input
                        type="number"
                        value={monthlyCharges}
                        onChange={(e) => setMonthlyCharges(e.target.value)}
                        placeholder="50"
                        className="h-9 text-sm rounded-xl border-2"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasCommonAreas} onCheckedChange={(c) => setHasCommonAreas(c === true)} />
                    <span className="text-sm">Parties communes (hall, parking commun...)</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Emplacement */}
            <Card className="border rounded-xl">
              <CardContent className="p-3 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  Position sur la parcelle
                  <SectionHelpPopover
                    title="Position sur la parcelle"
                    description="Indiquez l'emplacement de la construction sur la parcelle, l'orientation de la façade et la distance par rapport à la route. La position influence la valeur (première position = meilleure accessibilité)."
                  />
                </h4>

                <div className="space-y-1.5">
                  <Label className="text-xs">Emplacement construction</Label>
                  <Select value={buildingPosition} onValueChange={setBuildingPosition}>
                    <SelectTrigger className="h-9 text-sm rounded-xl border-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[1200]">
                      {BUILDING_POSITION_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Orientation façade</Label>
                    <Select value={facadeOrientation} onValueChange={setFacadeOrientation}>
                      <SelectTrigger className="h-9 text-sm rounded-xl border-2">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent className="z-[1200]">
                        {FACADE_ORIENTATION_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Distance route (m)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={distanceFromRoad}
                      onChange={handleNonNegativeChange(setDistanceFromRoad)}
                      placeholder="Ex: 5"
                      className="h-9 text-sm rounded-xl border-2"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={isCornerPlot} onCheckedChange={(c) => setIsCornerPlot(c === true)} />
                    <span className="text-sm">Parcelle d'angle</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={hasDirectStreetAccess} onCheckedChange={(c) => setHasDirectStreetAccess(c === true)} />
                    <span className="text-sm">Accès direct rue</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Équipements */}
            <Card className="border rounded-xl">
              <CardContent className="p-3 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  Équipements & commodités
                  <SectionHelpPopover
                    title="Équipements & commodités"
                    description="Cochez tous les équipements présents dans votre propriété. Plus votre bien est équipé, plus sa valeur estimée sera élevée. Incluez les installations récentes."
                  />
                </h4>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasWaterSupply} onCheckedChange={(c) => setHasWaterSupply(c === true)} />
                    <div className="flex items-center gap-1.5 text-sm">
                      <Droplets className="h-3.5 w-3.5 text-blue-500" />
                      Eau courante
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasElectricity} onCheckedChange={(c) => setHasElectricity(c === true)} />
                    <div className="flex items-center gap-1.5 text-sm">
                      <Zap className="h-3.5 w-3.5 text-yellow-500" />
                      Électricité
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasSewageSystem} onCheckedChange={(c) => setHasSewageSystem(c === true)} />
                    <div className="flex items-center gap-1.5 text-sm">
                      <Droplets className="h-3.5 w-3.5 text-gray-500" />
                      Assainissement
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                      <Checkbox checked={hasInternet} onCheckedChange={(c) => {
                        setHasInternet(c === true);
                        if (c !== true) setInternetProvider('');
                      }} />
                      <div className="flex items-center gap-1.5 text-sm">
                        <Wifi className="h-3.5 w-3.5 text-green-500" />
                        Internet
                      </div>
                    </div>
                    {hasInternet && (
                      <div className="ml-8">
                        <Select value={internetProvider} onValueChange={setInternetProvider}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Fournisseur d'accès internet" />
                          </SelectTrigger>
                          <SelectContent className="z-[1200]">
                            <SelectItem value="canalbox">Canalbox</SelectItem>
                            <SelectItem value="starlink">Starlink</SelectItem>
                            <SelectItem value="vodacom">Vodacom</SelectItem>
                            <SelectItem value="airtel">Airtel</SelectItem>
                            <SelectItem value="orange">Orange</SelectItem>
                            <SelectItem value="vsat">V-Sat</SelectItem>
                            <SelectItem value="microcom">Microcom</SelectItem>
                            <SelectItem value="autre">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasSecuritySystem} onCheckedChange={(c) => setHasSecuritySystem(c === true)} />
                    <div className="flex items-center gap-1.5 text-sm">
                      <Shield className="h-3.5 w-3.5 text-red-500" />
                      Sécurité
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasGarden} onCheckedChange={(c) => setHasGarden(c === true)} />
                    <div className="flex items-center gap-1.5 text-sm">
                      <Trees className="h-3.5 w-3.5 text-green-600" />
                      Jardin
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasPool} onCheckedChange={(c) => setHasPool(c === true)} />
                    <span className="text-sm">Piscine</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasAirConditioning} onCheckedChange={(c) => setHasAirConditioning(c === true)} />
                    <span className="text-sm">Climatisation</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasSolarPanels} onCheckedChange={(c) => setHasSolarPanels(c === true)} />
                    <span className="text-sm">Panneaux solaires</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasGenerator} onCheckedChange={(c) => setHasGenerator(c === true)} />
                    <span className="text-sm">Groupe électrogène</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasWaterTank} onCheckedChange={(c) => setHasWaterTank(c === true)} />
                    <span className="text-sm">Citerne d'eau</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasBorehole} onCheckedChange={(c) => setHasBorehole(c === true)} />
                    <span className="text-sm">Forage</span>
                  </div>
                </div>

                {/* Nouveaux équipements */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasElectricFence} onCheckedChange={(c) => setHasElectricFence(c === true)} />
                    <div className="flex items-center gap-1.5 text-sm">
                      <Fence className="h-3.5 w-3.5 text-orange-500" />
                      Clôture électrique
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasGarage} onCheckedChange={(c) => setHasGarage(c === true)} />
                    <div className="flex items-center gap-1.5 text-sm">
                      <Warehouse className="h-3.5 w-3.5 text-slate-600" />
                      Garage
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasCellar} onCheckedChange={(c) => setHasCellar(c === true)} />
                    <span className="text-sm">Cave</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasAutomaticGate} onCheckedChange={(c) => setHasAutomaticGate(c === true)} />
                    <div className="flex items-center gap-1.5 text-sm">
                      <DoorOpen className="h-3.5 w-3.5 text-indigo-500" />
                      Portail auto.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                  <Checkbox checked={hasParking} onCheckedChange={(c) => setHasParking(c === true)} />
                  <div className="flex items-center gap-1.5 text-sm flex-1">
                    <Car className="h-3.5 w-3.5 text-slate-500" />
                    Parking
                  </div>
                  {hasParking && (
                    <Input
                      type="number"
                      min="0"
                      value={parkingSpaces}
                      onChange={handleNonNegativeChange(setParkingSpaces)}
                      placeholder="Places"
                      className="h-8 w-16 text-xs rounded-lg"
                    />
                  )}
                </div>

                {hasGarden && (
                  <div className="flex items-center gap-2 pl-6">
                    <Label className="text-xs">Surface jardin (m²)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={gardenAreaSqm}
                      onChange={handleNonNegativeChange(setGardenAreaSqm)}
                      placeholder="Ex: 50"
                      className="h-8 w-24 text-xs rounded-lg"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* === ONGLET MATÉRIAUX === */}
          <TabsContent value="materiaux" className="space-y-3 pr-2 mt-0">
            <Card className="border rounded-xl">
              <CardContent className="p-3 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  Matériaux de construction
                  <SectionHelpPopover
                    title="Matériaux de construction"
                    description="Précisez les matériaux utilisés pour les murs, la toiture, les fenêtres et le sol. La qualité des matériaux est un facteur déterminant dans l'évaluation immobilière."
                  />
                </h4>

                <div className="space-y-1.5">
                  <Label className="text-xs">Murs / Élévation</Label>
                  <Select value={wallMaterial} onValueChange={setWallMaterial}>
                    <SelectTrigger className="h-9 text-sm rounded-xl border-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[1200]">
                      {WALL_MATERIAL_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Toiture</Label>
                  <Select value={roofMaterial} onValueChange={setRoofMaterial}>
                    <SelectTrigger className="h-9 text-sm rounded-xl border-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[1200]">
                      {ROOF_MATERIAL_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Fenêtres</Label>
                  <Select value={windowType} onValueChange={setWindowType}>
                    <SelectTrigger className="h-9 text-sm rounded-xl border-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[1200]">
                      {WINDOW_TYPE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Sol / Revêtement</Label>
                  <Select value={floorMaterial} onValueChange={setFloorMaterial}>
                    <SelectTrigger className="h-9 text-sm rounded-xl border-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[1200]">
                      {FLOOR_MATERIAL_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="my-2" />

                <h5 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  Finitions
                  <SectionHelpPopover
                    title="Finitions"
                    description="Indiquez l'état des finitions intérieures : crépi, peinture, plafond et isolation. Des finitions de qualité augmentent significativement la valeur du bien."
                  />
                </h5>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasPlaster} onCheckedChange={(c) => setHasPlaster(c === true)} />
                    <span className="text-sm">Crépi</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasPainting} onCheckedChange={(c) => setHasPainting(c === true)} />
                    <span className="text-sm">Peinture</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasCeiling} onCheckedChange={(c) => setHasCeiling(c === true)} />
                    <span className="text-sm">Plafond</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                  <Checkbox checked={hasDoubleGlazing} onCheckedChange={(c) => setHasDoubleGlazing(c === true)} />
                  <span className="text-sm">Double vitrage (isolation phonique)</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === ONGLET ENVIRONNEMENT === */}
          <TabsContent value="environnement" className="space-y-3 pr-2 mt-0">
            {/* Environnement sonore */}
            <Card className="border rounded-xl">
              <CardContent className="p-3 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  Environnement sonore
                  <SectionHelpPopover
                    title="Environnement sonore"
                    description="Évaluez le niveau de bruit autour du bien. Si vous êtes sur place, utilisez le microphone pour une mesure automatique. Un environnement calme valorise le bien."
                  />
                </h4>

                {/* Question: êtes-vous sur le site? */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Êtes-vous actuellement sur la construction ?</Label>
                  <RadioGroup 
                    value={isOnSite === null ? '' : isOnSite ? 'yes' : 'no'} 
                    onValueChange={(v) => {
                      setIsOnSite(v === 'yes');
                      if (v === 'no') {
                        stopSoundMeasurement();
                        setMeasuredDecibels(null);
                      }
                    }}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="onsite-yes" />
                      <Label htmlFor="onsite-yes" className="text-sm cursor-pointer">Oui</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="onsite-no" />
                      <Label htmlFor="onsite-no" className="text-sm cursor-pointer">Non</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Mesure par microphone si sur site */}
                {isOnSite === true && (
                  <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 rounded-xl">
                    <CardContent className="p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mic className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium">Mesure du bruit ambiant</span>
                        </div>
                        {measuredDecibels !== null && (
                          <Badge variant="secondary" className="text-xs">
                            ~{measuredDecibels} dB
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        Activez le microphone pour mesurer le niveau sonore en temps réel. Le niveau sera automatiquement déterminé.
                      </p>
                      
                      {microphoneError && (
                        <Alert className="bg-red-50 border-red-200 rounded-lg">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-xs text-red-700">{microphoneError}</AlertDescription>
                        </Alert>
                      )}

                      <div className="flex gap-2">
                        {!isRecordingSound ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={startSoundMeasurement}
                            className="flex-1 h-9 text-sm rounded-xl border-blue-300 text-blue-700 hover:bg-blue-100"
                          >
                            <Mic className="h-4 w-4 mr-2" />
                            Démarrer la mesure
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={stopSoundMeasurement}
                            className="flex-1 h-9 text-sm rounded-xl"
                          >
                            <MicOff className="h-4 w-4 mr-2" />
                            Arrêter la mesure
                          </Button>
                        )}
                      </div>

                      {isRecordingSound && measuredDecibels !== null && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span>Niveau mesuré:</span>
                            <span className="font-bold text-blue-700">{measuredDecibels} dB</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                            <div 
                              className={`h-3 rounded-full transition-all duration-300 ${
                                measuredDecibels < 40 ? 'bg-green-500' :
                                measuredDecibels < 55 ? 'bg-lime-500' :
                                measuredDecibels < 70 ? 'bg-yellow-500' :
                                measuredDecibels < 85 ? 'bg-orange-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(100, measuredDecibels)}%` }}
                            />
                          </div>
                          <p className="text-xs text-center font-medium text-blue-700">
                            Niveau détecté: {SOUND_ENVIRONMENT_OPTIONS.find(o => o.value === soundEnvironment)?.label}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Picklist manuel si pas sur site ou après mesure */}
                {(isOnSite === false || isOnSite === null) && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Niveau sonore estimé</Label>
                    <Select value={soundEnvironment} onValueChange={(v) => { setSoundEnvironment(v); if (v === 'tres_calme') setNearbyNoiseSources([]); }}>
                      <SelectTrigger className="h-9 text-sm rounded-xl border-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[1200]">
                        {SOUND_ENVIRONMENT_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Afficher le résultat si mesuré */}
                {isOnSite === true && measuredDecibels !== null && !isRecordingSound && (
                  <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200">
                    <span className="text-sm">Niveau sonore mesuré:</span>
                    <Badge className="bg-green-600 text-white">
                      {SOUND_ENVIRONMENT_OPTIONS.find(o => o.value === soundEnvironment)?.label} ({measuredDecibels} dB)
                    </Badge>
                  </div>
                )}

                {soundEnvironment !== 'tres_calme' && (
                  <SuggestivePicklist
                    picklistKey="noise_sources"
                    label="Sources de bruit à proximité"
                    placeholder="Rechercher ou ajouter une source..."
                    selectedValues={nearbyNoiseSources}
                    onSelectionChange={setNearbyNoiseSources}
                  />
                )}
              </CardContent>
            </Card>

            {/* Accessibilité */}
            <Card className="border rounded-xl">
              <CardContent className="p-3 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  Accessibilité & distances
                  <SectionHelpPopover
                    title="Accessibilité & distances"
                    description="Indiquez les distances vers les services essentiels (hôpital, école, marché) et le type d'accès routier. La proximité des commodités augmente la valeur du bien."
                  />
                </h4>
                
                <div className="space-y-1.5">
                  <Label className="text-xs">Type d'accès routier</Label>
                  <Select value={roadAccessType} onValueChange={setRoadAccessType}>
                    <SelectTrigger className="h-9 text-sm rounded-xl border-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[1200]">
                      {ROAD_ACCESS_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Route principale (m)</Label>
                    <Input
                      type="number"
                      value={distanceToMainRoad}
                      onChange={(e) => setDistanceToMainRoad(e.target.value)}
                      placeholder="Ex: 50"
                      className="h-9 text-sm rounded-xl border-2"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Hôpital (km)</Label>
                    <Input
                      type="number"
                      value={distanceToHospital}
                      onChange={(e) => setDistanceToHospital(e.target.value)}
                      placeholder="Ex: 2"
                      className="h-9 text-sm rounded-xl border-2"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">École (km)</Label>
                    <Input
                      type="number"
                      value={distanceToSchool}
                      onChange={(e) => setDistanceToSchool(e.target.value)}
                      placeholder="Ex: 1"
                      className="h-9 text-sm rounded-xl border-2"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Marché (km)</Label>
                    <Input
                      type="number"
                      value={distanceToMarket}
                      onChange={(e) => setDistanceToMarket(e.target.value)}
                      placeholder="Ex: 0.5"
                      className="h-9 text-sm rounded-xl border-2"
                    />
                  </div>
                </div>

                <SuggestivePicklist
                  picklistKey="nearby_amenities"
                  label="Commodités à proximité"
                  placeholder="Rechercher ou ajouter..."
                  selectedValues={nearbyAmenities}
                  onSelectionChange={setNearbyAmenities}
                />
              </CardContent>
            </Card>

            {/* Risques */}
            <Card className="border rounded-xl border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/20">
              <CardContent className="p-3 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  Zones à risque
                  <SectionHelpPopover
                    title="Zones à risque"
                    description="Signalez si le bien se trouve dans une zone inondable ou d'érosion. Ces facteurs de risque sont pris en compte dans l'évaluation et peuvent réduire la valeur estimée."
                  />
                </h4>
                
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={floodRiskZone} onCheckedChange={(c) => setFloodRiskZone(c === true)} />
                    <span className="text-sm text-amber-700 dark:text-amber-300">Zone inondable</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={erosionRiskZone} onCheckedChange={(c) => setErosionRiskZone(c === true)} />
                    <span className="text-sm text-amber-700 dark:text-amber-300">Zone d'érosion</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === ONGLET DOCUMENTS === */}
          <TabsContent value="documents" className="space-y-3 pr-2 mt-0">
            {/* Documents parcelle */}
            <Card className="border rounded-xl">
              <CardContent className="p-3 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Documents de la parcelle
                  <SectionHelpPopover
                    title="Documents de la parcelle"
                    description="Joignez les documents juridiques liés à la parcelle : titre foncier, certificat d'enregistrement, PV de bornage. Ces documents accéléreront le processus d'expertise."
                  />
                </h4>
                <p className="text-xs text-muted-foreground">
                  Titre foncier, certificat d'enregistrement, PV de bornage, attestation de propriété...
                </p>
                
                <input
                  ref={parcelDocsInputRef}
                  type="file"
                  accept=".pdf,image/*"
                  multiple
                  onChange={handleParcelDocSelect}
                  className="hidden"
                />
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => parcelDocsInputRef.current?.click()}
                  className="w-full h-10 text-sm rounded-xl border-2 border-dashed"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Documents parcelle (PDF, images)
                </Button>
                
                {parcelDocuments.length > 0 && (
                  <div className="space-y-2">
                    {parcelDocuments.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
                        <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <span className="flex-1 truncate text-sm">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeParcelDoc(index)}
                          className="h-7 w-7 rounded-lg"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Images construction */}
            <Card className="border rounded-xl">
              <CardContent className="p-3 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Camera className="h-4 w-4 text-green-600" />
                  Photos de la construction
                  <SectionHelpPopover
                    title="Photos de la construction"
                    description="Ajoutez des photos récentes de votre bien (façade, intérieur, cuisine, chambres, jardin). Plus vous fournissez de photos, plus l'expert pourra préparer sa visite efficacement."
                  />
                </h4>
                <p className="text-xs text-muted-foreground">
                  Façade, intérieur, cuisine, chambres, salles de bain, jardin, terrasse...
                </p>
                
                <input
                  ref={constructionImagesInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleConstructionImageSelect}
                  className="hidden"
                />
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => constructionImagesInputRef.current?.click()}
                  className="w-full h-10 text-sm rounded-xl border-2 border-dashed"
                >
                  <Image className="h-4 w-4 mr-2" />
                  Photos de la construction
                </Button>
                
                {constructionImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {constructionImages.map((file, index) => (
                      <div key={index} className="relative group">
                         <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                           <img
                             src={constructionImageUrls[index] || ''}
                             alt={file.name}
                             className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => removeConstructionImage(index)}
                          className="absolute -top-1 -right-1 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes additionnelles */}
            <Card className="border rounded-xl">
              <CardContent className="p-3 space-y-3">
                <h4 className="text-sm font-semibold">Notes additionnelles</h4>
                <Textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Autres informations pertinentes : servitudes, litiges, potentiel de développement, travaux récents, historique du bien..."
                  className="min-h-[100px] text-sm rounded-xl border-2"
                />
              </CardContent>
            </Card>

            <Alert className="rounded-xl bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm text-green-800 dark:text-green-200">
                Plus vous fournissez d'informations et de photos, plus l'expertise sera précise et rapide !
              </AlertDescription>
            </Alert>
          </TabsContent>
        </div>
      </Tabs>

      <div className="flex gap-3 mt-3">
        {(() => {
          const tabOrder = isTerrainNuLocal
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

  const isTerrainNu = constructionType === 'terrain_nu';

  const renderSummary = () => {
    // Use imported centralized labels (no local duplicates)
    const POSITION_LABELS = BUILDING_POSITION_LABELS;

    // Validation des champs obligatoires et importants
    const getMissingFields = () => {
      const missing: Array<{ label: string; tab: string; required: boolean }> = [];
      
      // Champs obligatoires
      if (!constructionType) missing.push({ label: 'Type de construction', tab: 'general', required: true });
      
      // Champs importants (non obligatoires mais recommandés)
      if (constructionType !== 'terrain_nu') {
        if (!constructionYear) missing.push({ label: 'Année de construction', tab: 'general', required: false });
        if (!totalBuiltAreaSqm) missing.push({ label: 'Surface construite', tab: 'general', required: false });
        if (!numberOfRooms) missing.push({ label: 'Nombre de pièces', tab: 'general', required: false });
      }
      if (constructionImages.length === 0 && constructionType !== 'terrain_nu') {
        missing.push({ label: 'Photos de la construction', tab: 'documents', required: false });
      }
      
      return missing;
    };

    const missingFields = getMissingFields();
    const requiredMissing = missingFields.filter(f => f.required);
    const recommendedMissing = missingFields.filter(f => !f.required);

    // Comptage de la complétion
    const allFields = [
      constructionType, constructionYear, constructionQuality, numberOfFloors, 
      totalBuiltAreaSqm, propertyCondition, numberOfRooms, numberOfBedrooms, numberOfBathrooms,
      wallMaterial, roofMaterial, windowType, floorMaterial, buildingPosition, roadAccessType, soundEnvironment
    ].filter(Boolean).length;
    const totalPossibleFields = 16;
    const completionPercentage = Math.round((allFields / totalPossibleFields) * 100);

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
                      {[constructionType, constructionYear, totalBuiltAreaSqm, numberOfFloors, propertyCondition, constructionQuality].filter(Boolean).length}/6
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setActiveTab('general'); setStep('form'); }} className="h-6 px-2 text-xs text-muted-foreground hover:text-primary">
                    Modifier
                  </Button>
                </div>
                <div className="divide-y divide-border/30">
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Type de construction</span>
                    <span className="font-medium">{CONSTRUCTION_TYPE_LABELS[constructionType] || constructionType || <span className="text-orange-600">Non renseigné</span>}</span>
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
                    <span className="text-muted-foreground">Standing</span>
                    <span className="font-medium">{QUALITY_LABELS[constructionQuality] || constructionQuality}</span>
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
                    <span className="text-muted-foreground">Murs / Élévation</span>
                    <span className="font-medium">{WALL_LABELS[wallMaterial] || wallMaterial}</span>
                  </div>
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
                  <div className="flex justify-between text-xs py-1.5">
                    <span className="text-muted-foreground">Environnement sonore</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{SOUND_LABELS[soundEnvironment] || soundEnvironment}</span>
                      {measuredDecibels !== null && (
                        <Badge variant="outline" className="text-[9px] ml-1">{measuredDecibels} dB</Badge>
                      )}
                    </div>
                  </div>
                  {nearbyNoiseSources.length > 0 && soundEnvironment !== 'tres_calme' && (
                    <div className="py-1.5">
                      <span className="text-muted-foreground text-xs">Sources de bruit</span>
                      <div className="flex flex-wrap gap-1 mt-1 justify-end">
                        {nearbyNoiseSources.map((src, idx) => (
                          <Badge key={idx} variant="secondary" className="text-[10px]">{src}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
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
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-primary/15 to-primary/5 rounded-2xl p-3 border border-primary/20">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-9 w-9 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground leading-tight">Parcelle</p>
              <p className="font-mono font-bold text-sm truncate">{parcelNumber}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[11px] text-muted-foreground leading-tight">Total</p>
            <p className="text-xl font-bold text-primary">${getTotalAmount()}</p>
          </div>
        </div>
      </div>

      <div className="bg-muted/30 rounded-2xl p-2.5">
        <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 px-0.5">Détails des frais</p>
        <div className="space-y-1">
          {fees.filter(fee => fee.is_mandatory).map((fee) => (
            <div key={fee.id} className="flex justify-between items-center px-0.5">
              <span className="text-sm">{fee.fee_name}</span>
              <span className="font-semibold text-sm">${fee.amount_usd}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold mb-2">Mode de paiement</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPaymentMethod('mobile_money')}
            className={`p-2.5 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 ${
              paymentMethod === 'mobile_money' 
                ? 'border-primary bg-primary/10 text-primary' 
                : 'border-border hover:border-primary/50 bg-background'
            }`}
          >
            <Phone className="h-4 w-4" />
            <span className="text-sm font-medium">Mobile Money</span>
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod('bank_card')}
            className={`p-2.5 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 ${
              paymentMethod === 'bank_card' 
                ? 'border-primary bg-primary/10 text-primary' 
                : 'border-border hover:border-primary/50 bg-background'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span className="text-sm font-medium">Carte bancaire</span>
          </button>
        </div>
      </div>

      {paymentMethod === 'mobile_money' && (
        <div className="bg-muted/20 rounded-2xl p-2.5 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] font-medium mb-1 block">Opérateur</Label>
              <Select value={paymentProvider} onValueChange={setPaymentProvider}>
                <SelectTrigger className="h-9 rounded-xl text-sm">
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent className="z-[1200]">
                  <SelectItem value="airtel_money">Airtel Money</SelectItem>
                  <SelectItem value="orange_money">Orange Money</SelectItem>
                   <SelectItem value="m_pesa">M-Pesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] font-medium mb-1 block">Téléphone</Label>
              <Input
                value={paymentPhone}
                onChange={(e) => setPaymentPhone(e.target.value)}
                placeholder="+243 ..."
                className="h-9 rounded-xl text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {paymentMethod === 'bank_card' && (
        <div className="flex items-center gap-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800">
          <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Redirection vers Stripe pour un paiement sécurisé.
          </p>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button 
          variant="outline" 
          onClick={() => setStep('summary')}
          disabled={processingPayment}
          className="flex-1 h-10 rounded-2xl text-sm"
        >
          Retour
        </Button>
        <Button 
          variant="seloger"
          onClick={handlePayment}
          disabled={processingPayment || !isPaymentValid() || (paymentMethod === 'mobile_money' && (!paymentProvider || !paymentPhone))}
          className="flex-1 h-10 rounded-2xl text-sm font-semibold"
        >
          {processingPayment ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              Traitement...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Payer ${getTotalAmount()}
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderConfirmation = () => (
    <div className="space-y-4 text-center py-4">
      <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
        <CheckCircle2 className="h-8 w-8 text-green-600" />
      </div>
      
      <div className="space-y-1">
        <h3 className="font-bold text-lg">Demande envoyée !</h3>
        <p className="text-sm text-muted-foreground">
          Votre demande d'expertise immobilière a été enregistrée avec succès.
        </p>
      </div>

      {createdRequest && (
        <div className="bg-muted/50 rounded-xl p-3 space-y-2 text-left">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Référence</span>
            <span className="font-mono font-bold">{createdRequest.reference_number}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Parcelle</span>
            <span className="font-mono">{parcelNumber}</span>
          </div>
        </div>
      )}

      <Alert className="rounded-xl text-left">
        <AlertDescription className="text-sm">
          Un expert immobilier analysera votre demande et vous contactera prochainement. 
          Vous pouvez suivre l'avancement depuis votre tableau de bord.
        </AlertDescription>
      </Alert>

      <Button 
        onClick={handleClose}
        className="w-full h-11 rounded-xl"
      >
        Fermer
      </Button>
    </div>
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
      const validity = checkCertificateValidity(existingCertificate.certificate_issue_date);
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
                  onClick={() => {
                    if (existingCertificate.certificate_url) {
                      window.open(existingCertificate.certificate_url, '_blank', 'noopener,noreferrer');
                      toast.success('Certificat ouvert avec succès.');
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
                 <SelectContent className="z-[1200]">
                  <SelectItem value="airtel_money">Airtel Money</SelectItem>
                  <SelectItem value="orange_money">Orange Money</SelectItem>
                  <SelectItem value="m_pesa">M-Pesa</SelectItem>
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
      <DialogContent className="max-w-[95vw] sm:max-w-[420px] max-h-[90vh] p-4 rounded-2xl z-[1200]">
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
