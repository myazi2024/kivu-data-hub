
ALTER TABLE public.subdivision_requests
  ADD COLUMN IF NOT EXISTS requester_entity_subtype_other text,
  ADD COLUMN IF NOT EXISTS parent_parcel_title_type text,
  ADD COLUMN IF NOT EXISTS parent_parcel_title_issue_date date,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subdivision_requests_status_check'
  ) THEN
    ALTER TABLE public.subdivision_requests
      ADD CONSTRAINT subdivision_requests_status_check
      CHECK (status IN ('pending','in_review','awaiting_payment','approved','rejected','returned','cancelled'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_subdivision_requests_user_status_created
  ON public.subdivision_requests (user_id, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subdivision_requests_idempotency
  ON public.subdivision_requests (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.can_subdivide_parcel(p_parcel_number text, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cadastral_contributions
    WHERE parcel_number = p_parcel_number
      AND user_id = p_user_id
      AND status = 'approved'
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_subdivide_parcel(text, uuid) TO authenticated;
