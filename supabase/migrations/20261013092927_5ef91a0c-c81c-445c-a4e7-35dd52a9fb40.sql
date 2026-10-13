CREATE OR REPLACE FUNCTION public.count_test_data_to_cleanup()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb := '{}'::jsonb; t int := 0; c int;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;
  SELECT count(*) INTO c FROM permit_payments pp JOIN cadastral_contributions x ON x.id=pp.contribution_id WHERE x.parcel_number LIKE 'TEST-%'; r:=r||jsonb_build_object('permit_payments',c); t:=t+c;
  SELECT count(*) INTO c FROM permit_admin_actions pa JOIN cadastral_contributions x ON x.id=pa.contribution_id WHERE x.parcel_number LIKE 'TEST-%'; r:=r||jsonb_build_object('permit_admin_actions',c); t:=t+c;
  SELECT count(*) INTO c FROM fraud_attempts fa JOIN cadastral_contributions x ON x.id=fa.contribution_id WHERE x.parcel_number LIKE 'TEST-%'; r:=r||jsonb_build_object('fraud_attempts',c); t:=t+c;
  SELECT count(*) INTO c FROM cadastral_contributor_codes WHERE parcel_number LIKE 'TEST-%'; r:=r||jsonb_build_object('contributor_codes',c); t:=t+c;
  SELECT count(*) INTO c FROM cadastral_service_access WHERE parcel_number LIKE 'TEST-%'; r:=r||jsonb_build_object('service_access',c); t:=t+c;
  SELECT count(*) INTO c FROM payment_transactions pt JOIN cadastral_invoices i ON i.id=pt.invoice_id WHERE i.parcel_number LIKE 'TEST-%'; r:=r||jsonb_build_object('payment_transactions',c); t:=t+c;
  SELECT count(*) INTO c FROM cadastral_invoices WHERE parcel_number LIKE 'TEST-%'; r:=r||jsonb_build_object('invoices',c); t:=t+c;
  SELECT count(*) INTO c FROM cadastral_contributions WHERE parcel_number LIKE 'TEST-%'; r:=r||jsonb_build_object('contributions',c); t:=t+c;
  SELECT count(*) INTO c FROM mutation_requests m JOIN cadastral_parcels p ON p.id=m.parcel_id WHERE p.parcel_number LIKE 'TEST-%'; r:=r||jsonb_build_object('mutation_requests',c); t:=t+c;
  SELECT count(*) INTO c FROM subdivision_requests s JOIN cadastral_parcels p ON p.id=s.parcel_id WHERE p.parcel_number LIKE 'TEST-%'; r:=r||jsonb_build_object('subdivision_requests',c); t:=t+c;
  SELECT count(*) INTO c FROM cadastral_land_disputes WHERE parcel_number LIKE 'TEST-%' OR reference_number LIKE 'TEST-%'; r:=r||jsonb_build_object('land_disputes',c); t:=t+c;
  SELECT count(*) INTO c FROM expertise_payments ep JOIN real_estate_expertise_requests e ON e.id=ep.expertise_request_id WHERE e.reference_number LIKE 'TEST-%'; r:=r||jsonb_build_object('expertise_payments',c); t:=t+c;
  SELECT count(*) INTO c FROM real_estate_expertise_requests WHERE reference_number LIKE 'TEST-%'; r:=r||jsonb_build_object('expertise_requests',c); t:=t+c;
  SELECT count(*) INTO c FROM land_title_requests WHERE reference_number LIKE 'TEST-%'; r:=r||jsonb_build_object('land_title_requests',c); t:=t+c;
  SELECT count(*) INTO c FROM cadastral_ownership_history h JOIN cadastral_parcels p ON p.id=h.parcel_id WHERE p.parcel_number LIKE 'TEST-%'; r:=r||jsonb_build_object('ownership_history',c); t:=t+c;
  SELECT count(*) INTO c FROM cadastral_tax_history h JOIN cadastral_parcels p ON p.id=h.parcel_id WHERE p.parcel_number LIKE 'TEST-%'; r:=r||jsonb_build_object('tax_history',c); t:=t+c;
  SELECT count(*) INTO c FROM cadastral_boundary_history h JOIN cadastral_parcels p ON p.id=h.parcel_id WHERE p.parcel_number LIKE 'TEST-%'; r:=r||jsonb_build_object('boundary_history',c); t:=t+c;
  SELECT count(*) INTO c FROM cadastral_mortgage_payments mp JOIN cadastral_mortgages m ON m.id=mp.mortgage_id JOIN cadastral_parcels p ON p.id=m.parcel_id WHERE p.parcel_number LIKE 'TEST-%'; r:=r||jsonb_build_object('mortgage_payments',c); t:=t+c;
  SELECT count(*) INTO c FROM cadastral_mortgages m JOIN cadastral_parcels p ON p.id=m.parcel_id WHERE p.parcel_number LIKE 'TEST-%'; r:=r||jsonb_build_object('mortgages',c); t:=t+c;
  SELECT count(*) INTO c FROM cadastral_building_permits b JOIN cadastral_parcels p ON p.id=b.parcel_id WHERE p.parcel_number LIKE 'TEST-%'; r:=r||jsonb_build_object('building_permits',c); t:=t+c;
  SELECT count(*) INTO c FROM cadastral_parcels WHERE parcel_number LIKE 'TEST-%'; r:=r||jsonb_build_object('parcels',c); t:=t+c;
  SELECT count(*) INTO c FROM generated_certificates WHERE reference_number LIKE 'TEST-%' OR parcel_number LIKE 'TEST-%'; r:=r||jsonb_build_object('generated_certificates',c); t:=t+c;
  SELECT count(*) INTO c FROM cadastral_boundary_conflicts WHERE reporting_parcel_number LIKE 'TEST-%' OR conflicting_parcel_number LIKE 'TEST-%'; r:=r||jsonb_build_object('boundary_conflicts',c); t:=t+c;
  RETURN jsonb_build_object('per_step', r, 'total', t);
