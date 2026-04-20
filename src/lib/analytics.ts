/**
 * Lightweight analytics helper.
 * Logs events to the audit_logs table (action prefix `analytics.`) when a user is signed in,
 * and always logs to console in dev. Safe to call without await.
 */
import { supabase } from '@/integrations/supabase/client';

export type AnalyticsEvent =
  | 'hero_cta_click'
  | 'partner_logo_click'
  | 'cadastral_map_search'
  | 'cadastral_map_parcel_select'
  | 'cadastral_map_geolocate'
  | 'cadastral_map_whatsapp_click'
  | 'user_dashboard_tab_click'
  | 'user_profile_update'
  | 'user_contribution_delete'
  | 'user_contribution_edit_open'
  | 'user_referral_link_copy'
  | 'user_account_delete_request'
  | 'cadastral_service_view'
  | 'cadastral_service_select'
  | 'cadastral_service_unselect'
  | 'cadastral_service_purchase'
  | 'cadastral_cart_open'
  | 'cadastral_cart_pay_parcel'
  | 'cadastral_cart_complete_bundle';

export async function trackEvent(event: AnalyticsEvent, payload?: Record<string, any>) {
  try {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug('[analytics]', event, payload);
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('audit_logs').insert({
      action: `analytics.${event}`,
      user_id: user.id,
      new_values: payload ?? null,
    } as any);
  } catch {
    // never throw from analytics
  }
}
