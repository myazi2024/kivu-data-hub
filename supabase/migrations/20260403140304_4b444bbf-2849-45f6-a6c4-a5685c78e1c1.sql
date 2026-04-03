
-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can check code validity" ON public.discount_codes;

-- Add restricted SELECT: only admins or the reseller's own user can see codes
CREATE POLICY "Admins and reseller owners can view discount codes"
  ON public.discount_codes FOR SELECT
  TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role])
    OR EXISTS (
      SELECT 1 FROM public.resellers r
      WHERE r.id = discount_codes.reseller_id
        AND r.user_id = auth.uid()
    )
  );
