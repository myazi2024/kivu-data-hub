import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getHighestRole } from '@/constants/roles';

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  organization: string;
  role: string;
  created_at: string;
  avatar_url: string;
  is_blocked: boolean;
  blocked_at: string | null;
  blocked_reason: string | null;
  fraud_strikes: number;
}

export interface FetchUsersOptions {
  /** 0-based offset (range start). Defaults to 0. */
  from?: number;
  /** Inclusive end of range. Defaults to 999 (1000 rows max). */
  to?: number;
  sortBy?: 'created_at' | 'full_name' | 'email';
  sortOrder?: 'asc' | 'desc';
  blockedOnly?: boolean;
}

export const useUserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState<number>(0);

  const fetchUsers = useCallback(async (opts: FetchUsersOptions = {}) => {
    const { from = 0, to = 999, sortBy = 'created_at', sortOrder = 'desc', blockedOnly } = opts;
    try {
      setLoading(true);

      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to);

      if (blockedOnly) query = query.eq('is_blocked', true);

      const { data: profilesData, error: profilesError, count } = await query;
      if (profilesError) throw profilesError;
      setTotalCount(count || 0);

      const userIds = profilesData?.map((p) => p.user_id) || [];
      if (userIds.length === 0) {
        setUsers([]);
        return;
      }

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      if (rolesError) console.error('Error fetching roles:', rolesError);

      const usersWithRoles = profilesData?.map((profile) => {
        const userRoles =
          rolesData?.filter((r) => r.user_id === profile.user_id).map((r) => r.role as string) || [];
        const highestRole = getHighestRole(userRoles);
        return {
          ...profile,
          email: profile.email || 'Email non disponible',
          role: highestRole,
        };
      });

      setUsers(usersWithRoles || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const blockUser = useCallback(async (userId: string, reason: string, userRole: string) => {
    try {
      if (userRole === 'super_admin') {
        toast.error('Impossible de bloquer un super administrateur');
        return false;
      }
      const { error } = await supabase
        .from('profiles')
        .update({
          is_blocked: true,
          blocked_at: new Date().toISOString(),
          blocked_reason: reason,
        })
        .eq('user_id', userId);
      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === userId
            ? { ...u, is_blocked: true, blocked_at: new Date().toISOString(), blocked_reason: reason }
            : u
        )
      );
      toast.success('Utilisateur bloqué avec succès');
      return true;
    } catch (error: any) {
      console.error('Error blocking user:', error);
      toast.error("Erreur lors du blocage de l'utilisateur");
      return false;
    }
  }, []);

  const unblockUser = useCallback(async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_blocked: false, blocked_at: null, blocked_reason: null })
        .eq('user_id', userId);
      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === userId ? { ...u, is_blocked: false, blocked_at: null, blocked_reason: null } : u
        )
      );
      toast.success('Utilisateur débloqué avec succès');
      return true;
    } catch (error: any) {
      console.error('Error unblocking user:', error);
      toast.error("Erreur lors du déblocage de l'utilisateur");
      return false;
    }
  }, []);

  return { users, loading, totalCount, fetchUsers, blockUser, unblockUser };
};
