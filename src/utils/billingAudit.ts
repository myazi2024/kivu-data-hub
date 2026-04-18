import { supabase } from '@/integrations/supabase/client';

/**
 * Centralized helper to log admin billing/pricing config changes.
 * Writes to `billing_config_audit` (admin RLS).
 */
export async function logBillingAudit(params: {
  tableName: string;
  recordId?: string | null;
  action: 'create' | 'update' | 'delete' | string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const adminId = userData.user?.id ?? null;
    const adminName =
      (userData.user?.user_metadata?.full_name as string) ||
      userData.user?.email ||
      null;

    const { error } = await supabase.from('billing_config_audit').insert({
      admin_id: adminId,
      admin_name: adminName,
      table_name: params.tableName,
      record_id: params.recordId ?? null,
      action: params.action,
      old_values: params.oldValues ?? null,
      new_values: params.newValues ?? null,
    });
    if (error) console.error('[billingAudit] insert failed', error);
  } catch (e) {
    console.error('[billingAudit] unexpected error', e);
  }
}
