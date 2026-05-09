-- 1. Columns
ALTER TABLE public.subdivision_requests
  ADD COLUMN IF NOT EXISTS official_plan_path text,
  ADD COLUMN IF NOT EXISTS official_plan_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS official_plan_version integer NOT NULL DEFAULT 0;

-- 2. Private bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('subdivision-plans', 'subdivision-plans', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies
DROP POLICY IF EXISTS "Owner can read own subdivision plan" ON storage.objects;
CREATE POLICY "Owner can read own subdivision plan"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'subdivision-plans'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Owner can insert own subdivision plan" ON storage.objects;
CREATE POLICY "Owner can insert own subdivision plan"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'subdivision-plans'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Admins manage subdivision plans" ON storage.objects;
CREATE POLICY "Admins manage subdivision plans"
ON storage.objects FOR ALL
USING (
  bucket_id = 'subdivision-plans'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
)
WITH CHECK (
  bucket_id = 'subdivision-plans'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
);

-- 4. RPC: signed URL for owner or admin
CREATE OR REPLACE FUNCTION public.get_signed_subdivision_plan(p_request_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_path text;
  v_signed jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT user_id, official_plan_path
    INTO v_user_id, v_path
  FROM public.subdivision_requests
  WHERE id = p_request_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF v_path IS NULL THEN
    RAISE EXCEPTION 'PLAN_NOT_GENERATED';
  END IF;

  IF auth.uid() <> v_user_id
     AND NOT public.has_role(auth.uid(), 'admin'::app_role)
     AND NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT storage.create_signed_url('subdivision-plans', v_path, 3600) INTO v_signed;
  RETURN v_signed->>'signedURL';
END;
$$;

REVOKE ALL ON FUNCTION public.get_signed_subdivision_plan(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_signed_subdivision_plan(uuid) TO authenticated;