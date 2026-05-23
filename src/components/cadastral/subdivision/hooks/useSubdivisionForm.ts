import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import {
  SubdivisionLot, SubdivisionRoad, SubdivisionCommonSpace, SubdivisionServitude,
  PlanElements, DEFAULT_PLAN_ELEMENTS, ParentParcelInfo, RequesterInfo,
  SubdivisionStep, SubdivisionPlanData, Point2D, FeeBreakdown, SubdivisionDocuments
} from '../types';
import { validateSubdivision, ValidationResult, gpsToNormalized, polygonArea, polygonPerimeter, snapNearbyLotVertices } from '../utils/geometry';
import { validateSubdivisionFull } from '../utils/subdivisionValidation';
import { buildMetricFrame, polygonPerimeterM, polygonAreaSqmAccurate, MetricFrame } from '../utils/metrics';
import { useZoningCompliance } from './useZoningCompliance';
import { useParentParcelEligibility } from './useParentParcelEligibility';
import { fetchInfrastructureTariffsAsync } from '@/hooks/useSubdivisionInfrastructureTariffs';
import { buildInfraItemsFromRoads } from '../utils/infrastructureFromRoads';
import { inferSectionType } from '../utils/sectionType';
import { useSubdivisionRequiredDocuments } from '@/hooks/useSubdivisionRequiredDocuments';

const DRAFT_KEY_PREFIX = 'subdivision-draft-v3-';
const IDEMPOTENCY_KEY_PREFIX = 'subdivision-idem-v1-';

export type { SubdivisionDocuments };

