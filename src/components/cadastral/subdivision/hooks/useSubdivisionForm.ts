import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  SubdivisionLot, SubdivisionRoad, SubdivisionCommonSpace, SubdivisionServitude,
  PlanElements, DEFAULT_PLAN_ELEMENTS, ParentParcelInfo, RequesterInfo,
  SubdivisionStep, AutoSubdivideOptions, SubdivisionPlanData, Point2D
} from '../types';
import { autoSubdivide, generateRoads, validateSubdivision, ValidationResult, gpsToNormalized } from '../utils/geometry';

export function useSubdivisionForm(parcelNumber: string, parcelData?: any) {
  // Steps
  const [currentStep, setCurrentStep] = useState<SubdivisionStep>('parcel');
  
  // Parent parcel
  const [parentParcel, setParentParcel] = useState<ParentParcelInfo | null>(null);
  const [loadingParcel, setLoadingParcel] = useState(false);
  
  // Requester
  const [requester, setRequester] = useState<RequesterInfo>({
    firstName: '', lastName: '', phone: '', type: 'owner', isOwner: true,
  });
  
  // Plan data
  const [lots, setLots] = useState<SubdivisionLot[]>([]);
  const [roads, setRoads] = useState<SubdivisionRoad[]>([]);
  const [commonSpaces, setCommonSpaces] = useState<SubdivisionCommonSpace[]>([]);
  const [servitudes, setServitudes] = useState<SubdivisionServitude[]>([]);
  const [planElements, setPlanElements] = useState<PlanElements>(DEFAULT_PLAN_ELEMENTS);
  
  // Purpose
  const [purpose, setPurpose] = useState('');
  
  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  
  // Validation
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true, errors: [], warnings: [] });
  
  // Undo history
  const [history, setHistory] = useState<SubdivisionLot[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Load parent parcel data
  const loadParcelData = useCallback(async () => {
    if (!parcelNumber) return;
    setLoadingParcel(true);
    
    try {
      // Try from props first
      if (parcelData?.area_sqm) {
        const gpsCoords = Array.isArray(parcelData.gps_coordinates) 
          ? parcelData.gps_coordinates.map((c: any) => ({ lat: c.lat, lng: c.lng }))
          : [];
        
        setParentParcel({
          parcelNumber,
          areaSqm: parcelData.area_sqm || 0,
          location: [parcelData.commune, parcelData.quartier, parcelData.avenue].filter(Boolean).join(', '),
          ownerName: parcelData.current_owner_name || '',
          titleReference: parcelData.title_reference_number || '',
          titleType: parcelData.property_title_type || '',
          titleIssueDate: parcelData.title_issue_date || '',
          gpsCoordinates: gpsCoords,
          parcelSides: parcelData.parcel_sides,
        });
        return;
      }
      
      // Fetch from DB
      const { data: parcel } = await supabase
        .from('cadastral_parcels')
        .select('*')
        .eq('parcel_number', parcelNumber)
        .is('deleted_at', null)
        .single();
      
      if (parcel) {
        const gpsCoords = Array.isArray(parcel.gps_coordinates) 
          ? (parcel.gps_coordinates as any[]).map((c: any) => ({ lat: c.lat, lng: c.lng }))
          : [];
        
        setParentParcel({
          parcelNumber,
          areaSqm: parcel.area_sqm || 0,
          location: [parcel.commune, parcel.quartier, parcel.avenue].filter(Boolean).join(', ') || parcel.location,
          ownerName: parcel.current_owner_name || '',
          titleReference: parcel.title_reference_number || '',
          titleType: parcel.property_title_type || '',
          titleIssueDate: parcel.title_issue_date || '',
          gpsCoordinates: gpsCoords,
          parcelSides: parcel.parcel_sides,
        });
      }
    } catch (err) {
      console.error('Error loading parcel data:', err);
    } finally {
      setLoadingParcel(false);
    }
  }, [parcelNumber, parcelData]);
  
  useEffect(() => {
    loadParcelData();
  }, [loadParcelData]);
  
  // Auto-subdivide
  const handleAutoSubdivide = useCallback((options: AutoSubdivideOptions) => {
    if (!parentParcel) return;
    
    const newLots = autoSubdivide(options, parentParcel.areaSqm);
    pushHistory(newLots);
    setLots(newLots);
    
    if (options.includeRoad) {
      const newRoads = generateRoads(newLots, options.direction, options.roadWidthM, parentParcel.areaSqm);
      setRoads(newRoads as SubdivisionRoad[]);
    }
  }, [parentParcel]);
  
  // History management
  const pushHistory = useCallback((newLots: SubdivisionLot[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newLots)));
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);
  
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setLots(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  }, [history, historyIndex]);
  
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setLots(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  }, [history, historyIndex]);
  
  // Update lot
  const updateLot = useCallback((lotId: string, updates: Partial<SubdivisionLot>) => {
    setLots(prev => {
      const updated = prev.map(l => l.id === lotId ? { ...l, ...updates } : l);
      pushHistory(updated);
      return updated;
    });
  }, [pushHistory]);
  
  // Delete lot
  const deleteLot = useCallback((lotId: string) => {
    setLots(prev => {
      const updated = prev.filter(l => l.id !== lotId);
      pushHistory(updated);
      return updated;
    });
  }, [pushHistory]);
  
  // Validate
  const runValidation = useCallback(() => {
    if (!parentParcel) return;
    const result = validateSubdivision(lots, parentParcel.areaSqm);
    setValidation(result);
    return result;
  }, [lots, parentParcel]);
  
  useEffect(() => {
    if (lots.length > 0 && parentParcel) {
      runValidation();
    }
  }, [lots, parentParcel, runValidation]);
  
  // Step validation
  const isStepValid = useCallback((step: SubdivisionStep): boolean => {
    switch (step) {
      case 'parcel':
        return !!(parentParcel && requester.firstName && requester.lastName && requester.phone);
      case 'designer':
        return lots.length >= 2 && validation.isValid;
      case 'plan':
        return true;
      case 'summary':
        return true;
      default:
        return false;
    }
  }, [parentParcel, requester, lots, validation]);
  
  // Navigation
  const steps: SubdivisionStep[] = ['parcel', 'designer', 'plan', 'summary'];
  
  const goNext = useCallback(() => {
    const idx = steps.indexOf(currentStep);
    if (idx < steps.length - 1) setCurrentStep(steps[idx + 1]);
  }, [currentStep]);
  
  const goPrev = useCallback(() => {
    const idx = steps.indexOf(currentStep);
    if (idx > 0) setCurrentStep(steps[idx - 1]);
  }, [currentStep]);
  
  // Submit
  const submit = useCallback(async (userId: string) => {
    if (!parentParcel) return null;
    
    setSubmitting(true);
    try {
      const refNum = `LOT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
      
      const planData: SubdivisionPlanData = {
        lots,
        roads,
        commonSpaces,
        servitudes,
        planElements,
      };
      
      const { data, error } = await supabase
        .from('subdivision_requests' as any)
        .insert({
          reference_number: refNum,
          user_id: userId,
          parcel_number: parcelNumber,
          parent_parcel_area_sqm: parentParcel.areaSqm,
          parent_parcel_location: parentParcel.location,
          parent_parcel_owner_name: parentParcel.ownerName,
          parent_parcel_title_reference: parentParcel.titleReference,
          parent_parcel_gps_coordinates: parentParcel.gpsCoordinates,
          requester_first_name: requester.firstName,
          requester_last_name: requester.lastName,
          requester_middle_name: requester.middleName || null,
          requester_phone: requester.phone,
          requester_email: requester.email || null,
          requester_type: requester.type,
          number_of_lots: lots.length,
          lots_data: lots,
          subdivision_plan_data: planData,
          purpose_of_subdivision: purpose,
          submission_fee_usd: 20,
          total_amount_usd: 20,
          status: 'pending',
          submission_payment_status: 'completed',
        } as any)
        .select()
        .single();
      
      if (error) throw error;
      
      // Create notification
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'success',
        title: 'Demande de lotissement soumise',
        message: `Votre demande ${refNum} a été soumise. Frais de dossier: 20$.`,
        action_url: '/user-dashboard?tab=subdivisions',
      });
      
      setReferenceNumber(refNum);
      setSubmitted(true);
      return refNum;
    } catch (err) {
      console.error('Error submitting:', err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [parentParcel, requester, lots, roads, commonSpaces, servitudes, planElements, purpose, parcelNumber]);
  
  return {
    // Steps
    currentStep, setCurrentStep, steps, goNext, goPrev, isStepValid,
    // Parent parcel
    parentParcel, loadingParcel, setParentParcel,
    // Requester
    requester, setRequester,
    // Plan data
    lots, setLots, roads, setRoads, commonSpaces, setCommonSpaces,
    servitudes, setServitudes, planElements, setPlanElements,
    // Operations
    handleAutoSubdivide, updateLot, deleteLot,
    undo, redo, canUndo: historyIndex > 0, canRedo: historyIndex < history.length - 1,
    // Validation
    validation, runValidation,
    // Purpose
    purpose, setPurpose,
    // Submission
    submitting, submitted, referenceNumber, submit,
  };
}
