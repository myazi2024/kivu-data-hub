-- Allow any authenticated user to check if a valid certificate exists for a parcel
-- This is needed because the certificate validity check must work across users
CREATE POLICY "Anyone can view completed expertise certificates"
  ON public.real_estate_expertise_requests
  FOR SELECT
  USING (status = 'completed' AND certificate_issue_date IS NOT NULL);