/**
 * Helpers réseau pour les uploads Supabase Storage.
 * - withNetworkRetry : retry uniquement sur erreurs réseau transitoires (TypeError "Failed to fetch", timeout).
 * - humanizeUploadError : traduction des messages bruts Supabase en messages utilisateurs FR.
 *
 * Utilisé par useCCCFormState.uploadFile (et réutilisable pour d'autres formulaires).
 */

const NETWORK_PATTERNS = /failed to fetch|network|networkerror|timeout|etimedout|aborted/i;

export function isNetworkError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof TypeError) return true; // fetch lance TypeError sur coupure
  const anyErr = err as { name?: string; message?: string };
  if (anyErr.name === 'AbortError') return true;
  return !!anyErr.message && NETWORK_PATTERNS.test(anyErr.message);
}

interface RetryOptions {
  retries?: number;
  delayMs?: number;
  backoff?: number;
}

/** Retry uniquement sur erreur réseau. Renvoie la dernière erreur sinon. */
export async function withNetworkRetry<T>(
  fn: () => Promise<T>,
  { retries = 2, delayMs = 800, backoff = 2 }: RetryOptions = {}
): Promise<T> {
  let lastErr: unknown;
  let wait = delayMs;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isNetworkError(err) || attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, wait));
      wait *= backoff;
    }
  }
  throw lastErr;
}

/** Promise.race avec timeout — annule via AbortController si fourni. */
export function withTimeout<T>(promise: Promise<T>, ms: number, controller?: AbortController): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      controller?.abort();
      reject(new Error(`timeout after ${ms}ms`));
    }, ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

export function humanizeUploadError(raw?: string | null): string {
  if (!raw) return "Erreur inconnue lors de l'envoi.";
  const m = raw.toLowerCase();
  if (NETWORK_PATTERNS.test(m)) {
    return "Connexion internet interrompue. Vérifiez votre réseau et réessayez.";
  }
  if (m.includes('row violates row-level security') || m.includes('rls')) {
    return "Permission refusée. Reconnectez-vous puis réessayez.";
  }
  if (m.includes('exceeded the maximum allowed size') || m.includes('payload too large')) {
    return "Fichier trop volumineux pour être envoyé.";
  }
  if (m.includes('mime') || m.includes('not allowed')) {
    return "Type de fichier non autorisé.";
  }
  if (m.includes('duplicate')) {
    return "Ce fichier a déjà été envoyé.";
  }
  return raw;
}
