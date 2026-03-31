CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners visible par tous" ON public.partners
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admin gère les partenaires" ON public.partners
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO storage.buckets (id, name, public)
VALUES ('partners', 'partners', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read partner logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'partners');

CREATE POLICY "Admin upload partner logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'partners' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin update partner logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'partners' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin delete partner logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'partners' AND public.has_role(auth.uid(), 'admin'));