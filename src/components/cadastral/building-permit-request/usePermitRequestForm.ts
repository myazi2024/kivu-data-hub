import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  PermitFormData, INITIAL_FORM_DATA, FeeItem,
  AttachmentFile, INITIAL_ATTACHMENTS, isValidEmail, isValidPhone,
} from './types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const DRAFT_KEY = 'permit_request_draft';

interface UsePermitRequestFormOptions {
  parcelNumber: string;
  hasExistingConstruction: boolean;
  parcelData?: any;
}

export const usePermitRequestForm = ({ parcelNumber, hasExistingConstruction, parcelData }: UsePermitRequestFormOptions) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [requestType, setRequestType] = useState<'new' | 'regularization'>(
    hasExistingConstruction ? 'regularization' : 'new'
  );

  // Fix #15: Track if draft was restored
  const draftRestoredRef = useRef(false);
  const [isDraftRestored, setIsDraftRestored] = useState(false);

  const [formData, setFormData] = useState<PermitFormData>(() => {
    try {
      const stored = localStorage.getItem(`${DRAFT_KEY}_${parcelNumber}`);
      if (stored) {
        draftRestoredRef.current = true;
        return JSON.parse(stored) as PermitFormData;
      }
    } catch {}
    return { ...INITIAL_FORM_DATA };
  });

  // Set isDraftRestored after mount
  useEffect(() => {
    if (draftRestoredRef.current) {
      setIsDraftRestored(true);
      // Auto-dismiss after 4s
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

  // Auto-populate user info
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        applicantName: prev.applicantName || user.user_metadata?.full_name || '',
        applicantPhone: prev.applicantPhone || user.user_metadata?.phone || '',
        applicantEmail: prev.applicantEmail || user.email || '',
      }));
    }
  }, [user]);

  // Pre-fill from parcelData (CCC) — only once, skip if draft restored
  const prefillDoneRef = useRef(false);
  useEffect(() => {
    if (!parcelData || prefillDoneRef.current || draftRestoredRef.current) return;
    prefillDoneRef.current = true;
    setFormData(prev => ({
      ...prev,
      constructionType: prev.constructionType || parcelData.construction_type || '',
      constructionNature: prev.constructionNature || parcelData.construction_nature || '',
      declaredUsage: prev.declaredUsage || parcelData.declared_usage || '',
      plannedArea: prev.plannedArea || (parcelData.area_sqm ? String(parcelData.area_sqm) : ''),
    }));
  }, [parcelData]);

  // Save draft to localStorage on form change
  useEffect(() => {
    try {
      localStorage.setItem(`${DRAFT_KEY}_${parcelNumber}`, JSON.stringify(formData));
    } catch {}
  }, [formData, parcelNumber]);

  // Load fees from permit_fees_config
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
          setDynamicFees(data as FeeItem[]);
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

  // Fix #6: Simplified handleInputChange — removed redundant date validation
  // (Calendar component already handles disabled dates)
  const handleInputChange = useCallback((field: string, value: string) => {
    // Fix #7: Clamp numeric fields to valid ranges
    if (field === 'numberOfFloors') {
      const n = parseInt(value);
      if (value && (isNaN(n) || n < 1)) return;
    }
    if (field === 'estimatedDuration') {
      const n = parseInt(value);
      if (value && (isNaN(n) || n < 1)) return;
    }
    if (field === 'numberOfRooms') {
      const n = parseInt(value);
      if (value && (isNaN(n) || n < 1)) return;
    }
    if (field === 'plannedArea') {
      const n = parseFloat(value);
      if (value && (isNaN(n) || n < 0)) return;
    }
    if (field === 'estimatedCost') {
      const n = parseFloat(value);
      if (value && (isNaN(n) || n < 0)) return;
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const requiresOriginalPermit = useCallback(() => {
    return ['Modification non autorisée', 'Extension ou agrandissement', 'Changement d\'usage sans autorisation']
      .includes(formData.regularizationReason);
  }, [formData.regularizationReason]);

  const totalFeeUSD = useMemo(() => dynamicFees.reduce((sum, fee) => sum + fee.amount_usd, 0), [dynamicFees]);

  const feeBreakdown = useMemo(() => dynamicFees.map(fee => ({
    label: fee.fee_name,
    amount: fee.amount_usd,
    detail: fee.description || undefined,
  })), [dynamicFees]);

  // Fix #8: Added minimum length validation for name and description
  const isFormValid = useCallback(() => {
    const baseFields = [
      formData.constructionType, formData.constructionNature, formData.declaredUsage,
      formData.plannedArea, formData.applicantName, formData.applicantPhone,
      formData.projectDescription,
    ];

    // Validate area is positive
    const area = parseFloat(formData.plannedArea);
    if (!area || area <= 0) return false;

    // Fix #8: Min length checks
    if (formData.applicantName.trim().length < 3) return false;
    if (formData.projectDescription.trim().length < 10) return false;

    // Validate email if provided
    if (formData.applicantEmail && !isValidEmail(formData.applicantEmail)) return false;

    // Validate phone
    if (!isValidPhone(formData.applicantPhone)) return false;

    // Required attachments
    if (!attachments.architectural_plans || !attachments.id_document) return false;

    if (requestType === 'regularization') {
      const regFields = [formData.constructionDate, formData.currentState, formData.regularizationReason];
      if (requiresOriginalPermit() && !formData.originalPermitNumber) return false;
      return baseFields.every(f => !!f) && regFields.every(f => !!f);
    }

    return baseFields.every(f => !!f) && !!formData.startDate;
  }, [formData, attachments, requestType, requiresOriginalPermit]);

  // Duplicate detection (includes 'returned' status)
  const checkDuplicateRequest = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    try {
      const { data, error } = await supabase
        .from('cadastral_contributions')
        .select('id, created_at, status')
        .eq('parcel_number', parcelNumber)
        .eq('user_id', user.id)
        .eq('contribution_type', 'permit_request')
        .in('status', ['pending', 'approved', 'returned'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const existing = data[0];
        const statusLabels: Record<string, string> = {
          pending: 'en attente de traitement',
          approved: 'approuvée',
          returned: 'retournée pour correction',
        };
        toast({
          title: 'Demande déjà existante',
          description: `Vous avez déjà une demande d'autorisation ${statusLabels[existing.status] || existing.status} pour cette parcelle (créée le ${format(new Date(existing.created_at), 'dd/MM/yyyy', { locale: fr })}). ${existing.status === 'returned' ? 'Veuillez la corriger depuis votre tableau de bord.' : 'Veuillez attendre son traitement.'}`,
          variant: 'destructive',
        });
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Duplicate check failed (non-blocking):', err);
      return false;
    }
  }, [user, parcelNumber, toast]);

  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(`${DRAFT_KEY}_${parcelNumber}`); } catch {}
  }, [parcelNumber]);

  const resetForm = useCallback(() => {
    setFormData({ ...INITIAL_FORM_DATA });
    setAttachments({ ...INITIAL_ATTACHMENTS });
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
  };
};
