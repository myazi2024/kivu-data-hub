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
import { 
  Loader2, FileSearch, MapPin, Building, Droplets, Zap, Wifi, 
  Shield, Car, Trees, AlertTriangle, Upload, X, FileText, Image, CheckCircle2,
  CreditCard, Smartphone, ArrowLeft, Receipt, DollarSign, Phone
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRealEstateExpertise } from '@/hooks/useRealEstateExpertise';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'form' | 'payment' | 'confirmation'>('form');
  const [createdRequest, setCreatedRequest] = useState<any>(null);

  // Payment state
  const [fees, setFees] = useState<ExpertiseFee[]>([]);
  const [loadingFees, setLoadingFees] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'bank_card'>('mobile_money');
  const [paymentProvider, setPaymentProvider] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [formData, setFormData] = useState<any>(null);

  // Form state
  const [propertyDescription, setPropertyDescription] = useState('');
  const [constructionYear, setConstructionYear] = useState('');
  const [constructionQuality, setConstructionQuality] = useState('standard');
  const [numberOfFloors, setNumberOfFloors] = useState('1');
  const [totalBuiltAreaSqm, setTotalBuiltAreaSqm] = useState('');
  const [propertyCondition, setPropertyCondition] = useState('bon');

  // Équipements
  const [hasWaterSupply, setHasWaterSupply] = useState(false);
  const [hasElectricity, setHasElectricity] = useState(false);
  const [hasSewageSystem, setHasSewageSystem] = useState(false);
  const [hasInternet, setHasInternet] = useState(false);
  const [hasSecuritySystem, setHasSecuritySystem] = useState(false);
  const [hasParking, setHasParking] = useState(false);
  const [parkingSpaces, setParkingSpaces] = useState('');
  const [hasGarden, setHasGarden] = useState(false);
  const [gardenAreaSqm, setGardenAreaSqm] = useState('');

  // Environnement
  const [roadAccessType, setRoadAccessType] = useState('asphalte');
  const [distanceToMainRoad, setDistanceToMainRoad] = useState('');
  const [distanceToHospital, setDistanceToHospital] = useState('');
  const [distanceToSchool, setDistanceToSchool] = useState('');
  const [distanceToMarket, setDistanceToMarket] = useState('');
  const [floodRiskZone, setFloodRiskZone] = useState(false);
  const [erosionRiskZone, setErosionRiskZone] = useState(false);

  const [additionalNotes, setAdditionalNotes] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newFiles = Array.from(files);
    const validFiles = newFiles.filter(file => {
      const isValid = file.type.startsWith('image/') || file.type === 'application/pdf';
      const isValidSize = file.size <= 10 * 1024 * 1024;
      if (!isValid) toast.error(`${file.name}: Format non supporté`);
      if (!isValidSize) toast.error(`${file.name}: Fichier trop volumineux (max 10MB)`);
      return isValid && isValidSize;
    });
    
    setAttachedFiles(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<string[]> => {
    if (attachedFiles.length === 0) return [];
    
    setUploadingFiles(true);
    const urls: string[] = [];
    
    try {
      for (const file of attachedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `expertise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `expertise-documents/${user?.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('cadastral-documents')
          .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
        const { data } = supabase.storage.from('cadastral-documents').getPublicUrl(filePath);
        urls.push(data.publicUrl);
      }
      
      return urls;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Erreur lors du téléchargement des fichiers');
      return [];
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleProceedToPayment = () => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    // Store form data for later submission
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
      additional_notes: additionalNotes || undefined,
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
      let documentUrls: string[] = [];
      if (attachedFiles.length > 0) {
        documentUrls = await uploadFiles();
      }

      // Create the expertise request
      const request = await createExpertiseRequest({
        ...formData,
        supporting_documents: documentUrls,
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
        // Call mobile money edge function
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

        // Simulate payment confirmation (in production, this would be webhook-based)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Update payment status
        await supabase
          .from('expertise_payments')
          .update({
            status: 'completed',
            paid_at: new Date().toISOString(),
            transaction_id: paymentResult?.transaction_id || 'TXN-' + Date.now()
          })
          .eq('id', paymentRecord.id);

        // Update expertise request payment status
        await supabase
          .from('real_estate_expertise_requests')
          .update({ payment_status: 'paid' })
          .eq('id', request.id);

      } else if (paymentMethod === 'bank_card') {
        // Stripe payment
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
    setCreatedRequest(null);
    setFormData(null);
    setPropertyDescription('');
    setConstructionYear('');
    setTotalBuiltAreaSqm('');
    setAdditionalNotes('');
    setAttachedFiles([]);
    setPaymentMethod('mobile_money');
    setPaymentProvider('');
    setPaymentPhone('');
    onOpenChange(false);
  };

  const renderForm = () => (
    <ScrollArea className="h-[65vh] sm:h-[70vh]">
      <div className="space-y-4 pr-2">
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

        <Alert className="rounded-xl bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
            Veuillez renseigner toutes les informations pertinentes sur ce bien. 
            Un expert analysera votre demande et vous délivrera un certificat d'expertise immobilière valable 6 mois.
          </AlertDescription>
        </Alert>

        {/* Description du bien */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Description du bien</Label>
          <Textarea
            value={propertyDescription}
            onChange={(e) => setPropertyDescription(e.target.value)}
            placeholder="Décrivez brièvement le bien (type, caractéristiques principales...)"
            className="min-h-[80px] text-sm rounded-xl border-2"
          />
        </div>

        {/* Informations construction */}
        <Card className="border rounded-xl">
          <CardContent className="p-3 space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              Informations sur la construction
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Année de construction</Label>
                <Input
                  type="number"
                  value={constructionYear}
                  onChange={(e) => setConstructionYear(e.target.value)}
                  placeholder="Ex: 2015"
                  className="h-10 text-sm rounded-xl border-2"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nombre d'étages</Label>
                <Input
                  type="number"
                  value={numberOfFloors}
                  onChange={(e) => setNumberOfFloors(e.target.value)}
                  placeholder="1"
                  className="h-10 text-sm rounded-xl border-2"
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
                  className="h-10 text-sm rounded-xl border-2"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Qualité construction</Label>
                <Select value={constructionQuality} onValueChange={setConstructionQuality}>
                  <SelectTrigger className="h-10 text-sm rounded-xl border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONSTRUCTION_QUALITY_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">État du bien</Label>
              <Select value={propertyCondition} onValueChange={setPropertyCondition}>
                <SelectTrigger className="h-10 text-sm rounded-xl border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_CONDITION_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  placeholder="Nb places"
                  className="h-8 w-20 text-xs rounded-lg"
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

        {/* Environnement */}
        <Card className="border rounded-xl">
          <CardContent className="p-3 space-y-3">
            <h4 className="text-sm font-semibold">Environnement & accessibilité</h4>
            
            <div className="space-y-1.5">
              <Label className="text-xs">Type d'accès routier</Label>
              <Select value={roadAccessType} onValueChange={setRoadAccessType}>
                <SelectTrigger className="h-10 text-sm rounded-xl border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROAD_ACCESS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Distance route principale (m)</Label>
                <Input
                  type="number"
                  value={distanceToMainRoad}
                  onChange={(e) => setDistanceToMainRoad(e.target.value)}
                  placeholder="Ex: 50"
                  className="h-10 text-sm rounded-xl border-2"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Distance hôpital (km)</Label>
                <Input
                  type="number"
                  value={distanceToHospital}
                  onChange={(e) => setDistanceToHospital(e.target.value)}
                  placeholder="Ex: 2"
                  className="h-10 text-sm rounded-xl border-2"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Distance école (km)</Label>
                <Input
                  type="number"
                  value={distanceToSchool}
                  onChange={(e) => setDistanceToSchool(e.target.value)}
                  placeholder="Ex: 1"
                  className="h-10 text-sm rounded-xl border-2"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Distance marché (km)</Label>
                <Input
                  type="number"
                  value={distanceToMarket}
                  onChange={(e) => setDistanceToMarket(e.target.value)}
                  placeholder="Ex: 0.5"
                  className="h-10 text-sm rounded-xl border-2"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox checked={floodRiskZone} onCheckedChange={(c) => setFloodRiskZone(c === true)} />
                <span className="text-sm text-amber-600">Zone inondable</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={erosionRiskZone} onCheckedChange={(c) => setErosionRiskZone(c === true)} />
                <span className="text-sm text-amber-600">Zone d'érosion</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes additionnelles */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Notes additionnelles</Label>
          <Textarea
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="Autres informations pertinentes (servitudes, litiges, potentiel de développement...)"
            className="min-h-[80px] text-sm rounded-xl border-2"
          />
        </div>

        {/* Documents */}
        <Card className="border rounded-xl">
          <CardContent className="p-3 space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Upload className="h-4 w-4 text-muted-foreground" />
              Documents justificatifs (optionnel)
            </h4>
            <p className="text-xs text-muted-foreground">
              Photos du bien, plans, titre foncier... (max 10MB/fichier)
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-11 text-sm rounded-xl border-2 border-dashed"
            >
              <Upload className="h-4 w-4 mr-2" />
              Ajouter des fichiers
            </Button>
            
            {attachedFiles.length > 0 && (
              <div className="space-y-2">
                {attachedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-xl">
                    {file.type.startsWith('image/') ? (
                      <Image className="h-4 w-4 text-primary flex-shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                    <span className="flex-1 truncate text-sm">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(index)}
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

        <Button 
          onClick={handleProceedToPayment} 
          className="w-full h-12 text-sm font-semibold rounded-xl shadow-lg"
          disabled={loading || uploadingFiles || loadingFees}
        >
          {loadingFees ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Chargement...
            </>
          ) : (
            <>
              <DollarSign className="h-4 w-4 mr-2" />
              Continuer vers le paiement ({getTotalAmount()}$)
            </>
          )}
        </Button>
      </div>
    </ScrollArea>
  );

  const renderPayment = () => (
    <div className="space-y-3">
      {/* Header compact avec montant */}
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

      {/* Détails des frais - compact */}
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

      {/* Mode de paiement - boutons compacts */}
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

      {/* Détails Mobile Money - optimisé mobile */}
      {paymentMethod === 'mobile_money' && (
        <div className="bg-muted/20 rounded-2xl p-2.5 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] font-medium mb-1 block">Opérateur</Label>
              <Select value={paymentProvider} onValueChange={setPaymentProvider}>
                <SelectTrigger className="h-9 rounded-xl text-sm">
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
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

      {/* Boutons - responsive */}
      <div className="flex gap-2 pt-1">
        <Button 
          variant="outline" 
          onClick={() => setStep('form')}
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
    <div className="space-y-6 text-center py-6">
      <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
        <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-xl font-bold">Demande envoyée !</h3>
        <p className="text-muted-foreground text-sm">
          Votre demande d'expertise immobilière a été soumise avec succès.
        </p>
      </div>

      {createdRequest && (
        <Card className="bg-muted/50 rounded-xl">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">N° de référence</span>
              <span className="font-mono font-bold">{createdRequest.reference_number}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Parcelle</span>
              <span className="font-medium">{parcelNumber}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Montant payé</span>
              <span className="font-medium text-green-600">{getTotalAmount()}$</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Alert className="text-left rounded-xl">
        <AlertDescription className="text-sm">
          Un expert immobilier examinera votre demande et vous contactera pour fixer un rendez-vous d'évaluation. 
          Le certificat d'expertise sera valable pendant <strong>6 mois</strong> après son émission.
        </AlertDescription>
      </Alert>

      <Button onClick={handleClose} className="w-full h-12 rounded-xl">
        Fermer
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={`${isMobile ? 'max-w-[95vw]' : 'max-w-lg'} p-4 rounded-2xl z-[1100]`}>
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-primary" />
            Demande d'expertise immobilière
          </DialogTitle>
          <DialogDescription className="text-sm">
            Évaluation de la valeur vénale pour la parcelle {parcelNumber}
          </DialogDescription>
        </DialogHeader>
        
        {step === 'form' && renderForm()}
        {step === 'payment' && renderPayment()}
        {step === 'confirmation' && renderConfirmation()}
      </DialogContent>
    </Dialog>
  );
};

export default RealEstateExpertiseRequestDialog;
