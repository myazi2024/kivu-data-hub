CREATE OR REPLACE FUNCTION public.enforce_mutation_request_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_transfer boolean := NEW.mutation_type IN ('vente','donation','succession','expropriation','echange');
  v_requires_cert boolean := NEW.mutation_type IN ('vente','donation','succession','echange');
  v_late boolean := NEW.mutation_type NOT IN ('correction','mise_a_jour','expropriation');
  v_parcel RECORD;
  v_optional uuid[];
  v_items jsonb;
  v_base numeric := 0;
  v_title_age text;
  v_value numeric;
  v_mut numeric := 0; v_bank numeric := 0;
  v_acq date; v_days int := 0; v_late_fee numeric := 0;
BEGIN
  -- Service role (générateurs de test, fonctions serveur) : pas de réécriture
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;

  NEW.status := 'pending';
  NEW.payment_status := 'pending';

  SELECT title_issue_date, current_owner_since INTO v_parcel
  FROM cadastral_parcels WHERE parcel_number = NEW.parcel_number LIMIT 1;

  -- Frais fixes : obligatoires actifs + optionnels actifs cochés
  SELECT coalesce(array_agg((e->>'fee_id')::uuid), '{}') INTO v_optional
  FROM jsonb_array_elements(coalesce(NEW.fee_items, '[]'::jsonb)) e
  WHERE (e->>'fee_id') ~ '^[0-9a-fA-F-]{36}$';

  SELECT coalesce(jsonb_agg(jsonb_build_object('fee_id', id, 'fee_name', fee_name, 'amount_usd', amount_usd) ORDER BY display_order), '[]'::jsonb),
         coalesce(sum(amount_usd), 0)
    INTO v_items, v_base
  FROM mutation_fees_config
  WHERE is_active AND (is_mandatory OR id = ANY(v_optional));

  -- Droits de mutation (types exigeant un certificat d'expertise)
  IF v_requires_cert THEN
    v_value := NEW.market_value_usd;
    IF v_value IS NULL OR v_value <= 0 THEN
      RAISE EXCEPTION 'La valeur vénale du bien est requise.';
    END IF;
    IF NEW.expertise_certificate_url IS NULL OR NEW.expertise_certificate_date IS NULL THEN
      RAISE EXCEPTION 'Le certificat d''expertise immobilière et sa date sont requis.';
    END IF;
    IF NEW.expertise_certificate_date::date > current_date THEN
      RAISE EXCEPTION 'La date du certificat d''expertise ne peut pas être future.';
    END IF;
    IF NEW.expertise_certificate_date::date <= (current_date - interval '6 months')::date THEN
      RAISE EXCEPTION 'Le certificat d''expertise est expiré (valide 6 mois).';
    END IF;

    IF v_parcel.title_issue_date IS NOT NULL THEN
      v_title_age := CASE WHEN v_parcel.title_issue_date <= (current_date - interval '10 years')::date THEN '10_or_more' ELSE 'less_than_10' END;
    ELSE
      v_title_age := CASE WHEN NEW.title_age = '10_or_more' THEN '10_or_more' ELSE 'less_than_10' END;
    END IF;
    NEW.title_age := v_title_age;

    IF v_value >= 10000 THEN
      v_mut := round(v_value * CASE WHEN v_title_age = '10_or_more' THEN 0.015 ELSE 0.03 END, 2);
      v_bank := CASE WHEN v_title_age = '10_or_more' THEN 0 ELSE round(v_value * 0.005, 2) END;
    END IF;
  ELSE
    NEW.expertise_certificate_url := NULL;
    NEW.expertise_certificate_date := NULL;
  END IF;

  -- Pénalités de retard : 0,45 $/jour après 20 jours, plafond 500 $
  IF v_late THEN
    v_acq := coalesce(v_parcel.current_owner_since::date,
                      nullif(NEW.proposed_changes->>'declared_acquisition_date','')::date);
    IF v_acq IS NOT NULL THEN
      v_days := greatest(0, (current_date - v_acq) - 20);
      v_late_fee := round(least(v_days * 0.45, 500), 2);
    END IF;
  END IF;

  NEW.fee_items := v_items;
  NEW.mutation_fee_amount := CASE WHEN v_mut > 0 THEN v_mut END;
  NEW.bank_fee_amount := CASE WHEN v_mut > 0 THEN v_bank END;
  NEW.late_fee_amount := CASE WHEN v_days > 0 THEN v_late_fee END;
  NEW.late_fee_days := CASE WHEN v_days > 0 THEN v_days END;
  NEW.total_amount_usd := round(v_base + v_mut + v_bank + v_late_fee, 2);
  IF NOT v_transfer THEN NEW.beneficiary_name := NULL; NEW.beneficiary_phone := NULL; END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_mutation_request_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_mutation_request_insert ON public.mutation_requests;
CREATE TRIGGER trg_enforce_mutation_request_insert
BEFORE INSERT ON public.mutation_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_mutation_request_insert();

CREATE OR REPLACE FUNCTION public.get_parcel_mutation_prefill(p_parcel_number text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise' USING ERRCODE = '42501';
  END IF;
  SELECT p.title_issue_date, p.current_owner_since INTO v_row
  FROM public.cadastral_parcels p WHERE p.parcel_number = p_parcel_number LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN to_jsonb(v_row);
END;
$$;