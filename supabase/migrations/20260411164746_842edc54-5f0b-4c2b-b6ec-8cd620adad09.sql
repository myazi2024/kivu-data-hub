
-- 1. Fix parcel_actions_config: replace broken admin policy (profiles.id) with correct user_roles check
DROP POLICY IF EXISTS "Only admins can modify parcel actions config" ON parcel_actions_config;

CREATE POLICY "Only admins can modify parcel actions config"
  ON parcel_actions_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role])
    )
  );

-- 2. Fix payment status bypass: remove user INSERT policy on payments (status changes must go through Edge Functions)
-- Users should not be able to create or update payment records directly
DROP POLICY IF EXISTS "Users can create payments" ON payments;

-- 3. Fix properties contact info exposure: remove anonymous SELECT that exposes contact_email/contact_phone
DROP POLICY IF EXISTS "Anyone can view basic property info" ON properties;

-- 4. Fix user_sessions: add INSERT and DELETE policies
CREATE POLICY "Users can create their own sessions"
  ON user_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON user_sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
