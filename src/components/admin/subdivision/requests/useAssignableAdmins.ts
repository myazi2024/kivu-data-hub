import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AssignableAdmin {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

/**
 * Loads users that have an admin or super_admin role.
 * Uses the secure user_roles table (never the profiles table) to determine
 * who is allowed to receive a subdivision assignment.
 */
export function useAssignableAdmins() {
  const [admins, setAdmins] = useState<AssignableAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: roles, error: rolesErr } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('role', ['admin', 'super_admin']);
        if (rolesErr) throw rolesErr;
        const ids = Array.from(new Set((roles || []).map((r: any) => r.user_id)));
        if (ids.length === 0) {
          if (!cancelled) setAdmins([]);
          return;
        }
        const { data: profiles, error: profErr } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', ids);
        if (profErr) throw profErr;
        if (!cancelled) {
          setAdmins(
            (profiles || []).map((p: any) => ({
              user_id: p.user_id,
              full_name: p.full_name,
              email: p.email,
            })).sort((a, b) => (a.full_name || a.email || '').localeCompare(b.full_name || b.email || '')),
          );
        }
      } catch (e) {
        console.warn('useAssignableAdmins failed', e);
        if (!cancelled) setAdmins([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { admins, loading };
}
