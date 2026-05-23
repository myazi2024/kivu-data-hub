CREATE OR REPLACE FUNCTION public.approve_subdivision_atomic(
  _request_id uuid,
  _admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req RECORD;
  v_remaining numeric;
  v_lots_count integer;
  v_roads_count integer;
  v_lot jsonb;
  v_road jsonb;
  v_bb jsonb;
  v_min_lat numeric; v_max_lat numeric; v_min_lng numeric; v_max_lng numeric;
  v_gps jsonb;
  v_plan jsonb;
  v_roads jsonb;
  v_parent_gps jsonb;
BEGIN
  -- Garde admin SEULEMENT si _admin_id fourni (cas appel direct admin).
  -- Si NULL : l'edge function (service_role) a déjà validé l'accès (webhook paiement).
  IF _admin_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _admin_id AND role IN ('admin','super_admin')
  ) THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;

  SELECT * INTO v_req FROM public.subdivision_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subdivision request not found'; END IF;

  v_remaining := COALESCE(v_req.remaining_fee_usd, 0);
  IF v_remaining > 0 AND v_req.status NOT IN ('awaiting_payment','approved') THEN
    RAISE EXCEPTION 'Outstanding fees (% USD) must be paid before approval', v_remaining;
  END IF;

  IF v_req.status <> 'approved' THEN
    UPDATE public.subdivision_requests
       SET status = 'approved',
           approved_at = COALESCE(approved_at, now()),
           reviewed_by = COALESCE(reviewed_by, _admin_id),
           reviewed_at = COALESCE(reviewed_at, now())
     WHERE id = _request_id;
  END IF;

  v_parent_gps := COALESCE(v_req.parent_parcel_gps_coordinates, '[]'::jsonb);
  IF jsonb_typeof(v_parent_gps) = 'array' AND jsonb_array_length(v_parent_gps) >= 3 THEN
    SELECT MIN((c->>'lat')::numeric), MAX((c->>'lat')::numeric),
           MIN((c->>'lng')::numeric), MAX((c->>'lng')::numeric)
      INTO v_min_lat, v_max_lat, v_min_lng, v_max_lng
      FROM jsonb_array_elements(v_parent_gps) c
     WHERE (c ? 'lat') AND (c ? 'lng');
    v_bb := jsonb_build_object('minLat', v_min_lat, 'maxLat', v_max_lat,
                                'minLng', v_min_lng, 'maxLng', v_max_lng);
  END IF;

  FOR v_lot IN SELECT * FROM jsonb_array_elements(COALESCE(v_req.lots_data, '[]'::jsonb))
  LOOP
    v_gps := NULL;
    IF v_bb IS NOT NULL AND (v_lot ? 'vertices') THEN
      SELECT jsonb_agg(jsonb_build_object(
               'lat', (v_min_lat + ((v->>'y')::numeric) * (v_max_lat - v_min_lat)),
               'lng', (v_min_lng + ((v->>'x')::numeric) * (v_max_lng - v_min_lng))))
        INTO v_gps
        FROM jsonb_array_elements(v_lot->'vertices') v;
    END IF;

    INSERT INTO public.subdivision_lots (
      subdivision_request_id, parcel_number, lot_number, lot_label,
      area_sqm, perimeter_m, intended_use, owner_name, is_built, has_fence,
      gps_coordinates, plan_coordinates, color
    )
    VALUES (
      v_req.id,
      v_req.parcel_number,
      COALESCE(v_lot->>'lotNumber', v_lot->>'id'),
      'Lot ' || COALESCE(v_lot->>'lotNumber', ''),
      COALESCE((v_lot->>'areaSqm')::numeric, 0),
      COALESCE((v_lot->>'perimeterM')::numeric, 0),
      COALESCE(v_lot->>'intendedUse', 'residential'),
      v_lot->>'ownerName',
      COALESCE((v_lot->>'isBuilt')::boolean, false),
      COALESCE((v_lot->>'hasFence')::boolean, false),
      v_gps,
      v_lot->'vertices',
      COALESCE(v_lot->>'color', '#22c55e')
    )
    ON CONFLICT (subdivision_request_id, lot_number) DO NOTHING;
  END LOOP;

  SELECT COUNT(*) INTO v_roads_count FROM public.subdivision_roads WHERE subdivision_request_id = v_req.id;
  IF v_roads_count = 0 THEN
    v_plan := COALESCE(v_req.subdivision_plan_data, '{}'::jsonb);
    v_roads := COALESCE(v_plan->'roads', '[]'::jsonb);
    FOR v_road IN SELECT * FROM jsonb_array_elements(v_roads)
    LOOP
      v_gps := NULL;
      IF v_bb IS NOT NULL AND (v_road ? 'path') THEN
        SELECT jsonb_agg(jsonb_build_object(
                 'lat', (v_min_lat + ((v->>'y')::numeric) * (v_max_lat - v_min_lat)),
                 'lng', (v_min_lng + ((v->>'x')::numeric) * (v_max_lng - v_min_lng))))
          INTO v_gps
          FROM jsonb_array_elements(v_road->'path') v;
      END IF;

      INSERT INTO public.subdivision_roads (
        subdivision_request_id, road_name, width_m, surface_type,
        is_existing, plan_coordinates, gps_coordinates
      )
      VALUES (
        v_req.id,
        v_road->>'name',
        NULLIF(v_road->>'widthM','')::numeric,
        v_road->>'surfaceType',
        COALESCE((v_road->>'isExisting')::boolean, false),
        v_road->'path',
        v_gps
      );
    END LOOP;
  END IF;

  UPDATE public.cadastral_parcels SET is_subdivided = true WHERE parcel_number = v_req.parcel_number;

  SELECT COUNT(*) INTO v_lots_count FROM public.subdivision_lots WHERE subdivision_request_id = v_req.id;
  SELECT COUNT(*) INTO v_roads_count FROM public.subdivision_roads WHERE subdivision_request_id = v_req.id;

  RETURN jsonb_build_object(
    'ok', true, 'request_id', v_req.id, 'status', 'approved',
    'lots_total', v_lots_count, 'roads_total', v_roads_count
  );
END;
$$;
