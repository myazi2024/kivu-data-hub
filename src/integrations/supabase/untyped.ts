/**
 * Helpers centralisés pour les tables Supabase **non générées** dans `types.ts`
 * (read-only). Permet d'isoler les `as any` à un seul point d'entrée par table
 * au lieu de les disséminer dans les composants.
 *
 * Lorsque les types seront regénérés, il suffira de remplacer ces helpers par
 * `supabase.from('table')` direct.
 */
import { supabase } from './client';

type AnyClient = any;

const cast = supabase as AnyClient;

/** Tables connues non typées (à enrichir au besoin) */
export const untypedTables = {
  subdivision_rate_config: () => cast.from('subdivision_rate_config'),
  subdivision_zoning_rules: () => cast.from('subdivision_zoning_rules'),
  partners: () => cast.from('partners'),
} as const;

/** Cast générique pour payload partiel (Insert/Update) sur table non typée */
export const asUntypedPayload = <T extends Record<string, unknown>>(payload: T): any => payload;

/** Récupère VITE_SUPABASE_URL sans cast `import.meta as any` à chaque usage */
export const getSupabaseUrl = (): string | undefined =>
  (import.meta as unknown as { env?: { VITE_SUPABASE_URL?: string } }).env?.VITE_SUPABASE_URL;
