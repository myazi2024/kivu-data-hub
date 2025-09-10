-- Create resellers table
CREATE TABLE public.resellers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reseller_code TEXT NOT NULL UNIQUE,
  business_name TEXT,
  contact_phone TEXT,
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00, -- Percentage
  fixed_commission_usd DECIMAL(10,2) DEFAULT 0, -- Fixed amount option
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create discount codes table
CREATE TABLE public.discount_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reseller_id UUID NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  discount_percentage DECIMAL(5,2) DEFAULT 0, -- Client discount %
  discount_amount_usd DECIMAL(10,2) DEFAULT 0, -- Fixed discount amount
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER NOT NULL DEFAULT 0,
  max_usage INTEGER, -- NULL = unlimited
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reseller sales table
CREATE TABLE public.reseller_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reseller_id UUID NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.cadastral_invoices(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  discount_code_id UUID REFERENCES public.discount_codes(id) ON DELETE SET NULL,
  sale_amount_usd DECIMAL(10,2) NOT NULL,
  discount_applied_usd DECIMAL(10,2) DEFAULT 0,
  commission_earned_usd DECIMAL(10,2) NOT NULL,
  commission_paid BOOLEAN NOT NULL DEFAULT false,
  commission_paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseller_sales ENABLE ROW LEVEL SECURITY;

-- RLS Policies for resellers
CREATE POLICY "Admins can manage all resellers" 
ON public.resellers 
FOR ALL 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Resellers can view their own profile" 
ON public.resellers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view active resellers" 
ON public.resellers 
FOR SELECT 
USING (is_active = true AND auth.uid() IS NOT NULL);

-- RLS Policies for discount codes
CREATE POLICY "Admins can manage all discount codes" 
ON public.discount_codes 
FOR ALL 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Resellers can view their own codes" 
ON public.discount_codes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.resellers r 
    WHERE r.id = reseller_id AND r.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can check code validity" 
ON public.discount_codes 
FOR SELECT 
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- RLS Policies for reseller sales
CREATE POLICY "Admins can view all sales" 
ON public.reseller_sales 
FOR ALL 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Resellers can view their own sales" 
ON public.reseller_sales 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.resellers r 
    WHERE r.id = reseller_id AND r.user_id = auth.uid()
  )
);

CREATE POLICY "System can create sales records" 
ON public.reseller_sales 
FOR INSERT 
WITH CHECK (true);

-- Add discount code fields to cadastral_invoices
ALTER TABLE public.cadastral_invoices 
ADD COLUMN discount_code_used TEXT,
ADD COLUMN discount_amount_usd DECIMAL(10,2) DEFAULT 0,
ADD COLUMN original_amount_usd DECIMAL(10,2);

-- Create function to generate unique reseller codes
CREATE OR REPLACE FUNCTION public.generate_reseller_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  next_num INTEGER;
  code TEXT;
BEGIN
  -- Get the next reseller code number
  SELECT COALESCE(MAX(CAST(SUBSTRING(reseller_code FROM 'BIC-RV(\d+)') AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.resellers
  WHERE reseller_code ~ '^BIC-RV\d+$';
  
  code := 'BIC-RV' || LPAD(next_num::TEXT, 3, '0');
  RETURN code;
END;
$$;

-- Create function to validate and apply discount code
CREATE OR REPLACE FUNCTION public.validate_and_apply_discount_code(
  code_input TEXT,
  invoice_amount DECIMAL
)
RETURNS TABLE (
  is_valid BOOLEAN,
  discount_amount DECIMAL,
  reseller_id UUID,
  code_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  discount_rec RECORD;
  calculated_discount DECIMAL := 0;
BEGIN
  -- Find the discount code
  SELECT dc.*, r.id as reseller_id
  INTO discount_rec
  FROM public.discount_codes dc
  JOIN public.resellers r ON r.id = dc.reseller_id
  WHERE dc.code = code_input
    AND dc.is_active = true
    AND r.is_active = true
    AND (dc.expires_at IS NULL OR dc.expires_at > now())
    AND (dc.max_usage IS NULL OR dc.usage_count < dc.max_usage);

  -- If code not found or invalid
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::DECIMAL, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  -- Calculate discount
  IF discount_rec.discount_percentage > 0 THEN
    calculated_discount := (invoice_amount * discount_rec.discount_percentage / 100);
  ELSIF discount_rec.discount_amount_usd > 0 THEN
    calculated_discount := discount_rec.discount_amount_usd;
  END IF;

  -- Ensure discount doesn't exceed invoice amount
  calculated_discount := LEAST(calculated_discount, invoice_amount);

  RETURN QUERY SELECT true, calculated_discount, discount_rec.reseller_id, discount_rec.id;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_resellers_updated_at
  BEFORE UPDATE ON public.resellers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discount_codes_updated_at
  BEFORE UPDATE ON public.discount_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();