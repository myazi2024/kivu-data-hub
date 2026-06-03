-- Lot V/W : atomicité octroi d'accès + validation service_id

-- 1. mark_cadastral_invoice_paid_safe : insère aussi dans cadastral_service_access (atomique)
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
  v_parcel_number text;
  v_services jsonb;
  v_has_completed_tx boolean;
  v_test_mode_active boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Authentification requise'::text;
    RETURN;
  END IF;

  SELECT user_id, status, parcel_number, selected_services
    INTO v_owner, v_status, v_parcel_number, v_services
    FROM public.cadastral_invoices WHERE id = p_invoice_id;
  IF v_owner IS NULL THEN
    RETURN QUERY SELECT false, 'Facture introuvable'::text;
    RETURN;
  END IF;
  IF v_owner <> v_user_id THEN
    RETURN QUERY SELECT false, 'Accès refusé'::text;
    RETURN;
  END IF;

  -- Idempotent : si déjà payé, on s'assure quand même que les accès existent
  IF v_status <> 'paid' THEN
    IF p_payment_method = 'TEST' THEN
      SELECT (value->>'enabled')::boolean INTO v_test_mode_active
        FROM public.system_config WHERE key = 'test_mode' LIMIT 1;
      IF NOT COALESCE(v_test_mode_active, false) THEN
        RETURN QUERY SELECT false, 'Mode test inactif'::text;
        RETURN;
      END IF;
    ELSE
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
  END IF;

  -- Octroi d'accès atomique (idempotent)
  IF v_services IS NOT NULL AND jsonb_typeof(v_services) = 'array' THEN
    INSERT INTO public.cadastral_service_access (user_id, invoice_id, parcel_number, service_type)
    SELECT v_user_id, p_invoice_id, v_parcel_number, jsonb_array_elements_text(v_services)
    ON CONFLICT (user_id, parcel_number, service_type) DO NOTHING;
  END IF;

  RETURN QUERY SELECT true, NULL::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_cadastral_invoice_paid_safe(uuid, text) TO authenticated;

-- 2. CHECK constraint sur format service_id (lowercase snake_case)
-- Drop si existait + ajout, NOT VALID puis VALIDATE pour ne pas casser existant
ALTER TABLE public.cadastral_services_config
  DROP CONSTRAINT IF EXISTS cadastral_services_config_service_id_format_check;

-- On valide d'abord que les lignes existantes respectent le format
DO $$
DECLARE
  v_bad_count int;
BEGIN
  SELECT count(*) INTO v_bad_count
    FROM public.cadastral_services_config
    WHERE service_id !~ '^[a-z][a-z0-9_]*$';
  IF v_bad_count > 0 THEN
    RAISE NOTICE 'Skipping service_id format CHECK: % rows do not match', v_bad_count;
  ELSE
    EXECUTE 'ALTER TABLE public.cadastral_services_config
             ADD CONSTRAINT cadastral_services_config_service_id_format_check
             CHECK (service_id ~ ''^[a-z][a-z0-9_]*$'')';
  END IF;
END $$;