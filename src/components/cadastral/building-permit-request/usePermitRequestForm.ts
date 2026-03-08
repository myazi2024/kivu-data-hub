import { useState, useEffect, useCallback, useMemo } from 'react';
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
}

export const usePermitRequestForm = ({ parcelNumber, hasExistingConstruction }: UsePermitRequestFormOptions) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [requestType, setRequestType] = useState<'new' | 'regularization'>(
    hasExistingConstruction ? 'regularization' : 'new'
  );
  const [formData, setFormData] = useState<PermitFormData>(() => {
    // Restore draft from localStorage
    try {
      const stored = localStorage.getItem(`${DRAFT_KEY}_${parcelNumber}`);
      if (stored) return JSON.parse(stored) as PermitFormData;
    } catch {}
    return { ...INITIAL_FORM_DATA };
  });
  const [attachments, setAttachments] = useState<Record<string, AttachmentFile | null>>({ ...INITIAL_ATTACHMENTS });

  // Fees
  const [dynamicFees, setDynamicFees] = useState<FeeItem[]>([]);
  const [feesLoading, setFeesLoading] = useState(false);
  const [feesSource, setFeesSource] = useState<'config' | 'fallback'>('config');

  // Memoized fallback fees to avoid stale closures (#1)
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

  // Save draft to localStorage on form change (#10)
  useEffect(() => {
    try {
      localStorage.setItem(`${DRAFT_KEY}_${parcelNumber}`, JSON.stringify(formData));
    } catch {}
  }, [formData, parcelNumber]);

  // Load fees from permit_fees_config (uses memoized fallback)
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

  const handleInputChange = useCallback((field: string, value: string) => {
    if (field === 'constructionDate' && value) {
      const selectedDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const minDate = new Date(1900, 0, 1);

      if (selectedDate > today) {
        toast({ title: "Date invalide", description: "La date de construction ne peut pas être dans le futur", variant: "destructive" });
        return;
      }
      if (selectedDate < minDate) {
        toast({ title: "Date invalide", description: "La date de construction est trop ancienne", variant: "destructive" });
        return;
      }
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  }, [toast]);

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

  const isFormValid = useCallback(() => {
    const baseFields = [
      formData.constructionType, formData.constructionNature, formData.declaredUsage,
      formData.plannedArea, formData.applicantName, formData.applicantPhone,
      formData.projectDescription,
    ];

    // Validate area is positive (#9)
    const area = parseFloat(formData.plannedArea);
    if (!area || area <= 0) return false;

    // Validate email if provided (#13)
    if (formData.applicantEmail && !isValidEmail(formData.applicantEmail)) return false;

    // Validate phone (#5)
    if (!isValidPhone(formData.applicantPhone)) return false;

    // Required attachments
    if (!attachments.architectural_plans || !attachments.id_document) return false;

    if (requestType === 'regularization') {
      const regFields = [formData.constructionDate, formData.currentState, formData.regularizationReason];
      if (requiresOriginalPermit() && !formData.originalPermitNumber) return false;
      return baseFields.every(f => f) && regFields.every(f => f);
    }

    return baseFields.every(f => f) && formData.startDate;
  }, [formData, attachments, requestType, requiresOriginalPermit]);

  // Duplicate detection (includes 'returned' status — fix #6)
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
  };
};
