import type { StatusType } from '@/components/shared/StatusBadge';
import { normalizeMortgageStatus } from '@/utils/mortgageReferences';

export const getMortgageStatusType = (status: string): StatusType => {
  const normalized = normalizeMortgageStatus(status);
  switch (normalized) {
    case 'active': return 'active';
    case 'paid': return 'paid';
    case 'en_defaut': return 'defaulted';
    case 'pending': return 'pending';
    case 'rejected': return 'rejected';
    case 'approved': return 'active';
    case 'returned': return 'pending';
    default: return 'pending';
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
