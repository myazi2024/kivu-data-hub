import type { StatusType } from '@/components/shared/StatusBadge';
import { normalizeMortgageStatus } from '@/utils/mortgageReferences';
import type { MortgageLifecycleState } from './mortgageTypes';

/**
 * Resolve effective lifecycle state from a mortgage row.
 * Workflow status `approved` / `completed` without explicit lifecycle defaults to `active`.
 */
export const resolveLifecycleState = (
  mortgageStatus?: string | null,
  lifecycleState?: MortgageLifecycleState | null,
): MortgageLifecycleState | null => {
  if (lifecycleState) return lifecycleState;
  const normalized = (mortgageStatus || '').toLowerCase();
  if (['approved', 'completed', 'active'].includes(normalized)) return 'active';
  if (['paid', 'paid_off', 'settled'].includes(normalized)) return 'paid';
  return null;
};

export const getMortgageStatusType = (status: string, lifecycle?: MortgageLifecycleState | null): StatusType => {
  const effective = resolveLifecycleState(status, lifecycle);
  if (effective) {
    switch (effective) {
      case 'active': return 'active';
      case 'paid': return 'paid';
      case 'defaulted': return 'defaulted';
      case 'renegotiated': return 'active';
      case 'cancelled': return 'rejected';
    }
  }
  const normalized = normalizeMortgageStatus(status);
  switch (normalized) {
    case 'active': return 'active';
    case 'paid': return 'paid';
    case 'en_defaut': return 'defaulted';
    case 'renegociee': return 'active';
    case 'pending': return 'pending';
    case 'rejected': return 'rejected';
    case 'approved': return 'active';
    case 'in_review': return 'pending';
    case 'returned': return 'pending';
    default: return 'pending';
  }
};

export const getLifecycleLabel = (state: MortgageLifecycleState | null | undefined): string => {
  switch (state) {
    case 'active': return 'Active';
    case 'paid': return 'Soldée';
    case 'defaulted': return 'En défaut';
    case 'renegotiated': return 'Renégociée';
    case 'cancelled': return 'Annulée';
    default: return '—';
  }
};

export const getCreditorTypeLabel = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'bank': case 'banque': return 'Banque';
    case 'microfinance': return 'Microfinance';
    case 'private': case 'particulier': return 'Particulier';
    case 'coopérative': return 'Coopérative';
    default: return type || 'Non spécifié';
  }
};

export const getRequestTypeLabel = (type: string) => {
  return type === 'mortgage_cancellation' ? 'Radiation' : 'Enregistrement';
};

// Fix #18: Removed dead normalizeStatusForFilter function (was just a pass-through to normalizeMortgageStatus)
