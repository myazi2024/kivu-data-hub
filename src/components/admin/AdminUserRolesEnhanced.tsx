import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Shield } from 'lucide-react';
import { RoleHierarchyGrid } from './roles/RoleHierarchyGrid';
import { RoleAssignForm } from './roles/RoleAssignForm';
import { UserRolesList } from './roles/UserRolesList';
import { RoleHistoryDialog } from './roles/RoleHistoryDialog';
import type { AppRole } from '@/constants/roles';
import { toast } from 'sonner';

interface AllUserProfile {
  user_id: string;
  full_name: string | null;
  email: string;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  profiles: { full_name: string | null; email: string };
}

export const AdminUserRolesEnhanced: React.FC = () => {
  const { profile, user } = useAuth();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [allUsers, setAllUsers] = useState<AllUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAdminAccess, setHasAdminAccess] = useState<boolean | null>(null);

  const isSuperAdmin = profile?.role === 'super_admin';

  const fetchAllUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, email, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) {
      console.error('Error fetching all users:', error);
      return;
    }
    setAllUsers(data || []);
  }, []);

  const fetchUserRoles = useCallback(async () => {
    try {
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('id, user_id, role, created_at, created_by')
        .order('created_at', { ascending: false });
      if (rolesError) throw rolesError;
      if (!rolesData?.length) { setUserRoles([]); setLoading(false); return; }

      const userIds = [...new Set(rolesData.map(r => r.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles').select('user_id, full_name, email').in('user_id', userIds);
      const profileMap = new Map<string, { full_name: string | null; email: string }>();
      (profilesData || []).forEach(p => profileMap.set(p.user_id, { full_name: p.full_name, email: p.email || 'Email non disponible' }));

      setUserRoles(rolesData.map((item: any) => ({
        id: item.id, user_id: item.user_id, role: item.role, created_at: item.created_at,
        profiles: profileMap.get(item.user_id) || { full_name: null, email: 'Email non disponible' },
      })));
    } catch (error) {
      console.error('Error fetching user roles:', error);
      toast.error('Impossible de charger les rôles');
      setUserRoles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const verifyAccess = async () => {
      if (!user) { setHasAdminAccess(false); setLoading(false); return; }
      const { data, error } = await supabase
        .from('user_roles').select('role').eq('user_id', user.id).in('role', ['admin', 'super_admin']);
      if (error) { setHasAdminAccess(false); setLoading(false); return; }
      const has = !!data?.length;
      setHasAdminAccess(has);
      if (has) { fetchUserRoles(); fetchAllUsers(); } else { setLoading(false); }
    };
    verifyAccess();
  }, [user, fetchUserRoles, fetchAllUsers]);

  if (loading) return <div className="text-center py-8">Chargement...</div>;
  if (!hasAdminAccess) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Seuls les administrateurs peuvent gérer les rôles</p>
        </CardContent>
      </Card>
    );
  }

  const refreshAll = () => { fetchUserRoles(); };

  return (
    <div className="space-y-3">
      <RoleHierarchyGrid userRoles={userRoles} />
      <Card>
        <CardHeader className="p-2 md:p-3 flex flex-row items-center justify-between">
          <RoleAssignForm
            allUsers={allUsers}
            currentUserId={user?.id}
            isSuperAdmin={isSuperAdmin}
            onAssigned={refreshAll}
          />
          <RoleHistoryDialog />
        </CardHeader>
      </Card>
      <UserRolesList
        userRoles={userRoles}
        currentUserId={user?.id}
        isSuperAdmin={isSuperAdmin}
        onRoleRemoved={refreshAll}
      />
    </div>
  );
};
