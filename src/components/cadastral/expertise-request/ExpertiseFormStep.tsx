import React, { useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MapPin, Building, Droplets, Zap, Wifi, Shield, Car, Trees, AlertTriangle,
  Upload, X, FileText, Image, CheckCircle2, Receipt, Home, Volume2, Layers,
  Building2, Camera, Info, Mic, MicOff, Fence, Warehouse, DoorOpen, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import SuggestivePicklist from '../SuggestivePicklist';
import SectionHelpPopover from '../SectionHelpPopover';
import type { ExpertiseFormState, FormAction, ParcelData } from './types';
import {
  CONSTRUCTION_TYPE_OPTIONS, CONSTRUCTION_QUALITY_OPTIONS, PROPERTY_CONDITION_OPTIONS,
  ROAD_ACCESS_OPTIONS, WALL_MATERIAL_OPTIONS, WINDOW_TYPE_OPTIONS, FLOOR_MATERIAL_OPTIONS,
  ROOF_MATERIAL_OPTIONS, FACADE_ORIENTATION_OPTIONS, BUILDING_POSITION_OPTIONS,
  ACCESSIBILITY_OPTIONS, SOUND_ENVIRONMENT_OPTIONS, YEAR_OPTIONS
} from './constants';

interface ExpertiseFormStepProps {
  state: ExpertiseFormState;
  dispatch: React.Dispatch<FormAction>;
  parcelNumber: string;
  parcelData?: ParcelData;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  parcelDocuments: File[];
  setParcelDocuments: React.Dispatch<React.SetStateAction<File[]>>;
  constructionImages: File[];
  setConstructionImages: React.Dispatch<React.SetStateAction<File[]>>;
  constructionImageUrls: string[];
  setConstructionImageUrls: React.Dispatch<React.SetStateAction<string[]>>;
  loading: boolean;
  loadingFees: boolean;
  uploadingFiles: boolean;
  onProceedToSummary: () => void;
  certificateChecked: boolean;
  checkingCertificate: boolean;
  existingCertificate: any;
  scrollAreaRef: React.RefObject<HTMLDivElement>;
}

const ExpertiseFormStep: React.FC<ExpertiseFormStepProps> = ({
  state, dispatch, parcelNumber, parcelData,
  activeTab, setActiveTab,
  parcelDocuments, setParcelDocuments,
  constructionImages, setConstructionImages,
  constructionImageUrls, setConstructionImageUrls,
  loading, loadingFees, uploadingFiles,
  onProceedToSummary, certificateChecked, checkingCertificate, existingCertificate,
  scrollAreaRef
}) => {
  const parcelDocsInputRef = useRef<HTMLInputElement>(null);
  const constructionImagesInputRef = useRef<HTMLInputElement>(null);

  // Sound measurement refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isRecordingSound, setIsRecordingSound] = React.useState(false);
  const [microphoneError, setMicrophoneError] = React.useState<string | null>(null);

  const setField = useCallback((field: keyof ExpertiseFormState, value: any) => {
    dispatch({ type: 'SET_FIELD', field, value });
  }, [dispatch]);

  const isTerrainNu = state.constructionType === 'terrain_nu';
  const isApartmentOrBuilding = ['appartement', 'immeuble', 'duplex', 'studio'].includes(state.constructionType);

  const handleNonNegativeChange = (field: keyof ExpertiseFormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || parseFloat(value) >= 0) setField(field, value);
  };

  const getSoundLevelFromDecibels = useCallback((db: number): string => {
    const match = SOUND_ENVIRONMENT_OPTIONS.find(opt => db >= opt.minDb && db < opt.maxDb);
    return match?.value || 'modere';
  }, []);

  const stopSoundMeasurement = useCallback(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    setIsRecordingSound(false);
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
        const estimatedDb = Math.round((average / 255) * 100);
        setField('measuredDecibels', estimatedDb);
        const detectedLevel = getSoundLevelFromDecibels(estimatedDb);
        setField('soundEnvironment', detectedLevel);
        animationFrameRef.current = requestAnimationFrame(measureSound);
      };
      measureSound();
    } catch {
      setMicrophoneError('Impossible d\'accéder au microphone. Vérifiez les autorisations.');
      setField('isOnSite', false);
    }
  };

  useEffect(() => {
    return () => stopSoundMeasurement();
  }, [stopSoundMeasurement]);

  const handleParcelDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const validFiles = Array.from(files).filter(file => {
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
    const validFiles = Array.from(files).filter(file => {
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

  const removeParcelDoc = (index: number) => setParcelDocuments(prev => prev.filter((_, i) => i !== index));

  const removeConstructionImage = (index: number) => {
    if (constructionImageUrls[index]) URL.revokeObjectURL(constructionImageUrls[index]);
    setConstructionImages(prev => prev.filter((_, i) => i !== index));
    setConstructionImageUrls(prev => prev.filter((_, i) => i !== index));
  };

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
    <div className="space-y-3">
      {renderNoCertificateInfo()}
      {checkingCertificate ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
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
              {/* GENERAL TAB */}
              <TabsContent value="general" className="space-y-3 pr-2 mt-0">
                <Alert className="border-amber-500/30 bg-amber-500/10 rounded-xl">
                  <Info className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
                    <strong>Important :</strong> Les informations que vous fournissez serviront de base à l'expert pour définir les facteurs clés de l'évaluation et organiser la visite terrain de votre construction. Veillez à leur exactitude.
                  </AlertDescription>
                </Alert>

                {/* Type de bien */}
                <Card className="border rounded-xl">
                  <CardContent className="p-3 space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      Type de bien
                      <SectionHelpPopover title="Type de bien" description="Sélectionnez la catégorie qui correspond le mieux à votre construction." />
                    </h4>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Type de construction</Label>
                      <Select value={state.constructionType} onValueChange={(v) => setField('constructionType', v)}>
                        <SelectTrigger className="h-10 text-sm rounded-xl border-2"><SelectValue /></SelectTrigger>
                        <SelectContent className="z-[1200]">
                          {CONSTRUCTION_TYPE_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Description du bien</Label>
                      <Textarea value={state.propertyDescription} onChange={(e) => setField('propertyDescription', e.target.value)} placeholder="Décrivez brièvement le bien..." className="min-h-[60px] text-sm rounded-xl border-2" />
                    </div>
                  </CardContent>
                </Card>

                {/* Caractéristiques - hidden for terrain nu */}
                {!isTerrainNu && (
                  <Card className="border rounded-xl">
                    <CardContent className="p-3 space-y-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        Caractéristiques
                        <SectionHelpPopover title="Caractéristiques" description="Renseignez les données techniques de votre bien." />
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Année construction</Label>
                          <Select value={state.constructionYear} onValueChange={(v) => setField('constructionYear', v)}>
                            <SelectTrigger className="h-9 text-sm rounded-xl border-2"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                            <SelectContent className="z-[1200] max-h-[200px]">
                              {YEAR_OPTIONS.map(opt => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Nombre d'étages</Label>
                          <Input type="number" min="0" value={state.numberOfFloors} onChange={handleNonNegativeChange('numberOfFloors')} placeholder="1" className="h-9 text-sm rounded-xl border-2" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Surface bâtie (m²)</Label>
                          <Input type="number" min="0" value={state.totalBuiltAreaSqm} onChange={handleNonNegativeChange('totalBuiltAreaSqm')} placeholder="Ex: 150" className="h-9 text-sm rounded-xl border-2" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Qualité</Label>
                          <Select value={state.constructionQuality} onValueChange={(v) => setField('constructionQuality', v)}>
                            <SelectTrigger className="h-9 text-sm rounded-xl border-2"><SelectValue /></SelectTrigger>
                            <SelectContent className="z-[1200]">
                              {CONSTRUCTION_QUALITY_OPTIONS.map(opt => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Pièces</Label>
                          <Input type="number" min="0" value={state.numberOfRooms} onChange={handleNonNegativeChange('numberOfRooms')} placeholder="5" className="h-9 text-sm rounded-xl border-2" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Chambres</Label>
                          <Input type="number" min="0" value={state.numberOfBedrooms} onChange={handleNonNegativeChange('numberOfBedrooms')} placeholder="3" className="h-9 text-sm rounded-xl border-2" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">SDB</Label>
                          <Input type="number" min="0" value={state.numberOfBathrooms} onChange={handleNonNegativeChange('numberOfBathrooms')} placeholder="2" className="h-9 text-sm rounded-xl border-2" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">État du bien</Label>
                        <Select value={state.propertyCondition} onValueChange={(v) => setField('propertyCondition', v)}>
                          <SelectTrigger className="h-9 text-sm rounded-xl border-2"><SelectValue /></SelectTrigger>
                          <SelectContent className="z-[1200]">
                            {PROPERTY_CONDITION_OPTIONS.map(opt => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Apartment details */}
                {isApartmentOrBuilding && (
                  <Card className="border rounded-xl border-blue-200 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-950/20">
                    <CardContent className="p-3 space-y-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-600" />
                        Détails appartement/immeuble
                        <SectionHelpPopover title="Détails appartement/immeuble" description="Précisez l'étage, l'accessibilité et les charges mensuelles." />
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">N° d'étage</Label>
                          <Input type="number" value={state.floorNumber} onChange={(e) => setField('floorNumber', e.target.value)} placeholder="Ex: 2" className="h-9 text-sm rounded-xl border-2" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Étages total</Label>
                          <Input type="number" value={state.totalBuildingFloors} onChange={(e) => setField('totalBuildingFloors', e.target.value)} placeholder="Ex: 5" className="h-9 text-sm rounded-xl border-2" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Accessibilité</Label>
                        <Select value={state.accessibility} onValueChange={(v) => setField('accessibility', v)}>
                          <SelectTrigger className="h-9 text-sm rounded-xl border-2"><SelectValue /></SelectTrigger>
                          <SelectContent className="z-[1200]">
                            {ACCESSIBILITY_OPTIONS.map(opt => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">N° appartement</Label>
                          <Input value={state.apartmentNumber} onChange={(e) => setField('apartmentNumber', e.target.value)} placeholder="Ex: A12" className="h-9 text-sm rounded-xl border-2" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Charges/mois ($)</Label>
                          <Input type="number" value={state.monthlyCharges} onChange={(e) => setField('monthlyCharges', e.target.value)} placeholder="50" className="h-9 text-sm rounded-xl border-2" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                        <Checkbox checked={state.hasCommonAreas} onCheckedChange={(c) => setField('hasCommonAreas', c === true)} />
                        <span className="text-sm">Parties communes (hall, parking commun...)</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Position */}
                <Card className="border rounded-xl">
                  <CardContent className="p-3 space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      Position sur la parcelle
                      <SectionHelpPopover title="Position sur la parcelle" description="Indiquez l'emplacement de la construction sur la parcelle." />
                    </h4>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Emplacement construction</Label>
                      <Select value={state.buildingPosition} onValueChange={(v) => setField('buildingPosition', v)}>
                        <SelectTrigger className="h-9 text-sm rounded-xl border-2"><SelectValue /></SelectTrigger>
                        <SelectContent className="z-[1200]">
                          {BUILDING_POSITION_OPTIONS.map(opt => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Orientation façade</Label>
                        <Select value={state.facadeOrientation} onValueChange={(v) => setField('facadeOrientation', v)}>
                          <SelectTrigger className="h-9 text-sm rounded-xl border-2"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                          <SelectContent className="z-[1200]">
                            {FACADE_ORIENTATION_OPTIONS.map(opt => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Distance route (m)</Label>
                        <Input type="number" min="0" value={state.distanceFromRoad} onChange={handleNonNegativeChange('distanceFromRoad')} placeholder="Ex: 5" className="h-9 text-sm rounded-xl border-2" />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        <Checkbox checked={state.isCornerPlot} onCheckedChange={(c) => setField('isCornerPlot', c === true)} />
                        <span className="text-sm">Parcelle d'angle</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox checked={state.hasDirectStreetAccess} onCheckedChange={(c) => setField('hasDirectStreetAccess', c === true)} />
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
                      <SectionHelpPopover title="Équipements & commodités" description="Cochez tous les équipements présents dans votre propriété." />
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { field: 'hasWaterSupply' as const, label: 'Eau courante', icon: <Droplets className="h-3.5 w-3.5 text-blue-500" /> },
                        { field: 'hasElectricity' as const, label: 'Électricité', icon: <Zap className="h-3.5 w-3.5 text-yellow-500" /> },
                        { field: 'hasSewageSystem' as const, label: 'Assainissement', icon: <Droplets className="h-3.5 w-3.5 text-gray-500" /> },
                        { field: 'hasSecuritySystem' as const, label: 'Sécurité', icon: <Shield className="h-3.5 w-3.5 text-red-500" /> },
                        { field: 'hasGarden' as const, label: 'Jardin', icon: <Trees className="h-3.5 w-3.5 text-green-600" /> },
                      ].map(({ field, label, icon }) => (
                        <div key={field} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                          <Checkbox checked={state[field] as boolean} onCheckedChange={(c) => setField(field, c === true)} />
                          <div className="flex items-center gap-1.5 text-sm">{icon}{label}</div>
                        </div>
                      ))}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                          <Checkbox checked={state.hasInternet} onCheckedChange={(c) => {
                            setField('hasInternet', c === true);
                            if (c !== true) setField('internetProvider', '');
                          }} />
                          <div className="flex items-center gap-1.5 text-sm">
                            <Wifi className="h-3.5 w-3.5 text-green-500" />Internet
                          </div>
                        </div>
                        {state.hasInternet && (
                          <div className="ml-8">
                            <Select value={state.internetProvider} onValueChange={(v) => setField('internetProvider', v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Fournisseur d'accès internet" /></SelectTrigger>
                              <SelectContent>
                                {['canalbox', 'starlink', 'vodacom', 'airtel', 'orange', 'vsat', 'microcom', 'autre'].map(p => (
                                  <SelectItem key={p} value={p}>{p === 'vsat' ? 'V-Sat' : p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { field: 'hasPool' as const, label: 'Piscine' },
                        { field: 'hasAirConditioning' as const, label: 'Climatisation' },
                        { field: 'hasSolarPanels' as const, label: 'Panneaux solaires' },
                        { field: 'hasGenerator' as const, label: 'Groupe électrogène' },
                        { field: 'hasWaterTank' as const, label: 'Citerne d\'eau' },
                        { field: 'hasBorehole' as const, label: 'Forage' },
                      ].map(({ field, label }) => (
                        <div key={field} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                          <Checkbox checked={state[field] as boolean} onCheckedChange={(c) => setField(field, c === true)} />
                          <span className="text-sm">{label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { field: 'hasElectricFence' as const, label: 'Clôture électrique', icon: <Fence className="h-3.5 w-3.5 text-orange-500" /> },
                        { field: 'hasGarage' as const, label: 'Garage', icon: <Warehouse className="h-3.5 w-3.5 text-slate-600" /> },
                        { field: 'hasCellar' as const, label: 'Cave', icon: null },
                        { field: 'hasAutomaticGate' as const, label: 'Portail auto.', icon: <DoorOpen className="h-3.5 w-3.5 text-indigo-500" /> },
                      ].map(({ field, label, icon }) => (
                        <div key={field} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                          <Checkbox checked={state[field] as boolean} onCheckedChange={(c) => setField(field, c === true)} />
                          <div className="flex items-center gap-1.5 text-sm">{icon}{label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                      <Checkbox checked={state.hasParking} onCheckedChange={(c) => setField('hasParking', c === true)} />
                      <div className="flex items-center gap-1.5 text-sm flex-1">
                        <Car className="h-3.5 w-3.5 text-slate-500" />Parking
                      </div>
                      {state.hasParking && (
                        <Input type="number" min="0" value={state.parkingSpaces} onChange={handleNonNegativeChange('parkingSpaces')} placeholder="Places" className="h-8 w-16 text-xs rounded-lg" />
                      )}
                    </div>
                    {state.hasGarden && (
                      <div className="flex items-center gap-2 pl-6">
                        <Label className="text-xs">Surface jardin (m²)</Label>
                        <Input type="number" min="0" value={state.gardenAreaSqm} onChange={handleNonNegativeChange('gardenAreaSqm')} placeholder="Ex: 50" className="h-8 w-24 text-xs rounded-lg" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* MATERIALS TAB */}
              <TabsContent value="materiaux" className="space-y-3 pr-2 mt-0">
                <Card className="border rounded-xl">
                  <CardContent className="p-3 space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      Matériaux de construction
                      <SectionHelpPopover title="Matériaux de construction" description="Précisez les matériaux utilisés pour les murs, la toiture, les fenêtres et le sol." />
                    </h4>
                    {[
                      { label: 'Murs / Élévation', field: 'wallMaterial' as const, options: WALL_MATERIAL_OPTIONS },
                      { label: 'Toiture', field: 'roofMaterial' as const, options: ROOF_MATERIAL_OPTIONS },
                      { label: 'Fenêtres', field: 'windowType' as const, options: WINDOW_TYPE_OPTIONS },
                      { label: 'Sol / Revêtement', field: 'floorMaterial' as const, options: FLOOR_MATERIAL_OPTIONS },
                    ].map(({ label, field, options }) => (
                      <div key={field} className="space-y-1.5">
                        <Label className="text-xs">{label}</Label>
                        <Select value={state[field]} onValueChange={(v) => setField(field, v)}>
                          <SelectTrigger className="h-9 text-sm rounded-xl border-2"><SelectValue /></SelectTrigger>
                          <SelectContent className="z-[1200]">
                            {options.map(opt => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                    <Separator className="my-2" />
                    <h5 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      Finitions
                      <SectionHelpPopover title="Finitions" description="Indiquez l'état des finitions intérieures." />
                    </h5>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { field: 'hasPlaster' as const, label: 'Crépi' },
                        { field: 'hasPainting' as const, label: 'Peinture' },
                        { field: 'hasCeiling' as const, label: 'Plafond' },
                      ].map(({ field, label }) => (
                        <div key={field} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                          <Checkbox checked={state[field] as boolean} onCheckedChange={(c) => setField(field, c === true)} />
                          <span className="text-sm">{label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                      <Checkbox checked={state.hasDoubleGlazing} onCheckedChange={(c) => setField('hasDoubleGlazing', c === true)} />
                      <span className="text-sm">Double vitrage (isolation phonique)</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ENVIRONMENT TAB */}
              <TabsContent value="environnement" className="space-y-3 pr-2 mt-0">
                {/* Sound */}
                <Card className="border rounded-xl">
                  <CardContent className="p-3 space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Volume2 className="h-4 w-4 text-muted-foreground" />
                      Environnement sonore
                      <SectionHelpPopover title="Environnement sonore" description="Évaluez le niveau de bruit autour du bien." />
                    </h4>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Êtes-vous actuellement sur la construction ?</Label>
                      <RadioGroup
                        value={state.isOnSite === null ? '' : state.isOnSite ? 'yes' : 'no'}
                        onValueChange={(v) => {
                          setField('isOnSite', v === 'yes');
                          if (v === 'no') { stopSoundMeasurement(); setField('measuredDecibels', null); }
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

                    {state.isOnSite === true && (
                      <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 rounded-xl">
                        <CardContent className="p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Mic className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium">Mesure du bruit ambiant</span>
                            </div>
                            {state.measuredDecibels !== null && (
                              <Badge variant="secondary" className="text-xs">~{state.measuredDecibels} dB</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">Activez le microphone pour mesurer le niveau sonore en temps réel.</p>
                          {microphoneError && (
                            <Alert className="bg-red-50 border-red-200 rounded-lg">
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                              <AlertDescription className="text-xs text-red-700">{microphoneError}</AlertDescription>
                            </Alert>
                          )}
                          <div className="flex gap-2">
                            {!isRecordingSound ? (
                              <Button type="button" variant="outline" onClick={startSoundMeasurement} className="flex-1 h-9 text-sm rounded-xl border-blue-300 text-blue-700 hover:bg-blue-100">
                                <Mic className="h-4 w-4 mr-2" />Démarrer la mesure
                              </Button>
                            ) : (
                              <Button type="button" variant="destructive" onClick={stopSoundMeasurement} className="flex-1 h-9 text-sm rounded-xl">
                                <MicOff className="h-4 w-4 mr-2" />Arrêter la mesure
                              </Button>
                            )}
                          </div>
                          {isRecordingSound && state.measuredDecibels !== null && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span>Niveau mesuré:</span>
                                <span className="font-bold text-blue-700">{state.measuredDecibels} dB</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                                <div className={`h-3 rounded-full transition-all duration-300 ${
                                  state.measuredDecibels < 40 ? 'bg-green-500' : state.measuredDecibels < 55 ? 'bg-lime-500' : state.measuredDecibels < 70 ? 'bg-yellow-500' : state.measuredDecibels < 85 ? 'bg-orange-500' : 'bg-red-500'
                                }`} style={{ width: `${Math.min(100, state.measuredDecibels)}%` }} />
                              </div>
                              <p className="text-xs text-center font-medium text-blue-700">
                                Niveau détecté: {SOUND_ENVIRONMENT_OPTIONS.find(o => o.value === state.soundEnvironment)?.label}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {(state.isOnSite === false || state.isOnSite === null) && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Niveau sonore estimé</Label>
                        <Select value={state.soundEnvironment} onValueChange={(v) => { setField('soundEnvironment', v); if (v === 'tres_calme') setField('nearbyNoiseSources', []); }}>
                          <SelectTrigger className="h-9 text-sm rounded-xl border-2"><SelectValue /></SelectTrigger>
                          <SelectContent className="z-[1200]">
                            {SOUND_ENVIRONMENT_OPTIONS.map(opt => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {state.isOnSite === true && state.measuredDecibels !== null && !isRecordingSound && (
                      <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200">
                        <span className="text-sm">Niveau sonore mesuré:</span>
                        <Badge className="bg-green-600 text-white">
                          {SOUND_ENVIRONMENT_OPTIONS.find(o => o.value === state.soundEnvironment)?.label} ({state.measuredDecibels} dB)
                        </Badge>
                      </div>
                    )}

                    {state.soundEnvironment !== 'tres_calme' && (
                      <SuggestivePicklist picklistKey="noise_sources" label="Sources de bruit à proximité" placeholder="Rechercher ou ajouter une source..." selectedValues={state.nearbyNoiseSources} onSelectionChange={(v) => setField('nearbyNoiseSources', v)} />
                    )}
                  </CardContent>
                </Card>

                {/* Accessibility */}
                <Card className="border rounded-xl">
                  <CardContent className="p-3 space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      Accessibilité & distances
                      <SectionHelpPopover title="Accessibilité & distances" description="Indiquez les distances vers les services essentiels." />
                    </h4>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Type d'accès routier</Label>
                      <Select value={state.roadAccessType} onValueChange={(v) => setField('roadAccessType', v)}>
                        <SelectTrigger className="h-9 text-sm rounded-xl border-2"><SelectValue /></SelectTrigger>
                        <SelectContent className="z-[1200]">
                          {ROAD_ACCESS_OPTIONS.map(opt => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { field: 'distanceToMainRoad' as const, label: 'Route principale (m)', placeholder: 'Ex: 50' },
                        { field: 'distanceToHospital' as const, label: 'Hôpital (km)', placeholder: 'Ex: 2' },
                        { field: 'distanceToSchool' as const, label: 'École (km)', placeholder: 'Ex: 1' },
                        { field: 'distanceToMarket' as const, label: 'Marché (km)', placeholder: 'Ex: 0.5' },
                      ].map(({ field, label, placeholder }) => (
                        <div key={field} className="space-y-1.5">
                          <Label className="text-xs">{label}</Label>
                          <Input type="number" value={state[field]} onChange={(e) => setField(field, e.target.value)} placeholder={placeholder} className="h-9 text-sm rounded-xl border-2" />
                        </div>
                      ))}
                    </div>
                    <SuggestivePicklist picklistKey="nearby_amenities" label="Commodités à proximité" placeholder="Rechercher ou ajouter..." selectedValues={state.nearbyAmenities} onSelectionChange={(v) => setField('nearbyAmenities', v)} />
                  </CardContent>
                </Card>

                {/* Risks */}
                <Card className="border rounded-xl border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/20">
                  <CardContent className="p-3 space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="h-4 w-4" />
                      Zones à risque
                      <SectionHelpPopover title="Zones à risque" description="Signalez si le bien se trouve dans une zone inondable ou d'érosion." />
                    </h4>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Checkbox checked={state.floodRiskZone} onCheckedChange={(c) => setField('floodRiskZone', c === true)} />
                        <span className="text-sm text-amber-700 dark:text-amber-300">Zone inondable</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox checked={state.erosionRiskZone} onCheckedChange={(c) => setField('erosionRiskZone', c === true)} />
                        <span className="text-sm text-amber-700 dark:text-amber-300">Zone d'érosion</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* DOCUMENTS TAB */}
              <TabsContent value="documents" className="space-y-3 pr-2 mt-0">
                <Card className="border rounded-xl">
                  <CardContent className="p-3 space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      Documents de la parcelle
                      <SectionHelpPopover title="Documents de la parcelle" description="Joignez les documents juridiques liés à la parcelle." />
                    </h4>
                    <p className="text-xs text-muted-foreground">Titre foncier, certificat d'enregistrement, PV de bornage, attestation de propriété...</p>
                    <input ref={parcelDocsInputRef} type="file" accept=".pdf,image/*" multiple onChange={handleParcelDocSelect} className="hidden" />
                    <Button type="button" variant="outline" onClick={() => parcelDocsInputRef.current?.click()} className="w-full h-10 text-sm rounded-xl border-2 border-dashed">
                      <Upload className="h-4 w-4 mr-2" />Documents parcelle (PDF, images)
                    </Button>
                    {parcelDocuments.length > 0 && (
                      <div className="space-y-2">
                        {parcelDocuments.map((file, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
                            <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <span className="flex-1 truncate text-sm">{file.name}</span>
                            <Button variant="ghost" size="icon" onClick={() => removeParcelDoc(index)} className="h-7 w-7 rounded-lg"><X className="h-3.5 w-3.5" /></Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border rounded-xl">
                  <CardContent className="p-3 space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Camera className="h-4 w-4 text-green-600" />
                      Photos de la construction
                      <SectionHelpPopover title="Photos de la construction" description="Ajoutez des photos récentes de votre bien." />
                    </h4>
                    <p className="text-xs text-muted-foreground">Façade, intérieur, cuisine, chambres, salles de bain, jardin, terrasse...</p>
                    <input ref={constructionImagesInputRef} type="file" accept="image/*" multiple onChange={handleConstructionImageSelect} className="hidden" />
                    <Button type="button" variant="outline" onClick={() => constructionImagesInputRef.current?.click()} className="w-full h-10 text-sm rounded-xl border-2 border-dashed">
                      <Image className="h-4 w-4 mr-2" />Photos de la construction
                    </Button>
                    {constructionImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {constructionImages.map((file, index) => (
                          <div key={index} className="relative group">
                            <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                              <img src={constructionImageUrls[index] || ''} alt={file.name} className="w-full h-full object-cover" />
                            </div>
                            <Button variant="destructive" size="icon" onClick={() => removeConstructionImage(index)} className="absolute -top-1 -right-1 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border rounded-xl">
                  <CardContent className="p-3 space-y-3">
                    <h4 className="text-sm font-semibold">Notes additionnelles</h4>
                    <Textarea value={state.additionalNotes} onChange={(e) => setField('additionalNotes', e.target.value)} placeholder="Autres informations pertinentes..." className="min-h-[100px] text-sm rounded-xl border-2" />
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

          {/* Navigation */}
          <div className="flex gap-3 mt-3">
            {(() => {
              const tabOrder = isTerrainNu ? ['general', 'environnement', 'documents'] : ['general', 'materiaux', 'environnement', 'documents'];
              const currentIndex = tabOrder.indexOf(activeTab);
              const isFirst = currentIndex === 0;
              const isLast = currentIndex === tabOrder.length - 1;
              return (
                <>
                  {!isFirst && (
                    <Button variant="outline" onClick={() => setActiveTab(tabOrder[currentIndex - 1])} className="flex-1 h-11 text-sm font-semibold rounded-xl">← Précédent</Button>
                  )}
                  {isLast ? (
                    <Button onClick={onProceedToSummary} className="flex-1 h-11 text-sm font-semibold rounded-xl shadow-lg" disabled={loading || uploadingFiles || loadingFees}>
                      {loadingFees ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />Chargement...</>) : (<><Receipt className="h-4 w-4 mr-2" />Récapitulatif</>)}
                    </Button>
                  ) : (
                    <Button onClick={() => setActiveTab(tabOrder[currentIndex + 1])} className="flex-1 h-11 text-sm font-semibold rounded-xl shadow-lg">Suivant →</Button>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpertiseFormStep;
