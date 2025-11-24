-- Create payment_methods_config table to store payment provider configurations
CREATE TABLE IF NOT EXISTS public.payment_methods_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_type TEXT NOT NULL CHECK (config_type IN ('mobile_money', 'bank_card')),
  provider_id TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  api_credentials JSONB DEFAULT '{}'::jsonb,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(config_type, provider_id)
);

-- Enable RLS
ALTER TABLE public.payment_methods_config ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can manage payment methods
CREATE POLICY "Admins can manage payment methods"
  ON public.payment_methods_config
  FOR ALL
  USING (get_current_user_role() = 'admin');

-- Policy: Everyone can view enabled payment methods
CREATE POLICY "Enabled payment methods are viewable by everyone"
  ON public.payment_methods_config
  FOR SELECT
  USING (is_enabled = true);

-- Create index for faster queries
CREATE INDEX idx_payment_methods_enabled ON public.payment_methods_config(is_enabled, config_type);

-- Insert default mobile money providers
INSERT INTO public.payment_methods_config (config_type, provider_id, provider_name, is_enabled, display_order)
VALUES 
  ('mobile_money', 'airtel_money', 'Airtel Money', true, 1),
  ('mobile_money', 'orange_money', 'Orange Money', true, 2),
  ('mobile_money', 'mpesa', 'M-Pesa', true, 3)
ON CONFLICT (config_type, provider_id) DO NOTHING;

-- Create payment_transactions table for logging
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  invoice_id UUID,
  payment_method TEXT NOT NULL,
  provider TEXT NOT NULL,
  amount_usd NUMERIC NOT NULL DEFAULT 0,
  phone_number TEXT,
  transaction_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own transactions
CREATE POLICY "Users can view their own transactions"
  ON public.payment_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: System can create transactions
CREATE POLICY "System can create transactions"
  ON public.payment_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all transactions
CREATE POLICY "Admins can view all transactions"
  ON public.payment_transactions
  FOR SELECT
  USING (get_current_user_role() = 'admin');

-- Create index for transaction queries
CREATE INDEX idx_payment_transactions_user ON public.payment_transactions(user_id, created_at DESC);
CREATE INDEX idx_payment_transactions_status ON public.payment_transactions(status, created_at DESC);