CREATE OR REPLACE FUNCTION public.create_analytics_visual_invoice(p_items jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid(); v_items jsonb := '[]'::jsonb; v_total numeric := 0; v_default int; v_id uuid; r record;
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
      AND EXISTS (SELECT 1 FROM analytics_charts_config a WHERE a.tab_key = c.tab_key AND a.item_key = c.item_key AND a.is_visible)
      AND NOT EXISTS (SELECT 1 FROM analytics_visual_access a WHERE a.user_id = v_uid
        AND a.tab_key = c.tab_key AND a.item_key = c.item_key AND a.expires_at > now())
  LOOP
    v_items := v_items || jsonb_build_object('tab_key', r.tab_key, 'item_key', r.item_key, 'price_usd', r.price_usd, 'access_days', r.days);
    v_total := v_total + r.price_usd;
  END LOOP;
  IF jsonb_array_length(v_items) = 0 THEN RAISE EXCEPTION 'Aucun visuel disponible à l''achat dans cette sélection'; END IF;
  SELECT id INTO v_id FROM analytics_visual_invoices
   WHERE user_id = v_uid AND status = 'pending' AND items = v_items AND created_at > now() - interval '1 day' LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO analytics_visual_invoices (user_id, items, total_amount_usd) VALUES (v_uid, v_items, v_total) RETURNING id INTO v_id;
  END IF;
  RETURN jsonb_build_object('invoice_id', v_id, 'total_amount_usd', v_total, 'items', v_items);
END $function$;