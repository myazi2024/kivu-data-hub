CREATE OR REPLACE FUNCTION public.upsert_cadastral_cart_draft(_cart_data jsonb DEFAULT NULL::jsonb, _discounts_data jsonb DEFAULT NULL::jsonb)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF _cart_data IS NULL AND _discounts_data IS NULL THEN RETURN; END IF;
  INSERT INTO public.cadastral_cart_drafts (user_id, cart_data, discounts_data)
  VALUES (_user_id, COALESCE(_cart_data, '{}'::jsonb), COALESCE(_discounts_data, '{}'::jsonb))
  ON CONFLICT (user_id) DO UPDATE SET
    cart_data = COALESCE(_cart_data, public.cadastral_cart_drafts.cart_data),
    discounts_data = COALESCE(_discounts_data, public.cadastral_cart_drafts.discounts_data),
    updated_at = now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_cadastral_invoice_safe(p_mode text, p_parcel_number text, p_selected_services text[], p_discount_code text DEFAULT NULL::text, p_client_type text DEFAULT NULL::text, p_client_name text DEFAULT NULL::text, p_client_nif text DEFAULT NULL::text, p_client_rccm text DEFAULT NULL::text, p_client_id_nat text DEFAULT NULL::text, p_client_address text DEFAULT NULL::text, p_client_tax_regime text DEFAULT NULL::text)
 RETURNS TABLE(invoice_id uuid, invoice_number text, total_amount_usd numeric, original_amount_usd numeric, discount_amount_usd numeric, discount_code_used text, status text, error_message text)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_email text; v_user_name text;
  v_total numeric := 0; v_original numeric := 0; v_discount numeric := 0;
  v_discount_code text := NULL;
  v_invoice_id uuid; v_invoice_number text; v_geo_zone text;
  v_status text; v_payment_method text;
  v_test_mode_active boolean; v_payment_required boolean;
  v_services text[];
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, 0::numeric, 0::numeric, 0::numeric, NULL::text, NULL::text, 'Authentification requise'::text; RETURN;
  END IF;
  IF p_mode NOT IN ('paid','bypass','test') THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, 0::numeric, 0::numeric, 0::numeric, NULL::text, NULL::text, 'Mode invalide'::text; RETURN;
  END IF;
  IF p_parcel_number IS NULL OR NOT EXISTS (SELECT 1 FROM public.cadastral_parcels WHERE parcel_number = p_parcel_number) THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, 0::numeric, 0::numeric, 0::numeric, NULL::text, NULL::text, 'Parcelle introuvable'::text; RETURN;
  END IF;

  SELECT email, COALESCE(raw_user_meta_data->>'full_name', '') INTO v_user_email, v_user_name
    FROM auth.users WHERE id = v_user_id;

  -- Services retenus : actifs au catalogue et pas déjà acquis (accès non expiré)
  SELECT COALESCE(array_agg(DISTINCT c.service_id), '{}'), COALESCE(SUM(c.price_usd), 0)
    INTO v_services, v_original
    FROM public.cadastral_services_config c
    WHERE c.service_id = ANY(p_selected_services)
      AND c.is_active = true AND c.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.cadastral_service_access a
        WHERE a.user_id = v_user_id AND a.parcel_number = p_parcel_number
          AND a.service_type = c.service_id
          AND (a.expires_at IS NULL OR a.expires_at > now()));

  IF cardinality(v_services) = 0 THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, 0::numeric, 0::numeric, 0::numeric, NULL::text, NULL::text,
      'Aucun service à payer : services retirés du catalogue ou déjà acquis'::text; RETURN;
  END IF;

  IF p_mode = 'bypass' THEN
    SELECT (value->>'payment_required')::boolean INTO v_payment_required FROM public.system_config WHERE key = 'payment_mode' LIMIT 1;
    IF COALESCE(v_payment_required, true) THEN
      RETURN QUERY SELECT NULL::uuid, NULL::text, 0::numeric, 0::numeric, 0::numeric, NULL::text, NULL::text, 'Bypass refusé : paiement requis'::text; RETURN;
    END IF;
    v_original := 0; v_total := 0; v_status := 'paid'; v_payment_method := 'BYPASS'; v_discount_code := 'BYPASS';
  ELSIF p_mode = 'test' THEN
    SELECT (value->>'enabled')::boolean INTO v_test_mode_active FROM public.system_config WHERE key = 'test_mode' LIMIT 1;
    IF NOT COALESCE(v_test_mode_active, false) THEN
      RETURN QUERY SELECT NULL::uuid, NULL::text, 0::numeric, 0::numeric, 0::numeric, NULL::text, NULL::text, 'Mode test inactif'::text; RETURN;
    END IF;
    v_total := v_original; v_status := 'pending'; v_payment_method := 'TEST';
  ELSE
    v_total := v_original;
    IF p_discount_code IS NOT NULL AND length(trim(p_discount_code)) > 0 THEN
      BEGIN
        SELECT COALESCE((res->>'discount_amount')::numeric, 0), (res->>'code')::text
          INTO v_discount, v_discount_code
          FROM (SELECT public.validate_discount_code(p_discount_code, v_original) AS res) sub;
        v_discount := LEAST(GREATEST(COALESCE(v_discount, 0), 0), v_original);
        v_total := v_original - v_discount;
      EXCEPTION WHEN undefined_function THEN v_discount := 0;
      END;
    END IF;
    v_status := 'pending'; v_payment_method := NULL;
  END IF;

  SELECT location INTO v_geo_zone FROM public.cadastral_parcels WHERE parcel_number = p_parcel_number LIMIT 1;

  INSERT INTO public.cadastral_invoices (
    user_id, parcel_number, selected_services,
    total_amount_usd, original_amount_usd, discount_amount_usd, discount_code_used,
    client_email, client_name,
    client_type, client_nif, client_rccm, client_id_nat, client_address, client_tax_regime,
    geographical_zone, status, payment_method, currency_code, exchange_rate_used)
  VALUES (
    v_user_id, p_parcel_number, to_jsonb(v_services),
    v_total, v_original, v_discount, v_discount_code,
    COALESCE(v_user_email, ''), COALESCE(p_client_name, NULLIF(v_user_name, '')),
    p_client_type, NULLIF(trim(coalesce(p_client_nif,'')), ''),
    NULLIF(trim(coalesce(p_client_rccm,'')), ''),
    NULLIF(trim(coalesce(p_client_id_nat,'')), ''),
    NULLIF(trim(coalesce(p_client_address,'')), ''),
    NULLIF(trim(coalesce(p_client_tax_regime,'')), ''),
    COALESCE(v_geo_zone, ''), v_status, v_payment_method, 'USD', 1)
  RETURNING id, cadastral_invoices.invoice_number INTO v_invoice_id, v_invoice_number;

  IF p_mode = 'bypass' THEN
    INSERT INTO public.cadastral_service_access (user_id, invoice_id, parcel_number, service_type)
    SELECT v_user_id, v_invoice_id, p_parcel_number, unnest(v_services)
    ON CONFLICT (user_id, parcel_number, service_type) DO NOTHING;
  END IF;

  RETURN QUERY SELECT v_invoice_id, v_invoice_number, v_total, v_original, v_discount, v_discount_code, v_status, NULL::text;
END;
$function$;