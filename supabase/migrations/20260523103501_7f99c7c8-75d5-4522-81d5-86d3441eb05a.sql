-- P3: Lifecycle & versioning - extend subdivision_plan_versions
ALTER TABLE public.subdivision_plan_versions
  ADD COLUMN IF NOT EXISTS official_version integer,
  ADD COLUMN IF NOT EXISTS pdf_path text,
  ADD COLUMN IF NOT EXISTS config_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS verification_code text,
  ADD COLUMN IF NOT EXISTS is_current boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_subdivision_plan_versions_request_current
  ON public.subdivision_plan_versions (subdivision_request_id) WHERE is_current = true;

-- Helper: mark only the latest official_version as current per request
CREATE OR REPLACE FUNCTION public.subdivision_plan_versions_set_current()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE public.subdivision_plan_versions
       SET is_current = false
     WHERE subdivision_request_id = NEW.subdivision_request_id
       AND id <> NEW.id
       AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subdivision_plan_versions_set_current ON public.subdivision_plan_versions;
CREATE TRIGGER trg_subdivision_plan_versions_set_current
  AFTER INSERT OR UPDATE OF is_current ON public.subdivision_plan_versions
  FOR EACH ROW EXECUTE FUNCTION public.subdivision_plan_versions_set_current();