-- 0. Audit des grilles de frais : colonnes réelles de system_config_audit
CREATE OR REPLACE FUNCTION public.audit_expertise_fees_change()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.system_config_audit (table_name, record_id, config_key, action, old_values, new_values, admin_id)
  VALUES ('expertise_fees_config', COALESCE(NEW.id, OLD.id), 'expertise_fees:'||COALESCE(NEW.id, OLD.id)::text, TG_OP,
          CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
          CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END, auth.uid());
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.audit_mutation_fees_change()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.system_config_audit (table_name, record_id, config_key, action, old_values, new_values, admin_id)
  VALUES (TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), 'mutation_fees:'||COALESCE(NEW.id, OLD.id)::text, TG_OP,
          CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
          CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END, auth.uid());
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 1. Type de frais : demande d'expertise vs accès au certificat
ALTER TABLE public.expertise_fees_config
  ADD COLUMN IF NOT EXISTS fee_kind text NOT NULL DEFAULT 'request';
ALTER TABLE public.expertise_fees_config
  DROP CONSTRAINT IF EXISTS expertise_fees_config_fee_kind_check;
ALTER TABLE public.expertise_fees_config
  ADD CONSTRAINT expertise_fees_config_fee_kind_check CHECK (fee_kind IN ('request','certificate_access'));

INSERT INTO public.expertise_fees_config (fee_name, amount_usd, description, is_mandatory, is_active, display_order, fee_kind)
SELECT 'Accès au certificat d''expertise', 28, 'Accès à un certificat d''expertise valide déjà émis pour la parcelle', true, true, 100, 'certificate_access'
WHERE NOT EXISTS (SELECT 1 FROM public.expertise_fees_config WHERE fee_kind = 'certificate_access');

-- 2. Nature du paiement
ALTER TABLE public.expertise_payments
  ADD COLUMN IF NOT EXISTS payment_kind text NOT NULL DEFAULT 'expertise_fee';
ALTER TABLE public.expertise_payments
  DROP CONSTRAINT IF EXISTS expertise_payments_payment_kind_check;
ALTER TABLE public.expertise_payments
  ADD CONSTRAINT expertise_payments_payment_kind_check CHECK (payment_kind IN ('expertise_fee','certificate_access'));
UPDATE public.expertise_payments p SET payment_kind = 'certificate_access'
  FROM public.real_estate_expertise_requests r
 WHERE r.id = p.expertise_request_id AND r.user_id <> p.user_id AND p.payment_kind <> 'certificate_access';

-- 3. Devis de demande : uniquement les frais de type « request »
CREATE OR REPLACE FUNCTION public.calculate_expertise_fees(p_scope text DEFAULT 'total'::text, p_valuations text[] DEFAULT ARRAY['market'::text])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_items jsonb := '[]'::jsonb;
  v_total numeric := 0;
  v_scope text := COALESCE(NULLIF(p_scope, ''), 'total');
  v_vals text[] := COALESCE(p_valuations, ARRAY['market']::text[]);
  r record;
  v_amount numeric;
BEGIN
  IF v_scope NOT IN ('partial','total') THEN v_scope := 'total'; END IF;
  IF array_length(v_vals, 1) IS NULL THEN v_vals := ARRAY['market']::text[]; END IF;

  FOR r IN
    SELECT fee_name, amount_usd, description, is_mandatory,
           applies_to_market_value, applies_to_rental_value, partial_multiplier
    FROM public.expertise_fees_config
    WHERE is_active = true AND fee_kind = 'request'
    ORDER BY display_order
  LOOP
    IF NOT ((r.applies_to_market_value AND 'market' = ANY(v_vals))
         OR (r.applies_to_rental_value AND 'rental' = ANY(v_vals))) THEN
      CONTINUE;
    END IF;
    v_amount := r.amount_usd;
    IF v_scope = 'partial' THEN
      v_amount := ROUND(v_amount * COALESCE(r.partial_multiplier, 1.0), 2);
    END IF;
    v_total := v_total + v_amount;
    v_items := v_items || jsonb_build_object(
      'fee_name', r.fee_name, 'amount_usd', v_amount, 'base_amount_usd', r.amount_usd,
      'description', r.description, 'is_mandatory', r.is_mandatory);
  END LOOP;

  RETURN jsonb_build_object('fee_items', v_items, 'total_amount_usd', ROUND(v_total, 2), 'scope', v_scope, 'valuations', to_jsonb(v_vals));
END;
$function$;

