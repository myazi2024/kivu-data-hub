import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import WhatsAppFloatingButton from './WhatsAppFloatingButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Grid3X3, MapPin, User, FileText, CreditCard, Check, Plus, Trash2,
  Ruler, Square, Home, Building2, Fence, AlertTriangle, Info, Loader2,
  ChevronRight, ChevronLeft, Upload, Compass, Route, Download, Copy,
  Layers, ZoomIn, ZoomOut, RotateCcw, Maximize2, ArrowUp, ArrowDown,
  ArrowLeft, ArrowRight
} from 'lucide-react';
import {
  LotData, SideDimension, InternalRoad, EnvironmentFeature,
  SketchSettings, DEFAULT_SKETCH_SETTINGS, ParentParcelData,
  SURFACE_TYPES, FENCE_TYPES
} from './subdivision/types';
import { LotGeometryEditor } from './subdivision/LotGeometryEditor';
import { EnvironmentEditor } from './subdivision/EnvironmentEditor';
import { InternalRoadsEditor } from './subdivision/InternalRoadsEditor';
import { ProfessionalSketchCanvas } from './subdivision/ProfessionalSketchCanvas';
import { SubdivisionAssistant } from './subdivision/SubdivisionAssistant';
import { ParentParcelSummary } from './subdivision/ParentParcelSummary';
import { ParcelSketchCreator } from './subdivision/ParcelSketchCreator';
import { SubdivisionValidations } from './subdivision/SubdivisionValidations';
import FormIntroDialog, { FORM_INTRO_CONFIGS } from './FormIntroDialog';
import SectionHelpPopover from './SectionHelpPopover';

interface SubdivisionRequestDialogProps {
  parcelNumber: string;
  parcelId?: string;
  parcelData?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SUBMISSION_FEE = 20;

// Interface pour les côtés de la parcelle mère (simple)
interface ParentParcelSideSimple {
  length: number;
  description: string;
}

interface ParentParcelSides {
  north: ParentParcelSideSimple;
  south: ParentParcelSideSimple;
  east: ParentParcelSideSimple;
  west: ParentParcelSideSimple;
}

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
  const [showIntro, setShowIntro] = useState(true);
  const [currentStep, setCurrentStep] = useState<'parcel' | 'lots' | 'sketch' | 'summary' | 'payment' | 'confirmation'>('parcel');
  
  // États parcelle mère - pré-remplis depuis parcelData
  const [parentParcelArea, setParentParcelArea] = useState('');
  const [parentParcelLocation, setParentParcelLocation] = useState('');
  const [parentParcelOwner, setParentParcelOwner] = useState('');
  const [parentParcelTitleRef, setParentParcelTitleRef] = useState('');
  const [parentParcelTitleType, setParentParcelTitleType] = useState('');
  const [parentParcelTitleIssueDate, setParentParcelTitleIssueDate] = useState('');
  const [parentParcelGPS, setParentParcelGPS] = useState<{ lat: string; lng: string }>({ lat: '', lng: '' });
  const [parentParcelGPSCoordinates, setParentParcelGPSCoordinates] = useState<Array<{ lat: number; lng: number; borne: string }>>([]);
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
  
  // États lots - utilisant le nouveau type LotData
  const [lots, setLots] = useState<LotData[]>([]);
  const [purposeOfSubdivision, setPurposeOfSubdivision] = useState('');
  
  // États pour les routes internes et environnement
  const [internalRoads, setInternalRoads] = useState<InternalRoad[]>([]);
  const [environmentFeatures, setEnvironmentFeatures] = useState<EnvironmentFeature[]>([]);
  const [sketchSettings, setSketchSettings] = useState<SketchSettings>(DEFAULT_SKETCH_SETTINGS);
  
