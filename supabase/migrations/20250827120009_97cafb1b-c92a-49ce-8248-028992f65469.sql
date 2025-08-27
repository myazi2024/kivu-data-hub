-- Fix function search path security warnings
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  next_num INTEGER;
  invoice_num TEXT;
BEGIN
  -- Get the next invoice number (simple counter)
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'BIC-(\d+)') AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.cadastral_invoices
  WHERE invoice_number ~ '^BIC-\d+$';
  
  invoice_num := 'BIC-' || LPAD(next_num::TEXT, 6, '0');
  RETURN invoice_num;
END;
$$;

CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$;