
-- Fix 1: Prevent users from self-elevating role via profile UPDATE
-- Add a BEFORE UPDATE trigger that blocks changes to sensitive columns
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Allow admins to change anything
  IF public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]) THEN
    RETURN NEW;
  END IF;

  -- Block non-admins from changing sensitive fields
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Cannot modify role field';
  END IF;
  IF NEW.is_blocked IS DISTINCT FROM OLD.is_blocked THEN
    RAISE EXCEPTION 'Cannot modify is_blocked field';
  END IF;
  IF NEW.blocked_at IS DISTINCT FROM OLD.blocked_at THEN
    RAISE EXCEPTION 'Cannot modify blocked_at field';
  END IF;
  IF NEW.blocked_reason IS DISTINCT FROM OLD.blocked_reason THEN
    RAISE EXCEPTION 'Cannot modify blocked_reason field';
  END IF;
  IF NEW.fraud_strikes IS DISTINCT FROM OLD.fraud_strikes THEN
    RAISE EXCEPTION 'Cannot modify fraud_strikes field';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_sensitive_fields_trigger ON public.profiles;
CREATE TRIGGER protect_profile_sensitive_fields_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_sensitive_fields();

-- Fix 2: Remove anonymous access to orders table
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
