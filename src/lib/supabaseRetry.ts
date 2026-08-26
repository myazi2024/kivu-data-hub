/**
 * Réessai silencieux des requêtes Supabase sur erreurs transitoires.
 *
 * Au démarrage (surtout en preview), les premières requêtes peuvent partir avant
 * que la session soit prête : PostgREST renvoie alors PGRST303 ("JWT issued at future"),
 * PGRST301 (JWT expiré) ou PGRST002 (cache de schéma). Ces erreurs disparaissent
 * après quelques centaines de millisecondes ; il ne faut donc pas afficher de toast
 * d'erreur au premier échec.
 */

const TRANSIENT_CODES = new Set(['PGRST002', 'PGRST301', 'PGRST303']);
const DEFAULT_DELAYS = [400, 900, 1800];

export const isTransientSupabaseError = (error: unknown): boolean => {
  if (!error) return false;
  const e = error as { code?: string; message?: string };
  if (e.code && TRANSIENT_CODES.has(e.code)) return true;
  const msg = (e.message || '').toLowerCase();
  return (
    msg.includes('jwt issued at future') ||
    msg.includes('jwt expired') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror')
  );
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Exécute une requête Supabase avec réessais sur erreurs transitoires.
 * `run` doit retourner une nouvelle requête à chaque appel (les query builders
 * Supabase ne sont pas réutilisables une fois exécutés).
 */
export async function withSupabaseRetry<T extends { error: any }>(
  run: () => PromiseLike<T>,
  delays: number[] = DEFAULT_DELAYS
): Promise<T> {
  let result = await run();
  let attempt = 0;
  while (result.error && isTransientSupabaseError(result.error) && attempt < delays.length) {
    await sleep(delays[attempt]);
    attempt++;
    result = await run();
  }
  return result;
}
