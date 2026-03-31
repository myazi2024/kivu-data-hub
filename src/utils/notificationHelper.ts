/**
 * Centralized notification creation utility.
 * All notification inserts should go through this helper to ensure
 * consistent types, error handling, and action_url mapping.
 */
import { supabase } from '@/integrations/supabase/client';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'account';

interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  actionUrl?: string;
}

/**
 * Normalize action_url to use current routes.
 * Keeps the mapping in one place instead of scattered across components.
 */
const normalizeActionUrl = (url?: string): string | undefined => {
  if (!url) return undefined;
  const routeMapping: Record<string, string> = {
    '/user-dashboard': '/mon-compte',
  };
  const [basePath, queryString] = url.split('?');
  const resolved = routeMapping[basePath] || basePath;
  return queryString ? `${resolved}?${queryString}` : resolved;
};

/**
 * Create a single notification for a user.
 * Handles error logging internally — never throws.
 */
export const createNotification = async (params: CreateNotificationParams): Promise<boolean> => {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      action_url: normalizeActionUrl(params.actionUrl),
    });
    if (error) {
      console.warn('Notification insert failed:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Notification insert exception:', e);
    return false;
  }
};

/**
 * Create notifications for multiple users at once (e.g. notify all admins).
 */
export const createBulkNotifications = async (
  notifications: CreateNotificationParams[]
): Promise<boolean> => {
  if (notifications.length === 0) return true;
  try {
    const rows = notifications.map(n => ({
      user_id: n.userId,
      title: n.title,
      message: n.message,
      type: n.type,
      action_url: normalizeActionUrl(n.actionUrl),
    }));
    const { error } = await supabase.from('notifications').insert(rows);
    if (error) {
      console.warn('Bulk notification insert failed:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Bulk notification insert exception:', e);
    return false;
  }
};
