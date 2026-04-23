/**
 * Centralized admin analytics + queryKey invalidation helper.
 *
 * Goals:
 *  - One call site for `trackEvent('admin_action', ...)` so payload shapes
 *    stay consistent across all admin modules.
 *  - One mapping from "module" to the queryKey prefixes that should be
 *    invalidated after a critical action — keeps navigation counts and
 *    list views in sync with mutations.
 *
 * Usage:
 *   const { trackAdminAction } = useAdminAnalytics();
 *   await trackAdminAction({
 *     module: 'mortgage',
 *     action: 'approve',
 *     ref: { request_id: row.id, reference_number: row.reference_number },
 *   });
 */
import { useCallback } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { trackEvent } from '@/lib/analytics';

export type AdminModule =
  | 'expertise'
  | 'land_title'
  | 'mutation'
  | 'mortgage'
  | 'land_dispute'
  | 'ccc'
  | 'subdivision'
  | 'fraud'
  | 'permits'
  | 'billing'
  | 'users'
  | 'roles'
  | 'config';

export interface AdminActionPayload {
  module: AdminModule;
  /** Free-form action verb: approve | reject | block | unblock | bulk_approve … */
  action: string;
  /** Optional reference fields (request id, parcel number, user id…). */
  ref?: Record<string, unknown>;
  /** Optional extra metadata (count, amount, reason…). */
  meta?: Record<string, unknown>;
}

/**
 * Mapping module → queryKey prefixes invalidated on every critical action.
 * Keys are matched as prefixes by react-query — passing `['admin-pending-counts']`
 * invalidates every query whose key starts with that array.
 */
const INVALIDATION_MAP: Record<AdminModule, string[][]> = {
  expertise: [['admin-pending-counts'], ['expertise-requests']],
  land_title: [['admin-pending-counts'], ['land-title-requests']],
  mutation: [['admin-pending-counts'], ['mutation-requests']],
  mortgage: [['admin-pending-counts'], ['mortgage-requests']],
  land_dispute: [['admin-pending-counts'], ['land-disputes']],
  ccc: [['admin-pending-counts'], ['ccc-contributions'], ['user-resource', 'cadastral_contributions']],
  subdivision: [['admin-pending-counts'], ['subdivision-requests']],
  fraud: [['admin-pending-counts'], ['fraud-detection']],
  permits: [['admin-pending-counts'], ['building-permits']],
  billing: [['admin-pending-counts'], ['invoices'], ['transactions']],
  users: [['admin-users']],
  roles: [['admin-users'], ['user-roles']],
  config: [],
};

export function invalidateAdminQueries(qc: QueryClient, module: AdminModule) {
  const prefixes = INVALIDATION_MAP[module] ?? [];
  for (const queryKey of prefixes) {
    qc.invalidateQueries({ queryKey });
  }
}

export function useAdminAnalytics() {
  const qc = useQueryClient();

  const trackAdminAction = useCallback(
    (payload: AdminActionPayload) => {
      const { module, action, ref, meta } = payload;
      // Fire-and-forget analytics
      void trackEvent('admin_action', { module, action, ...(ref ?? {}), ...(meta ?? {}) });
      // Unified queryKey invalidation
      invalidateAdminQueries(qc, module);
    },
    [qc],
  );

  return { trackAdminAction };
}
