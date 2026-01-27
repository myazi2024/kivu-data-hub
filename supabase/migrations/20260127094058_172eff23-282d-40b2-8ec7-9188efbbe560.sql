-- Update RLS policy to allow users to delete their own pending OR returned contributions
DROP POLICY IF EXISTS "Users can delete their own pending contributions" ON public.cadastral_contributions;

CREATE POLICY "Users can delete their own pending or returned contributions" 
ON public.cadastral_contributions 
FOR DELETE 
USING (auth.uid() = user_id AND status IN ('pending', 'returned'));