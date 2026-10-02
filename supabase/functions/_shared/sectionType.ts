// Miroir Deno de `src/components/cadastral/subdivision/utils/sectionType.ts`.
// Toute évolution doit rester synchrone entre les deux fichiers.
export type SectionType = 'urban' | 'rural';

export interface SectionTypeInput {
  parcel_number?: string | null;
  parcel_type?: string | null;
  quartier?: string | null;
  village?: string | null;
  province?: string | null;
  ville?: string | null;
  commune?: string | null;
  territoire?: string | null;
  collectivite?: string | null;
  groupement?: string | null;
}

export function inferSectionType(parcelData: SectionTypeInput | null | undefined): SectionType {
  if (!parcelData) return 'urban';
  // Même règle que le formulaire CCC : le préfixe SU/SR du numéro prime.
  const num = String(parcelData.parcel_number || '').trim().toUpperCase();
  if (num.startsWith('SR')) return 'rural';
  if (num.startsWith('SU')) return 'urban';
  const t = String(parcelData.parcel_type || '').trim().toUpperCase();
  if (t === 'SR' || t === 'RURAL' || t === 'RURALE') return 'rural';
  if (t === 'SU' || t === 'URBAN' || t === 'URBAINE') return 'urban';
  if (parcelData.quartier && String(parcelData.quartier).trim()) return 'urban';
  if (parcelData.village && String(parcelData.village).trim()) return 'rural';
  return 'urban';
}
