import { supabase } from '@/integrations/supabase/client';

export type ContributionAuditAction =
  | 'approve'
  | 'reject'
  | 'return'
  | 'bulk_approve'
  | 'bulk_reject'
  | 'invalidate_code';

/**
 * Log an admin action on a CCC contribution into cadastral_contribution_audit.
 * Best-effort: never throws — failures are logged to console only.
 */
export async function logContributionAudit(params: {
  contributionId: string;
  action: ContributionAuditAction;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let adminName: string | null = null;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', user.id)
        .maybeSingle();
      adminName = (profile as any)?.full_name ?? (profile as any)?.email ?? user.email ?? null;
    } catch {
      adminName = user.email ?? null;
    }

    await supabase.from('cadastral_contribution_audit').insert({
      contribution_id: params.contributionId,
      admin_id: user.id,
      admin_name: adminName,
      action: params.action,
      payload: params.payload ?? null,
    });
  } catch (err) {
    console.error('[audit] failed to log contribution audit', err);
  }
}
