ALTER TABLE public.partner_inquiries ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE INDEX IF NOT EXISTS partner_inquiries_user_idx ON public.partner_inquiries(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.partner_inquiry_set_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.user_id := auth.uid();
  NEW.status := 'pending';
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_partner_inquiry_set_user ON public.partner_inquiries;
CREATE TRIGGER trg_partner_inquiry_set_user BEFORE INSERT ON public.partner_inquiries
FOR EACH ROW EXECUTE FUNCTION public.partner_inquiry_set_user();

DROP POLICY IF EXISTS "Users read own partner inquiries" ON public.partner_inquiries;
CREATE POLICY "Users read own partner inquiries" ON public.partner_inquiries
FOR SELECT TO authenticated USING (user_id = auth.uid());
GRANT SELECT ON public.partner_inquiries TO authenticated;

CREATE OR REPLACE FUNCTION public.partner_inquiry_notify_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_label text;
BEGIN
  IF NEW.user_id IS NULL OR NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  v_label := CASE NEW.status
    WHEN 'in_review' THEN 'est en cours d''examen'
    WHEN 'approved' THEN 'a été acceptée'
    WHEN 'completed' THEN 'a été acceptée'
    WHEN 'rejected' THEN 'n''a pas été retenue'
    ELSE 'a été mise à jour' END;
  PERFORM public._notify(NEW.user_id, 'Demande de partenariat',
    'Votre demande de partenariat ' || v_label || '.', 'info',
    '/mon-compte?tab=partnership', 'partner_inquiry:' || NEW.id || ':' || NEW.status);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_partner_inquiry_notify ON public.partner_inquiries;
CREATE TRIGGER trg_partner_inquiry_notify AFTER UPDATE OF status ON public.partner_inquiries
FOR EACH ROW EXECUTE FUNCTION public.partner_inquiry_notify_status();

CREATE OR REPLACE FUNCTION public.notify_expiring_analytics_access()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n integer := 0;
BEGIN
  FOR r IN
    SELECT user_id, count(*) c, min(expires_at) e
    FROM public.analytics_visual_access
    WHERE expires_at > now() AND expires_at <= now() + interval '7 days'
    GROUP BY user_id
  LOOP
    PERFORM public._notify(r.user_id, 'Accès Données foncières bientôt expirés',
      r.c || ' visuel(s) expirent d''ici le ' || to_char(r.e, 'DD/MM/YYYY') || '. Renouvelez-les depuis votre espace.',
      'warning', '/mon-compte?tab=land-data-access',
      'analytics_access:' || r.user_id || ':expiring:' || to_char(r.e, 'YYYY-MM-DD'));
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.notify_expiring_analytics_access() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.partner_inquiry_notify_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.partner_inquiry_set_user() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule('notify-expiring-analytics-access') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='notify-expiring-analytics-access');
SELECT cron.schedule('notify-expiring-analytics-access', '0 8 * * *', 'SELECT public.notify_expiring_analytics_access()');