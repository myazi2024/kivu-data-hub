CREATE OR REPLACE FUNCTION public.bulk_update_parcel_actions(_actions jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_action jsonb;
  v_updated int := 0;
BEGIN
  IF NOT has_any_role(auth.uid(), ARRAY['admin'::app_role,'super_admin'::app_role]) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  FOR v_action IN SELECT * FROM jsonb_array_elements(_actions) LOOP
    UPDATE public.parcel_actions_config SET
      label = COALESCE(v_action->>'label', label),
      description = COALESCE(v_action->>'description', description),
      detailed_description = CASE WHEN v_action ? 'detailed_description' THEN v_action->>'detailed_description' ELSE detailed_description END,
      is_active = COALESCE((v_action->>'is_active')::boolean, is_active),
      is_visible = COALESCE((v_action->>'is_visible')::boolean, is_visible),
      display_order = COALESCE((v_action->>'display_order')::int, display_order),
      badge_type = COALESCE(v_action->>'badge_type', badge_type),
      badge_label = COALESCE(v_action->>'badge_label', badge_label),
      badge_color = COALESCE(v_action->>'badge_color', badge_color),
      requires_auth = COALESCE((v_action->>'requires_auth')::boolean, requires_auth),
      category = COALESCE(v_action->>'category', category),
      updated_at = now()
    WHERE id = (v_action->>'id')::uuid;
    v_updated := v_updated + 1;
  END LOOP;

  RETURN jsonb_build_object('updated', v_updated);
END;
$function$;