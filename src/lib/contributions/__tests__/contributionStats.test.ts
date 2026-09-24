import { describe, it, expect } from 'vitest';
import { computeContributionStats } from '../contributionStats';

describe('computeContributionStats', () => {
  it('agrège les retournées avec les demandes en attente', () => {
    const stats = computeContributionStats(
      { pending: 3, returned: 2, approved: 40, rejected: 1 },
      46,
    );
    expect(stats).toEqual({ total: 46, pending: 5, approved: 40, rejected: 1, returned: 2 });
  });

  it('reste à zéro tant que les compteurs ne sont pas chargés', () => {
    expect(computeContributionStats(undefined, 0)).toEqual({
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      returned: 0,
    });
  });

  it("n'est pas limité à la page courante", () => {
    const stats = computeContributionStats(
      { pending: 0, returned: 0, approved: 120, rejected: 0 },
      120,
    );
    expect(stats.approved).toBe(120);
    expect(stats.total).toBe(120);
  });
});