  // États croquis
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedLotIndex, setSelectedLotIndex] = useState<number | null>(null);
  
  // États paiement
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'bank_card'>('mobile_money');
  const [paymentProvider, setPaymentProvider] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Documents
  const [proofOfOwnership, setProofOfOwnership] = useState<File | null>(null);
  
  // Sketch créé pour la parcelle mère
  const [parentParcelSketch, setParentParcelSketch] = useState<{
    sides: SideDimension[];
    gpsPoints?: Array<{ lat: number; lng: number; borne: string }>;
  } | null>(null);
  const [hasExistingSketch, setHasExistingSketch] = useState(false);
  const [showSketchCreator, setShowSketchCreator] = useState(false);
  const [showRequesterEditor, setShowRequesterEditor] = useState(false);
  
  // Loading
  const [submitting, setSubmitting] = useState(false);
  const [loadingParcelData, setLoadingParcelData] = useState(false);
  const [dataSource, setDataSource] = useState<'props' | 'database' | 'manual'>('manual');
  
  // Fonction pour récupérer les données de la parcelle depuis la base de données
  const fetchParcelData = useCallback(async () => {
    if (!parcelNumber) return;
    
    setLoadingParcelData(true);
    try {
      // Rechercher dans cadastral_parcels
      const { data: parcel, error } = await supabase
        .from('cadastral_parcels')
        .select('*')
        .eq('parcel_number', parcelNumber)
        .is('deleted_at', null)
        .single();
      
      if (parcel && !error) {
        applyParcelData(parcel, 'database');
        return;
      }
      
      // Si non trouvé, chercher dans les contributions validées
      const { data: contribution } = await supabase
        .from('cadastral_contributions')
        .select('*')
        .eq('parcel_number', parcelNumber)
        .eq('status', 'validated')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (contribution) {
        applyParcelData({
          area_sqm: contribution.area_sqm,
          location: [contribution.commune, contribution.quartier, contribution.avenue].filter(Boolean).join(', '),
          current_owner_name: contribution.current_owner_name,
          current_owners_details: contribution.current_owners_details,
          title_reference_number: contribution.title_reference_number,
          property_title_type: contribution.property_title_type,
          title_issue_date: contribution.title_issue_date,
          gps_coordinates: contribution.gps_coordinates,
          parcel_sides: contribution.parcel_sides,
          province: contribution.province,
          ville: contribution.ville,
          commune: contribution.commune,
          quartier: contribution.quartier,
          avenue: contribution.avenue
        }, 'database');
      }
    } catch (err) {
      console.error('Error fetching parcel data:', err);
    } finally {
      setLoadingParcelData(false);
    }
  }, [parcelNumber]);
  
  // Appliquer les données de la parcelle (depuis props ou database)
  const applyParcelData = useCallback((data: any, source: 'props' | 'database') => {
    setDataSource(source);
    
    setParentParcelArea(data.area_sqm?.toString() || '');
    setParentParcelLocation(data.location || '');
    
    // Gérer les propriétaires multiples si disponibles
    if (data.current_owners_details && Array.isArray(data.current_owners_details)) {
      const ownersNames = data.current_owners_details
        .map((o: any) => `${o.lastName || ''} ${o.middleName || ''} ${o.firstName || ''}`.trim())
        .filter(Boolean)
        .join('; ');
      setParentParcelOwner(ownersNames || data.current_owner_name || '');
    } else {
      setParentParcelOwner(data.current_owner_name || '');
    }
    
    setParentParcelTitleRef(data.title_reference_number || '');
    setParentParcelTitleType(data.property_title_type || '');
    setParentParcelTitleIssueDate(data.title_issue_date || '');
    
    // GPS - gérer les différents formats
    if (data.gps_coordinates) {
      const gps = data.gps_coordinates;
      if (Array.isArray(gps) && gps.length > 0) {
        // Format tableau de bornes [{lat, lng, borne}] - stocker le tableau complet
        setParentParcelGPSCoordinates(gps.map((coord: any, index: number) => ({
          lat: parseFloat(coord.lat) || 0,
          lng: parseFloat(coord.lng) || 0,
          borne: coord.borne || `B${index + 1}`
        })));
        
        // Garder le premier point pour la compatibilité
        const firstPoint = gps[0];
        setParentParcelGPS({
          lat: firstPoint.lat?.toString() || '',
          lng: firstPoint.lng?.toString() || ''
        });
      } else if (typeof gps === 'object') {
        setParentParcelGPS({
          lat: gps.latitude?.toString() || gps.lat?.toString() || '',
          lng: gps.longitude?.toString() || gps.lng?.toString() || ''
        });
        setParentParcelGPSCoordinates([]);
      }
    } else if (data.latitude && data.longitude) {
      setParentParcelGPS({
        lat: data.latitude.toString(),
        lng: data.longitude.toString()
      });
      setParentParcelGPSCoordinates([]);
    }
    
    // Dimensions des côtés - gérer plusieurs formats CCC
    if (data.parcel_sides) {
      const sides = data.parcel_sides;
      
      // Format tableau [{name, length}] utilisé par le formulaire CCC
      if (Array.isArray(sides)) {
        const findSide = (names: string[]) => {
          return sides.find((s: any) => 
            names.some(n => s.name?.toLowerCase().includes(n.toLowerCase()))
          );
        };
        
        const north = findSide(['nord', 'north', 'n']);
        const south = findSide(['sud', 'south', 's']);
        const east = findSide(['est', 'east', 'e']);
        const west = findSide(['ouest', 'west', 'o', 'w']);
        
        setParentParcelSides({
          north: { length: parseFloat(north?.length) || 0, description: north?.name || 'Nord' },
          south: { length: parseFloat(south?.length) || 0, description: south?.name || 'Sud' },
          east: { length: parseFloat(east?.length) || 0, description: east?.name || 'Est' },
          west: { length: parseFloat(west?.length) || 0, description: west?.name || 'Ouest' }
        });
      } else {
        // Format objet {north: {length}, south: {length}, ...}
        setParentParcelSides({
          north: { length: sides.north?.length || sides.cote_nord || 0, description: sides.north?.description || '' },
          south: { length: sides.south?.length || sides.cote_sud || 0, description: sides.south?.description || '' },
          east: { length: sides.east?.length || sides.cote_est || 0, description: sides.east?.description || '' },
          west: { length: sides.west?.length || sides.cote_ouest || 0, description: sides.west?.description || '' }
        });
      }
    }
    
    toast({
      title: 'Données synchronisées',
      description: `Les informations de la parcelle ont été ${source === 'database' ? 'récupérées depuis la base de données CCC' : 'chargées'}.`,
    });
  }, [toast]);
  
  // Initialiser les données depuis parcelData ou depuis la base de données
  useEffect(() => {
    if (open) {
      if (parcelData && Object.keys(parcelData).length > 0) {
        // Données passées en props
        applyParcelData(parcelData, 'props');
      } else if (parcelNumber) {
        // Pas de données passées, récupérer depuis la base
        fetchParcelData();
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
  }, [open, parcelData, parcelNumber, user, applyParcelData, fetchParcelData]);
  
  // Calculer les statistiques
  const totalLotsArea = lots.reduce((sum, lot) => sum + lot.areaSqm, 0);
  const remainingArea = parseFloat(parentParcelArea || '0') - totalLotsArea;
  const builtLots = lots.filter(l => l.isBuilt).length;
  const fencedLots = lots.filter(l => l.hasFence).length;
  
  // Importer les fonctions centralisées pour éviter la duplication
  // Utiliser les utilitaires de subdivisionCalculations.ts
  const createDefaultSideLocal = (index: number, totalSides: number = 4): SideDimension => {
    // Angles intérieurs d'un polygone régulier = (n-2) * 180 / n
    const interiorAngle = totalSides >= 3 ? ((totalSides - 2) * 180) / totalSides : 90;
    return {
      id: crypto.randomUUID(),
      length: 0,
      angle: Math.round(interiorAngle * 10) / 10,
      isShared: false,
      isRoadBordering: false,
      roadType: 'none'
    };
  };
  
  // Créer des côtés par défaut (4 côtés pour un rectangle)
  const createDefaultSidesLocal = (numberOfSides: number = 4): SideDimension[] => {
    // Angles intérieurs d'un polygone régulier = (n-2) * 180 / n
    const interiorAngle = numberOfSides >= 3 ? ((numberOfSides - 2) * 180) / numberOfSides : 90;
    const roundedAngle = Math.round(interiorAngle * 10) / 10;
    return Array.from({ length: numberOfSides }, (_, i) => ({
      id: crypto.randomUUID(),
      length: 0,
      angle: roundedAngle,
      isShared: false,
      isRoadBordering: false,
      roadType: 'none' as const
    }));
  };
  
  // Ajouter un lot
  const addLot = () => {
    const newLot: LotData = {
      id: crypto.randomUUID(),
      lotNumber: `LOT-${(lots.length + 1).toString().padStart(3, '0')}`,
      sides: createDefaultSidesLocal(4),
      numberOfSides: 4,
      position: { x: 50 + (lots.length % 3) * 120, y: 50 + Math.floor(lots.length / 3) * 100 },
      rotation: 0,
      areaSqm: 0,
      perimeter: 0,
      isBuilt: false,
      hasFence: false,
      intendedUse: 'residential'
    };
    setLots([...lots, newLot]);
  };
  
  // Dupliquer un lot
  const duplicateLot = (lot: LotData, count: number = 1) => {
    const newLots: LotData[] = [];
    for (let i = 0; i < count; i++) {
      newLots.push({
        ...lot,
        id: crypto.randomUUID(),
        lotNumber: `LOT-${(lots.length + i + 1).toString().padStart(3, '0')}`,
        sides: lot.sides.map(s => ({ ...s, id: crypto.randomUUID() })),
        position: { 
          x: lot.position.x + (i + 1) * 30, 
          y: lot.position.y + (i + 1) * 30 
        }
      });
    }
    setLots([...lots, ...newLots]);
    toast({
      title: 'Lots dupliqués',
      description: `${count} lot(s) ont été créés avec les mêmes dimensions.`
    });
  };
  
  // Supprimer un lot
  const removeLot = (id: string) => {
    setLots(lots.filter(l => l.id !== id));
  };
  
  // Calculer l'aire à partir des dimensions des côtés
  const calculateLotArea = (lot: LotData): number => {
    if (lot.sides.length < 3) return 0;
    
    // Pour un quadrilatère simple, on utilise la moyenne des côtés opposés
    if (lot.sides.length === 4) {
      const avgLength = (lot.sides[0].length + lot.sides[2].length) / 2;
      const avgWidth = (lot.sides[1].length + lot.sides[3].length) / 2;
      return avgLength * avgWidth;
    }
    
    // Pour un polygone quelconque, formule approchée
    const avgSide = lot.sides.reduce((sum, s) => sum + s.length, 0) / lot.sides.length;
    const n = lot.sides.length;
    return (n * avgSide * avgSide) / (4 * Math.tan(Math.PI / n));
  };
  
  // Calculer le périmètre
  const calculatePerimeter = (lot: LotData): number => {
    return lot.sides.reduce((sum, side) => sum + side.length, 0);
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
  const updateLotSide = (lotId: string, sideIndex: number, updates: Partial<SideDimension>) => {
    setLots(lots.map(lot => {
      if (lot.id === lotId) {
        const newSides = [...lot.sides];
        newSides[sideIndex] = { ...newSides[sideIndex], ...updates };
        const updated = { ...lot, sides: newSides };
        // Recalculer surface et périmètre
        updated.areaSqm = calculateLotArea(updated);
        updated.perimeter = calculatePerimeter(updated);
        return updated;
      }
      return lot;
    }));
  };
  
  // Changer le nombre de côtés d'un lot
  const changeLotSidesCount = (lotId: string, newCount: number) => {
    // Angles intérieurs d'un polygone régulier = (n-2) * 180 / n
    const interiorAngle = newCount >= 3 ? ((newCount - 2) * 180) / newCount : 90;
    const roundedAngle = Math.round(interiorAngle * 10) / 10;
    
    setLots(lots.map(lot => {
      if (lot.id === lotId) {
        const currentSides = lot.sides;
        let newSides: SideDimension[];
        
        if (newCount > currentSides.length) {
          // Ajouter des côtés
          newSides = [
            ...currentSides,
            ...Array.from({ length: newCount - currentSides.length }, (_, i) => 
              createDefaultSideLocal(currentSides.length + i, newCount)
            )
          ];
        } else {
          // Réduire le nombre de côtés
          newSides = currentSides.slice(0, newCount);
        }
        
        // Recalculer les angles intérieurs corrects
        newSides = newSides.map(s => ({ ...s, angle: roundedAngle }));
        
        const updated = { ...lot, sides: newSides, numberOfSides: newCount };
        updated.areaSqm = calculateLotArea(updated);
        updated.perimeter = calculatePerimeter(updated);
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
  
  // Validation des étapes - avec validations strictes
  const canProceedToNext = () => {
    switch (currentStep) {
      case 'parcel':
        return parentParcelArea && parseFloat(parentParcelArea) > 0 && parentParcelOwner && requesterFirstName && requesterLastName && requesterPhone;
      case 'lots': {
        // Au moins 2 lots avec surfaces valides et pas de dépassement
        if (lots.length < 2) return false;
        
        // Chaque lot doit avoir au moins 3 côtés avec longueur > 0
        const allLotsValid = lots.every(l => {
          const validSides = l.sides.filter(side => side.length > 0);
          return validSides.length >= 3 && l.areaSqm > 0;
        });
        if (!allLotsValid) return false;
        
        // La surface totale ne doit pas dépasser la parcelle mère (avec 5% de tolérance)
        const tolerance = parseFloat(parentParcelArea) * 0.05;
        if (remainingArea < -tolerance) return false;
        
        return true;
      }
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
  
  // Soumission - avec gestion correcte du paiement
  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: 'Authentification requise',
        description: 'Veuillez vous connecter pour soumettre une demande.',
        variant: 'destructive'
      });
      return;
    }
    
    // Vérifier que le paiement est bien sélectionné
    if (!paymentMethod || (paymentMethod === 'mobile_money' && (!paymentProvider || !paymentPhone))) {
      toast({
        title: 'Paiement incomplet',
        description: 'Veuillez compléter les informations de paiement.',
        variant: 'destructive'
      });
      return;
    }
    
    setSubmitting(true);
    try {
      const referenceNumber = generateReferenceNumber();
      
      // Créer la demande avec statut de paiement en attente
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
          internal_roads: internalRoads,
          environment_features: environmentFeatures,
          purpose_of_subdivision: purposeOfSubdivision,
          submission_fee_usd: SUBMISSION_FEE,
          total_amount_usd: SUBMISSION_FEE,
          status: 'pending',
          // Paiement en attente par défaut - sera mis à jour après confirmation
          submission_payment_status: 'pending'
        } as any)
        .select()
        .single();
      
      if (error) throw error;
      
      // TODO: Intégrer le vrai traitement de paiement ici
      // Pour l'instant, on simule une validation de paiement
      // En production, ce statut sera mis à jour via webhook après paiement réel
      
      // Mise à jour du statut de paiement après validation (simulation)
      await supabase
        .from('subdivision_requests' as any)
        .update({ 
          submission_payment_status: 'completed',
          paid_at: new Date().toISOString()
        })
        .eq('id', (data as any).id);
      
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
  
  // Labels des côtés
  const getSideLabel = (index: number, total: number): string => {
    if (total === 4) {
      return ['Nord', 'Est', 'Sud', 'Ouest'][index] || `Côté ${index + 1}`;
    }
    return `Côté ${index + 1}`;
  };
  
  // Icône de direction pour les côtés
  const getSideIcon = (index: number, total: number) => {
    if (total === 4) {
      return [<ArrowUp key="n" className="h-3 w-3" />, 
              <ArrowRight key="e" className="h-3 w-3" />,
              <ArrowDown key="s" className="h-3 w-3" />,
              <ArrowLeft key="w" className="h-3 w-3" />][index] || null;
    }
    return null;
  };
  
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
    sideIndex,
    side
  }: { 
    lot: LotData; 
    sideIndex: number;
    side: SideDimension;
  }) => {
    const sideLabel = getSideLabel(sideIndex, lot.numberOfSides);
    const sideIcon = getSideIcon(sideIndex, lot.numberOfSides);
    
    return (
      <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-2 text-sm font-medium">
          {sideIcon}
          {sideLabel}
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Longueur (m)</Label>
            <Input
              type="number"
              value={side.length || ''}
              onChange={(e) => updateLotSide(lot.id, sideIndex, { length: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              className="h-8 text-sm"
            />
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs">Angle (°)</Label>
            <Input
              type="number"
              value={side.angle || 90}
              onChange={(e) => updateLotSide(lot.id, sideIndex, { angle: parseFloat(e.target.value) || 90 })}
              placeholder="90"
              className="h-8 text-sm"
              min={0}
              max={180}
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={side.isShared}
              onCheckedChange={(checked) => updateLotSide(lot.id, sideIndex, { isShared: checked })}
              className="scale-75"
            />
            <Label className="text-xs">Mitoyen</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={side.isRoadBordering}
              onCheckedChange={(checked) => updateLotSide(lot.id, sideIndex, { isRoadBordering: checked })}
              className="scale-75"
            />
            <Label className="text-xs">Borde route</Label>
          </div>
        </div>
        
        {side.isShared && (
          <div className="space-y-1">
            <Label className="text-xs">Lot adjacent</Label>
            <Input
              value={side.adjacentLotNumber || ''}
              onChange={(e) => updateLotSide(lot.id, sideIndex, { adjacentLotNumber: e.target.value })}
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
                onValueChange={(v) => updateLotSide(lot.id, sideIndex, { roadType: v as SideDimension['roadType'] })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="existing">Route existante</SelectItem>
                  <SelectItem value="created">Route créée</SelectItem>
                  <SelectItem value="none">Aucune</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Largeur route (m)</Label>
              <Input
                type="number"
                value={side.roadWidth || ''}
                onChange={(e) => updateLotSide(lot.id, sideIndex, { roadWidth: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Nom de la route</Label>
              <Input
                value={side.roadName || ''}
                onChange={(e) => updateLotSide(lot.id, sideIndex, { roadName: e.target.value })}
                placeholder="Avenue / Route"
                className="h-8 text-sm"
              />
            </div>
          </div>
        )}
      </div>
    );
  };
  
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
        config={FORM_INTRO_CONFIGS.subdivision}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 z-[1200]">
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
            {/* Étape 1: Parcelle mère + Demandeur - Vue optimisée */}
            {currentStep === 'parcel' && (
              <div className="space-y-6">
                {/* Vue résumé avec les nouveaux composants */}
                {!showSketchCreator && !showRequesterEditor ? (
                  <>
                    <ParentParcelSummary
                      parcelData={{
                        parcelNumber,
                        owner: parentParcelOwner,
                        area: parseFloat(parentParcelArea) || 0,
                        location: parentParcelLocation,
                        titleType: parentParcelTitleType,
                        titleRef: parentParcelTitleRef,
                        titleIssueDate: parentParcelTitleIssueDate,
                        gps: parentParcelGPS,
                        gpsCoordinates: parentParcelGPSCoordinates.length > 0 ? parentParcelGPSCoordinates : undefined,
                        sides: [
                          { id: 'north', length: parentParcelSides.north.length, angle: 90, isShared: false, isRoadBordering: false, roadType: 'none' },
                          { id: 'east', length: parentParcelSides.east.length, angle: 90, isShared: false, isRoadBordering: false, roadType: 'none' },
                          { id: 'south', length: parentParcelSides.south.length, angle: 90, isShared: false, isRoadBordering: false, roadType: 'none' },
                          { id: 'west', length: parentParcelSides.west.length, angle: 90, isShared: false, isRoadBordering: false, roadType: 'none' }
                        ],
                        hasSketch: hasExistingSketch || parentParcelSketch !== null
                      }}
                      requesterData={{
                        firstName: requesterFirstName,
                        lastName: requesterLastName,
                        middleName: requesterMiddleName,
                        phone: requesterPhone,
                        email: requesterEmail,
                        type: requesterType,
                        isOwner: isRequesterOwner
                      }}
                      dataSource={loadingParcelData ? 'loading' : dataSource !== 'manual' ? 'synced' : 'manual'}
                      onRefreshData={fetchParcelData}
                      onCreateSketch={() => setShowSketchCreator(true)}
                      onEditRequester={() => setShowRequesterEditor(true)}
                      isMandataryValid={isRequesterOwner ? undefined : true}
                    />
                    
                    {/* Section formulaire demandeur si en mode édition ou si données manquantes */}
                    {(!requesterFirstName || !requesterLastName || !requesterPhone) && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <User className="h-4 w-4 text-primary" />
                            Informations du demandeur
                            <SectionHelpPopover
                              title="Informations du demandeur"
                              description="Renseignez vos coordonnées complètes. Si vous n'êtes pas le propriétaire, précisez votre qualité (mandataire, notaire, etc.)."
                            />
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
                    )}
                  </>
                ) : showSketchCreator ? (
                  /* Créateur de croquis */
                  <ParcelSketchCreator
                    initialSides={[
                      { id: 'north', length: parentParcelSides.north.length, angle: 90, isShared: false, isRoadBordering: false, roadType: 'none' },
                      { id: 'east', length: parentParcelSides.east.length, angle: 90, isShared: false, isRoadBordering: false, roadType: 'none' },
                      { id: 'south', length: parentParcelSides.south.length, angle: 90, isShared: false, isRoadBordering: false, roadType: 'none' },
                      { id: 'west', length: parentParcelSides.west.length, angle: 90, isShared: false, isRoadBordering: false, roadType: 'none' }
                    ]}
                    initialArea={parseFloat(parentParcelArea) || 0}
                    onSave={(sides, gpsPoints) => {
                      // Mettre à jour les côtés depuis le sketch
                      if (sides.length >= 4) {
                        setParentParcelSides({
                          north: { length: sides[0]?.length || 0, description: 'Nord' },
                          east: { length: sides[1]?.length || 0, description: 'Est' },
                          south: { length: sides[2]?.length || 0, description: 'Sud' },
                          west: { length: sides[3]?.length || 0, description: 'Ouest' }
                        });
                      }
                      // Stocker le sketch complet
                      setParentParcelSketch({ sides, gpsPoints });
                      setHasExistingSketch(true);
                      // Mettre à jour GPS si disponible
                      if (gpsPoints && gpsPoints.length > 0) {
                        setParentParcelGPS({
                          lat: gpsPoints[0].lat.toString(),
                          lng: gpsPoints[0].lng.toString()
                        });
                      }
                      setShowSketchCreator(false);
                      toast({
                        title: 'Croquis enregistré',
                        description: 'Les dimensions de la parcelle ont été mises à jour.'
                      });
                    }}
                    onCancel={() => setShowSketchCreator(false)}
                  />
                ) : showRequesterEditor ? (
                  /* Éditeur de demandeur */
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        Modifier les informations du demandeur
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
                      
                      <div className="flex gap-2 pt-4">
                        <Button variant="outline" onClick={() => setShowRequesterEditor(false)}>
                          Annuler
                        </Button>
                        <Button onClick={() => setShowRequesterEditor(false)}>
                          <Check className="h-4 w-4 mr-2" />
                          Enregistrer
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            )}
            
            {/* Étape 2: Définition des lots */}
            {currentStep === 'lots' && (
              <div className="space-y-4">
                {/* Assistant de création automatique */}
                {lots.length === 0 && parseFloat(parentParcelArea) > 0 && (
                  <SubdivisionAssistant
                    parentParcel={{
                      area: parseFloat(parentParcelArea) || 0,
                      location: parentParcelLocation,
                      owner: parentParcelOwner,
                      titleRef: parentParcelTitleRef,
                      titleType: parentParcelTitleType,
                      titleIssueDate: parentParcelTitleIssueDate,
                      gps: parentParcelGPS,
                      sides: [
                        { id: 'north', length: parentParcelSides.north.length, angle: 90, isShared: false, isRoadBordering: false, roadType: 'none' },
                        { id: 'east', length: parentParcelSides.east.length, angle: 90, isShared: false, isRoadBordering: false, roadType: 'none' },
                        { id: 'south', length: parentParcelSides.south.length, angle: 90, isShared: false, isRoadBordering: false, roadType: 'none' },
                        { id: 'west', length: parentParcelSides.west.length, angle: 90, isShared: false, isRoadBordering: false, roadType: 'none' }
                      ],
                      numberOfSides: 4
                    }}
                    onGenerateLots={(generatedLots) => setLots(generatedLots)}
                    existingLots={lots}
                  />
                )}
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">Lots à créer</h3>
                    <p className="text-sm text-muted-foreground">
                      {lots.length > 0 
                        ? `${lots.length} lot(s) défini(s) - Modifiez ou ajoutez des lots`
                        : 'Utilisez l\'assistant ou ajoutez des lots manuellement'}
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
                              {lot.areaSqm > 0 ? `${lot.areaSqm.toLocaleString()} m² • P: ${lot.perimeter.toLocaleString()} m • ${lot.numberOfSides} côtés` : 'Dimensions à définir'}
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
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs">N° du lot</Label>
                              <Input
                                value={lot.lotNumber}
                                onChange={(e) => updateLot(lot.id, { lotNumber: e.target.value })}
                                className="h-9 text-sm"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Nombre de côtés</Label>
                              <Select 
                                value={lot.numberOfSides.toString()} 
                                onValueChange={(v) => changeLotSidesCount(lot.id, parseInt(v))}
                              >
                                <SelectTrigger className="h-9 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[3, 4, 5, 6, 7, 8].map(n => (
                                    <SelectItem key={n} value={n.toString()}>{n} côtés</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Usage prévu</Label>
                              <Select 
                                value={lot.intendedUse} 
                                onValueChange={(v: LotData['intendedUse']) => updateLot(lot.id, { intendedUse: v })}
                              >
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
                            <div className="flex items-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => duplicateLot(lot, 1)}
                                className="gap-1 flex-1"
                              >
                                <Copy className="h-3 w-3" />
                                Dupliquer
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-4">
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
                            {lot.hasFence && (
                              <Select 
                                value={lot.fenceType || 'wall'} 
                                onValueChange={(v: LotData['fenceType']) => updateLot(lot.id, { fenceType: v })}
                              >
                                <SelectTrigger className="h-8 w-32 text-xs">
                                  <SelectValue placeholder="Type clôture" />
                                </SelectTrigger>
                                <SelectContent>
                                  {FENCE_TYPES.map(t => (
                                    <SelectItem key={t.value} value={t.value}>
                                      {t.icon} {t.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                          
                          {/* Dimensions des côtés */}
                          <div className="pt-3 border-t">
                            <Label className="flex items-center gap-2 mb-3 text-sm font-medium">
                              <Ruler className="h-4 w-4" />
                              Dimensions et caractéristiques des côtés
                            </Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {lot.sides.map((side, sideIndex) => (
                                <SideEditor 
                                  key={side.id} 
                                  lot={lot} 
                                  sideIndex={sideIndex}
                                  side={side}
                                />
                              ))}
                            </div>
                          </div>
                          
                          {/* Résumé des angles */}
                          <div className="pt-3 border-t">
                            <div className="flex items-center justify-between">
                              <Label className="flex items-center gap-2 text-sm font-medium">
                                <Compass className="h-4 w-4" />
                                Somme des angles
                              </Label>
                              <span className={`text-sm font-medium ${
                                Math.abs(lot.sides.reduce((sum, s) => sum + (s.angle || 0), 0) - (lot.numberOfSides - 2) * 180) < 1 
                                  ? 'text-green-600' 
                                  : 'text-amber-600'
                              }`}>
                                {lot.sides.reduce((sum, s) => sum + (s.angle || 0), 0)}° 
                                (attendu: {(lot.numberOfSides - 2) * 180}°)
                              </span>
                            </div>
                          </div>
                          
                          {/* Notes */}
                          <div className="pt-3 border-t">
                            <Label className="text-xs mb-2 block">Notes sur le lot</Label>
                            <Textarea
                              value={lot.notes || ''}
                              onChange={(e) => updateLot(lot.id, { notes: e.target.value })}
                              placeholder="Informations supplémentaires..."
                              rows={2}
                              className="text-sm"
                            />
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
                
                {/* Section Routes internes */}
                {lots.length > 0 && (
                  <Card className="mt-6">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Route className="h-4 w-4 text-primary" />
                        Routes internes (optionnel)
                        <SectionHelpPopover
                          title="Routes internes"
                          description="Définissez les voies de circulation internes au lotissement. Précisez leur largeur et type de revêtement prévu. Ces routes doivent respecter les normes d'urbanisme en vigueur."
                        />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <InternalRoadsEditor
                        roads={internalRoads}
                        onRoadsChange={setInternalRoads}
                        lots={lots}
                      />
                    </CardContent>
                  </Card>
                )}
                
                {/* Section Environnement */}
                {lots.length > 0 && (
                  <Card className="mt-4">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Layers className="h-4 w-4 text-primary" />
                        Éléments environnants (optionnel)
                        <SectionHelpPopover
                          title="Éléments environnants"
                          description="Identifiez les éléments naturels ou construits autour de la parcelle (rivières, routes, bâtiments voisins) qui pourraient influencer le plan de lotissement."
                        />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <EnvironmentEditor
                        features={environmentFeatures}
                        onFeaturesChange={setEnvironmentFeatures}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
            
            {/* Étape 3: Croquis automatique */}
            {currentStep === 'sketch' && (
              <div className="space-y-4">
                <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <Layers className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
                    Le croquis professionnel est généré automatiquement à partir des données saisies. Vous pouvez l'exporter en PDF ou PNG haute résolution.
                  </AlertDescription>
                </Alert>
                
                <ProfessionalSketchCanvas
                  lots={lots}
                  internalRoads={internalRoads}
                  environmentFeatures={environmentFeatures}
                  parentParcel={{
                    area: parseFloat(parentParcelArea) || 0,
                    location: parentParcelLocation,
                    owner: parentParcelOwner,
                    titleRef: parentParcelTitleRef,
                    titleType: parentParcelTitleType,
                    titleIssueDate: parentParcelTitleIssueDate,
                    gps: parentParcelGPS,
                    sides: [
                      { id: 'n', length: parentParcelSides.north.length, angle: 90, isShared: false, isRoadBordering: false, roadType: 'none' },
                      { id: 'e', length: parentParcelSides.east.length, angle: 90, isShared: false, isRoadBordering: false, roadType: 'none' },
                      { id: 's', length: parentParcelSides.south.length, angle: 90, isShared: false, isRoadBordering: false, roadType: 'none' },
                      { id: 'w', length: parentParcelSides.west.length, angle: 90, isShared: false, isRoadBordering: false, roadType: 'none' }
                    ],
                    numberOfSides: 4
                  }}
                  settings={sketchSettings}
                  onSettingsChange={setSketchSettings}
                  onLotSelect={setSelectedLotIndex}
                  selectedLotIndex={selectedLotIndex}
                />
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
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">N° Parcelle:</span>
                      <span className="font-mono font-medium">{parcelNumber}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Propriétaire:</span>
                      <span className="font-medium">{parentParcelOwner}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Surface totale:</span>
                      <span className="font-medium">{parseFloat(parentParcelArea).toLocaleString()} m²</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Localisation:</span>
                      <span className="font-medium text-right max-w-[200px] truncate">{parentParcelLocation}</span>
                    </div>
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
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Nom complet:</span>
                      <span className="font-medium">{requesterLastName} {requesterFirstName} {requesterMiddleName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Téléphone:</span>
                      <span className="font-medium">{requesterPhone}</span>
                    </div>
                    {requesterEmail && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium">{requesterEmail}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Est propriétaire:</span>
                      <Badge variant={isRequesterOwner ? 'default' : 'secondary'}>
                        {isRequesterOwner ? 'Oui' : 'Non'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Lots */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Grid3X3 className="h-4 w-4" />
                      Lots créés ({lots.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid gap-2 max-h-40 overflow-y-auto">
                      {lots.map((lot, index) => (
                        <div key={lot.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{lot.lotNumber}</span>
                            <span className="text-muted-foreground">({lot.numberOfSides} côtés)</span>
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
      {open && <WhatsAppFloatingButton message="Bonjour, j'ai besoin d'aide avec la demande de lotissement." />}
    </Dialog>
  );
};

export default SubdivisionRequestDialog;
