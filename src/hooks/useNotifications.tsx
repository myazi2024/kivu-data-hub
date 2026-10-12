import { useCallback, useEffect, useMemo } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'account' | 'system_alert';
  is_read: boolean;
  action_url?: string | null;
  created_at: string;
  read_at?: string | null;
}

export const NOTIFICATIONS_PAGE_SIZE = 20;
type Pages = InfiniteData<Notification[], string | null>;

const listKey = (uid?: string) => ['notifications', 'list', uid] as const;
const countKey = (uid?: string) => ['notifications', 'unread', uid] as const;

/** Fusionne une notification dans les pages en évitant tout doublon (par id). */
export function upsertInPages(data: Pages | undefined, n: Notification): Pages | undefined {
  if (!data) return data;
  const exists = data.pages.some((p) => p.some((x) => x.id === n.id));
  if (exists) {
    return { ...data, pages: data.pages.map((p) => p.map((x) => (x.id === n.id ? { ...x, ...n } : x))) };
  }
  const [first = [], ...rest] = data.pages;
  return { ...data, pages: [[n, ...first], ...rest] };
}

export function removeFromPages(data: Pages | undefined, id: string): Pages | undefined {
  if (!data) return data;
  return { ...data, pages: data.pages.map((p) => p.filter((x) => x.id !== id)) };
}

// Un seul abonnement temps réel par utilisateur, partagé par toutes les instances du hook.
const subscribers = new Map<string, { count: number; cleanup: () => void }>();

/**
 * Notifications de l'utilisateur connecté : une seule source partagée (cache React Query),
 * compteur exact côté serveur, pagination, temps réel dédupliqué, resynchronisation au retour
 * réseau / sur l'onglet, et mises à jour optimistes avec retour arrière.
 */
export const useNotifications = () => {
  const { user } = useAuth();
  const uid = user?.id;
  const { toast } = useToast();
  const qc = useQueryClient();

  const list = useInfiniteQuery({
    queryKey: listKey(uid),
    enabled: !!uid,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      let q = supabase
        .from('notifications')
        .select('id,title,message,type,is_read,action_url,created_at,read_at')
        .eq('user_id', uid!)
        .order('created_at', { ascending: false })
        .limit(NOTIFICATIONS_PAGE_SIZE);
      if (pageParam) q = q.lt('created_at', pageParam);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
    getNextPageParam: (last) =>
      last.length === NOTIFICATIONS_PAGE_SIZE ? last[last.length - 1].created_at : undefined,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const count = useQuery({
    queryKey: countKey(uid),
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_unread_notification_count' as never);
      if (error) throw error;
      return Math.max(0, Number(data) || 0);
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const resync = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['notifications'] });
  }, [qc]);

  // Abonnement temps réel partagé
  useEffect(() => {
    if (!uid) return;
    const existing = subscribers.get(uid);
    if (existing) {
      existing.count++;
    } else {
      const channel = supabase
        .channel(`user-notifications-${uid}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` },
          (payload) => {
            if (payload.eventType === 'DELETE') {
              const id = (payload.old as { id?: string }).id;
              if (id) qc.setQueryData<Pages>(listKey(uid), (d) => removeFromPages(d, id));
              qc.invalidateQueries({ queryKey: countKey(uid) });
              return;
            }
            const n = payload.new as Notification;
            const isNew =
              payload.eventType === 'INSERT' &&
              !qc.getQueryData<Pages>(listKey(uid))?.pages.some((p) => p.some((x) => x.id === n.id));
            qc.setQueryData<Pages>(listKey(uid), (d) => upsertInPages(d, n));
            qc.invalidateQueries({ queryKey: countKey(uid) });
            if (isNew) {
              toast({
                title: n.title,
                description: n.message,
                variant: n.type === 'error' ? 'destructive' : 'default',
              });
            }
          },
        )
        .subscribe((status) => {
          // Après (re)connexion, on recharge pour combler les messages manqués hors ligne.
          if (status === 'SUBSCRIBED') qc.invalidateQueries({ queryKey: ['notifications'] });
        });
      subscribers.set(uid, { count: 1, cleanup: () => void supabase.removeChannel(channel) });
    }
    return () => {
      const s = subscribers.get(uid);
      if (!s) return;
      s.count--;
      if (s.count <= 0) {
        s.cleanup();
        subscribers.delete(uid);
      }
    };
  }, [uid, qc, toast]);

  const notifications = useMemo(() => list.data?.pages.flat() ?? [], [list.data]);
  const unreadCount = count.data ?? notifications.filter((n) => !n.is_read).length;

  const optimistic = async (mutate: (d: Pages | undefined) => Pages | undefined, countDelta: (c: number) => number) => {
    await qc.cancelQueries({ queryKey: ['notifications'] });
    const prevList = qc.getQueryData<Pages>(listKey(uid));
    const prevCount = qc.getQueryData<number>(countKey(uid));
    qc.setQueryData<Pages>(listKey(uid), mutate);
    qc.setQueryData<number>(countKey(uid), (c) => Math.max(0, countDelta(c ?? 0)));
    return () => {
      qc.setQueryData(listKey(uid), prevList);
      qc.setQueryData(countKey(uid), prevCount);
    };
  };

  const fail = (description: string) =>
    toast({ title: 'Erreur', description, variant: 'destructive' });

  const markAsRead = async (notificationId: string) => {
    if (!uid) return;
    const target = notifications.find((n) => n.id === notificationId);
    if (!target || target.is_read) return; // double clic : aucun effet
    const rollback = await optimistic(
      (d) => d && { ...d, pages: d.pages.map((p) => p.map((x) => (x.id === notificationId ? { ...x, is_read: true } : x))) },
      (c) => c - 1,
    );
    const { error } = await supabase.rpc('mark_notification_read' as never, { _id: notificationId } as never);
    if (error) {
      rollback();
      fail('Impossible de marquer cette notification comme lue');
    }
    qc.invalidateQueries({ queryKey: countKey(uid) });
  };

  const markAllAsRead = async () => {
    if (!uid) return;
    const rollback = await optimistic(
      (d) => d && { ...d, pages: d.pages.map((p) => p.map((x) => ({ ...x, is_read: true }))) },
      () => 0,
    );
    const { error } = await supabase.rpc('mark_all_notifications_read' as never);
    if (error) {
      rollback();
      fail('Impossible de marquer les notifications comme lues');
    }
    qc.invalidateQueries({ queryKey: countKey(uid) });
  };

  const deleteNotification = async (notificationId: string) => {
    if (!uid) return;
    const target = qc.getQueryData<Pages>(listKey(uid))?.pages.flat().find((n) => n.id === notificationId);
    const rollback = await optimistic(
      (d) => removeFromPages(d, notificationId),
      (c) => (target && !target.is_read ? c - 1 : c),
    );
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', uid);
    if (error) {
      rollback();
      fail('Impossible de supprimer la notification');
    }
    qc.invalidateQueries({ queryKey: countKey(uid) });
  };

  return {
    notifications,
    unreadCount,
    loading: list.isLoading,
    loadFailed: list.isError,
    hasMore: !!list.hasNextPage,
    loadingMore: list.isFetchingNextPage,
    loadMore: () => void list.fetchNextPage(),
    fetchNotifications: resync,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
};
