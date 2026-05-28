
-- 1. CHECK constraint sur category (P1-6)
ALTER TABLE public.cadastral_services_config
  DROP CONSTRAINT IF EXISTS cadastral_services_config_category_check;
ALTER TABLE public.cadastral_services_config
  ADD CONSTRAINT cadastral_services_config_category_check
  CHECK (category IN ('consultation','fiscal','juridique'));

-- 2. RLS publique : exclure les services soft-deleted (P1-5)
DROP POLICY IF EXISTS "Services config are viewable by everyone" ON public.cadastral_services_config;
CREATE POLICY "Services config are viewable by everyone"
  ON public.cadastral_services_config
  FOR SELECT
  USING (is_active = true AND deleted_at IS NULL);

-- 3. Drop des doublons RLS sur cadastral_invoices (P1-7)
DROP POLICY IF EXISTS "Admins view all invoices" ON public.cadastral_invoices;
DROP POLICY IF EXISTS "Users view own invoices" ON public.cadastral_invoices;

-- 4. Révoquer INSERT/UPDATE direct client sur cadastral_invoices (P0-S1)
DROP POLICY IF EXISTS "Users can create their own invoices" ON public.cadastral_invoices;
DROP POLICY IF EXISTS "Users can update their own invoices" ON public.cadastral_invoices;
REVOKE INSERT, UPDATE ON public.cadastral_invoices FROM authenticated;

