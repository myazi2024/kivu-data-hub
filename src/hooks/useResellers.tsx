import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Reseller {
  id: string;
  user_id: string;
  reseller_code: string;
  business_name?: string;
  contact_phone?: string;
  commission_rate: number;
  fixed_commission_usd: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiscountCode {
  id: string;
  reseller_id: string;
  code: string;
  discount_percentage: number;
  discount_amount_usd: number;
  is_active: boolean;
  expires_at?: string;
  usage_count: number;
  max_usage?: number;
  created_at: string;
  updated_at: string;
}

export interface ResellerSale {
  id: string;
  reseller_id: string;
  invoice_id?: string;
  payment_id?: string;
  discount_code_id?: string;
  sale_amount_usd: number;
  discount_applied_usd: number;
  commission_earned_usd: number;
  commission_paid: boolean;
  commission_paid_at?: string;
  created_at: string;
}

export const useResellers = () => {
  const [loading, setLoading] = useState(false);
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [currentReseller, setCurrentReseller] = useState<Reseller | null>(null);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // Fetch all resellers (admin only)
  const fetchResellers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('resellers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResellers(data || []);
    } catch (error) {
      console.error('Error fetching resellers:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les revendeurs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch current user's reseller profile
  const fetchCurrentReseller = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('resellers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setCurrentReseller(data || null);
    } catch (error) {
      console.error('Error fetching current reseller:', error);
    }
  };

  // Create new reseller
  const createReseller = async (resellerData: Partial<Reseller>) => {
    if (!user) return null;

    try {
      setLoading(true);

      // Generate reseller code
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_reseller_code');

      if (codeError) throw codeError;

      const { data, error } = await supabase
        .from('resellers')
        .insert([{
          user_id: user.id,
          reseller_code: codeData,
          ...resellerData
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Succès",
        description: `Revendeur créé avec le code ${data.reseller_code}`
      });

      return data;
    } catch (error) {
      console.error('Error creating reseller:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le revendeur",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update reseller
  const updateReseller = async (id: string, updates: Partial<Reseller>) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('resellers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Revendeur mis à jour"
      });

      return data;
    } catch (error) {
      console.error('Error updating reseller:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le revendeur",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Toggle reseller status
  const toggleResellerStatus = async (id: string) => {
    const reseller = resellers.find(r => r.id === id);
    if (!reseller) return;

    return updateReseller(id, { is_active: !reseller.is_active });
  };

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchResellers();
    }
    if (user) {
      fetchCurrentReseller();
    }
  }, [user, profile]);

  return {
    loading,
    resellers,
    currentReseller,
    fetchResellers,
    fetchCurrentReseller,
    createReseller,
    updateReseller,
    toggleResellerStatus
  };
};