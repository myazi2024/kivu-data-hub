import { describe, it, expect } from 'vitest';
import { insertTaxContribution, IRL_TAX_TYPE } from '../taxSharedUtils';

const mockClient = (result: { data?: any; error?: any }) => ({
  from: () => ({ insert: () => ({ select: () => ({ single: async () => result }) }) }),
});

describe('insertTaxContribution', () => {
  it('returns the server-stored entry (authoritative amount)', async () => {
    const r = await insertTaxContribution(mockClient({ data: { tax_history: [{ amount_usd: 42 }] }, error: null }), {});
    expect(r).toEqual({ entry: { amount_usd: 42 }, error: null });
  });

  it('surfaces the server duplicate message', async () => {
    const msg = 'Une déclaration « Taxe de bâtisse » pour l\'exercice 2025 existe déjà pour cette parcelle/bâtiment.';
    const r = await insertTaxContribution(mockClient({ error: { code: '23505', message: msg } }), {});
    expect(r.error).toBe(msg);
  });

  it('hides other raw database errors', async () => {
    const r = await insertTaxContribution(mockClient({ error: { code: '42501', message: 'permission denied' } }), {});
    expect(r.error).toBe('Erreur lors de la soumission de la déclaration');
  });

  it('uses the CCC label for rental income tax', () => {
    expect(IRL_TAX_TYPE).toBe('Impôt sur les revenus locatifs');
  });
});
