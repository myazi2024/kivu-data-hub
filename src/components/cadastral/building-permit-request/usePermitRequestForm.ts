import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  PermitFormData, INITIAL_FORM_DATA, FeeItem,
  AttachmentFile, INITIAL_ATTACHMENTS, isValidEmail, isValidPhone, isValidNif,
  DRAFT_SAFE_FIELDS,
} from './types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { buildKnownBuildingsForPermit, type PermitKnownBuilding } from './permitBuildings';
import { computeFeeBreakdown } from './permitFeeCompute';

const DRAFT_KEY = 'permit_request_draft';

interface UsePermitRequestFormOptions {
  parcelNumber: string;
  hasExistingConstruction: boolean;
  parcelData?: any;
}

const sanitizeForDraft = (fd: PermitFormData): Partial<PermitFormData> => {
  const out: Partial<PermitFormData> = {};
  for (const k of DRAFT_SAFE_FIELDS) {
    out[k] = fd[k] as any;
  }
  return out;
};

export const usePermitRequestForm = ({ parcelNumber, hasExistingConstruction, parcelData }: UsePermitRequestFormOptions) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [requestType, setRequestType] = useState<'new' | 'regularization'>(
    hasExistingConstruction ? 'regularization' : 'new'
  );

  // Track if draft was restored
  const draftRestoredRef = useRef(false);
  const [isDraftRestored, setIsDraftRestored] = useState(false);

  const [formData, setFormData] = useState<PermitFormData>(() => {
    try {
      const stored = localStorage.getItem(`${DRAFT_KEY}_${parcelNumber}`);
      if (stored) {
        draftRestoredRef.current = true;
        const parsed = JSON.parse(stored) as Partial<PermitFormData>;
        return { ...INITIAL_FORM_DATA, ...parsed };
      }
    } catch {}
    return { ...INITIAL_FORM_DATA };
  });

  useEffect(() => {
    if (draftRestoredRef.current) {
      setIsDraftRestored(true);
      const timer = setTimeout(() => setIsDraftRestored(false), 4000);
      return () => clearTimeout(timer);
    }
  }, []);

  const [attachments, setAttachments] = useState<Record<string, AttachmentFile | null>>({ ...INITIAL_ATTACHMENTS });

  // Fees
  const [dynamicFees, setDynamicFees] = useState<FeeItem[]>([]);
  const [feesLoading, setFeesLoading] = useState(false);
  const [feesSource, setFeesSource] = useState<'config' | 'fallback'>('config');

  const fallbackFees = useMemo<FeeItem[]>(() => (
    requestType === 'new'
      ? [{ id: 'fallback_1', fee_name: 'Frais d\'instruction', amount_usd: 75, description: 'Tarif standard (barème par défaut)', is_mandatory: true }]
      : [{ id: 'fallback_2', fee_name: 'Frais de régularisation', amount_usd: 120, description: 'Tarif majoré (barème par défaut)', is_mandatory: true }]
  ), [requestType]);

  // Sync requestType when hasExistingConstruction changes
  useEffect(() => {
    if (hasExistingConstruction) setRequestType('regularization');
  }, [hasExistingConstruction]);

  // ===== Known buildings (multi-construction support) =====
  const knownBuildings = useMemo<PermitKnownBuilding[]>(
    () => buildKnownBuildingsForPermit(parcelData),
    [parcelData],
  );

  const selectedBuilding = useMemo<PermitKnownBuilding | null>(() => {
    if (!formData.constructionRef || formData.constructionRef === 'new') return null;
    return knownBuildings.find((b) => b.ref === formData.constructionRef) || null;
  }, [formData.constructionRef, knownBuildings]);

  // ===== Pre-fill applicant identity from auth + parcel + taxpayer_identity =====
  const applicantPrefillRef = useRef(false);
  useEffect(() => {
    if (!user || applicantPrefillRef.current) return;
    applicantPrefillRef.current = true;

    const taxpayerIdentity = parcelData?.taxpayer_identity || {};
    const ownerName = parcelData?.current_owner_name || taxpayerIdentity.full_name || '';
    const taxpayerNif = taxpayerIdentity.nif || '';

    setFormData(prev => ({
      ...prev,
      applicantName: prev.applicantName || ownerName || (user.user_metadata?.full_name as string) || '',
      applicantPhone: prev.applicantPhone || (user.user_metadata?.phone as string) || '',
      applicantEmail: prev.applicantEmail || user.email || '',
      nif: prev.nif || taxpayerNif,
    }));
  }, [user, parcelData]);

  // ===== Pre-fill construction details from selected building =====
  const buildingPrefillRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedBuilding) return;
    if (buildingPrefillRef.current === selectedBuilding.ref) return;
    buildingPrefillRef.current = selectedBuilding.ref;

    setFormData(prev => ({
      ...prev,
      constructionType: selectedBuilding.constructionType || prev.constructionType,
      constructionNature: selectedBuilding.constructionNature || prev.constructionNature,
      declaredUsage: selectedBuilding.declaredUsage || prev.declaredUsage,
      plannedArea: selectedBuilding.areaSqm
        ? String(selectedBuilding.areaSqm)
        : prev.plannedArea,
      constructionDate: selectedBuilding.constructionYear
        ? `${selectedBuilding.constructionYear}-01-01`
        : prev.constructionDate,
    }));
  }, [selectedBuilding]);

  // Auto-select main building on first load if available and no constructionRef set yet
  useEffect(() => {
    if (knownBuildings.length === 0) {
      // No buildings known: switch to "new" so user inputs everything manually
      if (formData.constructionRef !== 'new') {
        setFormData(prev => ({ ...prev, constructionRef: 'new' }));
      }
      return;
    }
    // If current ref is unknown, fall back to main (or first available)
    const exists = knownBuildings.some(b => b.ref === formData.constructionRef);
    if (!exists && formData.constructionRef !== 'new') {
      setFormData(prev => ({ ...prev, constructionRef: knownBuildings[0].ref }));
    }
  }, [knownBuildings, formData.constructionRef]);

  // ===== Save draft to localStorage on form change (PII-safe) =====
  useEffect(() => {
    try {
      const safe = sanitizeForDraft(formData);
      localStorage.setItem(`${DRAFT_KEY}_${parcelNumber}`, JSON.stringify(safe));
    } catch {}
  }, [formData, parcelNumber]);

  // ===== Load fees from permit_fees_config (with new progressive columns) =====
  useEffect(() => {
    const loadFees = async () => {
      setFeesLoading(true);
      try {
        const permitType = requestType === 'new' ? 'construction' : 'regularization';
        const { data, error } = await supabase
          .from('permit_fees_config')
          .select('*')
          .eq('permit_type', permitType)
          .eq('is_active', true)
          .order('display_order');

        if (error) throw error;

        if (data && data.length > 0) {
          setDynamicFees(data as unknown as FeeItem[]);
          setFeesSource('config');
        } else {
          setDynamicFees(fallbackFees);
          setFeesSource('fallback');
        }
      } catch {
        setDynamicFees(fallbackFees);
        setFeesSource('fallback');
      } finally {
        setFeesLoading(false);
      }
    };
    loadFees();
  }, [requestType, fallbackFees]);

  const handleInputChange = useCallback((field: string, value: string) => {
    if (field === 'numberOfFloors' || field === 'estimatedDuration' || field === 'numberOfRooms') {
      const n = parseInt(value);
      if (value && (isNaN(n) || n < 1)) return;
    }
    if (field === 'plannedArea' || field === 'estimatedCost') {
      const n = parseFloat(value);
      if (value && (isNaN(n) || n < 0)) return;
    }
    setFormData(prev => {
      const next: PermitFormData = { ...prev, [field]: value } as PermitFormData;
      // Cascade reset for CCC picklist consistency
      if (field === 'constructionType') {
        next.constructionNature = '';
        next.declaredUsage = '';
      } else if (field === 'constructionNature') {
        next.declaredUsage = '';
      }
      return next;
    });
  }, []);

  const setConstructionRef = useCallback((ref: string) => {
    setFormData(prev => ({ ...prev, constructionRef: ref }));
    // Reset prefill ref so the building data re-applies for the newly selected ref
    if (ref === 'new') buildingPrefillRef.current = null;
  }, []);

  const requiresOriginalPermit = useCallback(() => {
    return ['Modification non autorisée', 'Extension ou agrandissement', 'Changement d\'usage sans autorisation']
      .includes(formData.regularizationReason);
  }, [formData.regularizationReason]);

  // ===== Progressive fee computation (P2) =====
  const feeContext = useMemo(() => ({
    area: parseFloat(formData.plannedArea) || 0,
    declaredUsage: formData.declaredUsage || undefined,
    constructionNature: formData.constructionNature || undefined,
  }), [formData.plannedArea, formData.declaredUsage, formData.constructionNature]);

  const { breakdown: feeBreakdown, total: totalFeeUSD } = useMemo(
    () => computeFeeBreakdown(dynamicFees, feeContext),
    [dynamicFees, feeContext],
  );

  // ===== Surface coherence vs parcel =====
  const parcelAreaSqm = Number(parcelData?.area_sqm) || null;
  const surfaceWarning = useMemo(() => {
    const area = parseFloat(formData.plannedArea);
    if (!parcelAreaSqm || !Number.isFinite(area) || area <= 0) return null;
    if (area > parcelAreaSqm) {
      return { kind: 'error' as const, message: `La surface (${area} m²) dépasse celle de la parcelle (${parcelAreaSqm} m²).` };
    }
    if (area > parcelAreaSqm * 0.8) {
      return { kind: 'warn' as const, message: `Emprise au sol élevée (>80% de la parcelle). Vérifiez les règles de recul.` };
    }
    return null;
  }, [formData.plannedArea, parcelAreaSqm]);

  // ===== Form validation =====
  const isFormValid = useCallback(() => {
    const baseFields = [
      formData.constructionType, formData.constructionNature, formData.declaredUsage,
      formData.plannedArea, formData.applicantName, formData.applicantPhone,
      formData.projectDescription,
    ];

    const area = parseFloat(formData.plannedArea);
    if (!area || area <= 0) return false;
    if (parcelAreaSqm && area > parcelAreaSqm) return false; // hard block

    if (formData.applicantName.trim().length < 3) return false;
    if (formData.projectDescription.trim().length < 10) return false;

    if (formData.applicantEmail && !isValidEmail(formData.applicantEmail)) return false;
    if (!isValidPhone(formData.applicantPhone)) return false;
    if (formData.nif && !isValidNif(formData.nif)) return false;

    if (!attachments.architectural_plans || !attachments.id_document) return false;

    if (requestType === 'regularization') {
      const regFields = [formData.constructionDate, formData.currentState, formData.regularizationReason];
      if (requiresOriginalPermit() && !formData.originalPermitNumber) return false;
      return baseFields.every(f => !!f) && regFields.every(f => !!f);
    }

    return baseFields.every(f => !!f) && !!formData.startDate;
  }, [formData, attachments, requestType, requiresOriginalPermit, parcelAreaSqm]);

  // ===== Duplicate detection (refined: per requestType + constructionRef) =====
  const checkDuplicateRequest = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    try {
      const { data, error } = await supabase
        .from('cadastral_contributions')
        .select('id, created_at, status, permit_request_data')
        .eq('parcel_number', parcelNumber)
        .eq('user_id', user.id)
        .eq('contribution_type', 'permit_request')
        .in('status', ['pending', 'returned'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const sameType = (data || []).filter((row: any) => {
        const reqType = row.permit_request_data?.requestType;
        const ref = row.permit_request_data?.constructionRef || 'main';
        const wantedType = requestType === 'new' ? 'construction' : 'regularization';
        return reqType === wantedType && ref === formData.constructionRef;
      });

      if (sameType.length > 0) {
        const existing = sameType[0];
        const statusLabels: Record<string, string> = {
          pending: 'en attente de traitement',
          returned: 'retournée pour correction',
        };
        toast({
          title: 'Demande déjà existante',
          description: `Vous avez déjà une demande ${statusLabels[existing.status] || existing.status} pour ce bâtiment (créée le ${format(new Date(existing.created_at), 'dd/MM/yyyy', { locale: fr })}). ${existing.status === 'returned' ? 'Veuillez la corriger depuis votre tableau de bord.' : 'Veuillez attendre son traitement.'}`,
          variant: 'destructive',
        });
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Duplicate check failed (non-blocking):', err);
      return false;
    }
  }, [user, parcelNumber, requestType, formData.constructionRef, toast]);

  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(`${DRAFT_KEY}_${parcelNumber}`); } catch {}
  }, [parcelNumber]);

  const resetForm = useCallback(() => {
    setFormData({ ...INITIAL_FORM_DATA });
    setAttachments({ ...INITIAL_ATTACHMENTS });
    applicantPrefillRef.current = false;
    buildingPrefillRef.current = null;
    clearDraft();
  }, [clearDraft]);

  return {
    requestType, setRequestType,
    formData, handleInputChange,
    attachments, setAttachments,
    dynamicFees, feesLoading, feesSource,
    totalFeeUSD, feeBreakdown,
    isFormValid, requiresOriginalPermit,
    checkDuplicateRequest,
    resetForm, clearDraft,
    isDraftRestored,
    knownBuildings,
    selectedBuilding,
    setConstructionRef,
    surfaceWarning,
    parcelAreaSqm,
  };
};
