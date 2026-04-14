
ALTER TABLE public.cadastral_contributions
  ADD COLUMN IF NOT EXISTS sound_environment text,
  ADD COLUMN IF NOT EXISTS nearby_noise_sources text;

ALTER TABLE public.cadastral_parcels
  ADD COLUMN IF NOT EXISTS sound_environment text,
  ADD COLUMN IF NOT EXISTS nearby_noise_sources text;
