-- Taxe foncière : montants, anti-doublon et notification fixés par le serveur
CREATE OR REPLACE FUNCTION public._tax_months_late(_year int, _deadline_month int, _deadline_day int)
RETURNS int LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE WHEN now() <= make_date(_year, _deadline_month, _deadline_day)::timestamptz THEN 0
    ELSE GREATEST(0, floor(extract(epoch FROM (now() - make_date(_year, _deadline_month, _deadline_day)::timestamptz)) / (86400 * 30.44))::int) END
$$;

CREATE OR REPLACE FUNCTION public._tax_zone_multiplier(_province text, _ville text, _zone text)
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _zone = 'rural' THEN 0.7
    WHEN _province = 'Kinshasa' THEN 1.5
    WHEN (_province, _ville) IN (('Nord-Kivu','Goma'),('Nord-Kivu','Beni'),('Nord-Kivu','Butembo'),('Sud-Kivu','Bukavu'),('Sud-Kivu','Uvira'),
      ('Haut-Katanga','Lubumbashi'),('Haut-Katanga','Likasi'),('Haut-Katanga','Kolwezi'),('Lualaba','Kolwezi'),('Kongo-Central','Matadi'),
      ('Kongo-Central','Boma'),('Équateur','Mbandaka'),('Tshopo','Kisangani'),('Kasaï-Central','Kananga'),('Kasaï-Oriental','Mbuji-Mayi')) THEN 1.2
    ELSE 1.0 END
$$;

CREATE OR REPLACE FUNCTION public._tax_penalties(_base numeric, _months int)
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN _months <= 0 OR _base <= 0 THEN 0 ELSE
    round(LEAST(_months * 2, 24) / 100.0 * _base, 2) + CASE WHEN _months > 3 THEN round(0.25 * _base, 2) ELSE 0 END END
$$;

CREATE OR REPLACE FUNCTION public._tax_fees(_tax numeric)
RETURNS numeric LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE _cfg jsonb; _f jsonb; _sum numeric := 0;
BEGIN
  SELECT config_value INTO _cfg FROM cadastral_contribution_config WHERE config_key = 'tax_payment_fees' AND is_active LIMIT 1;
  IF jsonb_typeof(_cfg) = 'array' THEN
    FOR _f IN SELECT * FROM jsonb_array_elements(_cfg) LOOP
      _sum := _sum + round(CASE WHEN _f->>'fee_type' = 'percentage'
        THEN COALESCE((_f->>'percentage')::numeric, 0) / 100 * _tax ELSE COALESCE((_f->>'amount_usd')::numeric, 0) END, 2);
    END LOOP;
  END IF;
  RETURN _sum;
END $$;

-- Barème foncier / IRL (property_tax_rates_config, repli identique à l'écran)
CREATE OR REPLACE FUNCTION public._tax_rate(_cat text, _zone text, _usage text, _ctype text)
RETURNS TABLE(base numeric, mult numeric, pct numeric) LANGUAGE plpgsql STABLE SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM property_tax_rates_config WHERE is_active) THEN
    RETURN QUERY SELECT r.base_amount_usd::numeric, r.area_multiplier::numeric, r.rate_percentage::numeric
      FROM property_tax_rates_config r WHERE r.is_active AND r.tax_category = _cat AND r.zone_type = _zone
      ORDER BY (r.usage_type = _usage) DESC,
               (CASE WHEN _cat = 'impot_foncier' THEN (r.construction_type IS NOT DISTINCT FROM _ctype) ELSE true END) DESC,
               (r.construction_type IS NULL) DESC, r.display_order LIMIT 1;
    RETURN;
  END IF;
  IF _cat = 'impot_revenu_locatif' THEN RETURN QUERY SELECT 0::numeric, 0::numeric, 22::numeric; RETURN; END IF;
  RETURN QUERY SELECT v.b::numeric, v.m::numeric, 0::numeric FROM (VALUES
    ('urban','residential','en_dur',5,0.05),('urban','residential','semi_dur',3,0.03),('urban','residential','en_paille',1,0.01),
    ('urban','residential',NULL,2,0.02),('urban','commercial','en_dur',10,0.10),('urban','commercial',NULL,5,0.05),
    ('rural','residential','en_dur',2,0.02),('rural','residential','semi_dur',1.5,0.015),('rural','residential','en_paille',0.5,0.005),
    ('rural','residential',NULL,1,0.01)) v(z,u,c,b,m)
  WHERE v.z = _zone ORDER BY (v.u = _usage) DESC, (v.c IS NOT DISTINCT FROM _ctype) DESC, (v.c IS NULL) DESC LIMIT 1;
END $$;

