-- Add admin_name to audit_logs for better traceability
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS admin_name TEXT;

-- Update the trigger function to include admin name
CREATE OR REPLACE FUNCTION public.log_profile_block_unblock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_profile_name TEXT;
BEGIN
  -- Only log when is_blocked status changes
  IF (TG_OP = 'UPDATE' AND OLD.is_blocked IS DISTINCT FROM NEW.is_blocked) THEN
    -- Get admin name from profiles
    SELECT full_name INTO admin_profile_name
    FROM public.profiles
    WHERE user_id = auth.uid();
    
    INSERT INTO public.audit_logs (
      action,
      table_name,
      record_id,
      user_id,
      admin_name,
      old_values,
      new_values
    ) VALUES (
      CASE 
        WHEN NEW.is_blocked = true THEN 'block_user'
        ELSE 'unblock_user'
      END,
      'profiles',
      NEW.user_id,
      auth.uid(),
      COALESCE(admin_profile_name, 'Unknown Admin'),
      jsonb_build_object(
        'is_blocked', OLD.is_blocked,
        'blocked_at', OLD.blocked_at,
        'blocked_reason', OLD.blocked_reason
      ),
      jsonb_build_object(
        'is_blocked', NEW.is_blocked,
        'blocked_at', NEW.blocked_at,
        'blocked_reason', NEW.blocked_reason
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add comment
COMMENT ON COLUMN public.audit_logs.admin_name IS 'Name of the admin who performed the action';