
-- Table hr_candidates
CREATE TABLE public.hr_candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position_id UUID REFERENCES public.hr_job_positions(id) ON DELETE SET NULL,
  pipeline_stage TEXT NOT NULL DEFAULT 'applied' CHECK (pipeline_stage IN ('applied','screening','interview','offer','hired','rejected')),
  score INTEGER CHECK (score >= 0 AND score <= 10),
  notes TEXT,
  cv_url TEXT,
  applied_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR admins can manage candidates" ON public.hr_candidates
  FOR ALL TO authenticated
  USING (public.is_hr_admin(auth.uid()))
  WITH CHECK (public.is_hr_admin(auth.uid()));

CREATE TRIGGER update_hr_candidates_updated_at
  BEFORE UPDATE ON public.hr_candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_cadastral_services_updated_at();

-- Add objectives column to hr_reviews
ALTER TABLE public.hr_reviews
  ADD COLUMN IF NOT EXISTS objectives JSONB DEFAULT '[]'::jsonb;

-- Storage bucket for HR documents
INSERT INTO storage.buckets (id, name, public) VALUES ('hr-documents', 'hr-documents', false);

CREATE POLICY "HR admins can upload hr docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'hr-documents' AND public.is_hr_admin(auth.uid()));

CREATE POLICY "HR admins can view hr docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'hr-documents' AND public.is_hr_admin(auth.uid()));

CREATE POLICY "HR admins can delete hr docs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'hr-documents' AND public.is_hr_admin(auth.uid()));
