-- Create cadastral_mortgages table for managing mortgage history on parcels
CREATE TABLE public.cadastral_mortgages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parcel_id UUID NOT NULL,
  mortgage_amount_usd NUMERIC NOT NULL DEFAULT 0,
  duration_months INTEGER NOT NULL DEFAULT 12,
  creditor_name TEXT NOT NULL,
  creditor_type TEXT NOT NULL DEFAULT 'Banque',
  contract_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mortgage_status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cadastral_mortgage_payments table for tracking mortgage payments
CREATE TABLE public.cadastral_mortgage_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mortgage_id UUID NOT NULL,
  payment_amount_usd NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_type TEXT NOT NULL DEFAULT 'partial',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.cadastral_mortgages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadastral_mortgage_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for cadastral_mortgages
CREATE POLICY "Cadastral mortgages are viewable by everyone" 
ON public.cadastral_mortgages 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage mortgages" 
ON public.cadastral_mortgages 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create policies for cadastral_mortgage_payments
CREATE POLICY "Mortgage payments are viewable by everyone" 
ON public.cadastral_mortgage_payments 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage mortgage payments" 
ON public.cadastral_mortgage_payments 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Add foreign key constraints
ALTER TABLE public.cadastral_mortgages 
ADD CONSTRAINT fk_cadastral_mortgages_parcel 
FOREIGN KEY (parcel_id) REFERENCES public.cadastral_parcels(id) ON DELETE CASCADE;

ALTER TABLE public.cadastral_mortgage_payments 
ADD CONSTRAINT fk_cadastral_mortgage_payments_mortgage 
FOREIGN KEY (mortgage_id) REFERENCES public.cadastral_mortgages(id) ON DELETE CASCADE;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates on mortgages table
CREATE TRIGGER update_cadastral_mortgages_updated_at
BEFORE UPDATE ON public.cadastral_mortgages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();