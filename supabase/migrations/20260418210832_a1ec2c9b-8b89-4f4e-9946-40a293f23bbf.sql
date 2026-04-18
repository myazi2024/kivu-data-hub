
-- Auto-archivage des articles non vus depuis 12 mois
CREATE OR REPLACE FUNCTION public.auto_archive_stale_articles()
RETURNS TABLE(archived_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  WITH stale AS (
    UPDATE public.articles
    SET is_published = false,
        updated_at = now()
    WHERE is_published = true
      AND deleted_at IS NULL
      AND COALESCE(last_viewed_at, published_at, created_at) < (now() - interval '12 months')
    RETURNING id
  )
  SELECT count(*)::integer INTO v_count FROM stale;
  RETURN QUERY SELECT v_count;
END;
$$;

-- Cron : exécution mensuelle (1er du mois à 03:00 UTC)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    PERFORM cron.unschedule('auto_archive_stale_articles_monthly')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='auto_archive_stale_articles_monthly');
    PERFORM cron.schedule(
      'auto_archive_stale_articles_monthly',
      '0 3 1 * *',
      $cron$ SELECT public.auto_archive_stale_articles(); $cron$
    );
  END IF;
END $$;
