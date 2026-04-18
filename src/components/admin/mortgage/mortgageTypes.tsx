import React from 'react';
import { FileX2, Landmark } from 'lucide-react';

/** Shared interface for mortgage requests across admin components (#16) */
export interface MortgageRequest {
  id: string;
  parcel_number: string;
  contribution_type: string;
  mortgage_history: any[];
  status: string;
  created_at: string;
  user_id: string;
  original_parcel_id?: string;
  rejection_reason?: string | null;
  change_justification?: string | null;
}

/** Business lifecycle states for an approved mortgage (post-workflow) */
export type MortgageLifecycleState = 'active' | 'paid' | 'defaulted' | 'renegotiated' | 'cancelled';

/** Shared interface for validated mortgages across admin components (#16) */
export interface Mortgage {
  id: string;
  parcel_id: string;
  creditor_name: string;
  creditor_type: string;
  mortgage_amount_usd: number;
  mortgage_status: string;
  /** Business state set after the workflow status reaches approved/completed */
  lifecycle_state?: MortgageLifecycleState | null;
  contract_date: string;
  duration_months: number;
  created_at: string;
  parcel_number?: string;
  reference_number?: string;
}

/** Shared icon renderer for request types (#17) */
export const getRequestTypeIcon = (type: string): React.ReactNode => {
  return type === 'mortgage_cancellation'
    ? <FileX2 className="h-3.5 w-3.5 text-destructive" />
    : <Landmark className="h-3.5 w-3.5 text-amber-600" />;
};
