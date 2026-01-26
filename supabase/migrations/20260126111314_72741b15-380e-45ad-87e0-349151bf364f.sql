-- Allow users to delete their own pending contributions
CREATE POLICY "Users can delete their own pending contributions" 
ON public.cadastral_contributions 
FOR DELETE 
USING (auth.uid() = user_id AND status = 'pending');