export function useSubdivisionForm(parcelNumber: string, parcelData?: any, authUser?: User | null, parcelId?: string) {
  // Steps
  const [currentStep, setCurrentStep] = useState<SubdivisionStep>('parcel');

  // Parent parcel
  const [parentParcel, setParentParcel] = useState<ParentParcelInfo | null>(null);
  const [loadingParcel, setLoadingParcel] = useState(false);

  // Dynamic pricing
  const [submissionFee, setSubmissionFee] = useState<number | null>(null);
  const [feeBreakdown, setFeeBreakdown] = useState<FeeBreakdown | null>(null);
  const [loadingFee, setLoadingFee] = useState(true);

  // Requester (identité enrichie alignée sur le bloc « Propriétaire actuel » du CCC)
  const [requester, setRequester] = useState<RequesterInfo>({
    legalStatus: 'Personne physique',
    gender: '',
    firstName: '', lastName: '', middleName: '',
    entityType: '', entitySubType: '', entitySubTypeOther: '', rccmNumber: '',
    rightType: '', stateExploitedBy: '',
    nationality: '',
    phone: '', email: '',
    type: 'owner', isOwner: true,
  });

  // Draft restored flag
  const [draftRestored, setDraftRestored] = useState(false);

  // Auto-fill requester from authenticated user — supports first/last/middle metadata
  // Guarded to run once per user.id so a Personne morale who cleared firstName is not re-overwritten.
  const lastAutoFillUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!authUser) return;
    if (lastAutoFillUserIdRef.current === authUser.id) return;
    lastAutoFillUserIdRef.current = authUser.id;
    const meta = (authUser.user_metadata || {}) as Record<string, any>;
    const fullName: string = meta.full_name || meta.name || '';
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const metaFirst = meta.first_name || meta.given_name || parts[0] || '';
    const metaLast = meta.last_name || meta.family_name || (parts.length > 1 ? parts[parts.length - 1] : '');
    const metaMiddle = meta.middle_name || (parts.length > 2 ? parts.slice(1, -1).join(' ') : '');
    setRequester(prev => ({
      ...prev,
      legalStatus: prev.legalStatus || 'Personne physique',
      firstName: prev.firstName || metaFirst,
      lastName: prev.lastName || metaLast,
      middleName: prev.middleName || metaMiddle,
      phone: prev.phone || authUser.phone || meta.phone || '',
      email: prev.email || authUser.email || '',
    }));
  }, [authUser]);
  
  // Plan data (lots/roads/...) — déclarés en amont, computeFee s'appuie sur eux.

  // Compute fee from current lots + roads (infrastructures dérivées des voies)
  const computeFee = useCallback(async (
    currentLots: SubdivisionLot[],
    currentRoads: SubdivisionRoad[],
    frame: MetricFrame,
  ) => {
    try {
      // Determine section type and location from parcelData (helper partagé front + edge)
      const sectionType = inferSectionType(parcelData);
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

      // Lot E — infrastructures dérivées des voies (auto)
      const tariffs = await fetchInfrastructureTariffsAsync();
      const derived = buildInfraItemsFromRoads(currentRoads, tariffs, frame, { sectionType });
      const infraItems = derived.map(d => ({
        infrastructure_key: d.infrastructure_key,
        label: d.label,
        unit: d.unit,
        quantity: d.quantity,
        rate_usd: d.rate_usd,
        subtotal_usd: d.subtotal_usd,
        roadId: d.roadId,
        roadName: d.roadName,
      })) as NonNullable<FeeBreakdown['infrastructures']>;
      const infrastructuresTotal = Math.round(infraItems.reduce((s, i) => s + i.subtotal_usd, 0) * 100) / 100;

      if (!rate) {
        // Safe fallback: 10$ per lot (aligned with edge function) + infra
        const fallback = Math.max(10, currentLots.length * 10) + infrastructuresTotal;
        setSubmissionFee(Math.round(fallback * 100) / 100);
        setFeeBreakdown(null);
        setLoadingFee(false);
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

      const lotsTotal = Math.round(items.reduce((s, i) => s + i.fee, 0) * 100) / 100;
      const total = Math.round((lotsTotal + infrastructuresTotal) * 100) / 100;

      setFeeBreakdown({
        ratePerSqm,
        locationName: specificRate ? locationName : '*',
        sectionType,
        isDefault: !specificRate,
        items,
        lotsTotal,
        infrastructures: infraItems,
        infrastructuresTotal,
        total,
      });
      setSubmissionFee(total);
    } catch {
      const fallback = Math.max(10, currentLots.length * 10);
      setSubmissionFee(fallback);
      setFeeBreakdown(null);
    } finally {
      setLoadingFee(false);
    }
  }, [parcelData]);

  // Plan data
  const [lots, setLots] = useState<SubdivisionLot[]>([]);
  const [roads, setRoads] = useState<SubdivisionRoad[]>([]);

  const [commonSpaces, setCommonSpaces] = useState<SubdivisionCommonSpace[]>([]);
  const [servitudes, setServitudes] = useState<SubdivisionServitude[]>([]);
  const [planElements, setPlanElements] = useState<PlanElements>(DEFAULT_PLAN_ELEMENTS);
  
  // Purpose
  const [purpose, setPurpose] = useState('');

  // Documents (uploaded URLs)
  const [documents, setDocuments] = useState<SubdivisionDocuments>({
    requester_id_document_url: null,
    proof_of_ownership_url: null,
    subdivision_sketch_url: null,
  });

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  // Stable idempotency key for the lifetime of this form session — persisted in localStorage
  // so the user retains the same key across reloads until the draft is cleared.
  const idempotencyStorageKey = `${IDEMPOTENCY_KEY_PREFIX}${authUser?.id || 'anon'}-${parcelNumber}`;
  const idempotencyKeyRef = useRef<string>('');
  if (!idempotencyKeyRef.current) {
    try {
      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(idempotencyStorageKey) : null;
      if (stored) {
        idempotencyKeyRef.current = stored;
      } else {
        idempotencyKeyRef.current = crypto.randomUUID();
        if (typeof localStorage !== 'undefined') localStorage.setItem(idempotencyStorageKey, idempotencyKeyRef.current);
      }
    } catch {
      idempotencyKeyRef.current = crypto.randomUUID();
    }
  }

  // Validation
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true, errors: [], warnings: [] });
  
  // Undo history
  const historyRef = useRef<SubdivisionLot[][]>([]);
  const historyIndexRef = useRef(-1);
  const [historyVersion, setHistoryVersion] = useState(0);
  const skipHistoryRef = useRef(false);
  // === Draft system === (scoped per user to avoid leaking drafts on shared devices)
  const draftKey = `${DRAFT_KEY_PREFIX}${authUser?.id || 'anon'}-${parcelNumber}`;
  
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
          // NOTE: legacy `selectedInfrastructures` field ignored — désormais dérivé des voies.
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
    try { localStorage.removeItem(idempotencyStorageKey); } catch { /* ignore */ }
    // Rotate idempotency key so the next attempt is treated as a new request
    idempotencyKeyRef.current = crypto.randomUUID();
    try { localStorage.setItem(idempotencyStorageKey, idempotencyKeyRef.current); } catch { /* ignore */ }
    setDraftRestored(false);
  }, [draftKey, idempotencyStorageKey]);
  
  // Load parent parcel data
  const loadParcelData = useCallback(async () => {
    if (!parcelNumber) return;
    setLoadingParcel(true);
    
    try {
      const computeEffectiveArea = (gpsCoords: { lat: number; lng: number }[], dbAreaSqm: number): number => {
        if (gpsCoords.length >= 3) {
          const frame = buildMetricFrame(gpsCoords as any, dbAreaSqm || 1);
          const normVerts = gpsCoords.map((g) => gpsToNormalized(g as any, gpsCoords as any));
          const geomArea = polygonAreaSqmAccurate(normVerts, frame);
          if (isFinite(geomArea) && geomArea > 0) return Math.round(geomArea);
        }
        return dbAreaSqm || 0;
      };

      if (parcelData?.area_sqm) {
        const gpsCoords = Array.isArray(parcelData.gps_coordinates) 
          ? parcelData.gps_coordinates.map((c: any) => ({ lat: c.lat, lng: c.lng }))
          : [];
        const effectiveAreaSqm = computeEffectiveArea(gpsCoords, parcelData.area_sqm || 0);
        
        setParentParcel({
          parcelNumber,
          areaSqm: effectiveAreaSqm,
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
        const effectiveAreaSqm = computeEffectiveArea(gpsCoords, parcel.area_sqm || 0);
        
        setParentParcel({
          parcelNumber,
          areaSqm: effectiveAreaSqm,
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

  // Anisotropic metric frame: source of truth for all length/area calculations.
  const metricFrame = useMemo<MetricFrame>(() => {
    return buildMetricFrame(parentParcel?.gpsCoordinates, parentParcel?.areaSqm || 0);
  }, [parentParcel]);

  // Recompute submission fee whenever lots / roads / parent change. Debounced 300ms.
  useEffect(() => {
    if (!parentParcel) {
      setLoadingFee(false);
      return;
    }
    if (lots.length === 0) {
      setSubmissionFee(null);
      setFeeBreakdown(null);
      setLoadingFee(false);
      return;
    }
    setLoadingFee(true);
    const t = setTimeout(() => {
      computeFee(lots, roads, metricFrame);
    }, 300);
    return () => clearTimeout(t);
  }, [lots, roads, metricFrame, parentParcel, computeFee]);

  // Required documents driven by admin config — selects which docs gate the form
  const { documents: requiredDocs } = useSubdivisionRequiredDocuments(requester.type);
  const requiredDocKeys = useMemo<string[]>(
    () => requiredDocs.filter(d => d.is_required && d.is_active).map(d => d.doc_key),
    [requiredDocs],
  );

  // Conformité aux règles de zonage admin (live, basée sur le plan en cours d'édition)
  const zoningCompliance = useZoningCompliance(
    parcelData
      ? {
          province: parcelData.province,
          ville: parcelData.ville,
          commune: parcelData.commune,
          quartier: parcelData.quartier,
          avenue: parcelData.avenue,
          territoire: parcelData.territoire,
          collectivite: parcelData.collectivite,
          groupement: parcelData.groupement,
          village: parcelData.village,
        }
      : null,
    parentParcel?.areaSqm || 0,
    lots,
    roads,
    commonSpaces,
  );

  // Éligibilité de la parcelle-mère vérifiée en amont (avant tout tracé)
  const parentEligibility = useParentParcelEligibility(
    parentParcel
      ? {
          id: parcelId,
          parcel_number: parcelNumber,
          area_sqm: parentParcel.areaSqm,
          property_title_type: parentParcel.titleType,
          title_issue_date: parentParcel.titleIssueDate,
          gps_coordinates: parentParcel.gpsCoordinates,
        }
      : null,
    parcelData
      ? {
          province: parcelData.province,
          ville: parcelData.ville,
          commune: parcelData.commune,
          quartier: parcelData.quartier,
          avenue: parcelData.avenue,
          territoire: parcelData.territoire,
          collectivite: parcelData.collectivite,
          groupement: parcelData.groupement,
          village: parcelData.village,
        }
      : null,
  );

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

    // Surface géométrique cohérente avec les côtés GPS affichés (edgeLengthM).
    // Évite l'incohérence "triangle 788/387/802 m → 2887 m² DB" en utilisant
    // la même metricFrame que les longueurs des côtés. Fallback DB sans GPS.
    const geomAreaSqm =
      metricFrame.hasGps && parentVertices.length >= 3
        ? Math.max(1, Math.round(polygonAreaSqmAccurate(parentVertices, metricFrame)))
        : Math.round(parentParcel.areaSqm);
    const fullLot: SubdivisionLot = {
      id: `lot-1`,
      lotNumber: '1',
      vertices: [...parentVertices],
      areaSqm: geomAreaSqm,
      perimeterM: Math.round(polygonPerimeterM(parentVertices, metricFrame)),
      intendedUse: 'residential',
      isBuilt: false,
      hasFence: false,
      color: '#22c55e',
      isParentBoundary: true,
    };
    pushHistory([fullLot]);
    setLots([fullLot]);
  }, [parentParcel, parentVertices, lots.length, pushHistory, metricFrame]);

  // Auto-create initial lot (= entire parent parcel) when entering the designer step
  // with an empty canvas. Skipped if a draft restored existing lots.
  useEffect(() => {
    if (currentStep !== 'designer') return;
    if (!parentParcel || !parentVertices || parentVertices.length < 3) return;
    if (lots.length > 0) return;
    if (draftRestored) return;
    createInitialLot();
  }, [currentStep, parentParcel, parentVertices, lots.length, draftRestored, createInitialLot]);

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
  
  // Update lot — geometry of the parent-boundary lot is locked
  const updateLot = useCallback((lotId: string, updates: Partial<SubdivisionLot>) => {
    setLots(prev => {
      const updated = prev.map(l => {
        if (l.id !== lotId) return l;
        if (l.isParentBoundary) {
          // Strip geometry-changing fields; allow metadata edits only
          const { vertices: _v, areaSqm: _a, perimeterM: _p, ...safe } = updates;
          return { ...l, ...safe };
        }
        return { ...l, ...updates };
      });
      pushHistory(updated);
      return updated;
    });
  }, [pushHistory]);
  
  // Delete lot — parent-boundary lot can only disappear via division
  const deleteLot = useCallback((lotId: string) => {
    setLots(prev => {
      const target = prev.find(l => l.id === lotId);
      if (target?.isParentBoundary) return prev;
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
    
    const result = validateSubdivisionFull(snappedLots, parentParcel.areaSqm, {
      parentVertices,
      roads: roads.map(r => ({ path: r.path, widthM: r.widthM })),
      metricFrame,
      requireRoadAccess: roads.length > 0,
    });
    setValidation(result);
    return result;
  }, [lots, parentParcel, parentVertices, roads, metricFrame]);
  
  useEffect(() => {
    if (lots.length > 0 && parentParcel) {
      runValidation();
    }
  }, [lots, parentParcel, runValidation]);
  
  // Step validation
  const isStepValid = useCallback((step: SubdivisionStep): boolean => {
    switch (step) {
      case 'parcel': {
        if (!parentParcel || !requester.type || !purpose || !requester.phone) return false;
        // Bloquer la suite si la parcelle-mère ne respecte pas les contraintes admin
        if (!parentEligibility.loading && !parentEligibility.eligible) return false;
        const status = requester.legalStatus;
        if (!status) return false;
        if (status !== 'État' && !requester.nationality) return false;
        if (status === 'Personne physique') {
          if (!requester.gender) return false;
          if (!requester.firstName || !requester.lastName) return false;
        } else if (status === 'Personne morale') {
          if (!requester.entityType) return false;
          if (!requester.rccmNumber) return false;
          if (!requester.lastName) return false; // raison sociale / dénomination
        } else if (status === 'État') {
          if (!requester.rightType) return false;
          if (!requester.stateExploitedBy) return false;
        }
        return true;
      }
      case 'designer':
        return lots.length >= 2 && validation.isValid;
      case 'plan':
        return true;
      case 'documents':
      case 'summary': {
        // Si la liste admin n'est pas encore chargée, garde le legacy minimum
        const keys = requiredDocKeys.length > 0
          ? requiredDocKeys
          : ['requester_id_document', 'proof_of_ownership'];
        return keys.every(k => !!(documents as Record<string, string | null | undefined>)[`${k}_url`]);
      }
      case 'zoning':
        return true; // page d'information uniquement
      default:
        return false;
    }
  }, [parentParcel, requester, lots, validation, purpose, documents, parentEligibility, requiredDocKeys]);

  // Navigation — l'onglet 'zoning' n'est ajouté que si une règle s'applique à la zone
  const hasZoningRule = !!zoningCompliance.rule && !zoningCompliance.loading;
  const steps: SubdivisionStep[] = useMemo(
    () => (hasZoningRule
      ? ['zoning', 'parcel', 'designer', 'plan', 'documents', 'summary']
      : ['parcel', 'designer', 'plan', 'documents', 'summary']),
    [hasZoningRule],
  );


  // Si la règle apparaît après le chargement initial, basculer une seule fois sur 'zoning'
  const zoningSeenRef = useRef(false);
  useEffect(() => {
    if (hasZoningRule && !zoningSeenRef.current && currentStep === 'parcel') {
      zoningSeenRef.current = true;
      setCurrentStep('zoning');
    } else if (hasZoningRule) {
      zoningSeenRef.current = true;
    }
  }, [hasZoningRule, currentStep]);

  const goNext = useCallback(() => {
    const idx = steps.indexOf(currentStep);
    if (idx < steps.length - 1) setCurrentStep(steps[idx + 1]);
  }, [currentStep, steps]);

  const goPrev = useCallback(() => {
    const idx = steps.indexOf(currentStep);
    if (idx > 0) setCurrentStep(steps[idx - 1]);
  }, [currentStep, steps]);

  // Submit — calls secure edge function (server is source of truth for fee + reference)
  // Returns { id, reference_number, total_amount_usd } so the caller can trigger payment
  const submit = useCallback(async (_userId: string) => {
    if (!parentParcel) return null;
    const keysToCheck = requiredDocKeys.length > 0
      ? requiredDocKeys
      : ['requester_id_document', 'proof_of_ownership'];
    const missing = keysToCheck.filter(k => !(documents as Record<string, string | null | undefined>)[`${k}_url`]);
    if (missing.length > 0) {
      throw new Error(`Pièces obligatoires manquantes (${missing.join(', ')}).`);
    }

    setSubmitting(true);
    try {
      // Compute section_type via shared helper (cohérent avec l'edge function)
      const sectionType = inferSectionType(parcelData);

      const { data, error } = await supabase.functions.invoke('subdivision-request', {
        body: {
          parcel_number: parcelNumber,
          parcel_id: parcelId || null,
          section_type: sectionType,
          parent_parcel: {
            areaSqm: parentParcel.areaSqm,
            location: parentParcel.location,
            ownerName: parentParcel.ownerName,
            titleReference: parentParcel.titleReference,
            gpsCoordinates: parentParcel.gpsCoordinates,
            province: parcelData?.province || null,
            ville: parcelData?.ville || null,
            commune: parcelData?.commune || null,
            quartier: parcelData?.quartier || null,
            avenue: parcelData?.avenue || null,
            territoire: parcelData?.territoire || null,
            collectivite: parcelData?.collectivite || null,
            groupement: parcelData?.groupement || null,
            village: parcelData?.village || null,
            propertyTitleType: parcelData?.property_title_type || parentParcel.titleType || null,
            titleIssueDate: parentParcel.titleIssueDate || parcelData?.title_issue_date || null,
          },
          requester: {
            legalStatus: requester.legalStatus || null,
            gender: requester.gender || null,
            firstName: requester.firstName,
            lastName: requester.lastName,
            middleName: requester.middleName || null,
            entityType: requester.entityType || null,
            entitySubType: requester.entitySubType || null,
            entitySubTypeOther: requester.entitySubTypeOther || null,
            rccmNumber: requester.rccmNumber || null,
            rightType: requester.rightType || null,
            stateExploitedBy: requester.stateExploitedBy || null,
            nationality: requester.nationality || null,
            phone: requester.phone,
            email: requester.email || null,
            type: requester.type,
          },
          lots,
          roads,
          commonSpaces,
          servitudes,
          planElements,
          purpose,
          documents,

        },
        headers: { 'Idempotency-Key': idempotencyKeyRef.current },
      });

      // Edge function returned non-2xx → parse error body for typed codes
      if (error) {
        let payload: any = null;
        try {
          const ctx = (error as any)?.context;
          if (ctx?.body && typeof ctx.body.text === 'function') {
            const txt = await ctx.body.text();
            payload = txt ? JSON.parse(txt) : null;
          } else if (typeof ctx === 'object' && ctx?.error) {
            payload = ctx;
          }
        } catch { /* ignore */ }
        const code = payload?.error || null;
        const msg = payload?.message || (error as any)?.message || 'Échec de la soumission';
        const e: any = new Error(msg);
        e.code = code;
        e.violations = payload?.violations || null;
        throw e;
      }
      if (!data?.id || !data?.reference_number) {
        throw new Error('Réponse invalide du serveur');
      }

      // Clear draft on successful submission
      clearDraft();

      setCreatedRequestId(data.id);
      setReferenceNumber(data.reference_number);
      // NOTE: do not set `submitted` here. The caller decides:
      //   - Stripe redirect succeeds → user navigates away
      //   - Stripe redirect fails → caller calls markSubmittedFallback() to show success/fallback screen
      return {
        id: data.id as string,
        reference_number: data.reference_number as string,
        total_amount_usd: Number(data.total_amount_usd),
      };
    } catch (err: any) {
      console.error('Error submitting:', err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [parentParcel, parcelData, requester, lots, roads, commonSpaces, servitudes, planElements, purpose, parcelNumber, parcelId, documents, clearDraft, requiredDocKeys]);

  const markSubmittedFallback = useCallback(() => setSubmitted(true), []);


  return {
    // Steps
    currentStep, setCurrentStep, steps, goNext, goPrev, isStepValid,
    // Parent parcel
    parentParcel, loadingParcel,
    // Parent vertices (normalized shape)
    parentVertices,
    // Anisotropic metric frame for accurate measurements
    metricFrame,
    // Requester
    requester, setRequester,
    // Plan data
    lots, setLots: setLotsWithHistory,
    roads, setRoads, commonSpaces, setCommonSpaces,
    servitudes, setServitudes, planElements, setPlanElements,
    // Operations
    deleteLot,
    undo, redo, canUndo: historyIndexRef.current > 0, canRedo: historyIndexRef.current < historyRef.current.length - 1,
    // Validation
    validation,
    // Conformité zonage admin
    zoningCompliance,
    // Éligibilité de la parcelle-mère (vérifiée en amont)
    parentEligibility,
    // Purpose
    purpose, setPurpose,
    // Documents
    documents, setDocuments,
    // Submission
    submitting, submitted, referenceNumber, createdRequestId, submit, markSubmittedFallback,
    // Pricing
    submissionFee, loadingFee, feeBreakdown,
    // Draft
    draftRestored, clearDraft,
  };
}
