
CREATE TABLE public.partner_inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  organization TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_inquiries ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a contact request (no auth required)
CREATE POLICY "Anyone can create partner inquiries"
ON public.partner_inquiries
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can read inquiries
CREATE POLICY "Admins can read partner inquiries"
ON public.partner_inquiries
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update inquiries
CREATE POLICY "Admins can update partner inquiries"
ON public.partner_inquiries
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_partner_inquiries_updated_at
BEFORE UPDATE ON public.partner_inquiries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
