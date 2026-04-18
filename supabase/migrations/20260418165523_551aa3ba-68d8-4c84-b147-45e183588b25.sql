CREATE UNIQUE INDEX IF NOT EXISTS cadastral_contributions_user_parcel_active_uidx
ON public.cadastral_contributions (user_id, parcel_number)
WHERE status IN ('pending', 'returned') AND user_id IS NOT NULL;