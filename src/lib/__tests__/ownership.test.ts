import { describe, it, expect } from 'vitest';
import { isOwnerDeclarationComplete, missingClaimRequirements } from '../ownership';

describe('ownership rules', () => {
  it('owner declaration needs at least one exploitation proof', () => {
    expect(isOwnerDeclarationComplete([])).toBe(false);
    expect(isOwnerDeclarationComplete([{ kind: 'identity' }])).toBe(false);
    expect(isOwnerDeclarationComplete([{ kind: 'electricity_bill' }])).toBe(true);
  });

  it('contribution claim only needs identity', () => {
    expect(missingClaimRequirements('contribution', [], '')).toEqual(["pièce d'identité"]);
    expect(missingClaimRequirements('contribution', [{ kind: 'identity' }], '')).toEqual([]);
  });

  it('contest claim needs identity, rights, exploitation and statement', () => {
    expect(missingClaimRequirements('contest', [{ kind: 'identity' }], 'court')).toHaveLength(3);
    expect(missingClaimRequirements('contest',
      [{ kind: 'identity' }, { kind: 'title' }, { kind: 'water_bill' }],
      'Je possède cette parcelle depuis 2010.')).toEqual([]);
  });
});
