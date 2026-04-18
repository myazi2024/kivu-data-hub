
-- 1. Add source_form_type to cadastral_contributions
ALTER TABLE public.cadastral_contributions
  ADD COLUMN IF NOT EXISTS source_form_type text 
  CHECK (source_form_type IN ('ccc', 'tax', 'mortgage', 'permit', 'dispute_report', 'subdivision', 'unknown'));

COMMENT ON COLUMN public.cadastral_contributions.source_form_type IS 'Type de formulaire d''origine pour pouvoir rouvrir l''édition avec le bon dialog';

-- 2. RPC: get_user_dashboard_stats — single call instead of 4+ count queries
CREATE OR REPLACE FUNCTION public.get_user_dashboard_stats(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Only allow user to query their own stats (or admin)
  IF auth.uid() IS NULL OR (auth.uid() <> target_user_id AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT jsonb_build_object(
    'contributions_total', (SELECT count(*) FROM cadastral_contributions WHERE user_id = target_user_id),
    'contributions_pending', (SELECT count(*) FROM cadastral_contributions WHERE user_id = target_user_id AND status IN ('pending','returned')),
    'contributions_approved', (SELECT count(*) FROM cadastral_contributions WHERE user_id = target_user_id AND status = 'approved'),
    'contributions_rejected', (SELECT count(*) FROM cadastral_contributions WHERE user_id = target_user_id AND status = 'rejected'),
    'titles_total', (SELECT count(*) FROM land_title_requests WHERE user_id = target_user_id),
    'titles_pending', (SELECT count(*) FROM land_title_requests WHERE user_id = target_user_id AND status = 'pending'),
    'invoices_total', (SELECT count(*) FROM cadastral_invoices WHERE user_id = target_user_id),
    'invoices_pending', (SELECT count(*) FROM cadastral_invoices WHERE user_id = target_user_id AND status = 'pending'),
    'disputes_total', (SELECT count(*) FROM cadastral_land_disputes WHERE reported_by = target_user_id),
    'disputes_active', (SELECT count(*) FROM cadastral_land_disputes WHERE reported_by = target_user_id AND current_status NOT IN ('resolved','closed','rejected')),
    'permits_total', (SELECT count(*) FROM cadastral_contributions WHERE user_id = target_user_id AND (contribution_type = 'permit_request' OR (building_permits IS NOT NULL AND jsonb_array_length(COALESCE(building_permits, '[]'::jsonb)) > 0))),
    'permits_pending', (SELECT count(*) FROM cadastral_contributions WHERE user_id = target_user_id AND (contribution_type = 'permit_request' OR (building_permits IS NOT NULL AND jsonb_array_length(COALESCE(building_permits, '[]'::jsonb)) > 0)) AND status = 'pending')
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_dashboard_stats(uuid) TO authenticated;

-- 3. RPC: request_account_deletion — secure RGPD-compliant soft delete
CREATE OR REPLACE FUNCTION public.request_account_deletion(confirmation_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify confirmation matches user's actual email
  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  
  IF v_email IS NULL OR lower(trim(v_email)) <> lower(trim(confirmation_email)) THEN
    RAISE EXCEPTION 'Email confirmation does not match';
  END IF;

  -- Mark profile as deleted and anonymize PII
  UPDATE public.profiles
  SET 
    deleted_at = now(),
    full_name = 'Compte supprimé',
    organization = NULL,
    avatar_url = NULL,
    updated_at = now()
  WHERE user_id = v_user_id;

  -- Audit log
  INSERT INTO public.audit_logs (action, user_id, table_name, record_id, new_values)
  VALUES (
    'account.deletion_requested',
    v_user_id,
    'profiles',
    v_user_id::text,
    jsonb_build_object('deleted_at', now(), 'email', v_email)
  );

  RETURN jsonb_build_object('success', true, 'deleted_at', now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_account_deletion(text) TO authenticated;
