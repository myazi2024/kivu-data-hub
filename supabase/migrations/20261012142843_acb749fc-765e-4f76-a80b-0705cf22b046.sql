
UPDATE public.notifications SET is_read = false WHERE is_read IS NULL;
UPDATE public.notifications SET type = 'info' WHERE type NOT IN ('info','success','warning','error','account','system_alert');
UPDATE public.notifications SET action_url = NULL WHERE action_url IS NOT NULL AND action_url !~ '^/[^/]';
ALTER TABLE public.notifications ALTER COLUMN is_read SET DEFAULT false, ALTER COLUMN is_read SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(), ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS dedupe_key text;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_action_url_internal;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_len_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('info','success','warning','error','account','system_alert'));
ALTER TABLE public.notifications ADD CONSTRAINT notifications_action_url_internal CHECK (action_url IS NULL OR (action_url ~ '^/[^/\\]' AND length(action_url) <= 500));
ALTER TABLE public.notifications ADD CONSTRAINT notifications_len_check CHECK (length(title) BETWEEN 1 AND 200 AND length(message) BETWEEN 1 AND 2000);
CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_dedupe_uidx ON public.notifications(user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
DROP INDEX IF EXISTS public.idx_notifications_user_id;

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins or self can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
REVOKE INSERT ON public.notifications FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.notifications_guard_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'super_admin'::app_role]) THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.message IS DISTINCT FROM OLD.message OR NEW.type IS DISTINCT FROM OLD.type
       OR NEW.action_url IS DISTINCT FROM OLD.action_url OR NEW.created_at IS DISTINCT FROM OLD.created_at
       OR NEW.dedupe_key IS DISTINCT FROM OLD.dedupe_key THEN
      RAISE EXCEPTION 'Seul l''état de lecture d''une notification peut être modifié';
    END IF;
  END IF;
  IF NEW.is_read AND NOT OLD.is_read AND NEW.read_at IS NULL THEN NEW.read_at := now(); END IF;
  IF NOT NEW.is_read THEN NEW.read_at := NULL; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notifications_guard_update ON public.notifications;
CREATE TRIGGER trg_notifications_guard_update BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.notifications_guard_update();

CREATE OR REPLACE FUNCTION public.notify_user(
  _user_id uuid, _title text, _message text, _type text DEFAULT 'info',
  _action_url text DEFAULT NULL, _dedupe_key text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF (_user_id IS DISTINCT FROM v_caller OR _type = 'system_alert')
     AND NOT public.has_any_role(v_caller, ARRAY['admin'::app_role,'super_admin'::app_role]) THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;
  INSERT INTO public.notifications(user_id, title, message, type, action_url, dedupe_key)
  VALUES (_user_id, _title, _message, COALESCE(_type,'info'), _action_url, _dedupe_key)
  ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.notify_user(uuid,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_user(uuid,text,text,text,text,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.notifications WHERE user_id = auth.uid() AND is_read = false
$$;
CREATE OR REPLACE FUNCTION public.mark_notification_read(_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  UPDATE public.notifications SET is_read = true, read_at = now()
  WHERE id = _id AND user_id = auth.uid() AND is_read = false;
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n > 0;
END $$;
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  UPDATE public.notifications SET is_read = true, read_at = now()
  WHERE user_id = auth.uid() AND is_read = false;
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.get_unread_notification_count() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_notification_read(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;

CREATE OR REPLACE FUNCTION public.purge_old_notifications()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  DELETE FROM public.notifications WHERE is_read = true AND created_at < now() - interval '180 days';
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.purge_old_notifications() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_old_notifications() TO service_role;

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname='purge-old-notifications';
    PERFORM cron.schedule('purge-old-notifications', '30 3 * * *', 'SELECT public.purge_old_notifications()');
  END IF;
END $$;
