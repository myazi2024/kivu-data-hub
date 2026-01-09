import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Grid3X3,
  MapPin,
  User,
  FileText,
  CreditCard,
  Check,
  Plus,
  Trash2,
  Ruler,
  Square,
  Home,
  Building2,
  Fence,
  AlertTriangle,
  Info,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Upload,
  X,
  Pencil,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Save,
  Download,
  Layers
} from 'lucide-react';

interface LotData {
  id: string;
  lotNumber: string;
  length: string;
  width: string;
  areaSqm: number;
  perimeter: number;
  isBuilt: boolean;
  hasFence: boolean;
  fenceType?: string;
  constructionType?: string;
  intendedUse?: string;
  notes?: string;
  coordinates?: { x: number; y: number; width: number; height: number };
}

interface SubdivisionRequestDialogProps {
  parcelNumber: string;
  parcelId?: string;
  parcelData?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SUBMISSION_FEE = 20;

const SubdivisionRequestDialog: React.FC<SubdivisionRequestDialogProps> = ({
  parcelNumber,
  parcelId,
  parcelData,
  open,
  onOpenChange
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // États pour les étapes
  const [currentStep, setCurrentStep] = useState<'intro' | 'parcel' | 'lots' | 'sketch' | 'requester' | 'summary' | 'payment' | 'confirmation'>('intro');
  
  // États parcelle mère
  const [parentParcelArea, setParentParcelArea] = useState(parcelData?.area_sqm?.toString() || '');
  const [parentParcelLocation, setParentParcelLocation] = useState(parcelData?.location || '');
  const [parentParcelOwner, setParentParcelOwner] = useState(parcelData?.current_owner_name || '');
  const [parentParcelTitleRef, setParentParcelTitleRef] = useState(parcelData?.title_reference_number || '');
  const [parentParcelGPS, setParentParcelGPS] = useState<{ lat: string; lng: string }>({ lat: '', lng: '' });
  
  // États demandeur
  const [requesterFirstName, setRequesterFirstName] = useState('');
  const [requesterLastName, setRequesterLastName] = useState('');
  const [requesterMiddleName, setRequesterMiddleName] = useState('');
  const [requesterPhone, setRequesterPhone] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [requesterType, setRequesterType] = useState('particulier');
  
  // États lots
  const [lots, setLots] = useState<LotData[]>([]);
  const [purposeOfSubdivision, setPurposeOfSubdivision] = useState('');
  
  // États croquis
  const [selectedTool, setSelectedTool] = useState<'select' | 'draw' | 'erase'>('select');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedLotIndex, setSelectedLotIndex] = useState<number | null>(null);
  
  // États paiement
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'bank_card'>('mobile_money');
  const [paymentProvider, setPaymentProvider] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Documents
  const [proofOfOwnership, setProofOfOwnership] = useState<File | null>(null);
  const [sketchFile, setSketchFile] = useState<File | null>(null);
  
  // Loading
  const [submitting, setSubmitting] = useState(false);
  
  // Calculer les statistiques
  const totalLotsArea = lots.reduce((sum, lot) => sum + lot.areaSqm, 0);
  const remainingArea = parseFloat(parentParcelArea || '0') - totalLotsArea;
  const builtLots = lots.filter(l => l.isBuilt).length;
  const fencedLots = lots.filter(l => l.hasFence).length;
  
  // Ajouter un lot
  const addLot = () => {
    const newLot: LotData = {
      id: crypto.randomUUID(),
      lotNumber: `LOT-${(lots.length + 1).toString().padStart(3, '0')}`,
      length: '',
      width: '',
      areaSqm: 0,
      perimeter: 0,
      isBuilt: false,
      hasFence: false,
      intendedUse: 'residential'
    };
    setLots([...lots, newLot]);
  };
  
  // Supprimer un lot
  const removeLot = (id: string) => {
    setLots(lots.filter(l => l.id !== id));
  };
  
  // Mettre à jour un lot
  const updateLot = (id: string, updates: Partial<LotData>) => {
    setLots(lots.map(lot => {
      if (lot.id === id) {
        const updated = { ...lot, ...updates };
        // Recalculer surface et périmètre
        const length = parseFloat(updated.length || '0');
        const width = parseFloat(updated.width || '0');
        updated.areaSqm = length * width;
        updated.perimeter = 2 * (length + width);
        return updated;
      }
      return lot;
    }));
  };
  
  // Génération du numéro de référence
  const generateReferenceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `LOT-${year}${month}-${random}`;
  };
  
