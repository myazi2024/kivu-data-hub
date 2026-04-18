
-- Unschedule existing if any
DO $$ BEGIN
  PERFORM cron.unschedule('health-snapshot-5min');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  PERFORM cron.unschedule('system-alerts-15min');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'health-snapshot-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://vqrcggcqgnkanngqhcga.supabase.co/functions/v1/health-snapshot',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxcmNnZ2NxZ25rYW5uZ3FoY2dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MDA3MTcsImV4cCI6MjA2OTI3NjcxN30.PP_49nOFnaC8aDf5IG3J0CAaPJi6zM_wppLy2qJG6BQ"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'system-alerts-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://vqrcggcqgnkanngqhcga.supabase.co/functions/v1/system-alerts-check',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxcmNnZ2NxZ25rYW5uZ3FoY2dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MDA3MTcsImV4cCI6MjA2OTI3NjcxN30.PP_49nOFnaC8aDf5IG3J0CAaPJi6zM_wppLy2qJG6BQ"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
