/**
 * Client-side helpers to gracefully handle the Postgres/Edge rate-limit
 * responses (HTTP 429). Wraps common Supabase calls and shows a standardized
 * toast message: « Trop de requêtes, veuillez réessayer plus tard. »
 */
import { toast } from '@/hooks/use-toast';
import type { FunctionsHttpError } from '@supabase/supabase-js';

export interface RateLimitError {
  isRateLimit: true;
  retryAfter: number;
  banned: boolean;
  message: string;
}

function formatRetry(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const m = Math.ceil(seconds / 60);
  return `${m} min`;
}

/**
 * Extract a normalized rate-limit descriptor from a caught error, or null.
 * Supports:
 *  - `FunctionsHttpError` from `supabase.functions.invoke`
 *  - PostgREST error whose message contains `rate_limited`
 *  - Generic `Response`-like objects
 */
export async function parseRateLimit(err: unknown): Promise<RateLimitError | null> {
  if (!err) return null;

  // supabase-js v2: FunctionsHttpError exposes `.context` with a Response
  const anyErr = err as { context?: Response; status?: number; message?: string };

  const response = anyErr.context;
  if (response && typeof response.status === 'number' && response.status === 429) {
    let payload: { message?: string; retry_after_seconds?: number; banned?: boolean } = {};
    try { payload = await response.clone().json(); } catch { /* ignore */ }
    return {
      isRateLimit: true,
      retryAfter: payload.retry_after_seconds ?? 60,
      banned: payload.banned ?? false,
      message: payload.message ?? 'Trop de requêtes, veuillez réessayer plus tard.',
    };
  }

  // PostgREST RPC failure raised via enforce_rate_limit (P0001)
  const msg = anyErr.message ?? '';
  if (msg.includes('rate_limited')) {
    // Attempt to extract JSON details
    let banned = false;
    let retry = 60;
    const m = msg.match(/\{[^}]*\}/);
    if (m) {
      try {
        const j = JSON.parse(m[0]);
        banned = !!j.banned;
        retry = j.retry_after_seconds ?? 60;
      } catch { /* ignore */ }
    }
    return {
      isRateLimit: true,
      retryAfter: retry,
      banned,
      message: banned
        ? 'Trop de requêtes détectées. Votre accès est temporairement suspendu.'
        : 'Trop de requêtes, veuillez réessayer plus tard.',
    };
  }

  return null;
}

/**
 * Show the standardized toast for a rate-limit event.
 */
export function showRateLimitToast(info: RateLimitError): void {
  toast({
    title: info.banned ? 'Accès temporairement bloqué' : 'Trop de requêtes',
    description: `${info.message} Réessayez dans ~${formatRetry(info.retryAfter)}.`,
    variant: 'destructive',
  });
}

/**
 * Wrap any async operation so that rate-limit errors surface a friendly toast
 * and are re-thrown as a tagged error the caller can identify.
 *
 * Usage:
 *   await withRateLimitToast(() => supabase.functions.invoke('create-payment', { body }));
 */
export async function withRateLimitToast<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const rl = await parseRateLimit(err);
    if (rl) {
      showRateLimitToast(rl);
      throw Object.assign(new Error(rl.message), { rateLimit: rl });
    }
    throw err;
  }
}

/**
 * Helper for supabase.functions.invoke that also inspects the `error` field
 * (supabase-js returns errors in the result rather than throwing for 4xx).
 */
export async function invokeWithRateLimit<T = unknown>(
  invoke: () => Promise<{ data: T | null; error: unknown }>,
): Promise<{ data: T | null; error: unknown }> {
  const result = await invoke();
  if (result.error) {
    const rl = await parseRateLimit(result.error);
    if (rl) {
      showRateLimitToast(rl);
      return { data: null, error: Object.assign(new Error(rl.message), { rateLimit: rl }) };
    }
  }
  return result;
}

export type { FunctionsHttpError };
