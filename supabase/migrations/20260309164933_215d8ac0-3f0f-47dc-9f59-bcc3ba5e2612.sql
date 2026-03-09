-- Fix #4: Prevent duplicate service access records
-- Add unique constraint on (user_id, parcel_number, service_type)
ALTER TABLE public.cadastral_service_access
  ADD CONSTRAINT unique_user_parcel_service
  UNIQUE (user_id, parcel_number, service_type);