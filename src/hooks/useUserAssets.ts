import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTestEnvironment, applyTestFilter } from '@/hooks/useTestEnvironment';
import {
  extractRentalAssets,
  extractListings,
  extractMarketValues,
  extractTaxObligations,
} from '@/utils/userRentalMarket';

const ASSET_COLUMNS = [
  'id',
  'parcel_number',
  'status',
  'created_at',
  'province',
  'ville',
  'declared_usage',
  'property_category',
  'construction_type',
  'construction_year',
  'sound_environment',
  'is_occupied',
  'hosting_capacity',
  'monthly_rent_usd',
  'rental_configuration',
  'rental_units',
  'rental_units_count',
  'rental_start_date',
  'additional_constructions',
  'market_listings',
  'would_sell_if_offered',
  'resale_price_amount',
  'resale_price_currency',
  'resale_price_usd',
  'has_recent_appraisal',
  'appraisal_date',
  'appraiser_name',
  'appraised_value_amount',
  'appraised_value_currency',
  'appraised_value_usd',
  'appraisal_report_url',
  'tax_history',
].join(', ');

/**
 * Charge l'ensemble des données patrimoniales déclarées par l'utilisateur
 * (locations, annonces, valeur marchande, fiscalité) en une seule requête.
 */
export function useUserAssets() {
  const { user } = useAuth();
  const { isTestRoute } = useTestEnvironment();

  const query = useQuery({
    queryKey: ['user-assets', user?.id, isTestRoute],
    enabled: !!user?.id,
    staleTime: 60 * 1000,
    queryFn: async () => {
      let q = supabase
        .from('cadastral_contributions')
        .select(ASSET_COLUMNS)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(500);
      q = applyTestFilter(q as any, 'parcel_number', isTestRoute) as any;

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const rows = useMemo(() => query.data ?? [], [query.data]);

  const rentals = useMemo(() => extractRentalAssets(rows), [rows]);
  const listings = useMemo(() => extractListings(rows), [rows]);
  const marketValues = useMemo(() => extractMarketValues(rows), [rows]);
  const taxes = useMemo(() => extractTaxObligations(rows), [rows]);

  const totals = useMemo(() => {
    const monthlyRentUsd = rentals.reduce((s, r) => s + r.monthlyRentUsd, 0);
    const unitsTotal = rentals.reduce((s, r) => s + (r.configuration === 'multi' ? r.units.length : 1), 0);
    const occupiedUnits = rentals.reduce((s, r) => s + r.occupiedCount, 0);
    const taxDue = taxes
      .filter((t) => t.paymentStatus !== 'Payé' && t.paymentStatus !== 'paid')
      .reduce((s, t) => s + (t.remainingAmountUsd ?? t.taxAmountUsd ?? 0), 0);
    return {
      monthlyRentUsd,
      annualRentUsd: monthlyRentUsd * 12,
      unitsTotal,
      occupiedUnits,
      vacantUnits: Math.max(0, unitsTotal - occupiedUnits),
      occupancyRate: unitsTotal > 0 ? Math.round((occupiedUnits / unitsTotal) * 100) : 0,
      listingsCount: listings.length,
      taxDue,
    };
  }, [rentals, listings, taxes]);

  return {
    rows,
    rentals,
    listings,
    marketValues,
    taxes,
    totals,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
