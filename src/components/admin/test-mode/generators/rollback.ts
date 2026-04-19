import { supabase } from '@/integrations/supabase/client';

/** Rollback all generated test data by parcel numbers and suffix — FK-safe order */
export const rollbackTestData = async (parcelNumbers: string[], suffix: string) => {
  // 1. Children of contributions
  await supabase.from('fraud_attempts').delete().in('contribution_id',
    (await supabase.from('cadastral_contributions').select('id').in('parcel_number', parcelNumbers)).data?.map(r => r.id) ?? []
  );
  await supabase.from('cadastral_contributor_codes').delete().in('parcel_number', parcelNumbers);

  // 2. Children of invoices
  await supabase.from('cadastral_service_access').delete().in('parcel_number', parcelNumbers);

  // 3. Payment transactions
  await supabase.from('payment_transactions').delete().filter('metadata->>test_mode', 'eq', 'true').ilike('transaction_reference', 'TEST-TXN-%');

  // 4. Invoices
  await supabase.from('cadastral_invoices').delete().in('parcel_number', parcelNumbers);

  // 5. Contributions
  await supabase.from('cadastral_contributions').delete().in('parcel_number', parcelNumbers);

  // 6. Resolve parcel ids EARLY — needed to purge FK children before parcels
  const parcelIds = (await supabase.from('cadastral_parcels').select('id').in('parcel_number', parcelNumbers)).data?.map(r => r.id) ?? [];

  // 7. Purge ALL tables that reference cadastral_parcels.id BEFORE deleting parcels
  // Double pass: by parcel_id (covers legacy refs) + by reference_number (covers TEST refs without parcel_id)
  if (parcelIds.length > 0) {
    // Cast to any to avoid TS2589 (deep union inference across many tables)
    const sb = supabase as any;
    await sb.from('mutation_requests').delete().in('parcel_id', parcelIds);
    await sb.from('subdivision_requests').delete().in('parcel_id', parcelIds);
    await sb.from('land_title_requests').delete().in('parcel_id', parcelIds);
    await sb.from('cadastral_land_disputes').delete().in('parcel_id', parcelIds);

    // expertise_payments → real_estate_expertise_requests (by parcel_id)
    const expReqByParcel = ((await sb.from('real_estate_expertise_requests').select('id').in('parcel_id', parcelIds)).data ?? []).map((r: { id: string }) => r.id);
    if (expReqByParcel.length > 0) {
      await sb.from('expertise_payments').delete().in('expertise_request_id', expReqByParcel);
      await sb.from('real_estate_expertise_requests').delete().in('id', expReqByParcel);
    }
  }

  // 7b. Reference-based pass for orphans (TEST refs without parcel_id link)
  await supabase.from('mutation_requests').delete().ilike('reference_number', `TEST-MUT-%-${suffix}`);
  await supabase.from('subdivision_requests').delete().ilike('reference_number', `TEST-SUB-%-${suffix}`);
  await supabase.from('land_title_requests').delete().ilike('reference_number', `TEST-LTR-%-${suffix}`);
  await supabase.from('cadastral_land_disputes').delete().ilike('reference_number', `TEST-DISP-%-${suffix}`);

  const expReqIds = (await supabase.from('real_estate_expertise_requests').select('id').ilike('reference_number', `TEST-EXP-%-${suffix}`)).data?.map(r => r.id) ?? [];
  if (expReqIds.length > 0) {
    await supabase.from('expertise_payments').delete().in('expertise_request_id', expReqIds);
  }
  await supabase.from('real_estate_expertise_requests').delete().ilike('reference_number', `TEST-EXP-%-${suffix}`);

  // 8. Parcel children (mortgages/history/permits)
  if (parcelIds.length > 0) {
    await supabase.from('cadastral_ownership_history').delete().in('parcel_id', parcelIds);
    await supabase.from('cadastral_tax_history').delete().in('parcel_id', parcelIds);
    await supabase.from('cadastral_boundary_history').delete().in('parcel_id', parcelIds);
    await supabase.from('cadastral_mortgages').delete().in('parcel_id', parcelIds);
    await supabase.from('cadastral_building_permits').delete().in('parcel_id', parcelIds);
  }

  // 9. Parcels (now safe)
  await supabase.from('cadastral_parcels').delete().in('parcel_number', parcelNumbers);

  // 10. Independent tables
  await supabase.from('cadastral_boundary_conflicts').delete().in('reporting_parcel_number', parcelNumbers);
  await supabase.from('generated_certificates').delete().ilike('reference_number', `TEST-CERT-%-${suffix}`);
};
