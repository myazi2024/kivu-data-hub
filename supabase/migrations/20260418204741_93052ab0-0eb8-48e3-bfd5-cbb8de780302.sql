DROP FUNCTION IF EXISTS public.escalate_stale_disputes(int);

CREATE OR REPLACE FUNCTION public.escalate_stale_disputes(_threshold_days int DEFAULT 30)
RETURNS TABLE(escalated_count int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count int;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Accès non autorisé';
  END IF;

  UPDATE cadastral_land_disputes
  SET escalated = true,
      escalated_at = COALESCE(escalated_at, now()),
      updated_at = now()
  WHERE escalated = false
    AND current_status NOT IN ('closed', 'lifted', 'resolu', 'leve')
    AND created_at < now() - (_threshold_days || ' days')::interval;

  GET DIAGNOSTICS _count = ROW_COUNT;

  RETURN QUERY SELECT _count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.escalate_stale_disputes(int) TO authenticated;