export interface TestDataStats {
  contributions: number;
  invoices: number;
  payments: number;
  cccCodes: number;
}

/** Safely cast config objects for audit logging */
export const toRecord = (obj: unknown): Record<string, unknown> =>
  obj as Record<string, unknown>;
