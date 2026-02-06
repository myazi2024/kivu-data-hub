import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  Volume2, Layers, Building2, Camera, Info
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRealEstateExpertise } from '@/hooks/useRealEstateExpertise';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import FormIntroDialog, { FORM_INTRO_CONFIGS } from './FormIntroDialog';

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
    property_title_type?: string;
  };
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ExpertiseFee {
  id: string;
  fee_name: string;
  amount_usd: number;
  description: string | null;
  is_mandatory: boolean;
  is_active: boolean;
  display_order: number;
}

// Options de configuration
const CONSTRUCTION_TYPE_OPTIONS = [
  { value: 'villa', label: 'Villa / Maison individuelle' },
  { value: 'appartement', label: 'Appartement' },
  { value: 'immeuble', label: 'Immeuble / Bâtiment' },
  { value: 'duplex', label: 'Duplex / Triplex' },
  { value: 'studio', label: 'Studio' },
  { value: 'commercial', label: 'Local commercial' },
  { value: 'entrepot', label: 'Entrepôt / Hangar' },
  { value: 'terrain_nu', label: 'Terrain nu (sans construction)' },
  { value: 'autre', label: 'Autre' },
];

const CONSTRUCTION_QUALITY_OPTIONS = [
  { value: 'luxe', label: 'Luxe / Haut standing' },
  { value: 'standard', label: 'Standard / Moyen standing' },
  { value: 'economique', label: 'Économique / Social' },
];

const PROPERTY_CONDITION_OPTIONS = [
  { value: 'neuf', label: 'Neuf (< 2 ans)' },
  { value: 'bon', label: 'Bon état' },
  { value: 'moyen', label: 'État moyen' },
  { value: 'mauvais', label: 'Mauvais état' },
  { value: 'a_renover', label: 'À rénover' },
];

const ROAD_ACCESS_OPTIONS = [
  { value: 'asphalte', label: 'Route asphaltée' },
  { value: 'terre', label: 'Route en terre' },
  { value: 'piste', label: 'Piste / Sentier' },
];

const WALL_MATERIAL_OPTIONS = [
  { value: 'beton', label: 'Béton armé' },
  { value: 'briques_cuites', label: 'Briques cuites' },
  { value: 'briques_adobe', label: 'Briques adobe' },
  { value: 'parpaings', label: 'Parpaings / Blocs' },
  { value: 'bois', label: 'Bois' },
  { value: 'tole', label: 'Tôles métalliques' },
  { value: 'mixte', label: 'Mixte' },
];

const ROOF_MATERIAL_OPTIONS = [
  { value: 'tole_bac', label: 'Tôle bac / Ondulée' },
  { value: 'tuiles', label: 'Tuiles' },
  { value: 'dalle_beton', label: 'Dalle béton (terrasse)' },
  { value: 'ardoise', label: 'Ardoise' },
  { value: 'chaume', label: 'Chaume / Paille' },
  { value: 'autre', label: 'Autre' },
];

const WINDOW_TYPE_OPTIONS = [
  { value: 'aluminium', label: 'Aluminium' },
  { value: 'bois', label: 'Bois' },
  { value: 'pvc', label: 'PVC' },
  { value: 'fer', label: 'Fer forgé' },
  { value: 'sans_fenetres', label: 'Sans fenêtres' },
];

const FLOOR_MATERIAL_OPTIONS = [
  { value: 'carrelage', label: 'Carrelage' },
  { value: 'ciment_lisse', label: 'Ciment lissé' },
  { value: 'parquet', label: 'Parquet / Bois' },
  { value: 'marbre', label: 'Marbre / Granit' },
  { value: 'terre_battue', label: 'Terre battue' },
  { value: 'autre', label: 'Autre' },
];

const SOUND_ENVIRONMENT_OPTIONS = [
  { value: 'tres_calme', label: 'Très calme (zone résidentielle)' },
  { value: 'calme', label: 'Calme' },
  { value: 'modere', label: 'Modéré (activité normale)' },
  { value: 'bruyant', label: 'Bruyant (avenue passante)' },
  { value: 'tres_bruyant', label: 'Très bruyant (zone commerciale/industrielle)' },
];

