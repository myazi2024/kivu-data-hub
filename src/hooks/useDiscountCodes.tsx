import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { DiscountCode } from './useResellers';

export interface DiscountValidation {
  is_valid: boolean;
  discount_amount: number;
  reseller_id: string | null;
  code_id: string | null;
}

export const useDiscountCodes = () => {
  const [loading, setLoading] = useState(false);
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // Fetch discount codes for current reseller
  const fetchMyCodes = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch the reseller profile for current user
      const { data: resellerData } = await supabase
        .from('resellers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!resellerData) {
        setCodes([]);
        setLoading(false);
        return;
      }

      // Fetch discount codes for this reseller
      const { data, error } = await supabase
        .from('discount_codes')
        .select('*')
        .eq('reseller_id', resellerData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch reseller details separately
      const { data: resellers } = await supabase
        .from('resellers')
        .select('id, business_name, reseller_code')
        .eq('id', resellerData.id)
        .maybeSingle();

      // Merge data
      const mergedData = (data || []).map(code => ({
        ...code,
        resellers: resellers || null
      }));

      setCodes(mergedData as any);
    } catch (error) {
      console.error('Error fetching discount codes:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos codes de remise",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch all discount codes (admin only)
  const fetchAllCodes = async () => {
    try {
      setLoading(true);
      
      // First fetch discount codes
      const { data: codesData, error: codesError } = await supabase
        .from('discount_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (codesError) throw codesError;

      // Then fetch resellers separately
      const { data: resellersData, error: resellersError } = await supabase
        .from('resellers')
        .select('id, business_name, reseller_code');

      if (resellersError) {
        console.error('Error fetching resellers:', resellersError);
        // Continue with codes only
        setCodes(codesData || []);
        return;
      }

      // Create a map for quick lookup
      const resellersMap = new Map(
        (resellersData || []).map(r => [r.id, r])
      );

      // Merge the data
      const mergedData = (codesData || []).map(code => ({
        ...code,
        resellers: resellersMap.get(code.reseller_id) || null
      }));

      setCodes(mergedData as any);
    } catch (error) {
      console.error('Error fetching all discount codes:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les codes de remise. Vérifiez que des revendeurs existent.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Validate discount code
  const validateDiscountCode = async (code: string, invoiceAmount: number): Promise<DiscountValidation | null> => {
    try {
      const { data, error } = await supabase
        .rpc('validate_and_apply_discount_code', {
          code_input: code,
          invoice_amount: invoiceAmount
        });

      if (error) throw error;

      if (data && data.length > 0) {
        return data[0];
      }

      return {
        is_valid: false,
        discount_amount: 0,
        reseller_id: null,
        code_id: null
      };
    } catch (error) {
      console.error('Error validating discount code:', error);
      toast({
        title: "Erreur",
        description: "Impossible de valider le code de remise",
        variant: "destructive"
      });
      return null;
    }
  };

  // Create discount code
  const createDiscountCode = async (codeData: {
    reseller_id: string;
    code: string;
    discount_percentage?: number;
    discount_amount_usd?: number;
    expires_at?: string;
    max_usage?: number;
  }) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('discount_codes')
        .insert([{
          reseller_id: codeData.reseller_id,
          code: codeData.code,
          discount_percentage: codeData.discount_percentage || 0,
          discount_amount_usd: codeData.discount_amount_usd || 0,
          expires_at: codeData.expires_at,
          max_usage: codeData.max_usage,
          is_active: true,
          usage_count: 0
        }])
        .select()
        .maybeSingle();

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Code de remise créé"
      });

      return data;
    } catch (error) {
      console.error('Error creating discount code:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le code de remise",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update discount code
  const updateDiscountCode = async (id: string, updates: Partial<DiscountCode>) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('discount_codes')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Code de remise mis à jour"
      });

      return data;
    } catch (error) {
      console.error('Error updating discount code:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le code de remise",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Increment usage count
  const incrementUsageCount = async (codeId: string) => {
    try {
      // First get current count
      const { data: currentCode, error: fetchError } = await supabase
        .from('discount_codes')
        .select('usage_count')
        .eq('id', codeId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // Then increment it
      const { error } = await supabase
        .from('discount_codes')
        .update({ usage_count: (currentCode.usage_count || 0) + 1 })
        .eq('id', codeId);

      if (error) throw error;
    } catch (error) {
      console.error('Error incrementing usage count:', error);
    }
  };

  // Toggle code status
  const toggleCodeStatus = async (id: string) => {
    const code = codes.find(c => c.id === id);
    if (!code) return;

    return updateDiscountCode(id, { is_active: !code.is_active });
  };

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchAllCodes();
    } else if (user) {
      fetchMyCodes();
    }
  }, [user, profile]);

  return {
    loading,
    codes,
    fetchMyCodes,
    fetchAllCodes,
    validateDiscountCode,
    createDiscountCode,
    updateDiscountCode,
    incrementUsageCount,
    toggleCodeStatus
  };
};