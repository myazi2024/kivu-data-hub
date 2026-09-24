/**
 * Compteurs de contributions CCC par statut.
 * Calculés côté serveur : la pagination ne doit pas fausser les totaux affichés.
 */
export interface ContributionStatusCounts {
  pending: number;
  returned: number;
  approved: number;
  rejected: number;
}

export interface ContributionStats {
  total: number;
  /** En attente = en attente de revue + retournées à corriger. */
  pending: number;
  approved: number;
  rejected: number;
  returned: number;
}

const EMPTY: ContributionStatusCounts = { pending: 0, returned: 0, approved: 0, rejected: 0 };

/** Construit les statistiques affichées à partir des compteurs serveur. */
export function computeContributionStats(
  counts: Partial<ContributionStatusCounts> | undefined,
  total: number,
): ContributionStats {
  const c = { ...EMPTY, ...(counts ?? {}) };
  return {
    total,
    pending: c.pending + c.returned,
    approved: c.approved,
    rejected: c.rejected,
    returned: c.returned,
  };
}
