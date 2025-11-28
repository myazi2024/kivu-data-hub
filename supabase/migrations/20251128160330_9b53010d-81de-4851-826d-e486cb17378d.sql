-- Create trigger function for automatic audit logging of profile blocks/unblocks
CREATE OR REPLACE FUNCTION public.log_profile_block_unblock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log when is_blocked status changes
  IF (TG_OP = 'UPDATE' AND OLD.is_blocked IS DISTINCT FROM NEW.is_blocked) THEN
    INSERT INTO public.audit_logs (
      action,
      table_name,
      record_id,
      user_id,
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

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_log_profile_block_unblock ON public.profiles;

-- Create trigger for profile blocks/unblocks
CREATE TRIGGER trigger_log_profile_block_unblock
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_block_unblock();

-- Add comment
COMMENT ON FUNCTION public.log_profile_block_unblock() IS 'Automatically logs profile block/unblock actions to audit_logs table';