-- 4. Création de la ligne de paiement par le serveur uniquement
DROP POLICY IF EXISTS "Users can create their own expertise payments" ON public.expertise_payments;
REVOKE INSERT ON public.expertise_payments FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_expertise_payment(
  p_request_id uuid, p_kind text, p_method text, p_provider text DEFAULT NULL, p_phone text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_req record;
  v_amount numeric;
  v_items jsonb;
  v_fee record;
  v_id uuid;
  v_provider text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentification requise' USING ERRCODE = '42501'; END IF;
  IF p_method NOT IN ('mobile_money','bank_card') THEN RAISE EXCEPTION 'Mode de paiement invalide'; END IF;
  IF p_kind NOT IN ('expertise_fee','certificate_access') THEN RAISE EXCEPTION 'Type de paiement invalide'; END IF;
  IF p_method = 'mobile_money' AND (p_provider IS NULL OR p_provider NOT IN ('airtel_money','orange_money','mpesa') OR COALESCE(p_phone,'') = '') THEN
    RAISE EXCEPTION 'Opérateur et numéro requis pour Mobile Money';
  END IF;
  v_provider := CASE WHEN p_method = 'mobile_money' THEN p_provider ELSE 'stripe' END;

  SELECT id, user_id, status, payment_status, total_amount_usd, computed_fee_items,
         certificate_url, certificate_issue_date, certificate_expiry_date
    INTO v_req FROM public.real_estate_expertise_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Demande introuvable'; END IF;

  IF p_kind = 'expertise_fee' THEN
    IF v_req.user_id <> v_uid THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
    IF COALESCE(v_req.payment_status,'pending') = 'paid' THEN RAISE EXCEPTION 'Cette demande est déjà payée'; END IF;
    v_amount := COALESCE(v_req.total_amount_usd, 0);
    v_items := COALESCE(v_req.computed_fee_items, '[]'::jsonb);
  ELSE
    IF v_req.user_id = v_uid THEN RAISE EXCEPTION 'Vous avez déjà accès à votre propre certificat'; END IF;
    IF v_req.status <> 'completed' OR v_req.certificate_url IS NULL OR v_req.certificate_issue_date IS NULL
       OR COALESCE(v_req.certificate_expiry_date, (v_req.certificate_issue_date + interval '6 months')::date) < current_date THEN
      RAISE EXCEPTION 'Aucun certificat valide pour cette demande';
    END IF;
    IF EXISTS (SELECT 1 FROM public.expertise_payments WHERE expertise_request_id = p_request_id AND user_id = v_uid AND status = 'completed') THEN
      RAISE EXCEPTION 'Accès déjà acheté';
    END IF;
    SELECT fee_name, amount_usd INTO v_fee FROM public.expertise_fees_config
     WHERE fee_kind = 'certificate_access' AND is_active = true ORDER BY display_order LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'Accès au certificat indisponible'; END IF;
    v_amount := v_fee.amount_usd;
    v_items := jsonb_build_array(jsonb_build_object('fee_name', v_fee.fee_name, 'amount_usd', v_fee.amount_usd));
  END IF;

  IF v_amount IS NULL OR v_amount <= 0 THEN RAISE EXCEPTION 'Montant invalide'; END IF;

  -- Réutilise une ligne en attente identique
  SELECT id INTO v_id FROM public.expertise_payments
   WHERE expertise_request_id = p_request_id AND user_id = v_uid AND status = 'pending' AND payment_kind = p_kind
   ORDER BY created_at DESC LIMIT 1;

  IF v_id IS NOT NULL THEN
    UPDATE public.expertise_payments
       SET payment_method = p_method, payment_provider = v_provider,
           phone_number = CASE WHEN p_method = 'mobile_money' THEN p_phone ELSE NULL END,
           fee_items = v_items, total_amount_usd = v_amount, updated_at = now()
     WHERE id = v_id;
  ELSE
    INSERT INTO public.expertise_payments (expertise_request_id, user_id, fee_items, total_amount_usd,
      payment_method, payment_provider, phone_number, status, payment_kind)
    VALUES (p_request_id, v_uid, v_items, v_amount, p_method, v_provider,
      CASE WHEN p_method = 'mobile_money' THEN p_phone ELSE NULL END, 'pending', p_kind)
    RETURNING id INTO v_id;
  END IF;

  RETURN jsonb_build_object('id', v_id, 'total_amount_usd', v_amount, 'fee_items', v_items);
END;
$function$;
REVOKE ALL ON FUNCTION public.create_expertise_payment(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_expertise_payment(uuid, text, text, text, text) TO authenticated;

-- The update trigger forbids client changes on total; the function runs as definer (postgres), allow it
CREATE OR REPLACE FUNCTION public.prevent_client_expertise_payment_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('role', true) = 'service_role'
     OR auth.role() = 'service_role'
     OR current_user IN ('postgres','supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    NEW.paid_at := NULL;
    NEW.receipt_url := NULL;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
     OR NEW.transaction_id IS DISTINCT FROM OLD.transaction_id
     OR NEW.total_amount_usd IS DISTINCT FROM OLD.total_amount_usd
     OR NEW.fee_items IS DISTINCT FROM OLD.fee_items
     OR NEW.payment_kind IS DISTINCT FROM OLD.payment_kind
     OR NEW.expertise_request_id IS DISTINCT FROM OLD.expertise_request_id
     OR NEW.receipt_url IS DISTINCT FROM OLD.receipt_url THEN
    RAISE EXCEPTION 'Modification interdite: le statut et les montants de paiement sont gérés côté serveur uniquement';
  END IF;

  RETURN NEW;
END;
$function$;

-- 5. Certificat valide d'une parcelle (vue publique minimale)
CREATE OR REPLACE FUNCTION public.get_parcel_valid_expertise_certificate(p_parcel_number text)
 RETURNS TABLE(id uuid, reference_number text, certificate_issue_date date, certificate_expiry_date date,
               access_fee_usd numeric, is_owner boolean, has_access boolean, market_value_usd numeric, has_certificate_file boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  r record;
  v_fee numeric;
  v_access boolean;
  v_owner boolean;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;

  SELECT q.id, q.user_id, q.reference_number, q.certificate_issue_date,
         COALESCE(q.certificate_expiry_date, (q.certificate_issue_date + interval '6 months')::date) AS expiry,
         q.market_value_usd, q.certificate_url
    INTO r
    FROM public.real_estate_expertise_requests q
   WHERE q.parcel_number = p_parcel_number
     AND q.status = 'completed'
     AND q.certificate_issue_date IS NOT NULL
     AND q.certificate_url IS NOT NULL AND length(trim(q.certificate_url)) > 0
     AND COALESCE(q.certificate_expiry_date, (q.certificate_issue_date + interval '6 months')::date) >= current_date
   ORDER BY q.certificate_issue_date DESC
   LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  v_owner := r.user_id = v_uid;
  v_access := v_owner OR public.is_expert_or_admin(v_uid) OR EXISTS (
    SELECT 1 FROM public.expertise_payments p
     WHERE p.expertise_request_id = r.id AND p.user_id = v_uid AND p.status = 'completed');

  SELECT amount_usd INTO v_fee FROM public.expertise_fees_config
   WHERE fee_kind = 'certificate_access' AND is_active = true ORDER BY display_order LIMIT 1;

  RETURN QUERY SELECT r.id, r.reference_number, r.certificate_issue_date, r.expiry,
    v_fee, v_owner, v_access, CASE WHEN v_access THEN r.market_value_usd ELSE NULL END, true;
END;
$function$;
REVOKE ALL ON FUNCTION public.get_parcel_valid_expertise_certificate(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_parcel_valid_expertise_certificate(text) TO authenticated;

-- 6. Ouverture du certificat : aussi pour les acheteurs de l'accès
CREATE OR REPLACE FUNCTION public.get_signed_expertise_certificate(p_request_id uuid, p_ttl_seconds integer DEFAULT 600)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'storage'
AS $function$
DECLARE
  v_url TEXT; v_path TEXT; v_owner UUID; v_pay TEXT; v_status TEXT; v_signed RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;

  SELECT user_id, certificate_url, payment_status, status
    INTO v_owner, v_url, v_pay, v_status
  FROM public.real_estate_expertise_requests WHERE id = p_request_id;

  IF v_url IS NULL THEN RETURN NULL; END IF;

  IF auth.uid() = v_owner THEN
    IF COALESCE(v_pay,'pending') <> 'paid' THEN
      RAISE EXCEPTION 'Le paiement doit être finalisé pour télécharger le certificat.';
    END IF;
  ELSIF NOT public.is_expert_or_admin(auth.uid()) THEN
    IF v_status <> 'completed' OR NOT EXISTS (
      SELECT 1 FROM public.expertise_payments
       WHERE expertise_request_id = p_request_id AND user_id = auth.uid()
         AND status = 'completed' AND payment_kind = 'certificate_access') THEN
      RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;
  END IF;

  v_path := regexp_replace(v_url, '^.*/expertise-certificates/', '');
  v_path := regexp_replace(v_path, '^.*/object/(public|sign)/expertise-certificates/', '');

  SELECT * INTO v_signed FROM storage.create_signed_url('expertise-certificates', v_path, p_ttl_seconds);
  RETURN v_signed.signed_url;
END;
$function$;
REVOKE ALL ON FUNCTION public.get_signed_expertise_certificate(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_signed_expertise_certificate(uuid, integer) TO authenticated;

-- 7. Fonction orpheline
DROP FUNCTION IF EXISTS public.verify_expertise_certificate(text);

-- 8. Règle admin de la grille des frais : table des rôles
DROP POLICY IF EXISTS "Only admins can modify expertise fees config" ON public.expertise_fees_config;
CREATE POLICY "Only admins can modify expertise fees config" ON public.expertise_fees_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));