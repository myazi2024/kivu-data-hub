
-- PURGE ALL CADASTRAL DATA using TRUNCATE CASCADE
TRUNCATE TABLE
  public.fraud_attempts,
  public.cadastral_contributor_codes,
  public.cadastral_service_access,
  public.payment_transactions,
  public.reseller_sales,
  public.expertise_payments,
  public.real_estate_expertise_requests,
  public.cadastral_invoices,
  public.cadastral_contributions,
  public.cadastral_mortgage_payments,
  public.cadastral_land_disputes,
  public.cadastral_ownership_history,
  public.cadastral_tax_history,
  public.cadastral_boundary_history,
  public.cadastral_mortgages,
  public.cadastral_building_permits,
  public.cadastral_parcels,
  public.land_title_requests,
  public.cadastral_boundary_conflicts,
  public.generated_certificates,
  public.mutation_requests,
  public.subdivision_requests,
  public.notifications,
  public.audit_logs
CASCADE;
