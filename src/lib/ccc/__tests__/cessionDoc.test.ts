import { describe, it, expect } from 'vitest';
import { getCessionDocLabel } from '../cessionDoc';

describe('getCessionDocLabel', () => {
  it('Vente → Acte de vente', () => expect(getCessionDocLabel('Vente')).toBe('Acte de vente'));
  it('Donation → Acte de donation', () => expect(getCessionDocLabel('Donation')).toBe('Acte de donation'));
  it('Succession → hérédité', () => expect(getCessionDocLabel('Succession')).toBe("Jugement / certificat d'hérédité"));
  it('Expropriation', () => expect(getCessionDocLabel('Expropriation')).toBe("Arrêté d'expropriation"));
  it('Échange', () => expect(getCessionDocLabel('Échange')).toBe("Acte d'échange"));
  it('autre → Acte de cession', () => expect(getCessionDocLabel('')).toBe('Acte de cession'));
});
