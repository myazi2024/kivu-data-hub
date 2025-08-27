-- Create cadastral billing tables
CREATE TABLE public.cadastral_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  parcel_number TEXT NOT NULL,
  search_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  selected_services JSONB NOT NULL, -- Array of selected service types
  total_amount_usd NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, failed
  payment_id UUID REFERENCES payments(id),
  invoice_number TEXT NOT NULL UNIQUE,
  client_name TEXT,
  client_email TEXT NOT NULL,
  client_organization TEXT,
  geographical_zone TEXT,
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cadastral service access table to track what user has paid for
CREATE TABLE public.cadastral_service_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  invoice_id UUID NOT NULL REFERENCES cadastral_invoices(id) ON DELETE CASCADE,
  parcel_number TEXT NOT NULL,
  service_type TEXT NOT NULL, -- 'information', 'location_history', 'history', 'obligations'
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiry for access
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cadastral_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadastral_service_access ENABLE ROW LEVEL SECURITY;

-- Policies for cadastral_invoices
CREATE POLICY "Users can view their own invoices" 
ON public.cadastral_invoices 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own invoices" 
ON public.cadastral_invoices 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices" 
ON public.cadastral_invoices 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all invoices" 
ON public.cadastral_invoices 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- Policies for cadastral_service_access
CREATE POLICY "Users can view their own service access" 
ON public.cadastral_service_access 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage service access" 
ON public.cadastral_service_access 
FOR ALL
USING (true)
WITH CHECK (true);

-- Create function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  invoice_num TEXT;
BEGIN
  -- Get the next invoice number (simple counter)
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'BIC-(\d+)') AS INTEGER)), 0) + 1
  INTO next_num
  FROM cadastral_invoices
  WHERE invoice_number ~ '^BIC-\d+$';
  
  invoice_num := 'BIC-' || LPAD(next_num::TEXT, 6, '0');
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate invoice numbers
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_invoice_number
  BEFORE INSERT ON cadastral_invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_number();

-- Create trigger for updated_at
CREATE TRIGGER update_cadastral_invoices_updated_at
  BEFORE UPDATE ON cadastral_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();