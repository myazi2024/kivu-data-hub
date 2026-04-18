import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Checks whether the current authenticated user has a specific permission
 * via the `user_has_permission` RPC. Returns `null` while loading.
 */
export function useUserPermission(resource: string, action: string) {
  const { user } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setAllowed(false);
      return;
    }
    setAllowed(null);
    supabase
      .rpc('user_has_permission', {
        _user_id: user.id,
        _resource: resource,
        _action: action,
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn('[useUserPermission] RPC error:', error.message);
          setAllowed(false);
          return;
        }
        setAllowed(Boolean(data));
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, resource, action]);

  return allowed;
}
