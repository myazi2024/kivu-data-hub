-- Table de persistance du panier cadastral par utilisateur
CREATE TABLE public.cadastral_cart_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  cart_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  discounts_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cadastral_cart_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own cart"
  ON public.cadastral_cart_drafts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own cart"
  ON public.cadastral_cart_drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own cart"
  ON public.cadastral_cart_drafts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete their own cart"
  ON public.cadastral_cart_drafts FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_cadastral_cart_drafts_updated_at
  BEFORE UPDATE ON public.cadastral_cart_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_cadastral_cart_drafts_updated_at
  ON public.cadastral_cart_drafts(updated_at DESC);