  // Validation des étapes
  const canProceedToNext = () => {
    switch (currentStep) {
      case 'intro':
        return true;
      case 'parcel':
        return parentParcelArea && parentParcelOwner;
      case 'lots':
        return lots.length >= 2 && lots.every(l => l.length && l.width);
      case 'sketch':
        return true; // Le croquis est optionnel
      case 'requester':
        return requesterFirstName && requesterLastName && requesterPhone;
      case 'summary':
        return true;
      case 'payment':
        return paymentMethod && (paymentMethod !== 'mobile_money' || (paymentProvider && paymentPhone));
      default:
        return false;
    }
  };
  
  // Navigation
  const goToNextStep = () => {
    const steps: typeof currentStep[] = ['intro', 'parcel', 'lots', 'sketch', 'requester', 'summary', 'payment', 'confirmation'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };
  
  const goToPreviousStep = () => {
    const steps: typeof currentStep[] = ['intro', 'parcel', 'lots', 'sketch', 'requester', 'summary', 'payment', 'confirmation'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };
  
  // Soumission
  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: 'Authentification requise',
        description: 'Veuillez vous connecter pour soumettre une demande.',
        variant: 'destructive'
      });
      return;
    }
    
    setSubmitting(true);
    try {
      const referenceNumber = generateReferenceNumber();
      
      const { data, error } = await supabase
        .from('subdivision_requests' as any)
        .insert({
          reference_number: referenceNumber,
          user_id: user.id,
          parcel_number: parcelNumber,
          parcel_id: parcelId || null,
          parent_parcel_area_sqm: parseFloat(parentParcelArea),
          parent_parcel_location: parentParcelLocation,
          parent_parcel_owner_name: parentParcelOwner,
          parent_parcel_title_reference: parentParcelTitleRef,
          parent_parcel_gps_coordinates: parentParcelGPS.lat ? parentParcelGPS : null,
          requester_first_name: requesterFirstName,
          requester_last_name: requesterLastName,
          requester_middle_name: requesterMiddleName || null,
          requester_phone: requesterPhone,
          requester_email: requesterEmail || null,
          requester_type: requesterType,
          number_of_lots: lots.length,
          lots_data: lots,
          purpose_of_subdivision: purposeOfSubdivision,
          submission_fee_usd: SUBMISSION_FEE,
          total_amount_usd: SUBMISSION_FEE,
          status: 'pending',
          submission_payment_status: 'completed'
        } as any)
        .select()
        .single();
      
      if (error) throw error;
      
      // Créer notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'success',
        title: 'Demande de lotissement soumise',
        message: `Votre demande de lotissement ${referenceNumber} a été soumise avec succès. Les frais de dossier de ${SUBMISSION_FEE}$ ont été payés.`,
        action_url: '/user-dashboard?tab=subdivisions'
      });
      
      setCurrentStep('confirmation');
      toast({
        title: 'Demande soumise avec succès',
        description: `Référence: ${referenceNumber}`
      });
    } catch (err: any) {
      console.error('Error submitting subdivision request:', err);
      toast({
        title: 'Erreur lors de la soumission',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  // Rendu du canvas pour le croquis
  useEffect(() => {
    if (currentStep === 'sketch' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Effacer le canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Dessiner la grille
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < canvas.width; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let i = 0; i < canvas.height; i += 20) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }
      
      // Dessiner la parcelle mère (contour)
      ctx.strokeStyle = '#1e40af';
      ctx.lineWidth = 3;
      ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);
      
      // Dessiner les lots
      lots.forEach((lot, index) => {
        if (lot.coordinates) {
          const isSelected = selectedLotIndex === index;
          ctx.fillStyle = isSelected ? 'rgba(59, 130, 246, 0.3)' : 'rgba(34, 197, 94, 0.2)';
          ctx.fillRect(lot.coordinates.x, lot.coordinates.y, lot.coordinates.width, lot.coordinates.height);
          ctx.strokeStyle = isSelected ? '#3b82f6' : '#22c55e';
          ctx.lineWidth = 2;
          ctx.strokeRect(lot.coordinates.x, lot.coordinates.y, lot.coordinates.width, lot.coordinates.height);
          
          // Label du lot
          ctx.fillStyle = '#1f2937';
          ctx.font = 'bold 12px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(lot.lotNumber, lot.coordinates.x + lot.coordinates.width / 2, lot.coordinates.y + lot.coordinates.height / 2);
        }
      });
    }
  }, [currentStep, lots, selectedLotIndex, zoomLevel]);
  
  const stepLabels = {
    intro: 'Introduction',
    parcel: 'Parcelle mère',
    lots: 'Définition des lots',
    sketch: 'Croquis',
    requester: 'Demandeur',
    summary: 'Récapitulatif',
    payment: 'Paiement',
    confirmation: 'Confirmation'
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Grid3X3 className="h-5 w-5 text-primary" />
            </div>
            Demande de Lotissement
          </DialogTitle>
          <DialogDescription>
            Parcelle: <span className="font-mono font-medium text-foreground">{parcelNumber}</span>
          </DialogDescription>
        </DialogHeader>
        
        {/* Indicateur d'étapes */}
        <div className="px-6 py-3 border-b bg-muted/30">
          <div className="flex items-center justify-between text-xs">
            {Object.entries(stepLabels).map(([key, label], index) => {
              const stepKeys = Object.keys(stepLabels);
              const currentIndex = stepKeys.indexOf(currentStep);
              const thisIndex = stepKeys.indexOf(key);
              const isActive = key === currentStep;
              const isPast = thisIndex < currentIndex;
              
              return (
                <React.Fragment key={key}>
                  <div className={`flex items-center gap-1.5 ${isActive ? 'text-primary font-medium' : isPast ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive ? 'bg-primary text-primary-foreground' : isPast ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                    }`}>
                      {isPast ? <Check className="h-3 w-3" /> : index + 1}
                    </div>
                    <span className="hidden sm:inline">{label}</span>
                  </div>
                  {index < Object.keys(stepLabels).length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${isPast ? 'bg-primary/30' : 'bg-muted'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
        
        <ScrollArea className="flex-1 max-h-[calc(90vh-200px)]">
          <div className="p-6">
            {/* Étape 0: Introduction */}
            {currentStep === 'intro' && (
              <div className="space-y-6">
                <div className="text-center space-y-4">
                  <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Grid3X3 className="h-10 w-10 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">Demande de Lotissement</h2>
                  <p className="text-muted-foreground max-w-lg mx-auto">
                    Bienvenue dans l'assistant de demande de lotissement. Ce service vous permet de diviser votre parcelle en plusieurs lots distincts.
                  </p>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-primary/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Documents requis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <ul className="space-y-1.5">
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span>Titre de propriété ou certificat d'enregistrement</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span>Plan cadastral existant (si disponible)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span>Pièce d'identité du propriétaire</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span>Croquis du lotissement souhaité</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-amber-500/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-amber-500" />
                        Frais de service
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-3">
                      <div className="flex justify-between items-center">
                        <span>Frais de dossier (à la soumission)</span>
                        <Badge className="bg-amber-500">${SUBMISSION_FEE}</Badge>
                      </div>
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Frais de traitement (si approuvé)</span>
                        <span className="text-xs">Variable selon surface</span>
                      </div>
                      <Alert className="mt-3 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-700 dark:text-amber-300 text-xs">
                          Les frais de dossier de {SUBMISSION_FEE}$ ne sont pas remboursables en cas de rejet.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                </div>
                
                <Card className="bg-muted/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary" />
                      Étapes du processus
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center space-y-2">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                          <span className="text-sm font-bold text-primary">1</span>
                        </div>
                        <p className="text-xs font-medium">Infos parcelle mère</p>
                      </div>
                      <div className="text-center space-y-2">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                          <span className="text-sm font-bold text-primary">2</span>
                        </div>
                        <p className="text-xs font-medium">Définition des lots</p>
                      </div>
                      <div className="text-center space-y-2">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                          <span className="text-sm font-bold text-primary">3</span>
                        </div>
                        <p className="text-xs font-medium">Croquis & demandeur</p>
                      </div>
                      <div className="text-center space-y-2">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                          <span className="text-sm font-bold text-primary">4</span>
                        </div>
                        <p className="text-xs font-medium">Paiement & soumission</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-700 dark:text-blue-300">
                    <strong>Important :</strong> Assurez-vous d'avoir tous les documents nécessaires avant de commencer. 
                    Le processus prend environ 10-15 minutes. Vous pouvez utiliser notre outil de croquis interactif pour visualiser votre lotissement.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            
            {/* Étape 1: Informations de la parcelle mère */}
            {currentStep === 'parcel' && (
              <div className="space-y-6">
                <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-700 dark:text-blue-300">
                    Renseignez les informations de la parcelle que vous souhaitez diviser en plusieurs lots.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="parentArea" className="flex items-center gap-1">
                      <Square className="h-3.5 w-3.5" />
                      Surface totale (m²) *
                    </Label>
                    <Input
                      id="parentArea"
                      type="number"
                      value={parentParcelArea}
                      onChange={(e) => setParentParcelArea(e.target.value)}
                      placeholder="Ex: 5000"
                      className="h-10"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="parentOwner" className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      Propriétaire actuel *
                    </Label>
                    <Input
                      id="parentOwner"
                      value={parentParcelOwner}
                      onChange={(e) => setParentParcelOwner(e.target.value)}
                      placeholder="Nom complet du propriétaire"
                      className="h-10"
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="parentLocation" className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      Localisation
                    </Label>
                    <Textarea
                      id="parentLocation"
                      value={parentParcelLocation}
                      onChange={(e) => setParentParcelLocation(e.target.value)}
                      placeholder="Adresse ou description de l'emplacement"
                      rows={2}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="parentTitleRef" className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      Référence du titre foncier
                    </Label>
                    <Input
                      id="parentTitleRef"
                      value={parentParcelTitleRef}
                      onChange={(e) => setParentParcelTitleRef(e.target.value)}
                      placeholder="N° du certificat d'enregistrement"
                      className="h-10"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      Coordonnées GPS (optionnel)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={parentParcelGPS.lat}
                        onChange={(e) => setParentParcelGPS(prev => ({ ...prev, lat: e.target.value }))}
                        placeholder="Latitude"
                        className="h-10"
                      />
                      <Input
                        value={parentParcelGPS.lng}
                        onChange={(e) => setParentParcelGPS(prev => ({ ...prev, lng: e.target.value }))}
                        placeholder="Longitude"
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="purpose" className="flex items-center gap-1">
                    <Info className="h-3.5 w-3.5" />
                    Motif du lotissement
                  </Label>
                  <Select value={purposeOfSubdivision} onValueChange={setPurposeOfSubdivision}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Sélectionner le motif" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vente">Vente de terrains</SelectItem>
                      <SelectItem value="succession">Partage successoral</SelectItem>
                      <SelectItem value="donation">Donation</SelectItem>
                      <SelectItem value="investissement">Investissement immobilier</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            {/* Étape 2: Définition des lots */}
            {currentStep === 'lots' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Lots à créer</h3>
                    <p className="text-sm text-muted-foreground">
                      Définissez au minimum 2 lots pour la subdivision
                    </p>
                  </div>
                  <Button onClick={addLot} size="sm" className="gap-1">
                    <Plus className="h-4 w-4" />
                    Ajouter un lot
                  </Button>
                </div>
                
                {/* Statistiques */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="p-3">
                    <div className="text-2xl font-bold text-primary">{lots.length}</div>
                    <div className="text-xs text-muted-foreground">Lots créés</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-2xl font-bold text-green-600">{totalLotsArea.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">m² attribués</div>
                  </Card>
                  <Card className="p-3">
                    <div className={`text-2xl font-bold ${remainingArea < 0 ? 'text-destructive' : 'text-orange-600'}`}>
                      {remainingArea.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">m² restants</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-2xl font-bold text-blue-600">{builtLots}/{fencedLots}</div>
                    <div className="text-xs text-muted-foreground">Construits/Clôturés</div>
                  </Card>
                </div>
                
                {remainingArea < 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      La surface totale des lots dépasse la surface de la parcelle mère de {Math.abs(remainingArea).toLocaleString()} m².
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Liste des lots */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {lots.map((lot, index) => (
                    <Card key={lot.id} className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-primary">{index + 1}</span>
                        </div>
                        
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">N° du lot</Label>
                            <Input
                              value={lot.lotNumber}
                              onChange={(e) => updateLot(lot.id, { lotNumber: e.target.value })}
                              className="h-8 text-sm"
                            />
                          </div>
                          
                          <div className="space-y-1.5">
                            <Label className="text-xs flex items-center gap-1">
                              <Ruler className="h-3 w-3" /> Longueur (m)
                            </Label>
                            <Input
                              type="number"
                              value={lot.length}
                              onChange={(e) => updateLot(lot.id, { length: e.target.value })}
                              placeholder="0"
                              className="h-8 text-sm"
                            />
                          </div>
                          
                          <div className="space-y-1.5">
                            <Label className="text-xs flex items-center gap-1">
                              <Ruler className="h-3 w-3" /> Largeur (m)
                            </Label>
                            <Input
                              type="number"
                              value={lot.width}
                              onChange={(e) => updateLot(lot.id, { width: e.target.value })}
                              placeholder="0"
                              className="h-8 text-sm"
                            />
                          </div>
                          
                          <div className="space-y-1.5">
                            <Label className="text-xs">Usage prévu</Label>
                            <Select value={lot.intendedUse || 'residential'} onValueChange={(v) => updateLot(lot.id, { intendedUse: v })}>
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="residential">Résidentiel</SelectItem>
                                <SelectItem value="commercial">Commercial</SelectItem>
                                <SelectItem value="industrial">Industriel</SelectItem>
                                <SelectItem value="agricultural">Agricole</SelectItem>
                                <SelectItem value="mixed">Mixte</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex items-center gap-4 md:col-span-2">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={lot.isBuilt}
                                onCheckedChange={(checked) => updateLot(lot.id, { isBuilt: checked })}
                              />
                              <Label className="text-xs flex items-center gap-1">
                                <Building2 className="h-3 w-3" /> Construit
                              </Label>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={lot.hasFence}
                                onCheckedChange={(checked) => updateLot(lot.id, { hasFence: checked })}
                              />
                              <Label className="text-xs flex items-center gap-1">
                                <Fence className="h-3 w-3" /> Clôturé
                              </Label>
                            </div>
                          </div>
                          
                          {lot.isBuilt && (
                            <div className="space-y-1.5">
                              <Label className="text-xs">Type de construction</Label>
                              <Select value={lot.constructionType || ''} onValueChange={(v) => updateLot(lot.id, { constructionType: v })}>
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="Sélectionner" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="maison">Maison</SelectItem>
                                  <SelectItem value="immeuble">Immeuble</SelectItem>
                                  <SelectItem value="hangar">Hangar</SelectItem>
                                  <SelectItem value="entrepot">Entrepôt</SelectItem>
                                  <SelectItem value="autre">Autre</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          
                          {lot.hasFence && (
                            <div className="space-y-1.5">
                              <Label className="text-xs">Type de clôture</Label>
                              <Select value={lot.fenceType || ''} onValueChange={(v) => updateLot(lot.id, { fenceType: v })}>
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="Sélectionner" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="mur">Mur en dur</SelectItem>
                                  <SelectItem value="grillage">Grillage</SelectItem>
                                  <SelectItem value="haie">Haie végétale</SelectItem>
                                  <SelectItem value="bois">Palissade en bois</SelectItem>
                                  <SelectItem value="mixte">Mixte</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant="secondary" className="font-mono">
                            {lot.areaSqm.toLocaleString()} m²
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            P: {lot.perimeter.toLocaleString()} m
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLot(lot.id)}
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                  
                  {lots.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed rounded-xl">
                      <Grid3X3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">Aucun lot défini</p>
                      <Button onClick={addLot} variant="outline" size="sm" className="mt-3 gap-1">
                        <Plus className="h-4 w-4" />
                        Créer le premier lot
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Étape 3: Croquis */}
            {currentStep === 'sketch' && (
              <div className="space-y-4">
                <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                  <Info className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-700 dark:text-amber-300">
                    Utilisez les outils ci-dessous pour esquisser la disposition des lots sur la parcelle. Cette étape est optionnelle.
                  </AlertDescription>
                </Alert>
                
                {/* Barre d'outils */}
                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                  <Button
                    variant={selectedTool === 'select' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedTool('select')}
                    className="gap-1"
                  >
                    <Move className="h-4 w-4" />
                    Sélectionner
                  </Button>
                  <Button
                    variant={selectedTool === 'draw' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedTool('draw')}
                    className="gap-1"
                  >
                    <Pencil className="h-4 w-4" />
                    Dessiner
                  </Button>
                  <Button
                    variant={selectedTool === 'erase' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedTool('erase')}
                    className="gap-1"
                  >
                    <X className="h-4 w-4" />
                    Effacer
                  </Button>
                  
                  <Separator orientation="vertical" className="h-6" />
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setZoomLevel(z => Math.min(z + 0.25, 2))}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground min-w-[40px] text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setZoomLevel(z => Math.max(z - 0.25, 0.5))}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  
                  <Separator orientation="vertical" className="h-6" />
                  
                  <Button variant="ghost" size="sm" className="gap-1">
                    <RotateCcw className="h-4 w-4" />
                    Réinitialiser
                  </Button>
                </div>
                
                {/* Canvas de dessin */}
                <div className="border rounded-xl overflow-hidden bg-white dark:bg-gray-900">
                  <canvas
                    ref={canvasRef}
                    width={700}
                    height={400}
                    className="w-full cursor-crosshair"
                    style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
                  />
                </div>
                
                {/* Légende */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 border-2 border-blue-800 rounded" />
                    Parcelle mère
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 bg-green-200 border border-green-600 rounded" />
                    Lots définis
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 bg-blue-200 border border-blue-600 rounded" />
                    Lot sélectionné
                  </div>
                </div>
                
                {/* Upload fichier optionnel */}
                <div className="p-4 border-2 border-dashed rounded-xl">
                  <div className="flex items-center gap-4">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Importer un croquis existant</p>
                      <p className="text-xs text-muted-foreground">
                        Vous pouvez importer une image de votre plan de lotissement (PNG, JPG, PDF)
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-1" />
                      Importer
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Étape 4: Informations du demandeur */}
            {currentStep === 'requester' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="requesterLastName">Nom *</Label>
                    <Input
                      id="requesterLastName"
                      value={requesterLastName}
                      onChange={(e) => setRequesterLastName(e.target.value)}
                      placeholder="Nom de famille"
                      className="h-10"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="requesterFirstName">Prénom *</Label>
                    <Input
                      id="requesterFirstName"
                      value={requesterFirstName}
                      onChange={(e) => setRequesterFirstName(e.target.value)}
                      placeholder="Prénom"
                      className="h-10"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="requesterMiddleName">Post-nom</Label>
                    <Input
                      id="requesterMiddleName"
                      value={requesterMiddleName}
                      onChange={(e) => setRequesterMiddleName(e.target.value)}
                      placeholder="Post-nom (optionnel)"
                      className="h-10"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="requesterPhone">Téléphone *</Label>
                    <Input
                      id="requesterPhone"
                      value={requesterPhone}
                      onChange={(e) => setRequesterPhone(e.target.value)}
                      placeholder="+243..."
                      className="h-10"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="requesterEmail">Email</Label>
                    <Input
                      id="requesterEmail"
                      type="email"
                      value={requesterEmail}
                      onChange={(e) => setRequesterEmail(e.target.value)}
                      placeholder="email@exemple.com"
                      className="h-10"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="requesterType">Type de demandeur</Label>
                    <Select value={requesterType} onValueChange={setRequesterType}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="particulier">Particulier</SelectItem>
                        <SelectItem value="entreprise">Entreprise</SelectItem>
                        <SelectItem value="promoteur">Promoteur immobilier</SelectItem>
                        <SelectItem value="cooperative">Coopérative</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Upload pièce d'identité */}
                <div className="p-4 border-2 border-dashed rounded-xl">
                  <div className="flex items-center gap-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Pièce d'identité du demandeur</p>
                      <p className="text-xs text-muted-foreground">
                        Carte d'identité, passeport ou autre document officiel
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-1" />
                      Téléverser
                    </Button>
                  </div>
                </div>
                
                {/* Upload preuve de propriété */}
                <div className="p-4 border-2 border-dashed rounded-xl">
                  <div className="flex items-center gap-4">
                    <Home className="h-8 w-8 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Preuve de propriété de la parcelle</p>
                      <p className="text-xs text-muted-foreground">
                        Titre foncier, certificat d'enregistrement ou contrat de vente
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-1" />
                      Téléverser
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Étape 5: Récapitulatif */}
            {currentStep === 'summary' && (
              <div className="space-y-6">
                {/* Parcelle mère */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Parcelle mère
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Numéro:</span>
                      <span className="ml-2 font-mono font-medium">{parcelNumber}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Surface:</span>
                      <span className="ml-2 font-medium">{parseFloat(parentParcelArea).toLocaleString()} m²</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Propriétaire:</span>
                      <span className="ml-2 font-medium">{parentParcelOwner}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Motif:</span>
                      <span className="ml-2 font-medium">{purposeOfSubdivision || 'Non spécifié'}</span>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Lots créés */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Grid3X3 className="h-4 w-4" />
                      Lots créés ({lots.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {lots.map((lot, index) => (
                        <div key={lot.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{lot.lotNumber}</Badge>
                            <span>{lot.length}m × {lot.width}m</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {lot.isBuilt && <Badge variant="secondary" className="text-xs">Construit</Badge>}
                            {lot.hasFence && <Badge variant="secondary" className="text-xs">Clôturé</Badge>}
                            <Badge>{lot.areaSqm.toLocaleString()} m²</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Surface totale attribuée:</span>
                      <span className="font-bold">{totalLotsArea.toLocaleString()} m²</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-muted-foreground">Surface restante:</span>
                      <span className={`font-bold ${remainingArea < 0 ? 'text-destructive' : 'text-green-600'}`}>
                        {remainingArea.toLocaleString()} m²
                      </span>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Demandeur */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Demandeur
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Nom complet:</span>
                      <span className="ml-2 font-medium">
                        {requesterLastName} {requesterFirstName} {requesterMiddleName}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Téléphone:</span>
                      <span className="ml-2 font-medium">{requesterPhone}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <span className="ml-2 font-medium">{requesterEmail || 'Non renseigné'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Type:</span>
                      <span className="ml-2 font-medium capitalize">{requesterType}</span>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Frais */}
                <Card className="border-primary/50 bg-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Frais de la demande
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Frais de dossier (non remboursables)</span>
                      <span className="font-bold text-lg">${SUBMISSION_FEE}</span>
                    </div>
                    
                    <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
                        <strong>Important:</strong> Les frais de dossier de {SUBMISSION_FEE}$ sont payables à la soumission et ne sont pas remboursables en cas de rejet.
                        Si votre demande est approuvée, des frais supplémentaires seront calculés en fonction du nombre de lots et de la surface.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Étape 6: Paiement */}
            {currentStep === 'payment' && (
              <div className="space-y-6">
                <Card className="border-primary bg-primary/5">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-primary">${SUBMISSION_FEE}</div>
                      <p className="text-sm text-muted-foreground mt-1">Frais de dossier à payer</p>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="space-y-4">
                  <Label>Mode de paiement</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant={paymentMethod === 'mobile_money' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('mobile_money')}
                      className="h-auto py-4 flex-col gap-2"
                    >
                      <div className="text-2xl">📱</div>
                      <span>Mobile Money</span>
                    </Button>
                    <Button
                      variant={paymentMethod === 'bank_card' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('bank_card')}
                      className="h-auto py-4 flex-col gap-2"
                      disabled
                    >
                      <div className="text-2xl">💳</div>
                      <span>Carte bancaire</span>
                      <Badge variant="secondary" className="text-[10px]">Bientôt</Badge>
                    </Button>
                  </div>
                </div>
                
                {paymentMethod === 'mobile_money' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Opérateur</Label>
                      <Select value={paymentProvider} onValueChange={setPaymentProvider}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Sélectionner l'opérateur" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mpesa">M-Pesa (Vodacom)</SelectItem>
                          <SelectItem value="airtel">Airtel Money</SelectItem>
                          <SelectItem value="orange">Orange Money</SelectItem>
                          <SelectItem value="afrimoney">Afrimoney</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Numéro de téléphone</Label>
                      <Input
                        value={paymentPhone}
                        onChange={(e) => setPaymentPhone(e.target.value)}
                        placeholder="+243..."
                        className="h-10"
                      />
                    </div>
                  </div>
                )}
                
                <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-700 dark:text-amber-300">
                    <strong>Attention:</strong> Les frais de dossier de {SUBMISSION_FEE}$ ne sont pas remboursables si votre demande est rejetée.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            
            {/* Étape 7: Confirmation */}
            {currentStep === 'confirmation' && (
              <div className="text-center py-8 space-y-6">
                <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto">
                  <Check className="h-10 w-10 text-green-600 dark:text-green-400" />
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-green-600 dark:text-green-400">
                    Demande soumise avec succès !
                  </h3>
                  <p className="text-muted-foreground mt-2">
                    Votre demande de lotissement a été enregistrée et sera traitée dans les plus brefs délais.
                  </p>
                </div>
                
                <Card className="max-w-sm mx-auto">
                  <CardContent className="pt-6 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Parcelle:</span>
                      <span className="font-mono font-medium">{parcelNumber}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Lots créés:</span>
                      <span className="font-medium">{lots.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Frais payés:</span>
                      <span className="font-medium">${SUBMISSION_FEE}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Délai estimé:</span>
                      <span className="font-medium">30 jours</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Alert className="max-w-md mx-auto">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Vous recevrez une notification par email et SMS lorsque votre demande sera traitée.
                    Si approuvée, vous devrez payer les frais restants pour finaliser le lotissement.
                  </AlertDescription>
                </Alert>
                
                <Button onClick={() => onOpenChange(false)} className="gap-2">
                  <Check className="h-4 w-4" />
                  Fermer
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* Navigation */}
        {currentStep !== 'confirmation' && (
          <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
            <Button
              variant="outline"
              onClick={goToPreviousStep}
              disabled={currentStep === 'parcel'}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </Button>
            
            {currentStep === 'payment' ? (
              <Button
                onClick={handleSubmit}
                disabled={!canProceedToNext() || submitting}
                className="gap-1"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Payer {SUBMISSION_FEE}$ et soumettre
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={goToNextStep}
                disabled={!canProceedToNext()}
                className="gap-1"
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SubdivisionRequestDialog;
