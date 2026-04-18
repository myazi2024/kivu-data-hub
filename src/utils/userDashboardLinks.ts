/**
 * Centralized route mapping for the user space.
 * Single source of truth — never hardcode old routes in components.
 */

/** Route to navigate to in order to contribute / open the cadastral map. */
export const CADASTRAL_MAP_ROUTE = '/cadastral-map';

/**
 * Map legacy/obsolete routes to current routes.
 * Used by NotificationBell to fix stale action_url values from old notifications.
 */
const LEGACY_ROUTE_MAPPING: Record<string, string> = {
  '/user-dashboard': '/mon-compte',
  '/carte-cadastrale': '/cadastral-map',
  '/dashboard': '/mon-compte',
};

export function resolveActionUrl(actionUrl: string): string {
  if (!actionUrl) return actionUrl;
  const [basePath, queryString] = actionUrl.split('?');
  const resolved = LEGACY_ROUTE_MAPPING[basePath] || basePath;
  return queryString ? `${resolved}?${queryString}` : resolved;
}
