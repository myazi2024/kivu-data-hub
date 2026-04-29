-- Étendre les politiques "admin only" aux super_admins via has_role()
-- Pattern: DROP + CREATE pour chaque policy qui utilisait get_current_user_role() = 'admin'

-- article_themes
DROP POLICY IF EXISTS "Admins can manage themes" ON public.article_themes;
CREATE POLICY "Admins can manage themes" ON public.article_themes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- articles
DROP POLICY IF EXISTS "Admins can manage all articles" ON public.articles;
CREATE POLICY "Admins can manage all articles" ON public.articles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- audit_logs (SELECT only)
DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Only admins can view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- cadastral_contribution_config
DROP POLICY IF EXISTS "Admins can manage contribution config" ON public.cadastral_contribution_config;
CREATE POLICY "Admins can manage contribution config" ON public.cadastral_contribution_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- cadastral_contributions (UPDATE)
DROP POLICY IF EXISTS "Admins can update contributions" ON public.cadastral_contributions;
CREATE POLICY "Admins can update contributions" ON public.cadastral_contributions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- cadastral_contributions (SELECT)
DROP POLICY IF EXISTS "Admins can view all contributions" ON public.cadastral_contributions;
CREATE POLICY "Admins can view all contributions" ON public.cadastral_contributions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- cadastral_contributor_codes (UPDATE; preserve owner OR admin/super_admin)
DROP POLICY IF EXISTS "System can update codes" ON public.cadastral_contributor_codes;
CREATE POLICY "System can update codes" ON public.cadastral_contributor_codes
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id
         OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'super_admin'));

-- cadastral_invoices (SELECT)
DROP POLICY IF EXISTS "Admins can view all invoices" ON public.cadastral_invoices;
CREATE POLICY "Admins can view all invoices" ON public.cadastral_invoices
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- cadastral_results_config
DROP POLICY IF EXISTS "Admins can manage results config" ON public.cadastral_results_config;
CREATE POLICY "Admins can manage results config" ON public.cadastral_results_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- cadastral_search_config (LE BUG initial)
DROP POLICY IF EXISTS "Admins can manage search config" ON public.cadastral_search_config;
CREATE POLICY "Admins can manage search config" ON public.cadastral_search_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- cadastral_services_config
DROP POLICY IF EXISTS "Only admins can manage services config" ON public.cadastral_services_config;
CREATE POLICY "Only admins can manage services config" ON public.cadastral_services_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- discount_codes
DROP POLICY IF EXISTS "Admins can manage all discount codes" ON public.discount_codes;
CREATE POLICY "Admins can manage all discount codes" ON public.discount_codes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- notifications (DELETE)
DROP POLICY IF EXISTS "Admins can delete any notification" ON public.notifications;
CREATE POLICY "Admins can delete any notification" ON public.notifications
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- notifications (UPDATE)
DROP POLICY IF EXISTS "Admins can update any notification" ON public.notifications;
CREATE POLICY "Admins can update any notification" ON public.notifications
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- notifications (SELECT)
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;
CREATE POLICY "Admins can view all notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- payment_methods_config
DROP POLICY IF EXISTS "Admins can manage payment methods" ON public.payment_methods_config;
CREATE POLICY "Admins can manage payment methods" ON public.payment_methods_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- payment_transactions (SELECT)
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.payment_transactions;
CREATE POLICY "Admins can view all transactions" ON public.payment_transactions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- payments (SELECT)
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
CREATE POLICY "Admins can view all payments" ON public.payments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- publication_downloads (SELECT)
DROP POLICY IF EXISTS "Admins can view all downloads" ON public.publication_downloads;
CREATE POLICY "Admins can view all downloads" ON public.publication_downloads
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- publications
DROP POLICY IF EXISTS "Admins can manage all publications" ON public.publications;
CREATE POLICY "Admins can manage all publications" ON public.publications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- reseller_sales
DROP POLICY IF EXISTS "Admins can view all sales" ON public.reseller_sales;
CREATE POLICY "Admins can view all sales" ON public.reseller_sales
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- resellers
DROP POLICY IF EXISTS "Admins can manage all resellers" ON public.resellers;
CREATE POLICY "Admins can manage all resellers" ON public.resellers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));