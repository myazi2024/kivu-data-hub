import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ResellerSale } from './useResellers';

export interface ResellerStats {
  totalSales: number;
  totalCommission: number;
  paidCommission: number;
  pendingCommission: number;
  salesCount: number;
}

export const useResellerSales = () => {
  const [loading, setLoading] = useState(false);
  const [sales, setSales] = useState<ResellerSale[]>([]);
  const [stats, setStats] = useState<ResellerStats>({
    totalSales: 0,
    totalCommission: 0,
    paidCommission: 0,
    pendingCommission: 0,
    salesCount: 0
  });
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // Fetch sales for current reseller
  const fetchMySales = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reseller_sales')
        .select(`
          *,
          resellers!inner(user_id),
          cadastral_invoices(invoice_number, parcel_number)
        `)
        .eq('resellers.user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSales(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching reseller sales:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les ventes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch all sales (admin only)
  const fetchAllSales = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reseller_sales')
        .select(`
          *,
          resellers(business_name, reseller_code),
          cadastral_invoices(invoice_number, parcel_number)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error('Error fetching all sales:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les ventes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Create reseller sale record
  const createResellerSale = async (saleData: {
    reseller_id: string;
    invoice_id?: string;
    payment_id?: string;
    discount_code_id?: string;
    sale_amount_usd: number;
    discount_applied_usd: number;
    commission_rate: number;
    fixed_commission_usd?: number;
  }) => {
    try {
      // Calculate commission
      let commission_earned = 0;
      if (saleData.fixed_commission_usd && saleData.fixed_commission_usd > 0) {
        commission_earned = saleData.fixed_commission_usd;
      } else {
        const net_amount = saleData.sale_amount_usd - saleData.discount_applied_usd;
        commission_earned = (net_amount * saleData.commission_rate) / 100;
      }

      const { data, error } = await supabase
        .from('reseller_sales')
        .insert([{
          reseller_id: saleData.reseller_id,
          invoice_id: saleData.invoice_id,
          payment_id: saleData.payment_id,
          discount_code_id: saleData.discount_code_id,
          sale_amount_usd: saleData.sale_amount_usd,
          discount_applied_usd: saleData.discount_applied_usd,
          commission_earned_usd: commission_earned
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating reseller sale:', error);
      throw error;
    }
  };

  // Mark commission as paid
  const markCommissionPaid = async (saleIds: string[]) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('reseller_sales')
        .update({
          commission_paid: true,
          commission_paid_at: new Date().toISOString()
        })
        .in('id', saleIds);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Commissions marquées comme payées"
      });

      // Refresh data
      if (profile?.role === 'admin') {
        fetchAllSales();
      } else {
        fetchMySales();
      }
    } catch (error) {
      console.error('Error marking commission as paid:', error);
      toast({
        title: "Erreur",
        description: "Impossible de marquer les commissions comme payées",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats for current reseller
  const calculateStats = (salesData: ResellerSale[]) => {
    const stats = salesData.reduce((acc, sale) => {
      acc.totalSales += sale.sale_amount_usd;
      acc.totalCommission += sale.commission_earned_usd;
      acc.salesCount += 1;

      if (sale.commission_paid) {
        acc.paidCommission += sale.commission_earned_usd;
      } else {
        acc.pendingCommission += sale.commission_earned_usd;
      }

      return acc;
    }, {
      totalSales: 0,
      totalCommission: 0,
      paidCommission: 0,
      pendingCommission: 0,
      salesCount: 0
    });

    setStats(stats);
  };

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchAllSales();
    } else if (user) {
      fetchMySales();
    }
  }, [user, profile]);

  return {
    loading,
    sales,
    stats,
    fetchMySales,
    fetchAllSales,
    createResellerSale,
    markCommissionPaid
  };
};