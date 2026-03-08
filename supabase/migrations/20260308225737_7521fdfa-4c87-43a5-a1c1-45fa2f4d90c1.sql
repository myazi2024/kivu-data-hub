
-- First, clean up existing duplicates: keep only the most recent contribution per user+parcel for active statuses
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, parcel_number ORDER BY updated_at DESC) as rn
  FROM public.cadastral_contributions
  WHERE status IN ('pending', 'returned') AND parcel_number != ''
)
UPDATE public.cadastral_contributions
SET status = 'rejected', rejection_reason = 'Doublon automatiquement résolu - contribution plus récente existante'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Now create the unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_contribution_per_user_parcel
  ON public.cadastral_contributions (user_id, parcel_number)
  WHERE status IN ('pending', 'returned') AND parcel_number != '';
