-- 1. Fix get_user_highest_role to include all roles
CREATE OR REPLACE FUNCTION public.get_user_highest_role(_user_id uuid)
 RETURNS app_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'super_admin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'expert_immobilier' THEN 3
      WHEN 'mortgage_officer' THEN 4
      WHEN 'partner' THEN 5
      WHEN 'user' THEN 6
    END
  LIMIT 1;
$$;

-- 2. Add RLS policies for admin users on user_roles (INSERT and DELETE, excluding super_admin)
CREATE POLICY "Admins can insert roles except super_admin"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  role <> 'super_admin'::app_role
  AND public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role])
);

CREATE POLICY "Admins can delete roles except super_admin"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  role <> 'super_admin'::app_role
  AND public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role])
);