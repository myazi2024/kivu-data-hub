// Source unique de vérité pour inférer la section type (urban/rural) depuis
// les données de la parcelle. Utilisé côté client ET côté edge function via
// le miroir `supabase/functions/_shared/sectionType.ts` — toute évolution
// doit être synchronisée dans les deux fichiers.
export type SectionType = 'urban' | 'rural';

export interface SectionTypeInput {
  quartier?: string | null;
  village?: string | null;
  // Champs informatifs (non utilisés pour l'inférence mais conservés pour debug)
  province?: string | null;
  ville?: string | null;
  commune?: string | null;
  territoire?: string | null;
  collectivite?: string | null;
  groupement?: string | null;
}

/**
 * Règle: une parcelle est urbaine si elle a un quartier renseigné ;
 * rurale si elle a un village renseigné ; urbaine par défaut.
 * (Cohérent avec la logique d'origine de l'edge function `subdivision-request`.)
 */
export function inferSectionType(parcelData: SectionTypeInput | null | undefined): SectionType {
  if (!parcelData) return 'urban';
  if (parcelData.quartier && String(parcelData.quartier).trim()) return 'urban';
  if (parcelData.village && String(parcelData.village).trim()) return 'rural';
  return 'urban';
}
