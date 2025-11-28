-- ============================================
-- SYSTÈME DE PERMISSIONS GRANULAIRES
-- ============================================

-- Table des permissions disponibles
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_name TEXT NOT NULL, -- Ex: "cadastral_parcels", "users", "invoices"
  action_name TEXT NOT NULL, -- Ex: "create", "read", "update", "delete"
  display_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(resource_name, action_name)
);

-- Table de mapping rôles -> permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(role, permission_id)
);

-- Table des notes privées admin sur les utilisateurs
CREATE TABLE IF NOT EXISTS public.admin_user_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  admin_name TEXT,
  note_content TEXT NOT NULL,
  is_important BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_admin_user_notes_user_id ON public.admin_user_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_user_notes_created_at ON public.admin_user_notes(created_at DESC);

-- Table pour l'historique d'activité détaillé des utilisateurs
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL, -- "login", "logout", "search", "contribution", "payment", etc.
  activity_details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour performance sur les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON public.user_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_activity_type ON public.user_activity_logs(activity_type);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Permissions : seuls les admins peuvent gérer
CREATE POLICY "Admins can manage permissions"
ON public.permissions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'super_admin')
  )
);

-- Role permissions : seuls les admins peuvent gérer
CREATE POLICY "Admins can manage role permissions"
ON public.role_permissions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'super_admin')
  )
);

-- Admin notes : seuls les admins peuvent créer et lire
CREATE POLICY "Admins can manage user notes"
ON public.admin_user_notes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'super_admin')
  )
);

-- User activity logs : admins peuvent lire, système peut écrire
CREATE POLICY "Admins can view activity logs"
ON public.user_activity_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "System can create activity logs"
ON public.user_activity_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FONCTIONS UTILITAIRES
-- ============================================

-- Fonction pour vérifier si un utilisateur a une permission spécifique
CREATE OR REPLACE FUNCTION public.user_has_permission(
  _user_id UUID,
  _resource TEXT,
  _action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _has_permission BOOLEAN;
BEGIN
  -- Vérifier si l'utilisateur a un rôle qui possède cette permission
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role = ur.role
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = _user_id
    AND p.resource_name = _resource
    AND p.action_name = _action
  ) INTO _has_permission;
  
  RETURN COALESCE(_has_permission, false);
END;
$$;

