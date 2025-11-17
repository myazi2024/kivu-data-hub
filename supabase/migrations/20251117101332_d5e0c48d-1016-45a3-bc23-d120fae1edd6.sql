-- Create table for boundary conflicts
CREATE TABLE public.cadastral_boundary_conflicts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporting_parcel_number TEXT NOT NULL,
  conflicting_parcel_number TEXT NOT NULL,
  conflict_type TEXT NOT NULL,
  description TEXT NOT NULL,
  proposed_solution TEXT,
  evidence_urls TEXT[],
  conflict_coordinates JSONB,
  reported_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cadastral_boundary_conflicts ENABLE ROW LEVEL SECURITY;

-- Policies for users to view their own reports
CREATE POLICY "Users can view their own boundary conflict reports"
ON public.cadastral_boundary_conflicts
FOR SELECT
USING (
  auth.uid() = reported_by OR
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Policy for users to create reports
CREATE POLICY "Authenticated users can create boundary conflict reports"
ON public.cadastral_boundary_conflicts
FOR INSERT
WITH CHECK (auth.uid() = reported_by);

-- Policy for admins to update reports
CREATE POLICY "Admins can update boundary conflict reports"
ON public.cadastral_boundary_conflicts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_boundary_conflicts_updated_at
BEFORE UPDATE ON public.cadastral_boundary_conflicts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_boundary_conflicts_status ON public.cadastral_boundary_conflicts(status);
CREATE INDEX idx_boundary_conflicts_parcels ON public.cadastral_boundary_conflicts(reporting_parcel_number, conflicting_parcel_number);
CREATE INDEX idx_boundary_conflicts_reported_by ON public.cadastral_boundary_conflicts(reported_by);