const BUILDING_POSITION_OPTIONS = [
  { value: 'premiere_position', label: 'Première position (bordure de route)' },
  { value: 'deuxieme_position', label: 'Deuxième position' },
  { value: 'fond_parcelle', label: 'Fond de parcelle' },
  { value: 'dans_servitude', label: 'Dans une servitude' },
  { value: 'coin_parcelle', label: 'En coin de parcelle' },
];

const ACCESSIBILITY_OPTIONS = [
  { value: 'escalier', label: 'Escalier uniquement' },
  { value: 'ascenseur', label: 'Ascenseur disponible' },
  { value: 'escalier_ascenseur', label: 'Escalier + Ascenseur' },
  { value: 'plain_pied', label: 'Plain-pied (RDC)' },
];

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
  const { createExpertiseRequest, loading } = useRealEstateExpertise();
  const parcelDocsInputRef = useRef<HTMLInputElement>(null);
  const constructionImagesInputRef = useRef<HTMLInputElement>(null);

  const [showIntro, setShowIntro] = useState(true);
  const [step, setStep] = useState<'form' | 'summary' | 'payment' | 'confirmation'>('form');
  const [activeTab, setActiveTab] = useState('general');
  const [createdRequest, setCreatedRequest] = useState<any>(null);

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
  const [nearbyNoiseSources, setNearbyNoiseSources] = useState('');
  const [hasDoubleGlazing, setHasDoubleGlazing] = useState(false);

  // === ÉQUIPEMENTS ===
  const [hasWaterSupply, setHasWaterSupply] = useState(false);
  const [hasElectricity, setHasElectricity] = useState(false);
  const [hasSewageSystem, setHasSewageSystem] = useState(false);
  const [hasInternet, setHasInternet] = useState(false);
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

  // === ENVIRONNEMENT & ACCESSIBILITÉ ===
  const [roadAccessType, setRoadAccessType] = useState('asphalte');
  const [distanceToMainRoad, setDistanceToMainRoad] = useState('');
  const [distanceToHospital, setDistanceToHospital] = useState('');
  const [distanceToSchool, setDistanceToSchool] = useState('');
  const [distanceToMarket, setDistanceToMarket] = useState('');
  const [floodRiskZone, setFloodRiskZone] = useState(false);
  const [erosionRiskZone, setErosionRiskZone] = useState(false);
  const [nearbyAmenities, setNearbyAmenities] = useState('');

  // === NOTES & DOCUMENTS ===
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [parcelDocuments, setParcelDocuments] = useState<File[]>([]);
  const [constructionImages, setConstructionImages] = useState<File[]>([]);
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

  const getTotalAmount = () => {
    return fees.reduce((sum, fee) => sum + fee.amount_usd, 0);
  };

  const handleParcelDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newFiles = Array.from(files);
    const validFiles = newFiles.filter(file => {
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
    const validFiles = newFiles.filter(file => {
      const isValid = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024;
      if (!isValid) toast.error(`${file.name}: Seules les images sont acceptées`);
      if (!isValidSize) toast.error(`${file.name}: Fichier trop volumineux (max 10MB)`);
      return isValid && isValidSize;
    });
    
    setConstructionImages(prev => [...prev, ...validFiles]);
    if (constructionImagesInputRef.current) constructionImagesInputRef.current.value = '';
  };

  const removeParcelDoc = (index: number) => {
    setParcelDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const removeConstructionImage = (index: number) => {
    setConstructionImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<{ parcelDocs: string[], constructionImages: string[] }> => {
    const result = { parcelDocs: [] as string[], constructionImages: [] as string[] };
    
    setUploadingFiles(true);
    
    try {
      // Upload parcel documents
      for (const file of parcelDocuments) {
        const fileExt = file.name.split('.').pop();
        const fileName = `parcel_doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
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
        const fileName = `construction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
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
      return result;
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleProceedToSummary = () => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
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
      nearby_noise_sources: nearbyNoiseSources || undefined,
      has_double_glazing: hasDoubleGlazing,
      has_pool: hasPool,
      has_air_conditioning: hasAirConditioning,
      has_solar_panels: hasSolarPanels,
      has_water_tank: hasWaterTank,
      has_generator: hasGenerator,
      has_borehole: hasBorehole,
      nearby_amenities: nearbyAmenities || undefined,
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
    if (!user || !formData) return;

    if (paymentMethod === 'mobile_money' && (!paymentProvider || !paymentPhone)) {
      toast.error('Veuillez sélectionner un opérateur et entrer votre numéro');
      return;
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

      // Create payment record
      const feeItems = fees.map(fee => ({
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
        const { data: paymentResult, error: mmError } = await supabase.functions.invoke(
          'process-mobile-money-payment',
          {
            body: {
              payment_provider: paymentProvider,
              phone_number: paymentPhone,
              amount_usd: getTotalAmount(),
              payment_type: 'expertise_fee',
              invoice_id: paymentRecord.id
            }
          }
        );

        if (mmError) throw mmError;

        await new Promise(resolve => setTimeout(resolve, 2000));

        await supabase
          .from('expertise_payments')
          .update({
            status: 'completed',
            paid_at: new Date().toISOString(),
            transaction_id: paymentResult?.transaction_id || 'TXN-' + Date.now()
          })
          .eq('id', paymentRecord.id);

        await supabase
          .from('real_estate_expertise_requests')
          .update({ payment_status: 'paid' })
          .eq('id', request.id);

      } else if (paymentMethod === 'bank_card') {
        const { data: stripeSession, error: stripeError } = await supabase.functions.invoke(
          'create-payment',
          {
            body: {
              invoice_id: paymentRecord.id,
              payment_type: 'expertise_fee',
              amount_usd: getTotalAmount()
            }
          }
        );

        if (stripeError) throw stripeError;

        if (stripeSession?.url) {
          window.location.href = stripeSession.url;
          return;
        }
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

  const handleClose = () => {
    setStep('form');
    setActiveTab('general');
    setCreatedRequest(null);
    setFormData(null);
    setPropertyDescription('');
    setConstructionYear('');
    setTotalBuiltAreaSqm('');
    setAdditionalNotes('');
    setParcelDocuments([]);
    setConstructionImages([]);
    setPaymentMethod('mobile_money');
    setPaymentProvider('');
    setPaymentPhone('');
    onOpenChange(false);
  };

  const isApartmentOrBuilding = constructionType === 'appartement' || constructionType === 'immeuble' || constructionType === 'duplex';

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-9 rounded-xl">
          <TabsTrigger value="general" className="text-xs rounded-lg">Général</TabsTrigger>
          <TabsTrigger value="materiaux" className="text-xs rounded-lg">Matériaux</TabsTrigger>
          <TabsTrigger value="environnement" className="text-xs rounded-lg">Environ.</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs rounded-lg">Documents</TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[50vh] sm:h-[55vh] mt-3">
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

            {/* Infos construction */}
            <Card className="border rounded-xl">
              <CardContent className="p-3 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  Caractéristiques
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Année construction</Label>
                    <Input
                      type="number"
                      value={constructionYear}
                      onChange={(e) => setConstructionYear(e.target.value)}
                      placeholder="Ex: 2015"
                      className="h-9 text-sm rounded-xl border-2"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nombre d'étages</Label>
                    <Input
                      type="number"
                      value={numberOfFloors}
                      onChange={(e) => setNumberOfFloors(e.target.value)}
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
                      value={totalBuiltAreaSqm}
                      onChange={(e) => setTotalBuiltAreaSqm(e.target.value)}
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
                      value={numberOfRooms}
                      onChange={(e) => setNumberOfRooms(e.target.value)}
                      placeholder="5"
                      className="h-9 text-sm rounded-xl border-2"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Chambres</Label>
                    <Input
                      type="number"
                      value={numberOfBedrooms}
                      onChange={(e) => setNumberOfBedrooms(e.target.value)}
                      placeholder="3"
                      className="h-9 text-sm rounded-xl border-2"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">SDB</Label>
                    <Input
                      type="number"
                      value={numberOfBathrooms}
                      onChange={(e) => setNumberOfBathrooms(e.target.value)}
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
            </Card>

            {/* Appartement / Immeuble - conditionnel */}
            {isApartmentOrBuilding && (
              <Card className="border rounded-xl border-blue-200 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-950/20">
                <CardContent className="p-3 space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    Détails appartement/immeuble
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
                    <Input
                      value={facadeOrientation}
                      onChange={(e) => setFacadeOrientation(e.target.value)}
                      placeholder="Ex: Nord-Est"
                      className="h-9 text-sm rounded-xl border-2"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Distance route (m)</Label>
                    <Input
                      type="number"
                      value={distanceFromRoad}
                      onChange={(e) => setDistanceFromRoad(e.target.value)}
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
                <h4 className="text-sm font-semibold">Équipements & commodités</h4>
                
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
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox checked={hasInternet} onCheckedChange={(c) => setHasInternet(c === true)} />
                    <div className="flex items-center gap-1.5 text-sm">
                      <Wifi className="h-3.5 w-3.5 text-green-500" />
                      Internet
                    </div>
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

                <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                  <Checkbox checked={hasParking} onCheckedChange={(c) => setHasParking(c === true)} />
                  <div className="flex items-center gap-1.5 text-sm flex-1">
                    <Car className="h-3.5 w-3.5 text-slate-500" />
                    Parking
                  </div>
                  {hasParking && (
                    <Input
                      type="number"
                      value={parkingSpaces}
                      onChange={(e) => setParkingSpaces(e.target.value)}
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
                      value={gardenAreaSqm}
                      onChange={(e) => setGardenAreaSqm(e.target.value)}
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

                <h5 className="text-xs font-semibold text-muted-foreground">Finitions</h5>
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
                </h4>

                <div className="space-y-1.5">
                  <Label className="text-xs">Niveau sonore</Label>
                  <Select value={soundEnvironment} onValueChange={setSoundEnvironment}>
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

                <div className="space-y-1.5">
                  <Label className="text-xs">Sources de bruit à proximité</Label>
                  <Textarea
                    value={nearbyNoiseSources}
                    onChange={(e) => setNearbyNoiseSources(e.target.value)}
                    placeholder="Ex: Marché, bar, école, route principale..."
                    className="min-h-[50px] text-sm rounded-xl border-2"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Accessibilité */}
            <Card className="border rounded-xl">
              <CardContent className="p-3 space-y-3">
                <h4 className="text-sm font-semibold">Accessibilité & distances</h4>
                
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

                <div className="space-y-1.5">
                  <Label className="text-xs">Commodités à proximité</Label>
                  <Textarea
                    value={nearbyAmenities}
                    onChange={(e) => setNearbyAmenities(e.target.value)}
                    placeholder="Ex: Banque, pharmacie, supermarché, église..."
                    className="min-h-[50px] text-sm rounded-xl border-2"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Risques */}
            <Card className="border rounded-xl border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/20">
              <CardContent className="p-3 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  Zones à risque
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
                            src={URL.createObjectURL(file)}
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
        </ScrollArea>
      </Tabs>

      {activeTab === 'documents' && (
        <Button 
          onClick={handleProceedToSummary} 
          className="w-full h-11 text-sm font-semibold rounded-xl shadow-lg mt-3"
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
      )}
    </div>
  );

  const renderSummary = () => {
    // Labels pour affichage
    const CONSTRUCTION_TYPE_LABELS: Record<string, string> = {
      villa: 'Villa / Maison individuelle',
      appartement: 'Appartement',
      immeuble: 'Immeuble / Bâtiment',
      duplex: 'Duplex / Triplex',
      studio: 'Studio',
      commercial: 'Local commercial',
      entrepot: 'Entrepôt / Hangar',
      terrain_nu: 'Terrain nu (sans construction)',
      autre: 'Autre'
    };

    const QUALITY_LABELS: Record<string, string> = {
      luxe: 'Luxe / Haut standing',
      standard: 'Standard / Moyen standing',
      economique: 'Économique / Social'
    };

    const CONDITION_LABELS: Record<string, string> = {
      neuf: 'Neuf (< 2 ans)',
      bon: 'Bon état',
      moyen: 'État moyen',
      mauvais: 'Mauvais état',
      a_renover: 'À rénover'
    };

    const WALL_LABELS: Record<string, string> = {
      beton: 'Béton armé',
      briques_cuites: 'Briques cuites',
      briques_adobe: 'Briques adobe',
      parpaings: 'Parpaings / Blocs',
      bois: 'Bois',
      tole: 'Tôles métalliques',
      mixte: 'Mixte'
    };

    const ROOF_LABELS: Record<string, string> = {
      tole_bac: 'Tôle bac / Ondulée',
      tuiles: 'Tuiles',
      dalle_beton: 'Dalle béton (terrasse)',
      ardoise: 'Ardoise',
      chaume: 'Chaume / Paille',
      autre: 'Autre'
    };

    const FLOOR_LABELS: Record<string, string> = {
      carrelage: 'Carrelage',
      ciment_lisse: 'Ciment lissé',
      parquet: 'Parquet / Bois',
      marbre: 'Marbre / Granit',
      terre_battue: 'Terre battue',
      autre: 'Autre'
    };

    const WINDOW_LABELS: Record<string, string> = {
      aluminium: 'Aluminium',
      bois: 'Bois',
      pvc: 'PVC',
      fer: 'Fer forgé',
      sans_fenetres: 'Sans fenêtres'
    };

    const ROAD_LABELS: Record<string, string> = {
      asphalte: 'Route asphaltée',
      terre: 'Route en terre',
      piste: 'Piste / Sentier'
    };

    const SOUND_LABELS: Record<string, string> = {
      tres_calme: 'Très calme',
      calme: 'Calme',
      modere: 'Modéré',
      bruyant: 'Bruyant',
      tres_bruyant: 'Très bruyant'
    };

    const POSITION_LABELS: Record<string, string> = {
      premiere_position: 'Première position (bordure de route)',
      deuxieme_position: 'Deuxième position',
      fond_parcelle: 'Fond de parcelle',
      dans_servitude: 'Dans une servitude',
      coin_parcelle: 'En coin de parcelle'
    };

    const ACCESSIBILITY_LABELS: Record<string, string> = {
      escalier: 'Escalier uniquement',
      ascenseur: 'Ascenseur disponible',
      escalier_ascenseur: 'Escalier + Ascenseur',
      plain_pied: 'Plain-pied (RDC)'
    };

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

    // Liste des équipements sélectionnés
    const selectedEquipments = [
      hasWaterSupply && 'Eau courante',
      hasElectricity && 'Électricité',
      hasSewageSystem && 'Assainissement',
      hasInternet && 'Internet',
      hasSecuritySystem && 'Système de sécurité',
      hasParking && `Parking${parkingSpaces ? ` (${parkingSpaces} places)` : ''}`,
      hasGarden && `Jardin${gardenAreaSqm ? ` (${gardenAreaSqm} m²)` : ''}`,
      hasPool && 'Piscine',
      hasAirConditioning && 'Climatisation',
      hasSolarPanels && 'Panneaux solaires',
      hasWaterTank && 'Citerne d\'eau',
      hasGenerator && 'Groupe électrogène',
      hasBorehole && 'Forage'
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

    return (
      <div className="flex flex-col h-full max-h-[70vh]">
        {/* En-tête fixe */}
        <div className="shrink-0 space-y-3 pb-3">
          <div className="bg-gradient-to-br from-primary/15 to-primary/5 rounded-2xl p-3 border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">Récapitulatif de la demande</h3>
                <p className="text-xs text-muted-foreground">Vérifiez les informations avant de continuer</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-primary">{completionPercentage}%</div>
                <div className="text-[10px] text-muted-foreground">complet</div>
              </div>
            </div>
            {/* Barre de progression */}
            <div className="w-full bg-muted rounded-full h-1.5 mt-2">
              <div 
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  completionPercentage >= 80 ? 'bg-green-500' : completionPercentage >= 50 ? 'bg-amber-500' : 'bg-primary'
                }`}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Avertissement */}
          <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 rounded-xl">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
              Veuillez vérifier attentivement toutes les informations. Une fois soumise, la demande ne pourra plus être modifiée.
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

        {/* Contenu scrollable */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-2 pr-3 pb-4">
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

            {/* Section Construction */}
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

            {/* Section Pièces */}
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

            {/* Section Matériaux */}
            <Card className="rounded-xl border-border/50 shadow-sm">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-amber-600" />
                    <h4 className="text-xs font-semibold">Matériaux de construction</h4>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setActiveTab('materials'); setStep('form'); }} className="h-6 px-2 text-xs text-muted-foreground hover:text-primary">
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

            {/* Section Emplacement */}
            <Card className="rounded-xl border-border/50 shadow-sm">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-cyan-600" />
                    <h4 className="text-xs font-semibold">Emplacement & Position</h4>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setActiveTab('materials'); setStep('form'); }} className="h-6 px-2 text-xs text-muted-foreground hover:text-primary">
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
                      <span className="font-medium">{facadeOrientation}</span>
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
            {(constructionType === 'appartement' || constructionType === 'studio' || constructionType === 'immeuble') && (
              <Card className="rounded-xl border-border/50 shadow-sm">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-indigo-600" />
                      <h4 className="text-xs font-semibold">Détails Appartement / Immeuble</h4>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setActiveTab('materials'); setStep('form'); }} className="h-6 px-2 text-xs text-muted-foreground hover:text-primary">
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
                  <Button variant="ghost" size="sm" onClick={() => { setActiveTab('environment'); setStep('form'); }} className="h-6 px-2 text-xs text-muted-foreground hover:text-primary">
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
                    <span className="font-medium">{SOUND_LABELS[soundEnvironment] || soundEnvironment}</span>
                  </div>
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
                  {nearbyAmenities && (
                    <div className="flex justify-between text-xs py-1.5">
                      <span className="text-muted-foreground">Commodités</span>
                      <span className="font-medium text-right max-w-[55%] truncate">{nearbyAmenities}</span>
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
        </ScrollArea>

        {/* Pied fixe avec montant et actions */}
        <div className="shrink-0 pt-3 space-y-3 border-t border-border/50 mt-2">
          {/* Montant total */}
          <Card className="rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Frais d'expertise</span>
                </div>
                <span className="text-xl font-bold text-primary">{getTotalAmount()} USD</span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setStep('form')}
              className="flex-1 h-11 rounded-xl"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Modifier
            </Button>
            <Button
              onClick={handleProceedToPayment}
              disabled={requiredMissing.length > 0 || loadingFees}
              className="flex-1 h-11 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 shadow-md"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Payer
            </Button>
          </div>

          {requiredMissing.length === 0 && (
            <div className="flex items-center justify-center gap-2 text-xs text-green-600">
              <CheckCircle2 className="h-4 w-4" />
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
          {fees.map((fee) => (
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
                  <SelectItem value="airtel">Airtel Money</SelectItem>
                  <SelectItem value="orange">Orange Money</SelectItem>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
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
          disabled={processingPayment || (paymentMethod === 'mobile_money' && (!paymentProvider || !paymentPhone))}
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-[95vw] sm:max-w-[420px] max-h-[90vh] p-4 rounded-2xl z-[1200]">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-primary" />
            {step === 'form' && 'Expertise immobilière'}
            {step === 'summary' && 'Récapitulatif'}
            {step === 'payment' && 'Paiement'}
            {step === 'confirmation' && 'Confirmation'}
          </DialogTitle>
          {step === 'form' && (
            <DialogDescription className="text-xs">
              Renseignez les détails pour obtenir un certificat de valeur vénale
            </DialogDescription>
          )}
        </DialogHeader>

        {step === 'form' && renderForm()}
        {step === 'summary' && renderSummary()}
        {step === 'payment' && renderPayment()}
        {step === 'confirmation' && renderConfirmation()}
      </DialogContent>
    </Dialog>
  );
};

export default RealEstateExpertiseRequestDialog;
