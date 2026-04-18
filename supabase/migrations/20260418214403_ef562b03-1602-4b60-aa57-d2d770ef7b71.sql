
ALTER TABLE public.hr_leave_requests ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE OR REPLACE FUNCTION public.auto_decrement_leave_balance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_days numeric; v_year integer;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    v_days := COALESCE(NEW.days_count, GREATEST(1, (NEW.end_date - NEW.start_date) + 1));
    v_year := EXTRACT(YEAR FROM NEW.start_date)::int;
    INSERT INTO public.hr_leave_balances (employee_id, leave_type, year, days_entitled, days_used, days_remaining)
    VALUES (NEW.employee_id, NEW.leave_type, v_year, 30, v_days, 30 - v_days)
    ON CONFLICT (employee_id, leave_type, year) DO UPDATE SET
      days_used = hr_leave_balances.days_used + v_days,
      days_remaining = hr_leave_balances.days_entitled - (hr_leave_balances.days_used + v_days),
      updated_at = now();
  END IF;
  RETURN NEW;
END; $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hr_leave_balances_emp_type_year_uniq') THEN
    ALTER TABLE public.hr_leave_balances ADD CONSTRAINT hr_leave_balances_emp_type_year_uniq UNIQUE (employee_id, leave_type, year);
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_auto_decrement_leave_balance ON public.hr_leave_requests;
CREATE TRIGGER trg_auto_decrement_leave_balance AFTER UPDATE ON public.hr_leave_requests
FOR EACH ROW EXECUTE FUNCTION public.auto_decrement_leave_balance();

CREATE TABLE IF NOT EXISTS public.system_alerts_state (
  alert_key text PRIMARY KEY,
  last_fired_at timestamptz NOT NULL DEFAULT now(),
  fire_count integer NOT NULL DEFAULT 1,
  last_payload jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_alerts_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins read alerts state" ON public.system_alerts_state;
CREATE POLICY "admins read alerts state" ON public.system_alerts_state FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
  ('health_db_threshold_ms', '500'::jsonb, 'Latence DB max (ms) avant degraded'),
  ('health_edge_threshold_ms', '1000'::jsonb, 'Latence edge function max (ms) avant degraded')
ON CONFLICT (setting_key) DO NOTHING;