CREATE OR REPLACE FUNCTION public._compute_tax_declaration(_e jsonb, _province text, _ville text)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  _kind text := _e->>'declaration_kind';
  _year int := NULLIF(_e->>'tax_year','')::int;
  _zone text := CASE WHEN _e->>'zone_type' = 'rural' THEN 'rural' ELSE 'urban' END;
  _zm numeric := public._tax_zone_multiplier(_province, _ville, _zone);
  _area numeric := GREATEST(COALESCE(NULLIF(_e->>'area_sqm','')::numeric, 0), 0);
  _r record; _base numeric := 0; _pen numeric := 0; _fees numeric := 0; _exempt boolean := false;
  _ex jsonb := COALESCE(_e->'exemption_codes', '[]'::jsonb); _cy int := NULLIF(_e->>'construction_year','')::int;
  _income numeric := 0; _taxable numeric; _t jsonb; _start date; _end date; _months numeric;
  _rates jsonb; _rate numeric; _cond numeric; _floors int; _xr numeric := 2800; _cdf numeric;
BEGIN
  IF _year IS NULL OR _year < 2000 OR _year > extract(year FROM now())::int THEN
    RAISE EXCEPTION 'Exercice fiscal invalide';
  END IF;

  IF _kind = 'property_tax' THEN
    _exempt := _ex ?| ARRAY['edifice_public','edifice_religieux','zone_economique_speciale']
      OR (_ex ? 'construction_moins_5ans' AND _cy IS NOT NULL AND extract(year FROM now())::int - _cy < 5)
      OR (_ex ? 'surface_moins_50m2' AND _area > 0 AND _area < 50);
    SELECT * INTO _r FROM public._tax_rate('impot_foncier', _zone, _e->>'declared_usage', NULLIF(_e->>'construction_type',''));
    _base := CASE WHEN _exempt THEN 0 ELSE round((COALESCE(_r.base,0) + COALESCE(_r.mult,0) * _area) * _zm, 2) END;
    _pen := public._tax_penalties(_base, public._tax_months_late(_year, 3, 31));
    _fees := public._tax_fees(_base);
    RETURN _e || jsonb_build_object('tax_type','Impôt foncier annuel','base_tax_usd',_base,'penalty_amount_usd',_pen,
      'fees_usd',_fees,'is_exempt',_exempt,'amount_usd',round(_base+_pen+_fees,2),'payment_status','En attente');

  ELSIF _kind = 'irl' THEN
    FOR _t IN SELECT * FROM jsonb_array_elements(COALESCE(_e->'tenants','[]'::jsonb)) LOOP
      _start := GREATEST(COALESCE(NULLIF(_t->>'arrival','')::date, make_date(_year,1,1)), make_date(_year,1,1));
      _end := LEAST(COALESCE(NULLIF(_t->>'departure','')::date, make_date(_year,12,31)), make_date(_year,12,31));
      IF _start <= _end THEN
        _months := LEAST(12, round(((_end - _start)::numeric / 30.44) * 10) / 10);
        _income := _income + round(GREATEST(COALESCE((_t->>'monthlyRent')::numeric,0),0) * _months, 2);
      END IF;
    END LOOP;
    _taxable := CASE WHEN (_e->>'deduction_30_applied')::boolean THEN _income - round(_income * 0.30, 2) ELSE _income END;
    SELECT * INTO _r FROM public._tax_rate('impot_revenu_locatif', _zone, _e->>'usage_type', NULL);
    _base := round(COALESCE(_r.pct,0) / 100 * _taxable, 2);
    _pen := public._tax_penalties(_base, public._tax_months_late(_year, 2, 28));
    _fees := public._tax_fees(_base);
    RETURN _e || jsonb_build_object('tax_type','Impôt sur les revenus locatifs','annual_rental_income',round(_income,2),
      'taxable_rental_income',round(_taxable,2),'irl_amount_usd',_base,'penalty_amount_usd',_pen,'fees_usd',_fees,
      'amount_usd',round(_base+_pen+_fees,2),'payment_status','En attente');

  ELSIF _kind = 'building_tax' THEN
    SELECT config_value INTO _rates FROM cadastral_contribution_config WHERE config_key='building_tax_rates' AND is_active LIMIT 1;
    IF _rates IS NULL OR _rates->'urban' IS NULL OR _rates->'rural' IS NULL THEN
      _rates := '{"urban":{"en_dur":500,"semi_dur":300,"en_paille":100},"rural":{"en_dur":300,"semi_dur":150,"en_paille":50}}';
    END IF;
    SELECT COALESCE(NULLIF(config_value->>'rate','')::numeric, CASE WHEN jsonb_typeof(config_value)='number' THEN config_value::text::numeric END, 2800)
      INTO _xr FROM cadastral_contribution_config WHERE config_key='cdf_usd_exchange_rate' AND is_active LIMIT 1;
    _xr := COALESCE(NULLIF(_xr,0), 2800);
    _rate := COALESCE((_rates->_zone->>(_e->>'construction_type'))::numeric, 0);
    _cond := CASE _e->>'building_condition' WHEN 'moyen' THEN 0.75 WHEN 'mauvais' THEN 0.5 ELSE 1.0 END;
    _floors := GREATEST(COALESCE(NULLIF(_e->>'floors','')::int, 1), 1);
    _cdf := _area * _floors * _rate * _zm * _cond
      * CASE WHEN _cy IS NOT NULL AND extract(year FROM now())::int - _cy > 20 THEN 0.9 ELSE 1.0 END;
    _base := round(_cdf / _xr, 2);
    _pen := public._tax_penalties(_base, public._tax_months_late(_year, 6, 30));
    RETURN _e || jsonb_build_object('tax_type','Taxe de bâtisse','base_amount_cdf',round(_cdf,2),'base_tax_usd',_base,
      'total_surface',_area*_floors,'penalty_amount_usd',_pen,'amount_usd',round(_base+_pen,2),'payment_status','En attente');
  END IF;
  RETURN _e;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_tax_declaration_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _e jsonb; _out jsonb := '[]'::jsonb; _kind text; _ref text;
