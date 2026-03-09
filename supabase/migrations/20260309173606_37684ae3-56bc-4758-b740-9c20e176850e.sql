
-- Fix: Add composite unique constraint for upsert in grantServiceAccess
ALTER TABLE public.cadastral_service_access 
ADD CONSTRAINT cadastral_service_access_user_parcel_service_unique 
UNIQUE (user_id, parcel_number, service_type);
