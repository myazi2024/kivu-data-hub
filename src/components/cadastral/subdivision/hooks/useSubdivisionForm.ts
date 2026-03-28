import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import {
  SubdivisionLot, SubdivisionRoad, SubdivisionCommonSpace, SubdivisionServitude,
  PlanElements, DEFAULT_PLAN_ELEMENTS, ParentParcelInfo, RequesterInfo,
  SubdivisionStep, SubdivisionPlanData, Point2D, FeeBreakdown
} from '../types';
import { validateSubdivision, ValidationResult, gpsToNormalized, polygonArea, polygonPerimeter, snapNearbyLotVertices } from '../utils/geometry';

const DRAFT_KEY_PREFIX = 'subdivision-draft-';

export function useSubdivisionForm(parcelNumber: string, parcelData?: any, authUser?: User | null) {
  // Steps
  const [currentStep, setCurrentStep] = useState<SubdivisionStep>('parcel');
  
  // Parent parcel
  const [parentParcel, setParentParcel] = useState<ParentParcelInfo | null>(null);
  const [loadingParcel, setLoadingParcel] = useState(false);
  
  // Dynamic pricing
  const [submissionFee, setSubmissionFee] = useState<number | null>(null);
  const [feeBreakdown, setFeeBreakdown] = useState<FeeBreakdown | null>(null);
  const [loadingFee, setLoadingFee] = useState(true);
  
  // Requester
  const [requester, setRequester] = useState<RequesterInfo>({
    firstName: '', lastName: '', phone: '', type: 'owner', isOwner: true,
  });
  
  // Draft restored flag
  const [draftRestored, setDraftRestored] = useState(false);
  
  // Auto-fill requester from authenticated user
  useEffect(() => {
    if (authUser) {
      const meta = authUser.user_metadata || {};
      const fullName = meta.full_name || meta.name || '';
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      setRequester(prev => ({
        ...prev,
        firstName: firstName || prev.firstName,
        lastName: lastName || prev.lastName,
        phone: authUser.phone || meta.phone || prev.phone,
        email: authUser.email || prev.email,
      }));
    }
  }, [authUser]);
  
  // Load subdivision rate from config based on location
  const computeFee = useCallback(async (currentLots: SubdivisionLot[]) => {
    try {
      // Determine section type and location from parcelData
      const sectionType = parcelData?.province && !parcelData?.quartier ? 'rural' : 'urban';
      const locationName = sectionType === 'urban'
        ? (parcelData?.quartier || '')
        : (parcelData?.village || '');

      // Fetch matching rates (specific + fallback *)
      const candidates = [locationName, '*'].filter(Boolean);
      const { data } = await supabase
        .from('subdivision_rate_config' as any)
        .select('*')
        .eq('section_type', sectionType)
        .in('location_name', candidates)
        .eq('is_active', true);

      const ratesData = (data as any[]) || [];
      const specificRate = ratesData.find(r => r.location_name === locationName);
      const fallbackRate = ratesData.find(r => r.location_name === '*');
      const rate = specificRate || fallbackRate;

      if (!rate) {
        setSubmissionFee(20);
        setFeeBreakdown(null);
        return;
      }

      const ratePerSqm = Number(rate.rate_per_sqm_usd);
      const minPerLot = rate.min_fee_per_lot_usd != null ? Number(rate.min_fee_per_lot_usd) : 0;
      const maxPerLot = rate.max_fee_per_lot_usd != null ? Number(rate.max_fee_per_lot_usd) : Infinity;

      const items = currentLots.map(lot => {
        const raw = lot.areaSqm * ratePerSqm;
        const fee = Math.round(Math.max(minPerLot, Math.min(raw, maxPerLot)) * 100) / 100;
        return { lotId: lot.id, lotNumber: lot.lotNumber, areaSqm: lot.areaSqm, fee };
      });

      const total = Math.round(items.reduce((s, i) => s + i.fee, 0) * 100) / 100;

      setFeeBreakdown({
        ratePerSqm,
        locationName: specificRate ? locationName : '*',
        sectionType,
        isDefault: !specificRate,
        items,
        total,
      });
      setSubmissionFee(total);
    } catch {
      setSubmissionFee(20);
      setFeeBreakdown(null);
    } finally {
      setLoadingFee(false);
    }
  }, [parcelData]);

  // Recompute fee when lots change
  useEffect(() => {
    if (lots.length > 0) {
      computeFee(lots);
    }
  }, [lots, computeFee]);
  
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
  const historyRef = useRef<SubdivisionLot[][]>([]);
  const historyIndexRef = useRef(-1);
  const [historyVersion, setHistoryVersion] = useState(0);
  const skipHistoryRef = useRef(false);
  // === Draft system ===
  const draftKey = `${DRAFT_KEY_PREFIX}${parcelNumber}`;
  
  // Restore draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.lots?.length > 0) {
          setLots(draft.lots);
          setRoads(draft.roads || []);
          setCommonSpaces(draft.commonSpaces || []);
          setServitudes(draft.servitudes || []);
          setPurpose(draft.purpose || '');
          if (draft.planElements) setPlanElements(draft.planElements);
          setDraftRestored(true);
        }
      }
    } catch {
      // ignore corrupt drafts
    }
  }, [draftKey]);
  
  // Auto-save draft on changes
  useEffect(() => {
    if (lots.length === 0 && roads.length === 0) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        lots, roads, commonSpaces, servitudes, purpose, planElements,
        savedAt: new Date().toISOString(),
      }));
    } catch {
      // storage full — ignore
    }
  }, [lots, roads, commonSpaces, servitudes, purpose, planElements, draftKey]);
  
  const clearDraft = useCallback(() => {
    localStorage.removeItem(draftKey);
    setDraftRestored(false);
  }, [draftKey]);
  
  // Load parent parcel data
  const loadParcelData = useCallback(async () => {
    if (!parcelNumber) return;
    setLoadingParcel(true);
    
    try {
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
  
  // Compute normalized parent vertices from GPS coordinates
  const parentVertices = useMemo<Point2D[] | undefined>(() => {
    if (!parentParcel || parentParcel.gpsCoordinates.length < 3) return undefined;
    return parentParcel.gpsCoordinates.map(gps => gpsToNormalized(gps, parentParcel.gpsCoordinates));
  }, [parentParcel]);

  // History management
  const pushHistory = useCallback((newLots: SubdivisionLot[]) => {
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(JSON.parse(JSON.stringify(newLots)));
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
    setHistoryVersion(v => v + 1);
  }, []);

  // History-aware setLots wrapper — all external mutations go through this
  const setLotsWithHistory = useCallback((updater: SubdivisionLot[] | ((prev: SubdivisionLot[]) => SubdivisionLot[])) => {
    if (skipHistoryRef.current) {
      setLots(updater);
      return;
    }
    setLots(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  // Allow canvas to skip history during drag
  const setSkipHistory = useCallback((skip: boolean) => {
    skipHistoryRef.current = skip;
  }, []);

  // Create initial lot covering the entire parent parcel
  const createInitialLot = useCallback(() => {
    if (!parentParcel || !parentVertices || parentVertices.length < 3) return;
    if (lots.length > 0) return;
    
    const sideLength = Math.sqrt(parentParcel.areaSqm);
    const fullLot: SubdivisionLot = {
      id: `lot-1`,
      lotNumber: '1',
      vertices: [...parentVertices],
      areaSqm: parentParcel.areaSqm,
      perimeterM: Math.round(polygonPerimeter(parentVertices, sideLength)),
      intendedUse: 'residential',
      isBuilt: false,
      hasFence: false,
      color: '#22c55e',
    };
    pushHistory([fullLot]);
    setLots([fullLot]);
  }, [parentParcel, parentVertices, lots.length, pushHistory]);
  
  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      setHistoryVersion(v => v + 1);
      setLots(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])));
    }
  }, []);
  
  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      setHistoryVersion(v => v + 1);
      setLots(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])));
    }
  }, []);
  
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
    
    // Snap nearby vertices (< 0.5m) before validating
    const { lots: snappedLots, changed } = snapNearbyLotVertices(lots, parentParcel.areaSqm, parentVertices);
    if (changed) {
      setLots(snappedLots);
    }
    
    const result = validateSubdivision(snappedLots, parentParcel.areaSqm);
    setValidation(result);
    return result;
  }, [lots, parentParcel, parentVertices]);
  
  useEffect(() => {
    if (lots.length > 0 && parentParcel) {
      runValidation();
    }
  }, [lots, parentParcel, runValidation]);
  
  // Step validation
  const isStepValid = useCallback((step: SubdivisionStep): boolean => {
    switch (step) {
      case 'parcel':
        return !!(parentParcel && requester.type && purpose);
      case 'designer':
        return lots.length >= 2 && validation.isValid;
      case 'plan':
        return true;
      case 'summary':
        return true;
      default:
        return false;
    }
  }, [parentParcel, requester, lots, validation, purpose]);
  
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
  
  // Submit — creates record with pending payment, returns ID for billing
  const submit = useCallback(async (userId: string) => {
    if (!parentParcel) return null;
    
    setSubmitting(true);
    try {
      const feeAmount = submissionFee ?? 20;
      
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
          submission_fee_usd: feeAmount,
          total_amount_usd: feeAmount,
          status: 'pending',
          submission_payment_status: 'pending',
        } as any)
        .select()
        .single();
      
      if (error) throw error;
      
      // Build reference from returned ID
      const record = data as any;
      const shortId = record.id.substring(0, 8).toUpperCase();
      const refNum = `LOT-${new Date().getFullYear()}-${shortId}`;
      
      // Update reference number
      await supabase
        .from('subdivision_requests' as any)
        .update({ reference_number: refNum } as any)
        .eq('id', record.id);
      
      // Create notification
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'success',
        title: 'Demande de lotissement soumise',
        message: `Votre demande ${refNum} a été soumise. Frais de dossier: ${feeAmount}$.`,
        action_url: '/user-dashboard?tab=subdivisions',
      });
      
      // Clear draft on successful submission
      clearDraft();
      
      setReferenceNumber(refNum);
      setSubmitted(true);
      return refNum;
    } catch (err) {
      console.error('Error submitting:', err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [parentParcel, requester, lots, roads, commonSpaces, servitudes, planElements, purpose, parcelNumber, submissionFee, clearDraft]);
  

  return {
    // Steps
    currentStep, setCurrentStep, steps, goNext, goPrev, isStepValid,
    // Parent parcel
    parentParcel, loadingParcel, setParentParcel,
    // Parent vertices (normalized shape)
    parentVertices,
    // Requester
    requester, setRequester,
    // Plan data
    lots, setLots: setLotsWithHistory, setLotsRaw: setLots, setSkipHistory,
    roads, setRoads, commonSpaces, setCommonSpaces,
    servitudes, setServitudes, planElements, setPlanElements,
    // Operations
    handleAutoSubdivide: createInitialLot, updateLot, deleteLot,
    undo, redo, canUndo: historyIndexRef.current > 0, canRedo: historyIndexRef.current < historyRef.current.length - 1, historyVersion,
    // Validation
    validation, runValidation,
    // Purpose
    purpose, setPurpose,
    // Submission
    submitting, submitted, referenceNumber, submit,
    // Pricing
    submissionFee, loadingFee,
    // Draft
    draftRestored, clearDraft,
  };
}
