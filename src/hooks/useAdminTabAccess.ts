import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  ADMIN_TAB_PERMISSIONS,
  ALWAYS_ACCESSIBLE_TABS,
} from '@/config/adminTabPermissions';

/**
 * Charge l'ensemble des permissions effectives de l'utilisateur courant
 * (via les rôles + table `role_permissions`) une seule fois.
 *
 * `super_admin` court-circuite la vérification : il a accès à tout.
 *
 * Retourne :
 *   - `loading` : true tant que la résolution n'est pas terminée
 *   - `isSuperAdmin` : true si l'utilisateur est super_admin
 *   - `canAccessTab(tab)` : true si l'onglet est autorisé
 *   - `accessibleTabs` : Set des onglets autorisés (utile pour filtrer la sidebar)
 */
export function useAdminTabAccess() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [permissionKeys, setPermissionKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.id) {
        if (!cancelled) {
          setLoading(false);
          setIsSuperAdmin(false);
          setPermissionKeys(new Set());
        }
        return;
      }
      setLoading(true);
      try {
        // 1. Roles
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        const roleList = (roles ?? []).map((r: any) => String(r.role));
        const superAdmin = roleList.includes('super_admin');

        let keys = new Set<string>();
        if (!superAdmin && roleList.length > 0) {
          // 2. Permissions associées aux rôles
          const { data: rps } = await supabase
            .from('role_permissions')
            .select('role, permissions(resource_name, action_name)')
            .in('role', roleList as any);

          (rps ?? []).forEach((row: any) => {
            const p = row.permissions;
            if (p?.resource_name && p?.action_name) {
              keys.add(`${p.resource_name}:${p.action_name}`);
            }
          });
        }

        if (!cancelled) {
          setIsSuperAdmin(superAdmin);
          setPermissionKeys(keys);
          setLoading(false);
        }
      } catch (err) {
        console.warn('[useAdminTabAccess] load failed:', err);
        if (!cancelled) {
          setIsSuperAdmin(false);
          setPermissionKeys(new Set());
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const canAccessTab = useMemo(
    () => (tab: string) => {
      if (isSuperAdmin) return true;
      if (ALWAYS_ACCESSIBLE_TABS.has(tab)) return true;
      const required = ADMIN_TAB_PERMISSIONS[tab];
      if (!required) return true; // Onglet non sensible → admin OK
      return permissionKeys.has(`${required.resource}:${required.action}`);
    },
    [isSuperAdmin, permissionKeys],
  );

  return { loading, isSuperAdmin, canAccessTab };
}
