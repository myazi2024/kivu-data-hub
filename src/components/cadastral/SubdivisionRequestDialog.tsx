import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
  Layers,
  Compass,
  ArrowRightLeft,
  Route,
  CornerUpRight,
  Maximize2
} from 'lucide-react';

// Types pour les dimensions de chaque côté
interface SideDimension {
  length: number;
  isShared: boolean; // Côté mitoyen
  isRoadBordering: boolean;
  roadType?: 'existing' | 'created' | 'none';
  roadName?: string;
  roadWidth?: number;
  adjacentLotNumber?: string; // Pour côtés mitoyens
  notes?: string;
}

// Angles des coins en degrés
interface CornerAngles {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
}

interface LotData {
  id: string;
  lotNumber: string;
  // Dimensions détaillées pour chaque côté
  northSide: SideDimension;
  southSide: SideDimension;
  eastSide: SideDimension;
  westSide: SideDimension;
  // Angles des coins
  cornerAngles: CornerAngles;
  // Calculs automatiques
  areaSqm: number;
  perimeter: number;
  // Caractéristiques
  isBuilt: boolean;
  hasFence: boolean;
  fenceType?: string;
  constructionType?: string;
  intendedUse?: string;
  notes?: string;
  // Coordonnées pour le croquis
  coordinates?: { x: number; y: number; points: { x: number; y: number }[] };
}

interface ParentParcelSides {
  north: { length: number; description?: string };
  south: { length: number; description?: string };
  east: { length: number; description?: string };
  west: { length: number; description?: string };
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
  
  // États pour les étapes (suppression de 'requester')
  const [currentStep, setCurrentStep] = useState<'parcel' | 'lots' | 'sketch' | 'summary' | 'payment' | 'confirmation'>('parcel');
  
  // États parcelle mère - pré-remplis depuis parcelData
  const [parentParcelArea, setParentParcelArea] = useState('');
  const [parentParcelLocation, setParentParcelLocation] = useState('');
  const [parentParcelOwner, setParentParcelOwner] = useState('');
  const [parentParcelTitleRef, setParentParcelTitleRef] = useState('');
  const [parentParcelTitleType, setParentParcelTitleType] = useState('');
  const [parentParcelTitleIssueDate, setParentParcelTitleIssueDate] = useState('');
  const [parentParcelGPS, setParentParcelGPS] = useState<{ lat: string; lng: string }>({ lat: '', lng: '' });
  const [parentParcelSides, setParentParcelSides] = useState<ParentParcelSides>({
    north: { length: 0, description: '' },
    south: { length: 0, description: '' },
    east: { length: 0, description: '' },
    west: { length: 0, description: '' }
  });
  
  // États demandeur (déplacé dans l'onglet parcelle mère)
  const [requesterFirstName, setRequesterFirstName] = useState('');
  const [requesterLastName, setRequesterLastName] = useState('');
  const [requesterMiddleName, setRequesterMiddleName] = useState('');
  const [requesterPhone, setRequesterPhone] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [requesterType, setRequesterType] = useState('particulier');
  const [isRequesterOwner, setIsRequesterOwner] = useState(true);
  
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
  
  // Loading
  const [submitting, setSubmitting] = useState(false);
  
  // Initialiser les données depuis parcelData au montage
  useEffect(() => {
    if (parcelData) {
      setParentParcelArea(parcelData.area_sqm?.toString() || '');
      setParentParcelLocation(parcelData.location || '');
      setParentParcelOwner(parcelData.current_owner_name || '');
      setParentParcelTitleRef(parcelData.title_reference_number || '');
      setParentParcelTitleType(parcelData.property_title_type || '');
      setParentParcelTitleIssueDate(parcelData.title_issue_date || '');
      
      // GPS
      if (parcelData.gps_coordinates) {
        const gps = parcelData.gps_coordinates;
        setParentParcelGPS({
          lat: gps.latitude?.toString() || gps.lat?.toString() || '',
          lng: gps.longitude?.toString() || gps.lng?.toString() || ''
        });
      } else if (parcelData.latitude && parcelData.longitude) {
        setParentParcelGPS({
          lat: parcelData.latitude.toString(),
          lng: parcelData.longitude.toString()
        });
      }
      
      // Dimensions des côtés si disponibles
      if (parcelData.parcel_sides) {
        const sides = parcelData.parcel_sides;
        setParentParcelSides({
          north: { length: sides.north?.length || sides.cote_nord || 0, description: sides.north?.description || '' },
          south: { length: sides.south?.length || sides.cote_sud || 0, description: sides.south?.description || '' },
          east: { length: sides.east?.length || sides.cote_est || 0, description: sides.east?.description || '' },
          west: { length: sides.west?.length || sides.cote_ouest || 0, description: sides.west?.description || '' }
        });
      }
      
      // Pré-remplir les infos du demandeur si l'utilisateur est connecté
      if (user) {
        const userData = user.user_metadata;
        if (userData) {
          setRequesterFirstName(userData.first_name || userData.prenom || '');
          setRequesterLastName(userData.last_name || userData.nom || '');
          setRequesterPhone(userData.phone || '');
          setRequesterEmail(user.email || '');
        }
      }
    }
  }, [parcelData, user]);
  
