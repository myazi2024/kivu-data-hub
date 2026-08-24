ALTER PUBLICATION supabase_realtime ADD TABLE public.currency_config;
ALTER TABLE public.currency_config REPLICA IDENTITY FULL;