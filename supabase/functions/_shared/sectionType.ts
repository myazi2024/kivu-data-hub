// Miroir Deno de `src/components/cadastral/subdivision/utils/sectionType.ts`.
// Toute évolution doit rester synchrone entre les deux fichiers.
export type SectionType = 'urban' | 'rural';

export interface SectionTypeInput {
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
  if (parcelData.quartier && String(parcelData.quartier).trim()) return 'urban';
  if (parcelData.village && String(parcelData.village).trim()) return 'rural';
  return 'urban';
}
