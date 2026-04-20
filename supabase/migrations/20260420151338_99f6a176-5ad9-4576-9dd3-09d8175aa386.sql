-- Phase 1.5 DGI Branchement

-- 1) Trigger BEFORE INSERT pour attribuer un numéro DGI normalisé si null
CREATE OR REPLACE FUNCTION public.assign_normalized_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := public.generate_normalized_invoice_number(EXTRACT(YEAR FROM now())::int);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_normalized_invoice_number ON public.cadastral_invoices;
CREATE TRIGGER trg_assign_normalized_invoice_number
BEFORE INSERT ON public.cadastral_invoices
FOR EACH ROW
EXECUTE FUNCTION public.assign_normalized_invoice_number();

-- 2) RPC v2 enrichie identité fiscale client
CREATE OR REPLACE FUNCTION public.create_cadastral_invoice_secure_v2(
  parcel_number_param text,
  selected_services_param text[],
  discount_code_param text DEFAULT NULL,
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
  services_data jsonb,
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
  v_services_data jsonb := '[]'::jsonb;
  v_invoice_id uuid;
  v_invoice_number text;
  v_geo_zone text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, 0::numeric, 0::numeric, 0::numeric, NULL::text, '[]'::jsonb, 'Authentification requise'::text;
    RETURN;
  END IF;

  -- Récup profil
  SELECT email, COALESCE(raw_user_meta_data->>'full_name', '')
  INTO v_user_email, v_user_name
  FROM auth.users WHERE id = v_user_id;

  -- Calcul total à partir du catalogue
  SELECT 
    COALESCE(SUM(price_usd), 0),
    jsonb_agg(jsonb_build_object('id', service_id, 'name', name, 'price', price_usd))
  INTO v_original, v_services_data
  FROM public.cadastral_services_config
  WHERE service_id = ANY(selected_services_param)
    AND is_active = true
    AND deleted_at IS NULL;

  IF v_original = 0 THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, 0::numeric, 0::numeric, 0::numeric, NULL::text, '[]'::jsonb, 'Aucun service valide trouvé'::text;
    RETURN;
  END IF;

  v_total := v_original;

  -- Application code promo (si fourni)
  IF discount_code_param IS NOT NULL AND length(trim(discount_code_param)) > 0 THEN
    -- best-effort, ne casse pas si la fonction n'existe pas
    BEGIN
      SELECT 
        COALESCE((res->>'discount_amount')::numeric, 0),
        (res->>'code')::text
      INTO v_discount, v_discount_code
      FROM (SELECT public.validate_discount_code(discount_code_param, v_original) AS res) sub;
      v_total := GREATEST(0, v_original - v_discount);
    EXCEPTION WHEN undefined_function THEN
      v_discount := 0;
    END;
  END IF;

  -- Géo
  SELECT location INTO v_geo_zone
  FROM public.cadastral_parcels
  WHERE parcel_number = parcel_number_param
  LIMIT 1;

  -- INSERT (le trigger attribue invoice_number automatiquement)
  INSERT INTO public.cadastral_invoices (
    user_id, parcel_number, selected_services,
    total_amount_usd, original_amount_usd, discount_amount_usd, discount_code_used,
    client_email, client_name,
    client_type, client_nif, client_rccm, client_id_nat, client_address, client_tax_regime,
    geographical_zone, status, currency_code, exchange_rate_used
  )
  VALUES (
    v_user_id, parcel_number_param, to_jsonb(selected_services_param),
    v_total, v_original, v_discount, v_discount_code,
    COALESCE(v_user_email, ''), COALESCE(p_client_name, NULLIF(v_user_name, '')),
    p_client_type, NULLIF(trim(coalesce(p_client_nif,'')), ''),
    NULLIF(trim(coalesce(p_client_rccm,'')), ''),
    NULLIF(trim(coalesce(p_client_id_nat,'')), ''),
    NULLIF(trim(coalesce(p_client_address,'')), ''),
    NULLIF(trim(coalesce(p_client_tax_regime,'')), ''),
    COALESCE(v_geo_zone, ''), 'pending', 'USD', 1
  )
  RETURNING id, cadastral_invoices.invoice_number INTO v_invoice_id, v_invoice_number;

  RETURN QUERY SELECT v_invoice_id, v_invoice_number, v_total, v_original, v_discount, v_discount_code, v_services_data, NULL::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_cadastral_invoice_secure_v2(text, text[], text, text, text, text, text, text, text, text) TO authenticated;