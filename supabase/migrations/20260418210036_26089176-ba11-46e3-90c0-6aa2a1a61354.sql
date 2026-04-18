
-- =======================================================================
-- 2. SOFT DELETE columns
-- =======================================================================
ALTER TABLE public.publications ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- =======================================================================
-- 3. SEO + scheduling + display author
-- =======================================================================
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS og_image_url text,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS author_display_name text,
  ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_articles_scheduled_at ON public.articles(scheduled_at) WHERE scheduled_at IS NOT NULL AND is_published = false;
CREATE INDEX IF NOT EXISTS idx_articles_deleted_at ON public.articles(deleted_at);
CREATE INDEX IF NOT EXISTS idx_publications_deleted_at ON public.publications(deleted_at);
CREATE INDEX IF NOT EXISTS idx_partners_deleted_at ON public.partners(deleted_at);

-- =======================================================================
-- 4. RLS articles : restreindre INSERT/UPDATE
-- =======================================================================
DROP POLICY IF EXISTS "Authors can create articles" ON public.articles;
DROP POLICY IF EXISTS "Authors can update their own articles" ON public.articles;
DROP POLICY IF EXISTS "Authors can view their own articles" ON public.articles;

CREATE POLICY "Editors and admins can create articles"
ON public.articles FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor')
);

CREATE POLICY "Editors and admins can update articles"
ON public.articles FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor')
);

CREATE POLICY "Editors view all articles"
ON public.articles FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor')
);

-- =======================================================================
-- 5. publication_categories
-- =======================================================================
CREATE TABLE IF NOT EXISTS public.publication_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.publication_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Categories visible everyone" ON public.publication_categories;
CREATE POLICY "Categories visible everyone"
ON public.publication_categories FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage categories" ON public.publication_categories;
CREATE POLICY "Admins manage categories"
ON public.publication_categories FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

INSERT INTO public.publication_categories (slug, name, display_order) VALUES
  ('research', 'Recherche', 1),
  ('report', 'Rapport', 2),
  ('analysis', 'Analyse', 3),
  ('guide', 'Guide', 4)
ON CONFLICT (slug) DO NOTHING;

-- =======================================================================
-- 6. article_revisions
-- =======================================================================
CREATE TABLE IF NOT EXISTS public.article_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  revision_number integer NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  summary text,
  edited_by uuid,
  edited_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (article_id, revision_number)
);

ALTER TABLE public.article_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Editors view revisions" ON public.article_revisions;
CREATE POLICY "Editors view revisions"
ON public.article_revisions FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'));

CREATE INDEX IF NOT EXISTS idx_article_revisions_article ON public.article_revisions(article_id, revision_number DESC);

