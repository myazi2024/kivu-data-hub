
CREATE TABLE public.pitch_slides_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slide_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pitch_slides_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pitch slides config"
ON public.pitch_slides_config FOR SELECT
USING (true);

CREATE POLICY "Admins can insert pitch slides config"
ON public.pitch_slides_config FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update pitch slides config"
ON public.pitch_slides_config FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete pitch slides config"
ON public.pitch_slides_config FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_pitch_slides_config_updated_at
BEFORE UPDATE ON public.pitch_slides_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
