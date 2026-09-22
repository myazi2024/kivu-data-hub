-- === A. Fermeture des fonctions à privilèges ===
DO $do$
DECLARE
  r record;
  auth_allow text[] := ARRAY[
    '_cleanup_test_data_chunk_internal','_purge_stale_test_generation_jobs','approve_subdivision_atomic',
    'assign_expertise_request','auto_archive_stale_articles','backfill_provider_fees','bulk_update_parcel_actions',
    'bulk_update_service_prices','calculate_expertise_fees','calculate_land_title_fees','can_subdivide_parcel',
    'cancel_land_title_request','cancel_mutation_request','check_and_consume_rate_limit','check_contribution_abuse',
    'close_fiscal_period','complete_expertise_request','count_test_data_stats','count_test_data_to_cleanup',
    'create_cadastral_invoice_safe','detect_suspicious_contribution','escalate_expertise_request',
    'escalate_mutation_request','escalate_stale_disputes','escalate_stale_requests','export_fec_period',
    'export_user_data','generate_credit_note_number','generate_mortgage_receipt','generate_passthrough_invoices',
    'generate_permit_number','generate_reseller_code','generate_verification_code','get_admin_dashboard_full',
    'get_admin_expertise_stats','get_admin_pending_counts','get_admin_statistics','get_billing_summary',
    'get_cadastral_parcel_data','get_cron_run_history','get_eligible_passthrough_transactions_count',
    'get_inactive_users','get_orphan_reseller_invoices_count','get_parcel_expertise_prefill',
    'get_parcel_mutation_prefill','get_parcel_timeline','get_reseller_statistics','get_signed_expertise_certificate',
    'get_signed_mutation_certificate','get_signed_subdivision_certificate','get_signed_subdivision_plan',
    'get_subdivision_admin_stats','get_test_cleanup_history','get_tva_declaration','get_user_activity_stats',
    'get_user_dashboard_stats','get_user_statistics','increment_article_view','list_dispute_mortgage_overlaps',
    'list_public_tables_with_count','log_audit_action','log_pii_export','mark_cadastral_invoice_paid_safe',
    'process_mutation_decision','purge_old_audit_logs','purge_test_billing_data','regenerate_missing_certificates',
    'regenerate_orphan_reseller_sales','reject_expertise_request','reopen_fiscal_period','request_account_deletion',
    'search_parcels_public','swap_theme_order','take_charge_mutation_request','upsert_cadastral_cart_draft',
    'user_has_permission','validate_and_apply_ccc','validate_and_apply_discount_code',
    'validate_contribution_completeness','validate_passthrough_invoice','validate_subdivision_against_rules',
    'verify_document_by_code','verify_document_public',
    -- fonctions évaluées par les règles d'accès (RLS), exécutées avec les droits de l'appelant
    'has_role','has_any_role','is_expert_or_admin','is_hr_admin'
  ];
  anon_allow text[] := ARRAY[
    'search_parcels_public','verify_document_by_code','verify_document_public','increment_article_view',
    'get_cadastral_parcel_data','check_and_consume_rate_limit',
    'has_role','has_any_role','is_expert_or_admin','is_hr_admin'
  ];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
    IF r.proname = ANY (auth_allow) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END IF;
    IF r.proname = ANY (anon_allow) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', r.sig);
    END IF;
  END LOOP;
END
$do$;

-- === B. Tables techniques de limitation de débit ===
REVOKE ALL ON public.rate_limit_buckets FROM anon, authenticated;
REVOKE ALL ON public.rate_limit_violations FROM anon, authenticated;
GRANT ALL ON public.rate_limit_buckets TO service_role;
GRANT ALL ON public.rate_limit_violations TO service_role;

DROP POLICY IF EXISTS "Admins can read rate limit buckets" ON public.rate_limit_buckets;
CREATE POLICY "Admins can read rate limit buckets"
  ON public.rate_limit_buckets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can read rate limit violations" ON public.rate_limit_violations;
CREATE POLICY "Admins can read rate limit violations"
  ON public.rate_limit_violations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- === C. Chemin de recherche figé ===
CREATE OR REPLACE FUNCTION public.generate_employee_matricule()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.matricule IS NULL OR NEW.matricule = '' THEN
    NEW.matricule := 'EMP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.hr_employee_matricule_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$function$;