END $$;
REVOKE ALL ON FUNCTION public.count_test_data_to_cleanup() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.count_test_data_to_cleanup() TO authenticated;

CREATE OR REPLACE FUNCTION public.cleanup_all_test_data_auto()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_steps text[] := ARRAY['permit_payments','permit_admin_actions','fraud_attempts','contributor_codes','service_access','payment_transactions','invoices','contributions','mutation_requests','subdivision_requests','land_disputes','expertise_payments','expertise_requests','land_title_requests','ownership_history','tax_history','boundary_history','mortgage_payments','mortgages','building_permits','parcels','generated_certificates','boundary_conflicts'];
  v_cfg jsonb; v_auto boolean; v_days int; v_latest timestamptz;
  v_step text; v_total int := 0; v_step_total int; v_chunk int; v_summary jsonb := '{}'::jsonb; v_skip text;
BEGIN
  SELECT config_value INTO v_cfg FROM cadastral_search_config WHERE config_key='test_mode' LIMIT 1;
  v_auto := COALESCE((v_cfg->>'auto_cleanup')::boolean, false);
  v_days := LEAST(30, GREATEST(1, COALESCE((v_cfg->>'test_data_retention_days')::int, 7)));
  SELECT max(created_at) INTO v_latest FROM cadastral_parcels WHERE parcel_number LIKE 'TEST-%';
  IF NOT v_auto THEN v_skip := 'auto_cleanup_disabled';
  ELSIF v_latest IS NULL THEN v_skip := 'no_test_data';
  ELSIF v_latest > now() - make_interval(days => v_days) THEN v_skip := 'retention_not_elapsed';
  END IF;
  IF v_skip IS NOT NULL THEN
    INSERT INTO audit_logs (action, table_name, new_values)
    VALUES ('AUTO_TEST_DATA_CLEANUP_SKIPPED','cadastral_parcels', jsonb_build_object('reason', v_skip, 'retention_days', v_days, 'latest_test_data', v_latest));
    RETURN jsonb_build_object('skipped', true, 'reason', v_skip);
  END IF;
  FOREACH v_step IN ARRAY v_steps LOOP
    v_step_total := 0;
    LOOP
      v_chunk := public._cleanup_test_data_chunk_internal(v_step, 1000);
      v_step_total := v_step_total + COALESCE(v_chunk,0);
      EXIT WHEN COALESCE(v_chunk,0) = 0;
    END LOOP;
    v_summary := v_summary || jsonb_build_object(v_step, v_step_total);
    v_total := v_total + v_step_total;
  END LOOP;
  INSERT INTO audit_logs (action, table_name, new_values)
  VALUES ('AUTO_TEST_DATA_CLEANUP_BATCHED','cadastral_parcels', jsonb_build_object('total_deleted', v_total, 'per_step', v_summary, 'retention_days', v_days));
  RETURN jsonb_build_object('total_deleted', v_total, 'per_step', v_summary);
END $$;
REVOKE ALL ON FUNCTION public.cleanup_all_test_data_auto() FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.cleanup_all_test_data();
DROP FUNCTION IF EXISTS public.cleanup_test_data_chunk(text, integer);