-- ==========================================
-- AMÉLIORATION CRITIQUE DU BACKEND (Corrigé)
-- ==========================================

-- 1. SOFT DELETE - Ajouter colonnes deleted_at sur tables importantes
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.cadastral_parcels ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.publications ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- 2. PERFORMANCE - Index sur colonnes fréquemment interrogées
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_cadastral_invoices_status ON public.cadastral_invoices(status);
CREATE INDEX IF NOT EXISTS idx_cadastral_invoices_user_id ON public.cadastral_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_cadastral_contributions_status ON public.cadastral_contributions(status);
CREATE INDEX IF NOT EXISTS idx_cadastral_contributions_user_id ON public.cadastral_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON public.discount_codes(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_cadastral_contributor_codes_code ON public.cadastral_contributor_codes(code) WHERE is_used = false;
CREATE INDEX IF NOT EXISTS idx_reseller_sales_reseller_id ON public.reseller_sales(reseller_id);

-- 3. STORAGE - Politiques RLS pour cadastral-documents (DROP puis CREATE)
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
CREATE POLICY "Users can upload their own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cadastral-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
CREATE POLICY "Users can view their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'cadastral-documents' AND
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role])
  )
);

DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
CREATE POLICY "Users can update their own documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'cadastral-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;
CREATE POLICY "Users can delete their own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'cadastral-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Admins can view all documents" ON storage.objects;
CREATE POLICY "Admins can view all documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'cadastral-documents' AND
  public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role])
);

-- 4. SYSTÈME DE NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5. PRÉFÉRENCES UTILISATEUR (GDPR)
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email_notifications BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  data_sharing_consent BOOLEAN DEFAULT false,
  language TEXT DEFAULT 'fr',
  timezone TEXT DEFAULT 'Africa/Lubumbashi',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.user_preferences;
CREATE POLICY "Users can manage their own preferences"
ON public.user_preferences
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger pour créer préférences par défaut
CREATE OR REPLACE FUNCTION public.create_user_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_preferences ON public.profiles;
CREATE TRIGGER on_profile_created_preferences
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_preferences();

-- 6. SESSIONS ACTIVES (Rate Limiting & Security)
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_token TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token) WHERE is_active = true;

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;
CREATE POLICY "Users can view their own sessions"
ON public.user_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 7. NETTOYAGE AUTOMATIQUE
CREATE OR REPLACE FUNCTION public.cleanup_expired_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.cadastral_contributor_codes
  SET is_valid = false, invalidated_at = now(), invalidation_reason = 'Code expiré'
  WHERE expires_at < now() AND is_used = false AND is_valid = true;

  UPDATE public.discount_codes
  SET is_active = false, updated_at = now()
  WHERE expires_at < now() AND is_active = true;

  UPDATE public.user_sessions
  SET is_active = false
  WHERE expires_at < now() AND is_active = true;

  DELETE FROM public.notifications
  WHERE is_read = true AND read_at < now() - INTERVAL '30 days';
END;
$$;

-- 8. VALIDATION FICHIERS
CREATE OR REPLACE FUNCTION public.validate_file_upload(
  file_name TEXT,
  file_size BIGINT,
  allowed_types TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  file_extension TEXT;
  max_size BIGINT := 10485760;
  result JSONB;
BEGIN
  file_extension := lower(substring(file_name from '\.([^.]+)$'));
  
  IF file_size > max_size THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Fichier trop volumineux (max 10 MB)');
  END IF;
  
  IF NOT (file_extension = ANY(allowed_types)) THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Type non autorisé: ' || array_to_string(allowed_types, ', '));
  END IF;
  
  RETURN jsonb_build_object('valid', true);
END;
$$;

-- 9. AUDIT AUTOMATIQUE
CREATE OR REPLACE FUNCTION public.auto_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_action(TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_action(TG_OP, TG_TABLE_NAME, OLD.id, to_jsonb(OLD), NULL);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_user_roles_changes ON public.user_roles;
CREATE TRIGGER audit_user_roles_changes
  AFTER UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.auto_audit_trigger();

DROP TRIGGER IF EXISTS audit_resellers_changes ON public.resellers;
CREATE TRIGGER audit_resellers_changes
  AFTER UPDATE OR DELETE ON public.resellers
  FOR EACH ROW EXECUTE FUNCTION public.auto_audit_trigger();

DROP TRIGGER IF EXISTS audit_discount_codes_changes ON public.discount_codes;
CREATE TRIGGER audit_discount_codes_changes
  AFTER UPDATE OR DELETE ON public.discount_codes
  FOR EACH ROW EXECUTE FUNCTION public.auto_audit_trigger();

-- 10. EXPORT GDPR
CREATE OR REPLACE FUNCTION public.export_user_data(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_data JSONB;
BEGIN
  IF auth.uid() != target_user_id AND NOT public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]) THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  SELECT jsonb_build_object(
    'profile', (SELECT row_to_json(p.*) FROM profiles p WHERE p.user_id = target_user_id),
    'roles', (SELECT jsonb_agg(row_to_json(r.*)) FROM user_roles r WHERE r.user_id = target_user_id),
    'preferences', (SELECT row_to_json(up.*) FROM user_preferences up WHERE up.user_id = target_user_id),
    'contributions', (SELECT jsonb_agg(row_to_json(c.*)) FROM cadastral_contributions c WHERE c.user_id = target_user_id),
    'invoices', (SELECT jsonb_agg(row_to_json(i.*)) FROM cadastral_invoices i WHERE i.user_id = target_user_id)
  ) INTO user_data;

  RETURN user_data;
END;
$$;