-- 5. RPC sécurisée unifiée pour création (paid|bypass|test)
CREATE OR REPLACE FUNCTION public.create_cadastral_invoice_safe(
  p_mode text,
  p_parcel_number text,
  p_selected_services text[],
  p_discount_code text DEFAULT NULL,
  p_client_type text DEFAULT NULL,
  p_client_name text DEFAULT NULL,
  p_client_nif text DEFAULT NULL,
  p_client_rccm text DEFAULT NULL,
  p_client_id_nat text DEFAULT NULL,
  p_client_address text DEFAULT NULL,
  p_client_tax_regime text DEFAULT NULL
)
RETURNS TABLE(
  invoice_id uuid,
  invoice_number text,
  total_amount_usd numeric,
  original_amount_usd numeric,
  discount_amount_usd numeric,
  discount_code_used text,
  status text,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_user_name text;
  v_total numeric := 0;
  v_original numeric := 0;
  v_discount numeric := 0;
  v_discount_code text := NULL;
  v_invoice_id uuid;
  v_invoice_number text;
  v_geo_zone text;
  v_status text;
  v_payment_method text;
  v_test_mode_active boolean;
  v_payment_required boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, 0::numeric, 0::numeric, 0::numeric, NULL::text, NULL::text, 'Authentification requise'::text;
    RETURN;
  END IF;

  IF p_mode NOT IN ('paid','bypass','test') THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, 0::numeric, 0::numeric, 0::numeric, NULL::text, NULL::text, 'Mode invalide'::text;
    RETURN;
  END IF;

  -- Profil
  SELECT email, COALESCE(raw_user_meta_data->>'full_name', '')
    INTO v_user_email, v_user_name
    FROM auth.users WHERE id = v_user_id;

  -- Total serveur depuis catalogue
  SELECT COALESCE(SUM(price_usd), 0) INTO v_original
    FROM public.cadastral_services_config
    WHERE service_id = ANY(p_selected_services)
      AND is_active = true
      AND deleted_at IS NULL;

  IF v_original = 0 AND p_mode <> 'bypass' THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, 0::numeric, 0::numeric, 0::numeric, NULL::text, NULL::text, 'Aucun service valide trouvé'::text;
    RETURN;
  END IF;

  -- Mode bypass : exige que payment_required=false en BD
  IF p_mode = 'bypass' THEN
    SELECT (value->>'payment_required')::boolean INTO v_payment_required
      FROM public.system_config WHERE key = 'payment_mode' LIMIT 1;
    IF COALESCE(v_payment_required, true) THEN
      RETURN QUERY SELECT NULL::uuid, NULL::text, 0::numeric, 0::numeric, 0::numeric, NULL::text, NULL::text, 'Bypass refusé : paiement requis'::text;
      RETURN;
    END IF;
    v_original := 0;
    v_total := 0;
    v_status := 'paid';
    v_payment_method := 'BYPASS';
    v_discount_code := 'BYPASS';
  ELSIF p_mode = 'test' THEN
    -- Vérifier que le mode test est actif (admin a activé via system_config)
    SELECT (value->>'enabled')::boolean INTO v_test_mode_active
      FROM public.system_config WHERE key = 'test_mode' LIMIT 1;
    IF NOT COALESCE(v_test_mode_active, false) THEN
      RETURN QUERY SELECT NULL::uuid, NULL::text, 0::numeric, 0::numeric, 0::numeric, NULL::text, NULL::text, 'Mode test inactif'::text;
      RETURN;
    END IF;
    v_total := v_original;
    v_status := 'pending';
    v_payment_method := 'TEST';
  ELSE
    -- paid
    v_total := v_original;
    -- Code promo
    IF p_discount_code IS NOT NULL AND length(trim(p_discount_code)) > 0 THEN
      BEGIN
        SELECT 
          COALESCE((res->>'discount_amount')::numeric, 0),
          (res->>'code')::text
        INTO v_discount, v_discount_code
        FROM (SELECT public.validate_discount_code(p_discount_code, v_original) AS res) sub;
        v_total := GREATEST(0, v_original - v_discount);
      EXCEPTION WHEN undefined_function THEN
        v_discount := 0;
      END;
    END IF;
    v_status := 'pending';
    v_payment_method := NULL;
  END IF;

  -- Géo
  SELECT location INTO v_geo_zone
    FROM public.cadastral_parcels
    WHERE parcel_number = p_parcel_number
    LIMIT 1;

  INSERT INTO public.cadastral_invoices (
    user_id, parcel_number, selected_services,
    total_amount_usd, original_amount_usd, discount_amount_usd, discount_code_used,
    client_email, client_name,
    client_type, client_nif, client_rccm, client_id_nat, client_address, client_tax_regime,
    geographical_zone, status, payment_method, currency_code, exchange_rate_used
  )
  VALUES (
    v_user_id, p_parcel_number, to_jsonb(p_selected_services),
    v_total, v_original, v_discount, v_discount_code,
    COALESCE(v_user_email, ''), COALESCE(p_client_name, NULLIF(v_user_name, '')),
    p_client_type, NULLIF(trim(coalesce(p_client_nif,'')), ''),
    NULLIF(trim(coalesce(p_client_rccm,'')), ''),
    NULLIF(trim(coalesce(p_client_id_nat,'')), ''),
    NULLIF(trim(coalesce(p_client_address,'')), ''),
    NULLIF(trim(coalesce(p_client_tax_regime,'')), ''),
    COALESCE(v_geo_zone, ''), v_status, v_payment_method, 'USD', 1
  )
  RETURNING id, cadastral_invoices.invoice_number INTO v_invoice_id, v_invoice_number;

  -- Pour bypass : grant immédiat
  IF p_mode = 'bypass' THEN
    INSERT INTO public.cadastral_service_access (user_id, invoice_id, parcel_number, service_type)
    SELECT v_user_id, v_invoice_id, p_parcel_number, unnest(p_selected_services)
    ON CONFLICT (user_id, parcel_number, service_type) DO NOTHING;
  END IF;

  RETURN QUERY SELECT v_invoice_id, v_invoice_number, v_total, v_original, v_discount, v_discount_code, v_status, NULL::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_cadastral_invoice_safe(text,text,text[],text,text,text,text,text,text,text,text) TO authenticated;

-- 6. RPC pour marquer une facture payée — valide qu'un paiement existe
CREATE OR REPLACE FUNCTION public.mark_cadastral_invoice_paid_safe(
  p_invoice_id uuid,
  p_payment_method text
)
RETURNS TABLE(ok boolean, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_owner uuid;
  v_status text;
  v_has_completed_tx boolean;
  v_test_mode_active boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Authentification requise'::text;
    RETURN;
  END IF;

  SELECT user_id, status INTO v_owner, v_status
    FROM public.cadastral_invoices WHERE id = p_invoice_id;
  IF v_owner IS NULL THEN
    RETURN QUERY SELECT false, 'Facture introuvable'::text;
    RETURN;
  END IF;
  IF v_owner <> v_user_id THEN
    RETURN QUERY SELECT false, 'Accès refusé'::text;
    RETURN;
  END IF;
  IF v_status = 'paid' THEN
    RETURN QUERY SELECT true, NULL::text;
    RETURN;
  END IF;

  -- Pour TEST : exiger mode test actif
  IF p_payment_method = 'TEST' THEN
    SELECT (value->>'enabled')::boolean INTO v_test_mode_active
      FROM public.system_config WHERE key = 'test_mode' LIMIT 1;
    IF NOT COALESCE(v_test_mode_active, false) THEN
      RETURN QUERY SELECT false, 'Mode test inactif'::text;
      RETURN;
    END IF;
  ELSE
    -- Pour les autres méthodes : exiger une transaction completed liée
    SELECT EXISTS (
      SELECT 1 FROM public.payment_transactions
      WHERE invoice_id = p_invoice_id
        AND status = 'completed'
    ) INTO v_has_completed_tx;
    IF NOT v_has_completed_tx THEN
      RETURN QUERY SELECT false, 'Aucun paiement complété trouvé'::text;
      RETURN;
    END IF;
  END IF;

  UPDATE public.cadastral_invoices
    SET status = 'paid', payment_method = p_payment_method, updated_at = now(),
        paid_at = COALESCE(paid_at, now())
    WHERE id = p_invoice_id;

  RETURN QUERY SELECT true, NULL::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_cadastral_invoice_paid_safe(uuid, text) TO authenticated;
