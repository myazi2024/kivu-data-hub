import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Permission {
  id: string;
  resource_name: string;
  action_name: string;
  display_name: string;
  description: string | null;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role: string;
  permission_id: string;
  created_at: string;
  permissions: Permission;
}

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('resource_name', { ascending: true })
        .order('action_name', { ascending: true });

      if (error) throw error;
      setPermissions(data || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Erreur lors du chargement des permissions');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRolePermissions = useCallback(async (role?: string) => {
    try {
      let query = supabase
        .from('role_permissions')
        .select(`
          id,
          role,
          permission_id,
          created_at,
          permissions (*)
        `)
        .order('created_at', { ascending: false });

      if (role) {
        query = query.eq('role', role as any);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRolePermissions(data as any || []);
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      toast.error('Erreur lors du chargement des permissions des rôles');
    }
  }, []);

  const addPermissionToRole = useCallback(async (role: string, permissionId: string) => {
    try {
      const { error } = await supabase
        .from('role_permissions')
        .insert([{
          role: role as any,
          permission_id: permissionId
        }]);

      if (error) throw error;
      
      toast.success('Permission ajoutée au rôle');
      await fetchRolePermissions(role);
      return true;
    } catch (error: any) {
      console.error('Error adding permission to role:', error);
      toast.error(error.message || 'Erreur lors de l\'ajout de la permission');
      return false;
    }
  }, [fetchRolePermissions]);

  const removePermissionFromRole = useCallback(async (rolePermissionId: string, role: string) => {
    try {
      const { error } = await supabase
        .from('role_permissions')
        .delete()
        .eq('id', rolePermissionId);

      if (error) throw error;
      
      toast.success('Permission retirée du rôle');
      await fetchRolePermissions(role);
      return true;
    } catch (error: any) {
      console.error('Error removing permission from role:', error);
      toast.error(error.message || 'Erreur lors du retrait de la permission');
      return false;
    }
  }, [fetchRolePermissions]);

  const checkUserPermission = useCallback(async (
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('user_has_permission', {
        _user_id: userId,
        _resource: resource,
        _action: action
      });

      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Error checking user permission:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
    fetchRolePermissions();
  }, [fetchPermissions, fetchRolePermissions]);

  return {
    permissions,
    rolePermissions,
    loading,
    fetchPermissions,
    fetchRolePermissions,
    addPermissionToRole,
    removePermissionFromRole,
    checkUserPermission
  };
};
