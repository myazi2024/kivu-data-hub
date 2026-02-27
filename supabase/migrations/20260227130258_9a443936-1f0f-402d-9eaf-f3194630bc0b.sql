-- Allow users to update payment_status on their own expertise requests
CREATE POLICY "Users can update payment_status on own requests"
ON public.real_estate_expertise_requests
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);