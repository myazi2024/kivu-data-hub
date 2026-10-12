/**
 * Création centralisée des notifications.
 * Le navigateur n'insère jamais directement dans `notifications` : tout passe
 * par la RPC `notify_user` (soi-même, ou n'importe qui pour un admin), qui
 * valide le type, le lien interne et ignore les doublons (`dedupe_key`).
 */
import { supabase } from '@/integrations/supabase/client';
import { resolveActionUrl } from '@/utils/userDashboardLinks';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'account';

const ALLOWED: ReadonlySet<string> = new Set(['info', 'success', 'warning', 'error', 'account']);

interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  actionUrl?: string;
  dedupeKey?: string;
}

/** Forme « ligne » acceptée par les anciens appels (`user_id`, `action_url`…). */
export interface NotificationRow {
  user_id: string;
  title: string;
  message: string;
  type?: string;
  action_url?: string | null;
  dedupe_key?: string;
}

const normalizeActionUrl = (url?: string | null): string | null => {
  if (!url) return null;
  const resolved = resolveActionUrl(url);
  return /^\/[^/\\]/.test(resolved) ? resolved : null;
};

export const normalizeNotificationType = (type?: string): NotificationType =>
  (type && ALLOWED.has(type) ? type : 'info') as NotificationType;

/** Envoie une notification via la RPC sécurisée. Ne lève jamais d'exception. */
export const insertNotification = async (row: NotificationRow): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase.rpc('notify_user' as never, {
      _user_id: row.user_id,
      _title: row.title.slice(0, 200),
      _message: row.message.slice(0, 2000),
      _type: normalizeNotificationType(row.type),
      _action_url: normalizeActionUrl(row.action_url),
      _dedupe_key: row.dedupe_key ?? null,
    } as never);
    if (error) {
      console.warn('Notification non envoyée :', error.message);
      return { error: new Error(error.message) };
    }
    return { error: null };
  } catch (e) {
    console.warn('Notification non envoyée :', e);
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
};

export const createNotification = async (params: CreateNotificationParams): Promise<boolean> => {
  const { error } = await insertNotification({
    user_id: params.userId,
    title: params.title,
    message: params.message,
    type: params.type,
    action_url: params.actionUrl,
    dedupe_key: params.dedupeKey,
  });
  return !error;
};

export const createBulkNotifications = async (
  notifications: CreateNotificationParams[],
): Promise<boolean> => {
  const results = await Promise.all(notifications.map(createNotification));
  return results.every(Boolean);
};
