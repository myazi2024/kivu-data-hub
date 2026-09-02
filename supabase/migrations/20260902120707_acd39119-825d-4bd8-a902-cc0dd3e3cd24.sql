ALTER TABLE public.cadastral_contributions
  DROP CONSTRAINT IF EXISTS cadastral_contributions_status_check;

ALTER TABLE public.cadastral_contributions
  ADD CONSTRAINT cadastral_contributions_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'returned'::text, 'awaiting_payment'::text, 'payment_failed'::text]));