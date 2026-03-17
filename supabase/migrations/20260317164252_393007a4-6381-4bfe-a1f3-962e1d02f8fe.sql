-- Schedule daily auto-cleanup of test data at 3 AM UTC
SELECT cron.schedule(
  'cleanup-test-data-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://vqrcggcqgnkanngqhcga.supabase.co/functions/v1/cleanup-test-data',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxcmNnZ2NxZ25rYW5uZ3FoY2dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MDA3MTcsImV4cCI6MjA2OTI3NjcxN30.PP_49nOFnaC8aDf5IG3J0CAaPJi6zM_wppLy2qJG6BQ"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);