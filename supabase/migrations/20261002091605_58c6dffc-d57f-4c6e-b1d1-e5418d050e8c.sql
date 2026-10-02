-- lovable-cron-fallback-reviewed: existing jobs at same frequency are only rescheduled to add the x-cron-secret header
CREATE TABLE IF NOT EXISTS public.internal_cron_secrets (
  name text PRIMARY KEY,
  secret text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.internal_cron_secrets FROM anon, authenticated;
GRANT ALL ON public.internal_cron_secrets TO service_role;
ALTER TABLE public.internal_cron_secrets ENABLE ROW LEVEL SECURITY;

INSERT INTO public.internal_cron_secrets(name, secret)
VALUES ('cron', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE s text;
BEGIN
  SELECT secret INTO s FROM public.internal_cron_secrets WHERE name = 'cron';
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('health-snapshot-5min','system-alerts-15min');
  PERFORM cron.schedule('health-snapshot-5min', '*/5 * * * *', format($c$
    select net.http_post(url:='https://vqrcggcqgnkanngqhcga.supabase.co/functions/v1/health-snapshot',
      headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',%L), body:='{}'::jsonb);
  $c$, s));
  PERFORM cron.schedule('system-alerts-15min', '*/15 * * * *', format($c$
    select net.http_post(url:='https://vqrcggcqgnkanngqhcga.supabase.co/functions/v1/system-alerts-check',
      headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',%L), body:='{}'::jsonb);
  $c$, s));
END $$;