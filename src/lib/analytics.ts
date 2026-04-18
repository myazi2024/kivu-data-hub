/**
 * Lightweight analytics helper.
 * Logs events to the audit_logs table (action prefix `analytics.`) when a user is signed in,
 * and always logs to console in dev. Safe to call without await.
 */
import { supabase } from '@/integrations/supabase/client';

export type AnalyticsEvent =
  | 'hero_cta_click'
  | 'partner_logo_click';

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
