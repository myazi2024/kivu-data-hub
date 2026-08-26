GRANT SELECT ON public.land_title_fees_by_type TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.land_title_fees_by_type TO authenticated;
GRANT ALL ON public.land_title_fees_by_type TO service_role;