  // Calculer les statistiques
  const totalLotsArea = lots.reduce((sum, lot) => sum + lot.areaSqm, 0);
  const remainingArea = parseFloat(parentParcelArea || '0') - totalLotsArea;
  const builtLots = lots.filter(l => l.isBuilt).length;
  const fencedLots = lots.filter(l => l.hasFence).length;
  
  // Créer un nouveau côté par défaut
  const createDefaultSide = (): SideDimension => ({
    length: 0,
    isShared: false,
    isRoadBordering: false,
    roadType: 'none'
  });
  
  // Créer les angles par défaut (90 degrés pour un rectangle)
  const createDefaultAngles = (): CornerAngles => ({
    topLeft: 90,
    topRight: 90,
    bottomRight: 90,
    bottomLeft: 90
  });
  
  // Ajouter un lot
  const addLot = () => {
    const newLot: LotData = {
      id: crypto.randomUUID(),
      lotNumber: `LOT-${(lots.length + 1).toString().padStart(3, '0')}`,
      northSide: createDefaultSide(),
      southSide: createDefaultSide(),
      eastSide: createDefaultSide(),
      westSide: createDefaultSide(),
      cornerAngles: createDefaultAngles(),
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
  
  // Calculer l'aire à partir des dimensions et angles
  const calculateLotArea = (lot: LotData): number => {
    // Pour un quadrilatère simple, on utilise la moyenne des côtés opposés
    const avgLength = (lot.northSide.length + lot.southSide.length) / 2;
    const avgWidth = (lot.eastSide.length + lot.westSide.length) / 2;
    return avgLength * avgWidth;
  };
  
  // Calculer le périmètre
  const calculatePerimeter = (lot: LotData): number => {
    return lot.northSide.length + lot.southSide.length + lot.eastSide.length + lot.westSide.length;
  };
  
  // Mettre à jour un lot
  const updateLot = (id: string, updates: Partial<LotData>) => {
    setLots(lots.map(lot => {
      if (lot.id === id) {
        const updated = { ...lot, ...updates };
        // Recalculer surface et périmètre
        updated.areaSqm = calculateLotArea(updated);
        updated.perimeter = calculatePerimeter(updated);
        return updated;
      }
      return lot;
    }));
  };
  
  // Mettre à jour un côté spécifique d'un lot
  const updateLotSide = (id: string, side: 'northSide' | 'southSide' | 'eastSide' | 'westSide', updates: Partial<SideDimension>) => {
    setLots(lots.map(lot => {
      if (lot.id === id) {
        const updated = {
          ...lot,
          [side]: { ...lot[side], ...updates }
        };
        // Recalculer surface et périmètre
        updated.areaSqm = calculateLotArea(updated);
        updated.perimeter = calculatePerimeter(updated);
        return updated;
      }
      return lot;
    }));
  };
  
  // Mettre à jour les angles d'un lot
  const updateLotAngles = (id: string, corner: keyof CornerAngles, value: number) => {
    setLots(lots.map(lot => {
      if (lot.id === id) {
        return {
          ...lot,
          cornerAngles: { ...lot.cornerAngles, [corner]: value }
        };
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
      case 'parcel':
        return parentParcelArea && parentParcelOwner && requesterFirstName && requesterLastName && requesterPhone;
      case 'lots':
        return lots.length >= 2 && lots.every(l => 
          l.northSide.length > 0 || l.southSide.length > 0 || l.eastSide.length > 0 || l.westSide.length > 0
        );
      case 'sketch':
        return true;
      case 'summary':
        return true;
      case 'payment':
        return paymentMethod && (paymentMethod !== 'mobile_money' || (paymentProvider && paymentPhone));
      default:
        return false;
    }
  };
  
  // Navigation
  const steps: (typeof currentStep)[] = ['parcel', 'lots', 'sketch', 'summary', 'payment', 'confirmation'];
  
  const goToNextStep = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };
  
  const goToPreviousStep = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };
  
  const goToPayment = () => {
    setCurrentStep('payment');
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
          parent_parcel_sides: parentParcelSides,
          requester_first_name: requesterFirstName,
          requester_last_name: requesterLastName,
          requester_middle_name: requesterMiddleName || null,
          requester_phone: requesterPhone,
          requester_email: requesterEmail || null,
          requester_type: requesterType,
          is_requester_owner: isRequesterOwner,
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
  
  // Génération automatique du croquis depuis les données des lots
  useEffect(() => {
    if (currentStep === 'sketch' && canvasRef.current && lots.length > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Effacer le canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Appliquer le zoom
      ctx.save();
      ctx.scale(zoomLevel, zoomLevel);
      
      // Calculer l'échelle basée sur la surface de la parcelle mère
      const parentArea = parseFloat(parentParcelArea) || 1000;
      const parentPerimeter = 
        parentParcelSides.north.length + 
        parentParcelSides.south.length + 
        parentParcelSides.east.length + 
        parentParcelSides.west.length;
      
      const canvasWidth = canvas.width / zoomLevel;
      const canvasHeight = canvas.height / zoomLevel;
      const margin = 50;
      const drawableWidth = canvasWidth - margin * 2;
      const drawableHeight = canvasHeight - margin * 2;
      
      // Dessiner la grille
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= canvasWidth; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvasHeight);
        ctx.stroke();
      }
      for (let i = 0; i <= canvasHeight; i += 30) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvasWidth, i);
        ctx.stroke();
      }
      
      // Dessiner la parcelle mère
      const parentNorth = parentParcelSides.north.length || Math.sqrt(parentArea);
      const parentWest = parentParcelSides.west.length || Math.sqrt(parentArea);
      const scale = Math.min(drawableWidth / parentNorth, drawableHeight / parentWest);
      
      const parentWidth = parentNorth * scale;
      const parentHeight = parentWest * scale;
      const startX = margin + (drawableWidth - parentWidth) / 2;
      const startY = margin + (drawableHeight - parentHeight) / 2;
      
      // Contour parcelle mère
      ctx.strokeStyle = '#1e40af';
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      ctx.strokeRect(startX, startY, parentWidth, parentHeight);
      
      // Étiquettes des côtés de la parcelle mère
      ctx.fillStyle = '#1e40af';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      
      // Nord
      if (parentParcelSides.north.length > 0) {
        ctx.fillText(`${parentParcelSides.north.length}m`, startX + parentWidth / 2, startY - 8);
      }
      // Sud
      if (parentParcelSides.south.length > 0) {
        ctx.fillText(`${parentParcelSides.south.length}m`, startX + parentWidth / 2, startY + parentHeight + 16);
      }
      // Est
      if (parentParcelSides.east.length > 0) {
        ctx.save();
        ctx.translate(startX + parentWidth + 16, startY + parentHeight / 2);
        ctx.rotate(Math.PI / 2);
        ctx.fillText(`${parentParcelSides.east.length}m`, 0, 0);
        ctx.restore();
      }
      // Ouest
      if (parentParcelSides.west.length > 0) {
        ctx.save();
        ctx.translate(startX - 8, startY + parentHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(`${parentParcelSides.west.length}m`, 0, 0);
        ctx.restore();
      }
      
      // Indicateur Nord
      ctx.beginPath();
      ctx.moveTo(margin + 20, margin - 25);
      ctx.lineTo(margin + 15, margin - 10);
      ctx.lineTo(margin + 25, margin - 10);
      ctx.closePath();
      ctx.fillStyle = '#dc2626';
      ctx.fill();
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('N', margin + 20, margin - 30);
      
      // Dessiner les lots
      const lotsPerRow = Math.ceil(Math.sqrt(lots.length));
      const lotWidth = (parentWidth - 10) / lotsPerRow;
      const lotHeight = (parentHeight - 10) / Math.ceil(lots.length / lotsPerRow);
      
      lots.forEach((lot, index) => {
        const row = Math.floor(index / lotsPerRow);
        const col = index % lotsPerRow;
        const x = startX + 5 + col * lotWidth;
        const y = startY + 5 + row * lotHeight;
        
        const isSelected = selectedLotIndex === index;
        
        // Fond du lot
        ctx.fillStyle = isSelected ? 'rgba(59, 130, 246, 0.3)' : lot.isBuilt ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)';
        ctx.fillRect(x, y, lotWidth - 4, lotHeight - 4);
        
        // Contour du lot
        ctx.strokeStyle = isSelected ? '#3b82f6' : lot.isBuilt ? '#ef4444' : '#22c55e';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.strokeRect(x, y, lotWidth - 4, lotHeight - 4);
        
        // Indiquer les côtés mitoyens avec des traits pointillés
        if (lot.northSide.isShared) {
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = '#f59e0b';
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + lotWidth - 4, y);
          ctx.stroke();
        }
        if (lot.southSide.isShared) {
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = '#f59e0b';
          ctx.beginPath();
          ctx.moveTo(x, y + lotHeight - 4);
          ctx.lineTo(x + lotWidth - 4, y + lotHeight - 4);
          ctx.stroke();
        }
        
        // Indiquer les côtés bordant une route
        ctx.setLineDash([]);
        if (lot.northSide.isRoadBordering) {
          ctx.strokeStyle = '#8b5cf6';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + lotWidth - 4, y);
          ctx.stroke();
        }
        if (lot.southSide.isRoadBordering) {
          ctx.strokeStyle = '#8b5cf6';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(x, y + lotHeight - 4);
          ctx.lineTo(x + lotWidth - 4, y + lotHeight - 4);
          ctx.stroke();
        }
        
        // Numéro et infos du lot
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(lot.lotNumber, x + (lotWidth - 4) / 2, y + (lotHeight - 4) / 2 - 8);
        
        // Surface
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText(`${lot.areaSqm.toLocaleString()} m²`, x + (lotWidth - 4) / 2, y + (lotHeight - 4) / 2 + 6);
        
        // Dimensions si disponibles
        if (lot.northSide.length > 0 && lot.westSide.length > 0) {
          ctx.font = '9px Inter, sans-serif';
          ctx.fillStyle = '#6b7280';
          ctx.fillText(`${lot.northSide.length}×${lot.westSide.length}m`, x + (lotWidth - 4) / 2, y + (lotHeight - 4) / 2 + 18);
        }
        
        // Icône construction
        if (lot.isBuilt) {
          ctx.font = '14px';
          ctx.fillText('🏠', x + (lotWidth - 4) / 2, y + (lotHeight - 4) - 8);
        }
      });
      
      // Légende
      const legendY = canvasHeight - 35;
      ctx.fillStyle = '#1f2937';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'left';
      
      ctx.fillStyle = 'rgba(34, 197, 94, 0.5)';
      ctx.fillRect(10, legendY, 12, 12);
      ctx.fillStyle = '#1f2937';
      ctx.fillText('Terrain nu', 26, legendY + 10);
      
      ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
      ctx.fillRect(90, legendY, 12, 12);
      ctx.fillStyle = '#1f2937';
      ctx.fillText('Construit', 106, legendY + 10);
      
      ctx.strokeStyle = '#f59e0b';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(170, legendY + 6);
      ctx.lineTo(185, legendY + 6);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText('Mitoyen', 190, legendY + 10);
      
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(250, legendY + 6);
      ctx.lineTo(265, legendY + 6);
      ctx.stroke();
      ctx.fillText('Route', 270, legendY + 10);
      
      ctx.restore();
    }
  }, [currentStep, lots, selectedLotIndex, zoomLevel, parentParcelArea, parentParcelSides]);
  
  const stepLabels = {
    parcel: 'Parcelle mère & Demandeur',
    lots: 'Définition des lots',
    sketch: 'Croquis automatique',
    summary: 'Récapitulatif',
    payment: 'Paiement',
    confirmation: 'Confirmation'
  };
  
  // Composant pour éditer un côté
  const SideEditor = ({ 
    lot, 
    sideName, 
    sideKey, 
    icon 
  }: { 
    lot: LotData; 
    sideName: string; 
    sideKey: 'northSide' | 'southSide' | 'eastSide' | 'westSide';
    icon: React.ReactNode;
  }) => {
    const side = lot[sideKey];
    
    return (
      <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {sideName}
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Longueur (m)</Label>
            <Input
              type="number"
              value={side.length || ''}
              onChange={(e) => updateLotSide(lot.id, sideKey, { length: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              className="h-8 text-sm"
            />
          </div>
          
          <div className="flex flex-col justify-end gap-1">
            <div className="flex items-center gap-2">
              <Switch
                checked={side.isShared}
                onCheckedChange={(checked) => updateLotSide(lot.id, sideKey, { isShared: checked })}
                className="scale-75"
              />
              <Label className="text-xs">Mitoyen</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={side.isRoadBordering}
                onCheckedChange={(checked) => updateLotSide(lot.id, sideKey, { isRoadBordering: checked })}
                className="scale-75"
              />
              <Label className="text-xs">Borde route</Label>
            </div>
          </div>
        </div>
        
        {side.isShared && (
          <div className="space-y-1">
            <Label className="text-xs">Lot adjacent</Label>
            <Input
              value={side.adjacentLotNumber || ''}
              onChange={(e) => updateLotSide(lot.id, sideKey, { adjacentLotNumber: e.target.value })}
              placeholder="N° du lot voisin"
              className="h-8 text-sm"
            />
          </div>
        )}
        
        {side.isRoadBordering && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Type de route</Label>
              <Select
                value={side.roadType || 'existing'}
                onValueChange={(v) => updateLotSide(lot.id, sideKey, { roadType: v as SideDimension['roadType'] })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="existing">Route existante</SelectItem>
                  <SelectItem value="created">Route créée</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Largeur route (m)</Label>
              <Input
                type="number"
                value={side.roadWidth || ''}
                onChange={(e) => updateLotSide(lot.id, sideKey, { roadWidth: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                className="h-8 text-sm"
              />
            </div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-[1100]" />
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 z-[1100]">
        <DialogHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg md:text-xl">
            <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Grid3X3 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            </div>
            <span className="truncate">Demande de Lotissement</span>
          </DialogTitle>
          <DialogDescription className="text-sm">
            Parcelle: <span className="font-mono font-medium text-foreground">{parcelNumber}</span>
          </DialogDescription>
        </DialogHeader>
        
        {/* Indicateur d'étapes */}
        <div className="px-3 md:px-6 py-2 md:py-3 border-b bg-muted/30">
          {/* Barre de progression mobile */}
          <div className="flex md:hidden items-center gap-1 mb-2">
            {Object.keys(stepLabels).map((key, index) => {
              const stepKeys = Object.keys(stepLabels);
              const currentIndex = stepKeys.indexOf(currentStep);
              const isActive = key === currentStep;
              const isPast = index < currentIndex;
              
              return (
                <div
                  key={key}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    isActive ? 'bg-primary' : isPast ? 'bg-primary/50' : 'bg-muted-foreground/20'
                  }`}
                />
              );
            })}
          </div>
          
          {/* Étape courante mobile */}
          <div className="flex md:hidden items-center justify-center">
            <div className="flex items-center gap-2 text-sm">
              <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center">
                <span className="text-xs font-bold text-primary-foreground">
                  {Object.keys(stepLabels).indexOf(currentStep) + 1}
                </span>
              </div>
              <span className="font-medium">{stepLabels[currentStep]}</span>
            </div>
          </div>
          
          {/* Indicateur desktop */}
          <div className="hidden md:flex items-center justify-between text-xs">
            {Object.entries(stepLabels).map(([key, label], index) => {
              const stepKeys = Object.keys(stepLabels);
              const currentIndex = stepKeys.indexOf(currentStep);
              const thisIndex = stepKeys.indexOf(key);
              const isActive = key === currentStep;
              const isPast = thisIndex < currentIndex;
              
              return (
                <React.Fragment key={key}>
                  <button
                    onClick={() => {
                      if (isPast) {
                        setCurrentStep(key as typeof currentStep);
                      }
                    }}
                    disabled={!isPast}
                    className={`flex items-center gap-1.5 ${isActive ? 'text-primary font-medium' : isPast ? 'text-muted-foreground hover:text-primary cursor-pointer' : 'text-muted-foreground/50 cursor-default'}`}
                  >
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                      isActive ? 'bg-primary text-primary-foreground' : isPast ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'bg-muted text-muted-foreground'
                    }`}>
                      {isPast ? <Check className="h-3 w-3" /> : index + 1}
                    </div>
                    <span className="hidden lg:inline max-w-[100px] truncate">{label}</span>
                  </button>
                  {index < Object.keys(stepLabels).length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 lg:mx-2 ${isPast ? 'bg-primary/30' : 'bg-muted'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
        
        <ScrollArea className="flex-1 max-h-[calc(90vh-240px)] md:max-h-[calc(90vh-200px)]">
          <div className="p-4 md:p-6">
            {/* Étape 1: Parcelle mère + Demandeur */}
            {currentStep === 'parcel' && (
              <div className="space-y-6">
                {/* Info auto-remplissage */}
                <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-300 text-sm">
                    Les données de la parcelle ont été automatiquement pré-remplies depuis la base de données. Vérifiez et complétez si nécessaire.
                  </AlertDescription>
                </Alert>
                
                {/* Section Parcelle mère */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      Informations de la parcelle mère
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="parentOwner" className="flex items-center gap-1 text-sm">
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
                      
                      <div className="space-y-2">
                        <Label htmlFor="parentArea" className="flex items-center gap-1 text-sm">
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
                      
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="parentLocation" className="flex items-center gap-1 text-sm">
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
                        <Label className="flex items-center gap-1 text-sm">
                          <Compass className="h-3.5 w-3.5" />
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
                      
                      <div className="space-y-2">
                        <Label htmlFor="parentTitleRef" className="flex items-center gap-1 text-sm">
                          <FileText className="h-3.5 w-3.5" />
                          Titre foncier
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="parentTitleRef"
                            value={parentParcelTitleRef}
                            onChange={(e) => setParentParcelTitleRef(e.target.value)}
                            placeholder="N° certificat"
                            className="h-10 flex-1"
                          />
                          <Select value={parentParcelTitleType} onValueChange={setParentParcelTitleType}>
                            <SelectTrigger className="h-10 w-[140px]">
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="certificat_enregistrement">Certificat</SelectItem>
                              <SelectItem value="titre_foncier">Titre foncier</SelectItem>
                              <SelectItem value="contrat_location">Contrat</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    
                    {/* Dimensions des côtés de la parcelle mère */}
                    <div className="pt-4 border-t">
                      <Label className="flex items-center gap-2 mb-3 text-sm font-medium">
                        <Ruler className="h-4 w-4" />
                        Dimensions des côtés de la parcelle
                      </Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Côté Nord (m)</Label>
                          <Input
                            type="number"
                            value={parentParcelSides.north.length || ''}
                            onChange={(e) => setParentParcelSides(prev => ({
                              ...prev,
                              north: { ...prev.north, length: parseFloat(e.target.value) || 0 }
                            }))}
                            placeholder="0"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Côté Sud (m)</Label>
                          <Input
                            type="number"
                            value={parentParcelSides.south.length || ''}
                            onChange={(e) => setParentParcelSides(prev => ({
                              ...prev,
                              south: { ...prev.south, length: parseFloat(e.target.value) || 0 }
                            }))}
                            placeholder="0"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Côté Est (m)</Label>
                          <Input
                            type="number"
                            value={parentParcelSides.east.length || ''}
                            onChange={(e) => setParentParcelSides(prev => ({
                              ...prev,
                              east: { ...prev.east, length: parseFloat(e.target.value) || 0 }
                            }))}
                            placeholder="0"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Côté Ouest (m)</Label>
                          <Input
                            type="number"
                            value={parentParcelSides.west.length || ''}
                            onChange={(e) => setParentParcelSides(prev => ({
                              ...prev,
                              west: { ...prev.west, length: parseFloat(e.target.value) || 0 }
                            }))}
                            placeholder="0"
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Motif du lotissement */}
                    <div className="space-y-2 pt-2">
                      <Label htmlFor="purpose" className="flex items-center gap-1 text-sm">
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
                  </CardContent>
                </Card>
                
                {/* Section Demandeur */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      Informations du demandeur
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Switch
                        checked={isRequesterOwner}
                        onCheckedChange={setIsRequesterOwner}
                      />
                      <Label className="text-sm">Le demandeur est le propriétaire de la parcelle</Label>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Nom *</Label>
                        <Input
                          value={requesterLastName}
                          onChange={(e) => setRequesterLastName(e.target.value)}
                          placeholder="Nom de famille"
                          className="h-10"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm">Prénom *</Label>
                        <Input
                          value={requesterFirstName}
                          onChange={(e) => setRequesterFirstName(e.target.value)}
                          placeholder="Prénom"
                          className="h-10"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm">Post-nom</Label>
                        <Input
                          value={requesterMiddleName}
                          onChange={(e) => setRequesterMiddleName(e.target.value)}
                          placeholder="Post-nom"
                          className="h-10"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm">Téléphone *</Label>
                        <Input
                          value={requesterPhone}
                          onChange={(e) => setRequesterPhone(e.target.value)}
                          placeholder="+243..."
                          className="h-10"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm">Email</Label>
                        <Input
                          type="email"
                          value={requesterEmail}
                          onChange={(e) => setRequesterEmail(e.target.value)}
                          placeholder="email@exemple.com"
                          className="h-10"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm">Type de demandeur</Label>
                        <Select value={requesterType} onValueChange={setRequesterType}>
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="particulier">Particulier</SelectItem>
                            <SelectItem value="entreprise">Entreprise</SelectItem>
                            <SelectItem value="promoteur">Promoteur immobilier</SelectItem>
                            <SelectItem value="cooperative">Coopérative</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Étape 2: Définition des lots */}
            {currentStep === 'lots' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">Lots à créer</h3>
                    <p className="text-sm text-muted-foreground">
                      Définissez au minimum 2 lots avec leurs dimensions exactes
                    </p>
                  </div>
                  <Button onClick={addLot} size="sm" className="gap-1 self-start sm:self-auto">
                    <Plus className="h-4 w-4" />
                    Ajouter un lot
                  </Button>
                </div>
                
                {/* Statistiques */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                  <Card className="p-2 md:p-3">
                    <div className="text-xl md:text-2xl font-bold text-primary">{lots.length}</div>
                    <div className="text-xs text-muted-foreground">Lots créés</div>
                  </Card>
                  <Card className="p-2 md:p-3">
                    <div className="text-xl md:text-2xl font-bold text-green-600">{totalLotsArea.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">m² attribués</div>
                  </Card>
                  <Card className="p-2 md:p-3">
                    <div className={`text-xl md:text-2xl font-bold ${remainingArea < 0 ? 'text-destructive' : 'text-orange-600'}`}>
                      {remainingArea.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">m² restants</div>
                  </Card>
                  <Card className="p-2 md:p-3">
                    <div className="text-xl md:text-2xl font-bold text-blue-600">{builtLots}/{fencedLots}</div>
                    <div className="text-xs text-muted-foreground">Constr./Clôturés</div>
                  </Card>
                </div>
                
                {remainingArea < 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      La surface totale dépasse la parcelle mère de {Math.abs(remainingArea).toLocaleString()} m².
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Liste des lots */}
                <Accordion type="multiple" className="space-y-2">
                  {lots.map((lot, index) => (
                    <AccordionItem key={lot.id} value={lot.id} className="border rounded-lg overflow-hidden">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-primary">{index + 1}</span>
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-medium text-sm">{lot.lotNumber}</div>
                            <div className="text-xs text-muted-foreground">
                              {lot.areaSqm > 0 ? `${lot.areaSqm.toLocaleString()} m² • P: ${lot.perimeter.toLocaleString()} m` : 'Dimensions à définir'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mr-2">
                            {lot.isBuilt && <Badge variant="secondary" className="text-[10px]">Construit</Badge>}
                            {lot.hasFence && <Badge variant="outline" className="text-[10px]">Clôturé</Badge>}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 pt-2">
                        <div className="space-y-4">
                          {/* Numéro et caractéristiques */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs">N° du lot</Label>
                              <Input
                                value={lot.lotNumber}
                                onChange={(e) => updateLot(lot.id, { lotNumber: e.target.value })}
                                className="h-9 text-sm"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Usage prévu</Label>
                              <Select value={lot.intendedUse || 'residential'} onValueChange={(v) => updateLot(lot.id, { intendedUse: v })}>
                                <SelectTrigger className="h-9 text-sm">
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
                            <div className="flex items-end gap-4">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={lot.isBuilt}
                                  onCheckedChange={(checked) => updateLot(lot.id, { isBuilt: checked })}
                                />
                                <Label className="text-xs"><Building2 className="h-3 w-3 inline mr-1" />Construit</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={lot.hasFence}
                                  onCheckedChange={(checked) => updateLot(lot.id, { hasFence: checked })}
                                />
                                <Label className="text-xs"><Fence className="h-3 w-3 inline mr-1" />Clôturé</Label>
                              </div>
                            </div>
                          </div>
                          
                          {/* Dimensions des 4 côtés */}
                          <div className="pt-3 border-t">
                            <Label className="flex items-center gap-2 mb-3 text-sm font-medium">
                              <Ruler className="h-4 w-4" />
                              Dimensions et caractéristiques des côtés
                            </Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <SideEditor lot={lot} sideName="Côté Nord" sideKey="northSide" icon={<CornerUpRight className="h-3 w-3" />} />
                              <SideEditor lot={lot} sideName="Côté Sud" sideKey="southSide" icon={<CornerUpRight className="h-3 w-3 rotate-180" />} />
                              <SideEditor lot={lot} sideName="Côté Est" sideKey="eastSide" icon={<CornerUpRight className="h-3 w-3 rotate-90" />} />
                              <SideEditor lot={lot} sideName="Côté Ouest" sideKey="westSide" icon={<CornerUpRight className="h-3 w-3 -rotate-90" />} />
                            </div>
                          </div>
                          
                          {/* Angles des coins */}
                          <div className="pt-3 border-t">
                            <Label className="flex items-center gap-2 mb-3 text-sm font-medium">
                              <Compass className="h-4 w-4" />
                              Angles des coins (en degrés)
                            </Label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Nord-Ouest</Label>
                                <Input
                                  type="number"
                                  value={lot.cornerAngles.topLeft}
                                  onChange={(e) => updateLotAngles(lot.id, 'topLeft', parseFloat(e.target.value) || 90)}
                                  className="h-8 text-sm"
                                  min={0}
                                  max={180}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Nord-Est</Label>
                                <Input
                                  type="number"
                                  value={lot.cornerAngles.topRight}
                                  onChange={(e) => updateLotAngles(lot.id, 'topRight', parseFloat(e.target.value) || 90)}
                                  className="h-8 text-sm"
                                  min={0}
                                  max={180}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Sud-Est</Label>
                                <Input
                                  type="number"
                                  value={lot.cornerAngles.bottomRight}
                                  onChange={(e) => updateLotAngles(lot.id, 'bottomRight', parseFloat(e.target.value) || 90)}
                                  className="h-8 text-sm"
                                  min={0}
                                  max={180}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Sud-Ouest</Label>
                                <Input
                                  type="number"
                                  value={lot.cornerAngles.bottomLeft}
                                  onChange={(e) => updateLotAngles(lot.id, 'bottomLeft', parseFloat(e.target.value) || 90)}
                                  className="h-8 text-sm"
                                  min={0}
                                  max={180}
                                />
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              La somme des angles doit être égale à 360°. Actuel: {
                                lot.cornerAngles.topLeft + lot.cornerAngles.topRight + lot.cornerAngles.bottomRight + lot.cornerAngles.bottomLeft
                              }°
                            </p>
                          </div>
                          
                          {/* Bouton supprimer */}
                          <div className="pt-3 border-t flex justify-end">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeLot(lot.id)}
                              className="gap-1"
                            >
                              <Trash2 className="h-4 w-4" />
                              Supprimer ce lot
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                
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
            )}
            
            {/* Étape 3: Croquis automatique */}
            {currentStep === 'sketch' && (
              <div className="space-y-4">
                <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <Layers className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
                    Le croquis est généré automatiquement à partir des données saisies. Vous pouvez zoomer et sélectionner les lots.
                  </AlertDescription>
                </Alert>
                
                {/* Barre d'outils */}
                <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/50 rounded-lg">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setZoomLevel(z => Math.min(z + 0.25, 2))}
                    className="gap-1"
                  >
                    <ZoomIn className="h-4 w-4" />
                    <span className="hidden sm:inline">Zoom +</span>
                  </Button>
                  <span className="text-xs text-muted-foreground min-w-[40px] text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setZoomLevel(z => Math.max(z - 0.25, 0.5))}
                    className="gap-1"
                  >
                    <ZoomOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Zoom -</span>
                  </Button>
                  
                  <Separator orientation="vertical" className="h-6 hidden sm:block" />
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setZoomLevel(1)}
                    className="gap-1"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span className="hidden sm:inline">Réinitialiser</span>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedLotIndex(null)}
                    className="gap-1"
                  >
                    <Maximize2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Tout voir</span>
                  </Button>
                </div>
                
                {/* Canvas */}
                <div className="relative bg-white dark:bg-gray-900 rounded-xl border overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={450}
                    className="w-full h-auto cursor-crosshair"
                    onClick={(e) => {
                      // Permettre la sélection d'un lot en cliquant
                      const rect = canvasRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      const x = (e.clientX - rect.left) * (600 / rect.width);
                      const y = (e.clientY - rect.top) * (450 / rect.height);
                      // Pour l'instant, on fait défiler les lots sélectionnés
                      setSelectedLotIndex(prev => 
                        prev === null ? 0 : (prev + 1) % lots.length
                      );
                    }}
                  />
                  
                  {lots.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                      <p className="text-muted-foreground">Définissez d'abord les lots pour voir le croquis</p>
                    </div>
                  )}
                </div>
                
                {/* Info lot sélectionné */}
                {selectedLotIndex !== null && lots[selectedLotIndex] && (
                  <Card className="p-4 bg-primary/5 border-primary/20">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                        <span className="text-sm font-bold text-primary-foreground">{selectedLotIndex + 1}</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{lots[selectedLotIndex].lotNumber}</div>
                        <div className="text-sm text-muted-foreground">
                          Surface: {lots[selectedLotIndex].areaSqm.toLocaleString()} m² • 
                          Périmètre: {lots[selectedLotIndex].perimeter.toLocaleString()} m
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentStep('lots')}
                      >
                        Modifier
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            )}
            
            {/* Étape 4: Récapitulatif */}
            {currentStep === 'summary' && (
              <div className="space-y-4">
                {/* Parcelle mère */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Parcelle mère
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
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
                      <span className="text-muted-foreground">Titre foncier:</span>
                      <span className="ml-2 font-medium">{parentParcelTitleRef || 'Non renseigné'}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground">Localisation:</span>
                      <span className="ml-2 font-medium">{parentParcelLocation || 'Non renseignée'}</span>
                    </div>
                    {parentParcelGPS.lat && (
                      <div className="sm:col-span-2">
                        <span className="text-muted-foreground">GPS:</span>
                        <span className="ml-2 font-mono text-xs">{parentParcelGPS.lat}, {parentParcelGPS.lng}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Demandeur */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Demandeur
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
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
                
                {/* Lots créés */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Grid3X3 className="h-4 w-4" />
                      Lots créés ({lots.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {lots.map((lot) => (
                        <div key={lot.id} className="flex flex-wrap items-center justify-between gap-2 p-2 bg-muted/50 rounded-lg text-sm">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{lot.lotNumber}</Badge>
                            <span className="text-xs text-muted-foreground">
                              N:{lot.northSide.length}m S:{lot.southSide.length}m E:{lot.eastSide.length}m O:{lot.westSide.length}m
                            </span>
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
                
                {/* Frais */}
                <Card className="border-primary/50 bg-primary/5">
                  <CardHeader className="pb-2">
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
                        <strong>Important:</strong> Les frais de dossier de {SUBMISSION_FEE}$ ne sont pas remboursables en cas de rejet.
                        Si votre demande est approuvée, des frais supplémentaires seront calculés.
                      </AlertDescription>
                    </Alert>
                    
                    {/* Bouton Procéder au paiement */}
                    <Button 
                      onClick={goToPayment} 
                      className="w-full gap-2 mt-4"
                      size="lg"
                    >
                      <CreditCard className="h-5 w-5" />
                      Procéder au paiement
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Étape 5: Paiement */}
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
                  <Label className="text-sm font-medium">Mode de paiement</Label>
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
                      <Label className="text-sm">Opérateur</Label>
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
                      <Label className="text-sm">Numéro de téléphone</Label>
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
                  <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
                    <strong>Attention:</strong> Les frais de dossier de {SUBMISSION_FEE}$ ne sont pas remboursables si votre demande est rejetée.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            
            {/* Étape 6: Confirmation */}
            {currentStep === 'confirmation' && (
              <div className="text-center py-6 md:py-8 space-y-6">
                <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto">
                  <Check className="h-8 w-8 md:h-10 md:w-10 text-green-600 dark:text-green-400" />
                </div>
                
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-green-600 dark:text-green-400">
                    Demande soumise avec succès !
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm">
                    Votre demande sera traitée dans les plus brefs délais.
                  </p>
                </div>
                
                <Card className="max-w-sm mx-auto">
                  <CardContent className="pt-6 space-y-2 text-sm">
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
                  <AlertDescription className="text-sm">
                    Vous recevrez une notification lorsque votre demande sera traitée.
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
        
        {/* Navigation en bas - toujours visible sauf confirmation */}
        {currentStep !== 'confirmation' && (
          <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-t bg-muted/30">
            <Button
              variant="outline"
              onClick={goToPreviousStep}
              disabled={currentStep === 'parcel'}
              className="gap-1"
              size="sm"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Précédent</span>
            </Button>
            
            {/* Indicateur central mobile */}
            <div className="flex md:hidden items-center text-xs text-muted-foreground">
              {Object.keys(stepLabels).indexOf(currentStep) + 1} / {Object.keys(stepLabels).length}
            </div>
            
            {currentStep === 'payment' ? (
              <Button
                onClick={handleSubmit}
                disabled={!canProceedToNext() || submitting}
                className="gap-1"
                size="sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">Traitement...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    <span className="hidden sm:inline">Payer ${SUBMISSION_FEE} et soumettre</span>
                    <span className="sm:hidden">Payer ${SUBMISSION_FEE}</span>
                  </>
                )}
              </Button>
            ) : currentStep === 'summary' ? (
              <Button
                onClick={goToPayment}
                className="gap-1"
                size="sm"
              >
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Procéder au paiement</span>
                <span className="sm:hidden">Paiement</span>
              </Button>
            ) : (
              <Button
                onClick={goToNextStep}
                disabled={!canProceedToNext()}
                className="gap-1"
                size="sm"
              >
                <span className="hidden sm:inline">Suivant</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default SubdivisionRequestDialog;
