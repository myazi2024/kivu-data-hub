import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useBulkUserActions = () => {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const bulkBlockUsers = useCallback(async (
    userIds: string[],
    reason: string
  ) => {
    if (userIds.length === 0) return { success: 0, failed: 0 };

    setProcessing(true);
    setProgress(0);
    
    let success = 0;
    let failed = 0;

    try {
      // Pre-check: filter out super_admins to prevent blocking them
      const { data: superAdmins } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('user_id', userIds)
        .eq('role', 'super_admin' as any);
      
      const superAdminIds = new Set((superAdmins || []).map(sa => sa.user_id));
      const safeUserIds = userIds.filter(id => !superAdminIds.has(id));
      
      if (superAdminIds.size > 0) {
        toast.error(`${superAdminIds.size} super admin(s) ignoré(s) — impossible de les bloquer`);
      }

      for (let i = 0; i < safeUserIds.length; i++) {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({
              is_blocked: true,
              blocked_at: new Date().toISOString(),
              blocked_reason: reason
            })
            .eq('user_id', safeUserIds[i]);

          if (error) throw error;
          
          // Send notification
          await supabase.from('notifications').insert({
            user_id: safeUserIds[i],
            type: 'account',
            title: 'Compte bloqué',
            message: `Votre compte a été bloqué. Raison: ${reason}`,
            action_url: '/user-dashboard?tab=security'
          });

          success++;
        } catch (error) {
          console.error(`Error blocking user ${safeUserIds[i]}:`, error);
          failed++;
        }

        setProgress(Math.round(((i + 1) / safeUserIds.length) * 100));
      }

      toast.success(`${success} utilisateur(s) bloqué(s), ${failed} échec(s)`);
    } catch (error) {
      console.error('Error in bulk block:', error);
      toast.error('Erreur lors du blocage en masse');
    } finally {
      setProcessing(false);
      setProgress(0);
    }

    return { success, failed };
  }, []);

  const bulkUnblockUsers = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) return { success: 0, failed: 0 };

    setProcessing(true);
    setProgress(0);
    
    let success = 0;
    let failed = 0;

    try {
      for (let i = 0; i < userIds.length; i++) {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({
              is_blocked: false,
              blocked_at: null,
              blocked_reason: null
            })
            .eq('user_id', userIds[i]);

          if (error) throw error;
          
          // Send notification
          await supabase.from('notifications').insert({
            user_id: userIds[i],
            type: 'account',
            title: 'Compte débloqué',
            message: 'Votre compte a été débloqué. Vous pouvez à nouveau accéder à la plateforme.',
            action_url: '/user-dashboard'
          });

          success++;
        } catch (error) {
          console.error(`Error unblocking user ${userIds[i]}:`, error);
          failed++;
        }

        setProgress(Math.round(((i + 1) / userIds.length) * 100));
      }

      toast.success(`${success} utilisateur(s) débloqué(s), ${failed} échec(s)`);
    } catch (error) {
      console.error('Error in bulk unblock:', error);
      toast.error('Erreur lors du déblocage en masse');
    } finally {
      setProcessing(false);
      setProgress(0);
    }

    return { success, failed };
  }, []);

  const bulkAddRole = useCallback(async (
    userIds: string[],
    role: string
  ) => {
    if (userIds.length === 0) return { success: 0, failed: 0 };

    setProcessing(true);
    setProgress(0);
    
    let success = 0;
    let failed = 0;

    try {
      for (let i = 0; i < userIds.length; i++) {
        try {
          // Check if role already exists
          const { data: existing } = await supabase
            .from('user_roles')
            .select('id')
            .eq('user_id', userIds[i])
            .eq('role', role as any)
            .maybeSingle();

          if (!existing) {
            const { error } = await supabase
              .from('user_roles')
              .insert([{
                user_id: userIds[i],
                role: role as any
              }]);

            if (error) throw error;
          }

          success++;
        } catch (error) {
          console.error(`Error adding role to user ${userIds[i]}:`, error);
          failed++;
        }

        setProgress(Math.round(((i + 1) / userIds.length) * 100));
      }

      toast.success(`Rôle ajouté à ${success} utilisateur(s), ${failed} échec(s)`);
    } catch (error) {
      console.error('Error in bulk add role:', error);
      toast.error('Erreur lors de l\'ajout en masse du rôle');
    } finally {
      setProcessing(false);
      setProgress(0);
    }

    return { success, failed };
  }, []);

  return {
    processing,
    progress,
    bulkBlockUsers,
    bulkUnblockUsers,
    bulkAddRole
  };
};
