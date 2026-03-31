-- ===================================================
-- FIX S1: cadastral_service_access - remove ALL true policy
-- ===================================================
DROP POLICY IF EXISTS "System can manage service access" ON public.cadastral_service_access;

CREATE POLICY "Admins can manage service access"
ON public.cadastral_service_access
FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]));

-- ===================================================
-- FIX S2: orders - remove UPDATE true policy
-- ===================================================
DROP POLICY IF EXISTS "System can update orders" ON public.orders;

CREATE POLICY "Admins can update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]));

CREATE POLICY "Users can update their own orders"
ON public.orders
FOR UPDATE
USING (auth.uid() = user_id);

-- ===================================================
-- FIX S3: cadastral_land_disputes - remove public SELECT true
-- ===================================================
DROP POLICY IF EXISTS "Public can view disputes for parcels" ON public.cadastral_land_disputes;

CREATE POLICY "Authenticated users can view disputes"
ON public.cadastral_land_disputes
FOR SELECT
TO authenticated
USING (
  auth.uid() = reported_by
  OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role])
);

-- ===================================================
-- FIX S4: payment_methods_config - restrict to authenticated only
-- ===================================================
DROP POLICY IF EXISTS "Enabled payment methods are viewable by everyone" ON public.payment_methods_config;

CREATE POLICY "Authenticated users can view enabled payment methods"
ON public.payment_methods_config
FOR SELECT
TO authenticated
USING (is_enabled = true);

-- ===================================================
-- FIX S5: cadastral_parcels - remove anon read, restrict manage
-- ===================================================
DROP POLICY IF EXISTS "Allow public read access to cadastral parcels" ON public.cadastral_parcels;
DROP POLICY IF EXISTS "Authenticated users can view parcels" ON public.cadastral_parcels;
DROP POLICY IF EXISTS "Authenticated users can manage cadastral parcels" ON public.cadastral_parcels;

CREATE POLICY "Authenticated users can view parcels"
ON public.cadastral_parcels
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage cadastral parcels"
ON public.cadastral_parcels
FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]));

-- ===================================================
-- FIX S6: generated_certificates - remove public SELECT true
-- ===================================================
DROP POLICY IF EXISTS "Users can view their own certificates" ON public.generated_certificates;

CREATE POLICY "Users can view their own certificates"
ON public.generated_certificates
FOR SELECT
TO authenticated
USING (
  generated_by = auth.uid()
  OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role])
);

-- ===================================================
-- FIX S7: Financial tables - restrict to authenticated
-- ===================================================

-- cadastral_mortgages
DROP POLICY IF EXISTS "Cadastral mortgages are viewable by everyone" ON public.cadastral_mortgages;
DROP POLICY IF EXISTS "Authenticated users can manage mortgages" ON public.cadastral_mortgages;

CREATE POLICY "Authenticated users can view mortgages"
ON public.cadastral_mortgages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage mortgages"
ON public.cadastral_mortgages FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]));

-- cadastral_mortgage_payments
DROP POLICY IF EXISTS "Mortgage payments are viewable by everyone" ON public.cadastral_mortgage_payments;
DROP POLICY IF EXISTS "Authenticated users can manage mortgage payments" ON public.cadastral_mortgage_payments;

CREATE POLICY "Authenticated users can view mortgage payments"
ON public.cadastral_mortgage_payments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage mortgage payments"
ON public.cadastral_mortgage_payments FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]));

-- cadastral_tax_history
DROP POLICY IF EXISTS "Cadastral tax history is viewable by everyone" ON public.cadastral_tax_history;
DROP POLICY IF EXISTS "Authenticated users can manage tax history" ON public.cadastral_tax_history;

CREATE POLICY "Authenticated users can view tax history"
ON public.cadastral_tax_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage tax history"
ON public.cadastral_tax_history FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]));

-- cadastral_ownership_history
DROP POLICY IF EXISTS "Cadastral ownership history is viewable by everyone" ON public.cadastral_ownership_history;
DROP POLICY IF EXISTS "Authenticated users can manage ownership history" ON public.cadastral_ownership_history;

CREATE POLICY "Authenticated users can view ownership history"
ON public.cadastral_ownership_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage ownership history"
ON public.cadastral_ownership_history FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]));

-- cadastral_boundary_history
DROP POLICY IF EXISTS "Boundary history is viewable by everyone" ON public.cadastral_boundary_history;
DROP POLICY IF EXISTS "Authenticated users can manage boundary history" ON public.cadastral_boundary_history;

CREATE POLICY "Authenticated users can view boundary history"
ON public.cadastral_boundary_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage boundary history"
ON public.cadastral_boundary_history FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]));

-- cadastral_building_permits
DROP POLICY IF EXISTS "Building permits are viewable by everyone" ON public.cadastral_building_permits;
DROP POLICY IF EXISTS "Authenticated users can manage building permits" ON public.cadastral_building_permits;

CREATE POLICY "Authenticated users can view building permits"
ON public.cadastral_building_permits FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage building permits"
ON public.cadastral_building_permits FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]));

-- ===================================================
-- FIX S8: reseller_sales - remove INSERT true
-- ===================================================
DROP POLICY IF EXISTS "System can create sales records" ON public.reseller_sales;

CREATE POLICY "Admins can create sales records"
ON public.reseller_sales FOR INSERT TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]));

