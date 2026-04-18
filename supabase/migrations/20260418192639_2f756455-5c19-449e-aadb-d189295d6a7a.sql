-- 1) Trigger dupliqué
DROP TRIGGER IF EXISTS create_parcel_on_approval_trigger ON public.cadastral_contributions;

-- 2) Purge codes orphelins
DELETE FROM public.cadastral_contributor_codes c
WHERE NOT EXISTS (
  SELECT 1 FROM public.cadastral_contributions ct
  WHERE ct.id = c.contribution_id AND ct.status = 'approved'
)
OR EXISTS (
  SELECT 1 FROM public.cadastral_contributions ct
  WHERE ct.id = c.contribution_id AND ct.parcel_number ILIKE 'TEST-%'
);

-- 3) Purge contributions TEST
DELETE FROM public.cadastral_contributions WHERE parcel_number ILIKE 'TEST-%';

-- 4) Trigger motif rejet obligatoire
CREATE OR REPLACE FUNCTION public.enforce_rejection_reason()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'rejected'
     AND (NEW.rejection_reason IS NULL OR length(trim(NEW.rejection_reason)) = 0) THEN
    RAISE EXCEPTION 'Un motif de rejet est obligatoire lorsque le statut est "rejected"';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_rejection_reason_trigger ON public.cadastral_contributions;
CREATE TRIGGER enforce_rejection_reason_trigger
BEFORE INSERT OR UPDATE ON public.cadastral_contributions
FOR EACH ROW EXECUTE FUNCTION public.enforce_rejection_reason();

-- 5) Expiration codes CCC
CREATE OR REPLACE FUNCTION public.expire_outdated_ccc_codes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count INTEGER;
BEGIN
  WITH updated AS (
    UPDATE public.cadastral_contributor_codes
    SET is_valid = false,
        invalidated_at = NOW(),
        invalidation_reason = COALESCE(invalidation_reason, 'Expiration automatique (90 jours)')
    WHERE expires_at < NOW() AND is_valid = true AND is_used = false
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM updated;
  RETURN v_count;
END;
$$;

-- 6) Cron quotidien
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-ccc-codes-daily') THEN
    PERFORM cron.unschedule('expire-ccc-codes-daily');
  END IF;
  PERFORM cron.schedule(
    'expire-ccc-codes-daily',
    '0 3 * * *',
    $cron$ SELECT public.expire_outdated_ccc_codes(); $cron$
  );
END $$;

-- 7) Audit log
CREATE TABLE IF NOT EXISTS public.cadastral_contribution_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contribution_id UUID NOT NULL,
  admin_id UUID,
  admin_name TEXT,
  action TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contrib_audit_contribution
  ON public.cadastral_contribution_audit(contribution_id);
CREATE INDEX IF NOT EXISTS idx_contrib_audit_created
  ON public.cadastral_contribution_audit(created_at DESC);

ALTER TABLE public.cadastral_contribution_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view contribution audit" ON public.cadastral_contribution_audit;
CREATE POLICY "Admins can view contribution audit"
ON public.cadastral_contribution_audit FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Admins can insert contribution audit" ON public.cadastral_contribution_audit;
CREATE POLICY "Admins can insert contribution audit"
ON public.cadastral_contribution_audit FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 8) Vue codes orphelins
CREATE OR REPLACE VIEW public.cadastral_orphan_codes AS
SELECT c.*
FROM public.cadastral_contributor_codes c
LEFT JOIN public.cadastral_contributions ct ON ct.id = c.contribution_id
WHERE ct.id IS NULL OR ct.status <> 'approved';

-- 9) Run expiration
SELECT public.expire_outdated_ccc_codes();