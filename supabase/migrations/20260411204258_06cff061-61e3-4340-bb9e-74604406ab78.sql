
-- Table for app appearance configuration
CREATE TABLE public.app_appearance_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text UNIQUE NOT NULL,
  config_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.app_appearance_config ENABLE ROW LEVEL SECURITY;

-- Everyone can read appearance config (needed to apply theme)
CREATE POLICY "Anyone can read appearance config"
  ON public.app_appearance_config FOR SELECT
  USING (true);

-- Only admins can modify
CREATE POLICY "Admins can insert appearance config"
  ON public.app_appearance_config FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]));

CREATE POLICY "Admins can update appearance config"
  ON public.app_appearance_config FOR UPDATE
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]));

CREATE POLICY "Admins can delete appearance config"
  ON public.app_appearance_config FOR DELETE
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]));

-- Trigger for updated_at
CREATE TRIGGER update_app_appearance_config_updated_at
  BEFORE UPDATE ON public.app_appearance_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cadastral_services_updated_at();

-- Storage bucket for app assets (logo, favicon)
INSERT INTO storage.buckets (id, name, public) VALUES ('app-assets', 'app-assets', true);

-- Storage policies
CREATE POLICY "Public read access for app assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'app-assets');

CREATE POLICY "Admins can upload app assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'app-assets' AND public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]));

CREATE POLICY "Admins can update app assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'app-assets' AND public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]));

CREATE POLICY "Admins can delete app assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'app-assets' AND public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]));
