ALTER TABLE public.cadastral_contributions
  ADD COLUMN IF NOT EXISTS is_rented boolean NOT NULL DEFAULT false;