-- ===================================================
-- FIX S9: Functions missing search_path
-- ===================================================
CREATE OR REPLACE FUNCTION public.update_territorial_zones_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_invoice_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := public.generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_mutation_reference()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.reference_number IS NULL OR NEW.reference_number = '' THEN
    NEW.reference_number := public.generate_mutation_reference();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_current_owner_name()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.current_owners_details IS NOT NULL AND jsonb_array_length(NEW.current_owners_details) > 0 THEN
    NEW.current_owner_name := public.extract_owner_names_from_details(NEW.current_owners_details);
    NEW.current_owner_legal_status := NEW.current_owners_details->0->>'legalStatus';
    NEW.current_owner_since := (NEW.current_owners_details->0->>'since')::DATE;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.extract_owner_names_from_details(owners_details jsonb)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public'
AS $function$
DECLARE
  result TEXT := '';
  owner JSONB;
BEGIN
  IF owners_details IS NULL OR jsonb_array_length(owners_details) = 0 THEN
    RETURN NULL;
  END IF;
  FOR owner IN SELECT * FROM jsonb_array_elements(owners_details)
  LOOP
    IF result != '' THEN result := result || '; '; END IF;
    result := result || COALESCE(owner->>'lastName', '') || 
              CASE WHEN owner->>'middleName' IS NOT NULL AND owner->>'middleName' != '' 
                   THEN ' ' || (owner->>'middleName') ELSE '' END ||
              ' ' || COALESCE(owner->>'firstName', '');
  END LOOP;
  RETURN TRIM(result);
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_generate_ccc_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_code TEXT; v_value_usd NUMERIC; v_existing_code TEXT;
BEGIN
  IF (OLD.status = 'pending' OR OLD.status = 'returned') AND NEW.status = 'approved' THEN
    SELECT code INTO v_existing_code FROM cadastral_contributor_codes WHERE contribution_id = NEW.id LIMIT 1;
    IF v_existing_code IS NOT NULL THEN RETURN NEW; END IF;
    IF NEW.user_id IS NULL THEN
      RAISE EXCEPTION 'user_id NULL pour la contribution %', NEW.id;
    END IF;
    v_code := generate_ccc_code();
    v_value_usd := calculate_ccc_value(NEW.id);
    IF v_value_usd IS NULL OR v_value_usd < 0 OR v_value_usd > 5 THEN
      RAISE EXCEPTION 'Valeur CCC invalide: %', v_value_usd;
    END IF;
    INSERT INTO cadastral_contributor_codes (code, parcel_number, user_id, contribution_id, value_usd, is_used, is_valid, expires_at)
    VALUES (v_code, NEW.parcel_number, NEW.user_id, NEW.id, v_value_usd, false, true, NOW() + INTERVAL '90 days');
    BEGIN
      INSERT INTO notifications (user_id, type, title, message, action_url)
      VALUES (NEW.user_id, 'success', 'Code CCC généré',
        format('Votre code CCC %s (valeur %s USD) pour la parcelle %s est valable 90 jours.', v_code, v_value_usd::TEXT, NEW.parcel_number),
        '/user-dashboard?tab=ccc-codes');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_contribution_completeness(contribution_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_contribution RECORD; v_errors JSONB := '[]'::JSONB; v_warnings JSONB := '[]'::JSONB;
BEGIN
  SELECT * INTO v_contribution FROM cadastral_contributions WHERE id = contribution_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'errors', jsonb_build_array('Contribution non trouvée'), 'warnings', '[]'::JSONB);
  END IF;
  IF v_contribution.parcel_number IS NULL OR v_contribution.parcel_number = '' THEN v_errors := v_errors || jsonb_build_array('Numéro de parcelle requis'); END IF;
  IF v_contribution.property_title_type IS NULL THEN v_errors := v_errors || jsonb_build_array('Type de titre foncier requis'); END IF;
  IF v_contribution.current_owner_name IS NULL OR v_contribution.current_owner_name = '' THEN v_errors := v_errors || jsonb_build_array('Nom du propriétaire actuel requis'); END IF;
  IF v_contribution.area_sqm IS NULL OR v_contribution.area_sqm <= 0 THEN v_errors := v_errors || jsonb_build_array('Superficie requise et doit être positive'); END IF;
  IF v_contribution.province IS NULL OR v_contribution.province = '' THEN v_errors := v_errors || jsonb_build_array('Province requise'); END IF;
  IF v_contribution.property_title_document_url IS NULL THEN v_warnings := v_warnings || jsonb_build_array('Document de titre foncier non fourni'); END IF;
  IF v_contribution.owner_document_url IS NULL THEN v_warnings := v_warnings || jsonb_build_array('Document d''identité du propriétaire non fourni'); END IF;
  IF v_contribution.gps_coordinates IS NULL THEN v_warnings := v_warnings || jsonb_build_array('Coordonnées GPS non fournies'); END IF;
  IF v_contribution.ownership_history IS NULL THEN v_warnings := v_warnings || jsonb_build_array('Historique de propriété non fourni'); END IF;
  IF v_contribution.boundary_history IS NULL THEN v_warnings := v_warnings || jsonb_build_array('Historique des bornages non fourni'); END IF;
  IF v_contribution.tax_history IS NULL THEN v_warnings := v_warnings || jsonb_build_array('Historique des taxes non fourni'); END IF;
  RETURN jsonb_build_object('valid', jsonb_array_length(v_errors) = 0, 'errors', v_errors, 'warnings', v_warnings,
    'completeness_score', CASE WHEN jsonb_array_length(v_warnings) = 0 THEN 100 WHEN jsonb_array_length(v_warnings) <= 2 THEN 80 WHEN jsonb_array_length(v_warnings) <= 4 THEN 60 ELSE 40 END);
END;
$function$;