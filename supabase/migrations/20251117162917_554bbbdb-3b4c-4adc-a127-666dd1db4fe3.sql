-- Add admin policies for notifications management

-- Policy: Admins can view all notifications
CREATE POLICY "Admins can view all notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (get_current_user_role() = 'admin');

-- Policy: Admins can delete any notification
CREATE POLICY "Admins can delete any notification"
ON public.notifications
FOR DELETE
TO authenticated
USING (get_current_user_role() = 'admin');

-- Policy: Admins can update any notification
CREATE POLICY "Admins can update any notification"
ON public.notifications
FOR UPDATE
TO authenticated
USING (get_current_user_role() = 'admin');