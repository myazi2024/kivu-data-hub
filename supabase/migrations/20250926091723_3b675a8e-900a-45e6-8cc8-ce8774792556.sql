-- Corriger la fonction is_permit_valid pour définir le search_path
CREATE OR REPLACE FUNCTION public.is_permit_valid(issue_date DATE, validity_months INTEGER)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT issue_date + (validity_months || ' months')::INTERVAL > CURRENT_DATE;
$$;