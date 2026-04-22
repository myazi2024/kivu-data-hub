
ALTER TABLE public.subdivision_requests
  ADD COLUMN IF NOT EXISTS assigned_to UUID,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS in_review_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estimated_processing_days INTEGER NOT NULL DEFAULT 14;

CREATE INDEX IF NOT EXISTS idx_subdivision_requests_assigned_to ON public.subdivision_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_subdivision_requests_status ON public.subdivision_requests(status);

-- Audit log dédié des décisions admin
CREATE TABLE IF NOT EXISTS public.subdivision_admin_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.subdivision_requests(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  reason TEXT,
  admin_id UUID,
  admin_name TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subdivision_admin_actions_request ON public.subdivision_admin_actions(request_id);
CREATE INDEX IF NOT EXISTS idx_subdivision_admin_actions_created ON public.subdivision_admin_actions(created_at DESC);

ALTER TABLE public.subdivision_admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view subdivision admin actions"
ON public.subdivision_admin_actions FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins insert subdivision admin actions"
ON public.subdivision_admin_actions FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger : log auto des changements de statut
CREATE OR REPLACE FUNCTION public.log_subdivision_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_name TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND COALESCE(NEW.status,'') IS DISTINCT FROM COALESCE(OLD.status,'') THEN
    SELECT COALESCE(raw_user_meta_data->>'full_name', email)
      INTO v_admin_name FROM auth.users WHERE id = auth.uid();

    INSERT INTO public.subdivision_admin_actions
      (request_id, action, previous_status, new_status, reason, admin_id, admin_name)
    VALUES (
      NEW.id,
      'status_change',
      OLD.status,
      NEW.status,
      COALESCE(NEW.rejection_reason, NEW.processing_notes),
      auth.uid(),
      v_admin_name
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_subdivision_status_change ON public.subdivision_requests;
CREATE TRIGGER trg_log_subdivision_status_change
AFTER UPDATE ON public.subdivision_requests
FOR EACH ROW EXECUTE FUNCTION public.log_subdivision_status_change();
