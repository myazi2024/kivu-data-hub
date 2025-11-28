import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

const ROLE_HIERARCHY = ['super_admin', 'admin', 'partner', 'user'];

export const useUserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      
      // Optimized query with join to get profiles and roles in one call
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles for all users
      const userIds = profilesData?.map(p => p.user_id) || [];
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      }

      // Combine profiles with their highest role
      const usersWithRoles = profilesData?.map(profile => {
        const userRoles = rolesData?.filter(r => r.user_id === profile.user_id).map(r => r.role) || [];
        let highestRole = 'user';
        
        for (const hierarchyRole of ROLE_HIERARCHY) {
          if (userRoles.includes(hierarchyRole as any)) {
            highestRole = hierarchyRole;
            break;
          }
        }

        return {
          ...profile,
          role: highestRole
        };
      });

      setUsers(usersWithRoles || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  }, []);

  const blockUser = useCallback(async (userId: string, reason: string, userRole: string) => {
    try {
      // Security check: prevent blocking super_admin
      if (userRole === 'super_admin') {
        toast.error('Impossible de bloquer un super administrateur');
        return false;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          is_blocked: true,
          blocked_at: new Date().toISOString(),
          blocked_reason: reason
        })
        .eq('user_id', userId);

      if (error) throw error;

      // Create audit log
      await supabase.from('audit_logs').insert({
        action: 'block_user',
        table_name: 'profiles',
        record_id: userId,
        new_values: { is_blocked: true, blocked_reason: reason }
      });

      // Update local state instead of full refetch
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.user_id === userId 
            ? { ...u, is_blocked: true, blocked_at: new Date().toISOString(), blocked_reason: reason }
            : u
        )
      );

      toast.success('Utilisateur bloqué avec succès');
      return true;
    } catch (error: any) {
      console.error('Error blocking user:', error);
      toast.error('Erreur lors du blocage de l\'utilisateur');
      return false;
    }
  }, []);

  const unblockUser = useCallback(async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_blocked: false,
          blocked_at: null,
          blocked_reason: null
        })
        .eq('user_id', userId);

      if (error) throw error;

      // Create audit log
      await supabase.from('audit_logs').insert({
        action: 'unblock_user',
        table_name: 'profiles',
        record_id: userId,
        new_values: { is_blocked: false }
      });

      // Update local state instead of full refetch
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.user_id === userId 
            ? { ...u, is_blocked: false, blocked_at: null, blocked_reason: null }
            : u
        )
      );

      toast.success('Utilisateur débloqué avec succès');
      return true;
    } catch (error: any) {
      console.error('Error unblocking user:', error);
      toast.error('Erreur lors du déblocage de l\'utilisateur');
      return false;
    }
  }, []);

  return {
    users,
    loading,
    fetchUsers,
    blockUser,
    unblockUser
  };
};
