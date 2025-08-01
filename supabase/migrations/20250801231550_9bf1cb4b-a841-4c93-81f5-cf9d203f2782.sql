-- Fix the function search path mutable issue
ALTER FUNCTION public.update_territorial_zones_updated_at() SET search_path = '';

-- Also fix the existing function if it exists
ALTER FUNCTION public.update_updated_at_column() SET search_path = '' CASCADE;