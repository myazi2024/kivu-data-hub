CREATE TABLE public.analytics_visual_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tab_key text NOT NULL,
  item_key text NOT NULL,
  price_usd numeric(10,2) NOT NULL DEFAULT 0 CHECK (price_usd >= 0),
  access_days integer CHECK (access_days IS NULL OR access_days BETWEEN 1 AND 3650),
  is_active boolean NOT NULL DEFAULT false,
  description text CHECK (description IS NULL OR length(description) <= 300),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tab_key, item_key)
);
GRANT SELECT ON public.analytics_visual_catalog TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.analytics_visual_catalog TO authenticated;
GRANT ALL ON public.analytics_visual_catalog TO service_role;
ALTER TABLE public.analytics_visual_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "catalog read" ON public.analytics_visual_catalog FOR SELECT TO authenticated
  USING (is_active OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "catalog admin write" ON public.analytics_visual_catalog FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.analytics_catalog_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  default_access_days integer NOT NULL DEFAULT 30 CHECK (default_access_days BETWEEN 1 AND 3650),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.analytics_catalog_settings (id) VALUES (true);
GRANT SELECT, UPDATE ON public.analytics_catalog_settings TO authenticated;
GRANT ALL ON public.analytics_catalog_settings TO service_role;
ALTER TABLE public.analytics_catalog_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings read" ON public.analytics_catalog_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings admin update" ON public.analytics_catalog_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.analytics_visual_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  items jsonb NOT NULL,
  total_amount_usd numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.analytics_visual_invoices (user_id, created_at DESC);
GRANT SELECT ON public.analytics_visual_invoices TO authenticated;
GRANT ALL ON public.analytics_visual_invoices TO service_role;
ALTER TABLE public.analytics_visual_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoice own or admin" ON public.analytics_visual_invoices FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.analytics_visual_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tab_key text NOT NULL,
  item_key text NOT NULL,
  expires_at timestamptz NOT NULL,
  invoice_id uuid NOT NULL REFERENCES public.analytics_visual_invoices(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invoice_id, tab_key, item_key)
);
CREATE INDEX ON public.analytics_visual_access (user_id, expires_at);
GRANT SELECT ON public.analytics_visual_access TO authenticated;
GRANT ALL ON public.analytics_visual_access TO service_role;
ALTER TABLE public.analytics_visual_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "access own or admin" ON public.analytics_visual_access FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- Création de facture : prix et durée calculés par le serveur
CREATE OR REPLACE FUNCTION public.create_analytics_visual_invoice(p_items jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_items jsonb := '[]'::jsonb;
  v_total numeric := 0;
  v_default int;
  v_id uuid;
  r record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 200 THEN
    RAISE EXCEPTION 'Sélection invalide';
  END IF;
  SELECT default_access_days INTO v_default FROM analytics_catalog_settings LIMIT 1;
  FOR r IN
    SELECT DISTINCT c.tab_key, c.item_key, c.price_usd, COALESCE(c.access_days, v_default, 30) AS days
    FROM jsonb_to_recordset(p_items) AS x(tab_key text, item_key text)
    JOIN analytics_visual_catalog c ON c.tab_key = x.tab_key AND c.item_key = x.item_key
    WHERE c.is_active AND c.price_usd > 0
      AND NOT EXISTS (SELECT 1 FROM analytics_visual_access a WHERE a.user_id = v_uid
        AND a.tab_key = c.tab_key AND a.item_key = c.item_key AND a.expires_at > now())
  LOOP
    v_items := v_items || jsonb_build_object('tab_key', r.tab_key, 'item_key', r.item_key, 'price_usd', r.price_usd, 'access_days', r.days);
    v_total := v_total + r.price_usd;
  END LOOP;
  IF jsonb_array_length(v_items) = 0 THEN RAISE EXCEPTION 'Aucun visuel disponible à l''achat dans cette sélection'; END IF;
  -- Réutilise une facture en attente identique
  SELECT id INTO v_id FROM analytics_visual_invoices
   WHERE user_id = v_uid AND status = 'pending' AND items = v_items AND created_at > now() - interval '1 day' LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO analytics_visual_invoices (user_id, items, total_amount_usd) VALUES (v_uid, v_items, v_total) RETURNING id INTO v_id;
  END IF;
  RETURN jsonb_build_object('invoice_id', v_id, 'total_amount_usd', v_total, 'items', v_items);
END $$;
REVOKE ALL ON FUNCTION public.create_analytics_visual_invoice(jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_analytics_visual_invoice(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_analytics_access()
RETURNS TABLE(tab_key text, item_key text, expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.tab_key, a.item_key, max(a.expires_at) FROM analytics_visual_access a
  WHERE a.user_id = auth.uid() AND a.expires_at > now() GROUP BY a.tab_key, a.item_key
$$;
REVOKE ALL ON FUNCTION public.get_my_analytics_access() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_analytics_access() TO authenticated;

-- Accès accordé uniquement quand la transaction est confirmée
CREATE OR REPLACE FUNCTION public.grant_analytics_access_on_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv record; it jsonb;
BEGIN
  IF NEW.status <> 'completed' OR NEW.invoice_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN RETURN NEW; END IF;
  SELECT * INTO inv FROM analytics_visual_invoices WHERE id = NEW.invoice_id FOR UPDATE;
  IF NOT FOUND OR inv.status <> 'pending' OR inv.user_id <> NEW.user_id THEN RETURN NEW; END IF;
  FOR it IN SELECT * FROM jsonb_array_elements(inv.items) LOOP
    INSERT INTO analytics_visual_access (user_id, tab_key, item_key, expires_at, invoice_id)
    VALUES (inv.user_id, it->>'tab_key', it->>'item_key', now() + make_interval(days => (it->>'access_days')::int), inv.id)
    ON CONFLICT DO NOTHING;
  END LOOP;
  UPDATE analytics_visual_invoices SET status = 'paid', paid_at = now() WHERE id = inv.id;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.grant_analytics_access_on_payment() FROM public, anon, authenticated;
CREATE TRIGGER trg_grant_analytics_access AFTER INSERT OR UPDATE OF status ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.grant_analytics_access_on_payment();