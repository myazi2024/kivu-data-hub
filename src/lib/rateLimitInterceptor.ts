/**
 * Installs a lightweight interceptor on `supabase.functions.invoke` so that
 * any HTTP 429 (rate-limited) response surfaces a standardized toast:
 * « Trop de requêtes, veuillez réessayer plus tard. »
 *
 * Called once from App.tsx.
 */
import { supabase } from '@/integrations/supabase/client';
import { parseRateLimit, showRateLimitToast } from '@/lib/rateLimit';

let installed = false;

export function installRateLimitInterceptor(): void {
  if (installed) return;
  installed = true;

  const originalInvoke = supabase.functions.invoke.bind(supabase.functions);

  // Preserve overloads via `any`.
  (supabase.functions as unknown as { invoke: typeof originalInvoke }).invoke =
    (async (name: string, options?: unknown) => {
      const result = await originalInvoke(name as never, options as never);
      if (result?.error) {
        const rl = await parseRateLimit(result.error);
        if (rl) {
          showRateLimitToast(rl);
        }
      }
      return result;
    }) as typeof originalInvoke;
}