-- Fonction pour obtenir toutes les permissions d'un rôle
CREATE OR REPLACE FUNCTION public.get_role_permissions(_role app_role)
RETURNS TABLE (
  permission_id UUID,
  resource_name TEXT,
  action_name TEXT,
  display_name TEXT,
  description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.resource_name,
    p.action_name,
    p.display_name,
    p.description
  FROM permissions p
  JOIN role_permissions rp ON rp.permission_id = p.id
  WHERE rp.role = _role
  ORDER BY p.resource_name, p.action_name;
END;
$$;

-- Fonction pour obtenir les statistiques d'activité d'un utilisateur
CREATE OR REPLACE FUNCTION public.get_user_activity_stats(
  _user_id UUID,
  _start_date DATE DEFAULT NULL,
  _end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  total_activities BIGINT,
  login_count BIGINT,
  search_count BIGINT,
  contribution_count BIGINT,
  payment_count BIGINT,
  last_activity TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_activities,
    COUNT(*) FILTER (WHERE activity_type = 'login')::BIGINT as login_count,
    COUNT(*) FILTER (WHERE activity_type = 'search')::BIGINT as search_count,
    COUNT(*) FILTER (WHERE activity_type = 'contribution')::BIGINT as contribution_count,
    COUNT(*) FILTER (WHERE activity_type = 'payment')::BIGINT as payment_count,
    MAX(created_at) as last_activity
  FROM user_activity_logs
  WHERE user_id = _user_id
    AND (COALESCE(_start_date::TIMESTAMPTZ, '1970-01-01'::TIMESTAMPTZ) IS NULL OR created_at >= COALESCE(_start_date::TIMESTAMPTZ, '1970-01-01'::TIMESTAMPTZ))
    AND (COALESCE(_end_date::TIMESTAMPTZ, '2100-01-01'::TIMESTAMPTZ) IS NULL OR created_at <= COALESCE(_end_date::TIMESTAMPTZ, '2100-01-01'::TIMESTAMPTZ));
END;
$$;

-- Trigger pour auto-update updated_at sur admin_user_notes
CREATE OR REPLACE FUNCTION public.update_admin_user_notes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_admin_user_notes_updated_at
BEFORE UPDATE ON public.admin_user_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_admin_user_notes_updated_at();

-- ============================================
-- DONNÉES INITIALES - PERMISSIONS PAR DÉFAUT
-- ============================================

-- Permissions pour la gestion des parcelles cadastrales
INSERT INTO public.permissions (resource_name, action_name, display_name, description) VALUES
('cadastral_parcels', 'create', 'Créer des parcelles', 'Permet de créer de nouvelles parcelles cadastrales'),
('cadastral_parcels', 'read', 'Consulter les parcelles', 'Permet de consulter les parcelles cadastrales'),
('cadastral_parcels', 'update', 'Modifier les parcelles', 'Permet de modifier les parcelles cadastrales existantes'),
('cadastral_parcels', 'delete', 'Supprimer les parcelles', 'Permet de supprimer des parcelles cadastrales'),

-- Permissions pour la gestion des utilisateurs
('users', 'create', 'Créer des utilisateurs', 'Permet de créer de nouveaux utilisateurs'),
('users', 'read', 'Consulter les utilisateurs', 'Permet de consulter les profils utilisateurs'),
('users', 'update', 'Modifier les utilisateurs', 'Permet de modifier les profils utilisateurs'),
('users', 'delete', 'Supprimer les utilisateurs', 'Permet de supprimer des utilisateurs'),
('users', 'block', 'Bloquer des utilisateurs', 'Permet de bloquer/débloquer des utilisateurs'),

-- Permissions pour la gestion des rôles
('roles', 'create', 'Attribuer des rôles', 'Permet d''attribuer des rôles aux utilisateurs'),
('roles', 'read', 'Consulter les rôles', 'Permet de consulter les rôles des utilisateurs'),
('roles', 'update', 'Modifier les rôles', 'Permet de modifier les rôles des utilisateurs'),
('roles', 'delete', 'Retirer des rôles', 'Permet de retirer des rôles aux utilisateurs'),

-- Permissions pour les contributions
('contributions', 'create', 'Créer des contributions', 'Permet de créer de nouvelles contributions'),
('contributions', 'read', 'Consulter les contributions', 'Permet de consulter les contributions'),
('contributions', 'update', 'Modifier les contributions', 'Permet de modifier les contributions'),
('contributions', 'approve', 'Approuver les contributions', 'Permet d''approuver ou rejeter les contributions'),

-- Permissions pour les factures
('invoices', 'create', 'Créer des factures', 'Permet de créer de nouvelles factures'),
('invoices', 'read', 'Consulter les factures', 'Permet de consulter les factures'),
('invoices', 'update', 'Modifier les factures', 'Permet de modifier les factures'),
('invoices', 'delete', 'Supprimer les factures', 'Permet de supprimer des factures'),

-- Permissions pour les paiements
('payments', 'create', 'Créer des paiements', 'Permet de créer de nouveaux paiements'),
('payments', 'read', 'Consulter les paiements', 'Permet de consulter les paiements'),
('payments', 'refund', 'Rembourser des paiements', 'Permet de rembourser des paiements'),

-- Permissions pour les codes de réduction
('discount_codes', 'create', 'Créer des codes', 'Permet de créer des codes de réduction'),
('discount_codes', 'read', 'Consulter les codes', 'Permet de consulter les codes de réduction'),
('discount_codes', 'update', 'Modifier les codes', 'Permet de modifier les codes de réduction'),
('discount_codes', 'delete', 'Supprimer les codes', 'Permet de supprimer des codes de réduction'),

-- Permissions pour les statistiques
('analytics', 'read', 'Consulter les statistiques', 'Permet de consulter les statistiques et rapports'),
('audit_logs', 'read', 'Consulter les logs', 'Permet de consulter les journaux d''audit')

ON CONFLICT (resource_name, action_name) DO NOTHING;

-- Attribution des permissions au rôle super_admin (toutes les permissions)
INSERT INTO public.role_permissions (role, permission_id, created_by)
SELECT 'super_admin'::app_role, id, NULL
FROM public.permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- Attribution des permissions au rôle admin (presque toutes sauf delete users)
INSERT INTO public.role_permissions (role, permission_id, created_by)
SELECT 'admin'::app_role, id, NULL
FROM public.permissions
WHERE NOT (resource_name = 'users' AND action_name = 'delete')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Attribution des permissions au rôle partner (limitées aux codes de réduction)
INSERT INTO public.role_permissions (role, permission_id, created_by)
SELECT 'partner'::app_role, id, NULL
FROM public.permissions
WHERE resource_name IN ('discount_codes', 'analytics')
AND action_name IN ('create', 'read', 'update')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Attribution des permissions au rôle user (lecture uniquement de ses propres données)
INSERT INTO public.role_permissions (role, permission_id, created_by)
SELECT 'user'::app_role, id, NULL
FROM public.permissions
WHERE action_name = 'read'
OR (resource_name IN ('contributions', 'cadastral_parcels') AND action_name = 'create')
ON CONFLICT (role, permission_id) DO NOTHING;