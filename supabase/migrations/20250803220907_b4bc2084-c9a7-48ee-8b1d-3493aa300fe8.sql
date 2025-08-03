-- Create publications table
CREATE TABLE public.publications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  price_usd NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'research',
  tags TEXT[],
  file_url TEXT,
  cover_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, published, archived
  featured BOOLEAN NOT NULL DEFAULT false,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table for MobileMoney transactions
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  publication_id UUID REFERENCES public.publications(id) ON DELETE CASCADE,
  amount_usd NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'mobile_money',
  transaction_id TEXT,
  phone_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, cancelled
  payment_provider TEXT, -- mpesa, orange_money, airtel_money
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create downloads tracking table
CREATE TABLE public.publication_downloads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  publication_id UUID REFERENCES public.publications(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  downloaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  UNIQUE(user_id, publication_id)
);

-- Enable Row Level Security
ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_downloads ENABLE ROW LEVEL SECURITY;

-- Publications policies
CREATE POLICY "Anyone can view published publications" 
ON public.publications 
FOR SELECT 
USING (status = 'published');

CREATE POLICY "Admins can manage all publications" 
ON public.publications 
FOR ALL 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Authors can manage their own publications" 
ON public.publications 
FOR ALL 
USING (auth.uid() = created_by);

-- Payments policies
CREATE POLICY "Users can view their own payments" 
ON public.payments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create payments" 
ON public.payments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments" 
ON public.payments 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- Downloads policies
CREATE POLICY "Users can view their own downloads" 
ON public.publication_downloads 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create download records" 
ON public.publication_downloads 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all downloads" 
ON public.publication_downloads 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- Create indexes for better performance
CREATE INDEX idx_publications_status ON public.publications(status);
CREATE INDEX idx_publications_category ON public.publications(category);
CREATE INDEX idx_publications_created_at ON public.publications(created_at);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_downloads_user_publication ON public.publication_downloads(user_id, publication_id);

-- Create triggers for updated_at
CREATE TRIGGER update_publications_updated_at
  BEFORE UPDATE ON public.publications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();