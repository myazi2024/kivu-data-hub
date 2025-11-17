-- Add DELETE policy for users to delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Add CHECK constraint for notification types
ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('info', 'success', 'warning', 'error'));

-- Add foreign key constraint from notifications to auth.users (via user_id)
-- Note: We can't directly reference auth.users, so we'll use a trigger to validate
CREATE OR REPLACE FUNCTION validate_notification_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
    RAISE EXCEPTION 'user_id must reference a valid user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER validate_notification_user_trigger
BEFORE INSERT OR UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION validate_notification_user();

-- Add index on user_id for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
ON public.notifications(user_id);

-- Add index on is_read and user_id for faster unread queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON public.notifications(user_id, is_read) 
WHERE is_read = false;