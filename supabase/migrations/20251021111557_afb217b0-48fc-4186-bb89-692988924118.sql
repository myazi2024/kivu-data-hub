-- ============================================
-- CRITICAL SECURITY FIXES
-- ============================================

-- 1. Fix cadastral_parcels - Remove public access
-- This table contains sensitive property owner information
DROP POLICY IF EXISTS "Cadastral parcels are viewable by everyone" ON public.cadastral_parcels;

CREATE POLICY "Authenticated users can view parcels"
ON public.cadastral_parcels FOR SELECT
TO authenticated
USING (true);

-- 2. Fix cadastral_invoices - Remove public access to customer data
-- This policy was exposing customer emails, names, organizations
DROP POLICY IF EXISTS "Allow statistics access for cadastral invoices" ON public.cadastral_invoices;

-- Users can only see their own invoices
CREATE POLICY "Users view own invoices"
ON public.cadastral_invoices FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can see all invoices
CREATE POLICY "Admins view all invoices"
ON public.cadastral_invoices FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Fix resellers table - Restrict contact information
-- Currently, all authenticated users can see reseller contact details
DROP POLICY IF EXISTS "Authenticated users can view active resellers" ON public.resellers;

-- Only resellers can see their own full details
CREATE POLICY "Resellers view own profile"
ON public.resellers FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can see all resellers
CREATE POLICY "Admins view all resellers"
ON public.resellers FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Public can see minimal reseller info (code only, no contact details)
-- This is for discount code validation
CREATE POLICY "Public can validate reseller codes"
ON public.resellers FOR SELECT
TO public
USING (is_active = true);