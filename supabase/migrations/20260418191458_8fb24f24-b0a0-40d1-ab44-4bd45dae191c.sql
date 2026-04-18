
-- ============================================================
-- P0: Clean DB collisions + init new tabs
-- ============================================================

-- 1. Purge boundary collision (legacy dispute keys under tab_key='boundary')
DELETE FROM public.analytics_charts_config
WHERE tab_key = 'boundary'
  AND item_key IN (
    'resolution-rate','conflict-type','status','type-status-cross','evolution','geo',
    'kpi-resolved','kpi-pending','kpi-rate','kpi-delay','kpi-total','__tab__'
  );

-- 2. Purge orphan tab 'lifting' (no longer in registry)
DELETE FROM public.analytics_charts_config
WHERE tab_key = 'lifting';

-- 3. Initialize new tabs (servitudes, geometry, consistency) — tab markers only
-- (default visibility ON, items will be auto-created on first admin save)
INSERT INTO public.analytics_charts_config
  (tab_key, item_key, item_type, is_visible, display_order, custom_title)
VALUES
  ('servitudes',  '__tab__', 'tab', true, 13, NULL),
  ('boundary',    '__tab__', 'tab', true, 14, NULL),
  ('geometry',    '__tab__', 'tab', true, 15, NULL),
  ('consistency', '__tab__', 'tab', true, 16, NULL)
ON CONFLICT (tab_key, item_key) DO NOTHING;

-- ============================================================
-- P2: Audit log for analytics config changes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.analytics_config_audit (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id        uuid NOT NULL,
  admin_name      text,
  action          text NOT NULL,        -- 'upsert' | 'delete' | 'cleanup_orphans' | 'sync_registry' | 'reset_tab'
  tab_key         text,
  item_count      int  NOT NULL DEFAULT 0,
  diff            jsonb,                -- summary of changes
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_config_audit_created_at
  ON public.analytics_config_audit (created_at DESC);

ALTER TABLE public.analytics_config_audit ENABLE ROW LEVEL SECURITY;

-- Only admins/super_admins can read audit
DROP POLICY IF EXISTS "Admins read analytics audit" ON public.analytics_config_audit;
CREATE POLICY "Admins read analytics audit"
  ON public.analytics_config_audit
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Only admins/super_admins can insert audit
DROP POLICY IF EXISTS "Admins insert analytics audit" ON public.analytics_config_audit;
CREATE POLICY "Admins insert analytics audit"
  ON public.analytics_config_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
    )
  );
