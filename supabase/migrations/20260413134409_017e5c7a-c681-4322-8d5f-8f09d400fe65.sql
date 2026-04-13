
-- Fonction utilitaire pour vérifier les droits RH (admin/super_admin)
CREATE OR REPLACE FUNCTION public.is_hr_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::app_role, 'super_admin'::app_role)
  );
$$;

-- ========== HR_EMPLOYEES ==========
CREATE TABLE public.hr_employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  matricule TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  department TEXT NOT NULL,
  position TEXT NOT NULL,
  salary_usd NUMERIC DEFAULT 0,
  birth_date DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'leave', 'departed')),
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR admins can view employees" ON public.hr_employees FOR SELECT TO authenticated USING (public.is_hr_admin(auth.uid()));
CREATE POLICY "HR admins can insert employees" ON public.hr_employees FOR INSERT TO authenticated WITH CHECK (public.is_hr_admin(auth.uid()));
CREATE POLICY "HR admins can update employees" ON public.hr_employees FOR UPDATE TO authenticated USING (public.is_hr_admin(auth.uid()));
CREATE POLICY "HR admins can delete employees" ON public.hr_employees FOR DELETE TO authenticated USING (public.is_hr_admin(auth.uid()));

-- Auto-generate matricule
CREATE OR REPLACE FUNCTION public.generate_hr_matricule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  IF NEW.matricule IS NULL OR NEW.matricule = '' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(matricule FROM 'EMP-(\d+)') AS INTEGER)), 0) + 1
    INTO next_num
    FROM public.hr_employees
    WHERE matricule ~ '^EMP-\d+$';
    NEW.matricule := 'EMP-' || LPAD(next_num::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_hr_matricule
  BEFORE INSERT ON public.hr_employees
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_hr_matricule();

-- Updated_at trigger
CREATE TRIGGER update_hr_employees_updated_at
  BEFORE UPDATE ON public.hr_employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cadastral_services_updated_at();

-- ========== HR_LEAVE_BALANCES ==========
CREATE TABLE public.hr_leave_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL DEFAULT 'annual',
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  days_entitled NUMERIC NOT NULL DEFAULT 20,
  days_used NUMERIC NOT NULL DEFAULT 0,
  days_remaining NUMERIC GENERATED ALWAYS AS (days_entitled - days_used) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, leave_type, year)
);

ALTER TABLE public.hr_leave_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR admins can manage leave balances" ON public.hr_leave_balances FOR ALL TO authenticated USING (public.is_hr_admin(auth.uid())) WITH CHECK (public.is_hr_admin(auth.uid()));

CREATE TRIGGER update_hr_leave_balances_updated_at
  BEFORE UPDATE ON public.hr_leave_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cadastral_services_updated_at();

-- ========== HR_LEAVE_REQUESTS ==========
CREATE TABLE public.hr_leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL DEFAULT 'annual',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT,
  approved_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR admins can manage leave requests" ON public.hr_leave_requests FOR ALL TO authenticated USING (public.is_hr_admin(auth.uid())) WITH CHECK (public.is_hr_admin(auth.uid()));

-- Auto-calculate days_count
CREATE OR REPLACE FUNCTION public.calculate_leave_days()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.days_count := (NEW.end_date - NEW.start_date) + 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_leave_days_count
  BEFORE INSERT OR UPDATE ON public.hr_leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_leave_days();

-- Update leave balance when request is approved
CREATE OR REPLACE FUNCTION public.update_leave_balance_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    INSERT INTO public.hr_leave_balances (employee_id, leave_type, year, days_entitled, days_used)
    VALUES (NEW.employee_id, NEW.leave_type, EXTRACT(YEAR FROM NEW.start_date)::INTEGER, 20, NEW.days_count)
    ON CONFLICT (employee_id, leave_type, year)
    DO UPDATE SET days_used = hr_leave_balances.days_used + NEW.days_count, updated_at = now();
  END IF;
  
  IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    UPDATE public.hr_leave_balances
    SET days_used = GREATEST(0, days_used - OLD.days_count), updated_at = now()
    WHERE employee_id = OLD.employee_id AND leave_type = OLD.leave_type AND year = EXTRACT(YEAR FROM OLD.start_date)::INTEGER;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_leave_balance
  AFTER UPDATE ON public.hr_leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_leave_balance_on_approval();

CREATE TRIGGER update_hr_leave_requests_updated_at
  BEFORE UPDATE ON public.hr_leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cadastral_services_updated_at();

-- ========== HR_REVIEWS ==========
CREATE TABLE public.hr_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  review_period TEXT NOT NULL,
  review_date DATE NOT NULL DEFAULT CURRENT_DATE,
  score INTEGER CHECK (score >= 1 AND score <= 5),
  strengths TEXT,
  improvements TEXT,
  objectives JSONB DEFAULT '[]'::jsonb,
  reviewer_name TEXT,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR admins can manage reviews" ON public.hr_reviews FOR ALL TO authenticated USING (public.is_hr_admin(auth.uid())) WITH CHECK (public.is_hr_admin(auth.uid()));

CREATE TRIGGER update_hr_reviews_updated_at
  BEFORE UPDATE ON public.hr_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cadastral_services_updated_at();

-- ========== HR_JOB_POSITIONS ==========
CREATE TABLE public.hr_job_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  contract_type TEXT NOT NULL DEFAULT 'CDI',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'draft')),
  description TEXT,
  requirements TEXT,
  salary_range TEXT,
  location TEXT DEFAULT 'Goma',
  posted_at TIMESTAMPTZ DEFAULT now(),
  closes_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_job_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR admins can manage job positions" ON public.hr_job_positions FOR ALL TO authenticated USING (public.is_hr_admin(auth.uid())) WITH CHECK (public.is_hr_admin(auth.uid()));

CREATE TRIGGER update_hr_job_positions_updated_at
  BEFORE UPDATE ON public.hr_job_positions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cadastral_services_updated_at();

-- ========== HR_DOCUMENTS ==========
CREATE TABLE public.hr_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT,
  file_size BIGINT,
  expires_at DATE,
  notes TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR admins can manage documents" ON public.hr_documents FOR ALL TO authenticated USING (public.is_hr_admin(auth.uid())) WITH CHECK (public.is_hr_admin(auth.uid()));

CREATE TRIGGER update_hr_documents_updated_at
  BEFORE UPDATE ON public.hr_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cadastral_services_updated_at();

-- Create indexes
CREATE INDEX idx_hr_employees_department ON public.hr_employees(department);
CREATE INDEX idx_hr_employees_status ON public.hr_employees(status);
CREATE INDEX idx_hr_leave_requests_employee ON public.hr_leave_requests(employee_id);
CREATE INDEX idx_hr_leave_requests_status ON public.hr_leave_requests(status);
CREATE INDEX idx_hr_reviews_employee ON public.hr_reviews(employee_id);
CREATE INDEX idx_hr_documents_employee ON public.hr_documents(employee_id);
CREATE INDEX idx_hr_job_positions_status ON public.hr_job_positions(status);
