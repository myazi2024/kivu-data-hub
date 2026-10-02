REVOKE EXECUTE ON FUNCTION public.can_subdivide_parcel(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.approve_subdivision_atomic(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._cleanup_test_data_chunk_internal(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_and_consume_rate_limit(text, text) FROM PUBLIC, anon, authenticated;

DO $do$
DECLARE
  r record; impl text; sig text; args text; callargs text; res text; guard text; body text; isset boolean;
  spec text[][] := ARRAY[
    ['auto_archive_stale_articles','admin'],
    ['escalate_stale_requests','admin'],
    ['list_dispute_mortgage_overlaps','admin'],
    ['get_orphan_reseller_invoices_count','admin'],
    ['_purge_stale_test_generation_jobs','admin'],
    ['get_eligible_passthrough_transactions_count','admin'],
    ['generate_credit_note_number','admin'],
    ['get_user_activity_stats','self:_user_id'],
    ['get_reseller_statistics','self:reseller_user_id'],
    ['detect_suspicious_contribution','self:p_user_id'],
    ['check_contribution_abuse','self:p_user_id']
  ];
  i int;
BEGIN
  FOR i IN 1..array_length(spec,1) LOOP
    SELECT p.oid, pg_get_function_arguments(p.oid) a, pg_get_function_identity_arguments(p.oid) ia,
           pg_get_function_result(p.oid) rr, p.proretset rs
      INTO r FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname=spec[i][1];
    impl := spec[i][1] || '__impl';
    EXECUTE format('ALTER FUNCTION public.%I(%s) RENAME TO %I', spec[i][1], r.ia, impl);
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated', impl, r.ia);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role', impl, r.ia);
    SELECT string_agg(split_part(trim(x),' ',1), ', ') INTO callargs
      FROM unnest(string_to_array(r.ia, ',')) x WHERE trim(x) <> '';
    callargs := coalesce(callargs,'');
    IF spec[i][2] = 'admin' THEN
      guard := 'NOT (public.has_role(auth.uid(),''admin''::app_role) OR public.has_role(auth.uid(),''super_admin''::app_role))';
    ELSE
      guard := format('%I IS DISTINCT FROM auth.uid() AND NOT (public.has_role(auth.uid(),''admin''::app_role) OR public.has_role(auth.uid(),''super_admin''::app_role))', split_part(spec[i][2],':',2));
    END IF;
    IF r.rs THEN
      body := format('RETURN QUERY SELECT * FROM public.%I(%s);', impl, callargs);
    ELSE
      body := format('RETURN public.%I(%s);', impl, callargs);
    END IF;
    EXECUTE format($f$CREATE FUNCTION public.%I(%s) RETURNS %s LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $b$
BEGIN
  IF coalesce(auth.role(),'') IN ('anon','authenticated') AND (%s) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  %s
END $b$$f$, spec[i][1], r.a, r.rr, guard, body);
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon', spec[i][1], r.ia);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role', spec[i][1], r.ia);
  END LOOP;
END $do$;