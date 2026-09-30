DROP POLICY IF EXISTS "Admins can insert roles except super_admin" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles except super_admin" ON public.user_roles;
CREATE POLICY "Admins can insert non-admin roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (role NOT IN ('super_admin','admin') AND public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'super_admin'::app_role]));
CREATE POLICY "Admins can delete non-admin roles" ON public.user_roles FOR DELETE TO authenticated
  USING (role NOT IN ('super_admin','admin') AND public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'super_admin'::app_role]));