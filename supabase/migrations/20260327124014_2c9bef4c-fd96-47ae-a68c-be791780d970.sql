-- Update get_user_highest_role to include notaire, geometre, urbaniste
CREATE OR REPLACE FUNCTION public.get_user_highest_role(_user_id uuid)
 RETURNS app_role
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  result app_role;
BEGIN
  SELECT role INTO result
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role::text
      WHEN 'super_admin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'expert_immobilier' THEN 3
      WHEN 'mortgage_officer' THEN 4
      WHEN 'notaire' THEN 5
      WHEN 'geometre' THEN 6
      WHEN 'urbaniste' THEN 7
      WHEN 'partner' THEN 8
      WHEN 'user' THEN 9
      ELSE 10
    END
  LIMIT 1;
  RETURN result;
END;
$$;