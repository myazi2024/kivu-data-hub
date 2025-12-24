import React, { useState, useRef } from 'react';
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
import { 
  Loader2, FileSearch, MapPin, Building, Droplets, Zap, Wifi, 
  Shield, Car, Trees, AlertTriangle, Upload, X, FileText, Image, CheckCircle2
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

  const [step, setStep] = useState<'form' | 'confirmation'>('form');
  const [createdRequest, setCreatedRequest] = useState<any>(null);

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

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    let documentUrls: string[] = [];
    if (attachedFiles.length > 0) {
      documentUrls = await uploadFiles();
    }

    const request = await createExpertiseRequest({
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
      supporting_documents: documentUrls,
      requester_name: profile?.full_name || user.email || 'Utilisateur',
      requester_phone: undefined,
      requester_email: profile?.email || user.email || undefined,
    });

    if (request) {
      setCreatedRequest(request);
      setStep('confirmation');
      onSuccess?.();
    }
  };

  const handleClose = () => {
    setStep('form');
    setCreatedRequest(null);
    setPropertyDescription('');
    setConstructionYear('');
    setTotalBuiltAreaSqm('');
    setAdditionalNotes('');
    setAttachedFiles([]);
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
          onClick={handleSubmit} 
          className="w-full h-12 text-sm font-semibold rounded-xl shadow-lg"
          disabled={loading || uploadingFiles}
        >
          {loading || uploadingFiles ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {uploadingFiles ? 'Envoi des fichiers...' : 'Création...'}
            </>
          ) : (
            <>
              <FileSearch className="h-4 w-4 mr-2" />
              Soumettre la demande d'expertise
            </>
          )}
        </Button>
      </div>
    </ScrollArea>
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
      <DialogContent className={`${isMobile ? 'max-w-[95vw]' : 'max-w-lg'} p-4 rounded-2xl`}>
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-primary" />
            Demande d'expertise immobilière
          </DialogTitle>
          <DialogDescription className="text-sm">
            Évaluation de la valeur vénale pour la parcelle {parcelNumber}
          </DialogDescription>
        </DialogHeader>
        
        {step === 'form' ? renderForm() : renderConfirmation()}
      </DialogContent>
    </Dialog>
  );
};

export default RealEstateExpertiseRequestDialog;
