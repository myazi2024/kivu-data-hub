ALTER TABLE public.cadastral_contributions 
ADD COLUMN IF NOT EXISTS additional_constructions JSONB DEFAULT NULL;