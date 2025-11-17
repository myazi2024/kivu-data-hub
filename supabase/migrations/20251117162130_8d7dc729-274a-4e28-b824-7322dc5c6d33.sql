-- Fix search_path for the validation function
DROP FUNCTION IF EXISTS validate_notification_user() CASCADE;

CREATE OR REPLACE FUNCTION validate_notification_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
    RAISE EXCEPTION 'user_id must reference a valid user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Recreate the trigger
CREATE TRIGGER validate_notification_user_trigger
BEFORE INSERT OR UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION validate_notification_user();