CREATE OR REPLACE FUNCTION public.snapshot_article_revision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_rev integer;
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.content IS DISTINCT FROM OLD.content OR NEW.title IS DISTINCT FROM OLD.title) THEN
    SELECT COALESCE(MAX(revision_number), 0) + 1 INTO next_rev
    FROM public.article_revisions WHERE article_id = OLD.id;
    INSERT INTO public.article_revisions (article_id, revision_number, title, content, summary, edited_by)
    VALUES (OLD.id, next_rev, OLD.title, OLD.content, OLD.summary, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_article_revision ON public.articles;
CREATE TRIGGER trg_snapshot_article_revision
BEFORE UPDATE ON public.articles
FOR EACH ROW EXECUTE FUNCTION public.snapshot_article_revision();

-- =======================================================================
-- 7. AUDIT trigger générique sur Contenu
-- =======================================================================
CREATE OR REPLACE FUNCTION public.audit_content_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_changed jsonb := '{}'::jsonb;
  v_action text;
  v_record_id uuid;
  k text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_new := to_jsonb(NEW);
    v_record_id := NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := CASE
      WHEN (to_jsonb(OLD) ? 'deleted_at') AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN 'soft_delete'
      WHEN (to_jsonb(OLD) ? 'deleted_at') AND OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN 'restore'
      ELSE 'update'
    END;
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    FOR k IN SELECT jsonb_object_keys(v_new) LOOP
      IF v_old->k IS DISTINCT FROM v_new->k THEN
        v_changed := v_changed || jsonb_build_object(k, jsonb_build_object('old', v_old->k, 'new', v_new->k));
      END IF;
    END LOOP;
    v_record_id := NEW.id;
  ELSE
    v_action := 'delete';
    v_old := to_jsonb(OLD);
    v_record_id := OLD.id;
  END IF;

  INSERT INTO public.history_audit (table_name, record_id, action, actor_id, changed_fields, old_values, new_values)
  VALUES (TG_TABLE_NAME, v_record_id, v_action, auth.uid(), v_changed, v_old, v_new);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_articles ON public.articles;
CREATE TRIGGER trg_audit_articles
AFTER INSERT OR UPDATE OR DELETE ON public.articles
FOR EACH ROW EXECUTE FUNCTION public.audit_content_changes();

DROP TRIGGER IF EXISTS trg_audit_article_themes ON public.article_themes;
CREATE TRIGGER trg_audit_article_themes
AFTER INSERT OR UPDATE OR DELETE ON public.article_themes
FOR EACH ROW EXECUTE FUNCTION public.audit_content_changes();

DROP TRIGGER IF EXISTS trg_audit_publications ON public.publications;
CREATE TRIGGER trg_audit_publications
AFTER INSERT OR UPDATE OR DELETE ON public.publications
FOR EACH ROW EXECUTE FUNCTION public.audit_content_changes();

DROP TRIGGER IF EXISTS trg_audit_partners ON public.partners;
CREATE TRIGGER trg_audit_partners
AFTER INSERT OR UPDATE OR DELETE ON public.partners
FOR EACH ROW EXECUTE FUNCTION public.audit_content_changes();

-- =======================================================================
-- 8. RPC increment_article_view
-- =======================================================================
CREATE OR REPLACE FUNCTION public.increment_article_view(_article_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.articles
  SET view_count = view_count + 1,
      last_viewed_at = now()
  WHERE id = _article_id
    AND is_published = true
    AND deleted_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_article_view(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.increment_article_view(uuid) TO anon, authenticated;

-- =======================================================================
-- 9. RPC swap_theme_order
-- =======================================================================
CREATE OR REPLACE FUNCTION public.swap_theme_order(_theme_a uuid, _theme_b uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_a integer;
  order_b integer;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT display_order INTO order_a FROM public.article_themes WHERE id = _theme_a FOR UPDATE;
  SELECT display_order INTO order_b FROM public.article_themes WHERE id = _theme_b FOR UPDATE;
  UPDATE public.article_themes SET display_order = order_b WHERE id = _theme_a;
  UPDATE public.article_themes SET display_order = order_a WHERE id = _theme_b;
END;
$$;

GRANT EXECUTE ON FUNCTION public.swap_theme_order(uuid, uuid) TO authenticated;

-- =======================================================================
-- 10. RPC track_publication_download
-- =======================================================================
CREATE OR REPLACE FUNCTION public.track_publication_download(_publication_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.publications
  SET download_count = download_count + 1
  WHERE id = _publication_id
    AND status = 'published'
    AND deleted_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_publication_download(uuid) TO anon, authenticated;

-- =======================================================================
-- 11. RPC publish_scheduled_articles
-- =======================================================================
CREATE OR REPLACE FUNCTION public.publish_scheduled_articles()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH updated AS (
    UPDATE public.articles
    SET is_published = true,
        published_at = COALESCE(published_at, now()),
        scheduled_at = NULL
    WHERE scheduled_at IS NOT NULL
      AND scheduled_at <= now()
      AND is_published = false
      AND deleted_at IS NULL
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM updated;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_scheduled_articles() TO authenticated;

-- =======================================================================
-- 12. RPC archive_stale_articles
-- =======================================================================
CREATE OR REPLACE FUNCTION public.archive_stale_articles(_months integer DEFAULT 12)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  WITH updated AS (
    UPDATE public.articles
    SET is_published = false
    WHERE is_published = true
      AND deleted_at IS NULL
      AND (last_viewed_at IS NULL OR last_viewed_at < now() - (_months || ' months')::interval)
      AND published_at < now() - (_months || ' months')::interval
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM updated;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_stale_articles(integer) TO authenticated;

-- =======================================================================
-- 13. Vue Hub Contenu (KPIs)
-- =======================================================================
CREATE OR REPLACE VIEW public.content_hub_stats
WITH (security_invoker = true)
AS
SELECT
  (SELECT COUNT(*) FROM public.articles WHERE is_published = true AND deleted_at IS NULL) AS published_articles,
  (SELECT COUNT(*) FROM public.articles WHERE is_published = false AND deleted_at IS NULL) AS draft_articles,
  (SELECT COUNT(*) FROM public.articles WHERE scheduled_at IS NOT NULL AND scheduled_at > now() AND deleted_at IS NULL) AS scheduled_articles,
  (SELECT COALESCE(SUM(view_count), 0) FROM public.articles WHERE deleted_at IS NULL) AS total_views,
  (SELECT COUNT(*) FROM public.articles WHERE is_published = true AND deleted_at IS NULL AND updated_at < now() - interval '90 days') AS stale_articles,
  (SELECT COUNT(*) FROM public.publications WHERE status = 'published' AND deleted_at IS NULL) AS published_publications,
  (SELECT COALESCE(SUM(download_count), 0) FROM public.publications WHERE deleted_at IS NULL) AS total_downloads,
  (SELECT COUNT(*) FROM public.partners WHERE is_active = true AND deleted_at IS NULL) AS active_partners,
  (SELECT COUNT(*) FROM public.article_themes WHERE is_active = true) AS active_themes;

GRANT SELECT ON public.content_hub_stats TO authenticated;

-- =======================================================================
-- 14. Storage buckets
-- =======================================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('articles', 'articles', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('publications', 'publications', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Articles images public read" ON storage.objects;
CREATE POLICY "Articles images public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'articles');

DROP POLICY IF EXISTS "Articles images editor write" ON storage.objects;
CREATE POLICY "Articles images editor write"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'articles' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor')));

DROP POLICY IF EXISTS "Articles images editor update" ON storage.objects;
CREATE POLICY "Articles images editor update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'articles' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor')));

DROP POLICY IF EXISTS "Articles images admin delete" ON storage.objects;
CREATE POLICY "Articles images admin delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'articles' AND has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Publications admin all" ON storage.objects;
CREATE POLICY "Publications admin all"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'publications' AND has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'publications' AND has_role(auth.uid(), 'admin'));

-- =======================================================================
-- 15. Cron
-- =======================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('publish-scheduled-articles');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'publish-scheduled-articles',
      '*/5 * * * *',
      'SELECT public.publish_scheduled_articles();'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END$$;
