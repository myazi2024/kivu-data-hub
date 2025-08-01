-- Fix the function search path mutable issue
ALTER FUNCTION public.update_territorial_zones_updated_at() SET search_path = '';