BEGIN
  IF NEW.contribution_type <> 'update' OR jsonb_typeof(NEW.tax_history) <> 'array'
     OR public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]) THEN
    RETURN NEW;
  END IF;
  FOR _e IN SELECT * FROM jsonb_array_elements(NEW.tax_history) LOOP
    _kind := _e->>'declaration_kind';
    IF _kind IS NULL THEN _out := _out || jsonb_build_array(_e); CONTINUE; END IF;
    IF _kind NOT IN ('property_tax','building_tax','irl','declared_payment') THEN
      RAISE EXCEPTION 'Type de déclaration fiscale inconnu';
    END IF;
    IF _kind = 'declared_payment' THEN
      IF _e->>'tax_type' NOT IN ('Impôt foncier annuel','Taxe de bâtisse','Impôt sur les revenus locatifs') THEN
        RAISE EXCEPTION 'Type de taxe invalide';
      END IF;
      IF COALESCE(NULLIF(_e->>'amount_usd','')::numeric, -1) <= 0 THEN RAISE EXCEPTION 'Montant invalide'; END IF;
    ELSE
      _e := public._compute_tax_declaration(_e, NEW.province, NEW.ville);
    END IF;
    _ref := COALESCE(_e->>'construction_ref', 'main');
    IF EXISTS (
      SELECT 1 FROM cadastral_contributions c, jsonb_array_elements(c.tax_history) h
      WHERE c.parcel_number = NEW.parcel_number AND c.user_id = NEW.user_id AND c.contribution_type = 'update'
        AND c.status NOT IN ('rejected','returned') AND jsonb_typeof(c.tax_history) = 'array'
        AND h->>'tax_type' = _e->>'tax_type' AND h->>'tax_year' = _e->>'tax_year'
        AND COALESCE(h->>'construction_ref','main') = _ref
    ) THEN
      RAISE EXCEPTION 'Une déclaration « % » pour l''exercice % existe déjà pour cette parcelle/bâtiment.', _e->>'tax_type', _e->>'tax_year'
        USING ERRCODE = '23505';
    END IF;
    _out := _out || jsonb_build_array(_e);
  END LOOP;
  NEW.tax_history := _out;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS aad_enforce_tax_declaration_insert ON public.cadastral_contributions;
CREATE TRIGGER aad_enforce_tax_declaration_insert BEFORE INSERT ON public.cadastral_contributions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_tax_declaration_insert();

CREATE OR REPLACE FUNCTION public.notify_tax_declaration_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _e jsonb;
BEGIN
  IF NEW.contribution_type = 'update' AND jsonb_typeof(NEW.tax_history) = 'array' THEN
    FOR _e IN SELECT * FROM jsonb_array_elements(NEW.tax_history) WHERE value ? 'declaration_kind' LOOP
      INSERT INTO notifications(user_id, title, message, type, action_url)
      VALUES (NEW.user_id,
        CASE WHEN _e->>'declaration_kind' = 'declared_payment' THEN 'Paiement de taxe enregistré' ELSE 'Déclaration fiscale soumise' END,
        format('%s — parcelle %s, exercice %s. Montant : %s USD.', _e->>'tax_type', NEW.parcel_number, _e->>'tax_year',
          to_char(COALESCE((_e->>'amount_usd')::numeric,0), 'FM999999990.00')),
        'info', '/mon-compte');
    END LOOP;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS zz_notify_tax_declaration_insert ON public.cadastral_contributions;
CREATE TRIGGER zz_notify_tax_declaration_insert AFTER INSERT ON public.cadastral_contributions
  FOR EACH ROW EXECUTE FUNCTION public.notify_tax_declaration_insert();

REVOKE ALL ON FUNCTION public._tax_months_late(int,int,int), public._tax_zone_multiplier(text,text,text),
  public._tax_penalties(numeric,int), public._tax_fees(numeric), public._tax_rate(text,text,text,text),
  public._compute_tax_declaration(jsonb,text,text), public.enforce_tax_declaration_insert(),
  public.notify_tax_declaration_insert() FROM PUBLIC, anon, authenticated;