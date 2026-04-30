import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ExpertOption {
  user_id: string;
  full_name: string;
  email: string | null;
}

/**
 * Lists users eligible to receive an expertise assignment
 * (`expert_immobilier` or `admin` role).
 */
export function useExpertiseExperts(enabled = true) {
  return useQuery({
    queryKey: ['expertise-eligible-experts'],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ExpertOption[]> => {
      const { data: roleRows, error: roleErr } = await (supabase as any)
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['expert_immobilier', 'admin']);
      if (roleErr) throw roleErr;
      const ids = Array.from(new Set((roleRows || []).map((r: any) => r.user_id)));
      if (ids.length === 0) return [];

      const { data: profiles, error: pErr } = await (supabase as any)
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', ids);
      if (pErr) throw pErr;

      return (profiles || [])
        .map((p: any) => ({
          user_id: p.user_id,
          full_name: [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || p.email || p.user_id,
          email: p.email ?? null,
        }))
        .sort((a: ExpertOption, b: ExpertOption) => a.full_name.localeCompare(b.full_name));
    },
  });
}
