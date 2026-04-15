export interface TestDataStats {
  parcels: number;
  contributions: number;
  invoices: number;
  payments: number;
  cccCodes: number;
  serviceAccess: number;
  titleRequests: number;
  expertiseRequests: number;
  expertisePayments: number;
  disputes: number;
  boundaryConflicts: number;
  
  ownershipHistory: number;
  taxHistory: number;
  fraudAttempts: number;
  certificates: number;
  boundaryHistory: number;
  mortgages: number;
  buildingPermits: number;
  mutationRequests: number;
  subdivisionRequests: number;
}

export const EMPTY_STATS: TestDataStats = {
  parcels: 0,
  contributions: 0,
  invoices: 0,
  payments: 0,
  cccCodes: 0,
  serviceAccess: 0,
  titleRequests: 0,
  expertiseRequests: 0,
  expertisePayments: 0,
  disputes: 0,
  boundaryConflicts: 0,
  
  ownershipHistory: 0,
  taxHistory: 0,
  fraudAttempts: 0,
  certificates: 0,
  boundaryHistory: 0,
  mortgages: 0,
  buildingPermits: 0,
  mutationRequests: 0,
  subdivisionRequests: 0,
};

/** Generation step for progress tracking */
export interface GenerationStep {
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
}

/** Safely cast config objects for audit logging */
export const toRecord = (obj: unknown): Record<string, unknown> =>
  obj as Record<string, unknown>;
