import { describe, it, expect, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { canCancelPartnerInquiry, validatePartnerDocs } from '../partnerInquiry';

const pdf = (size = 1000) => ({ name: 'a.pdf', type: 'application/pdf', size });

describe('partner inquiry rules', () => {
  it('allows cancel only before decision', () => {
    expect(canCancelPartnerInquiry('pending')).toBe(true);
    expect(canCancelPartnerInquiry('in_review')).toBe(true);
    expect(canCancelPartnerInquiry('approved')).toBe(false);
    expect(canCancelPartnerInquiry('rejected')).toBe(false);
    expect(canCancelPartnerInquiry('cancelled')).toBe(false);
  });
  it('limits to 5 documents', () => {
    expect(validatePartnerDocs([pdf(), pdf()], 3)).toBeNull();
    expect(validatePartnerDocs([pdf()], 5)).not.toBeNull();
  });
  it('rejects files over 10 MB and bad types', () => {
    expect(validatePartnerDocs([pdf(10 * 1024 * 1024 + 1)])).not.toBeNull();
    expect(validatePartnerDocs([{ name: 'x.doc', type: 'application/msword', size: 10 }])).not.toBeNull();
  });
});
