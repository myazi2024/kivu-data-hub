// Shared rate-limit helper for Supabase Edge Functions.
// Backed by the Postgres RPC `check_and_consume_rate_limit(_key, _action)`.
//
// Usage:
//   import { enforceRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";
//   const rl = await enforceRateLimit(req, "payment.create");
//   if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RateLimitResult {
  allowed: boolean;
  banned?: boolean;
  retry_after_seconds?: number;
  remaining?: number;
  reset_at?: string;
  reason?: string;
}

// Simple stable hash for anonymous identity (avoids storing raw IPs)
async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getClientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Build a stable rate-limit key from the request.
 * - Authenticated users → `user:<uid>`
 * - Anonymous          → `anon:<sha256(ip|ua)>`
 */
export async function buildRateLimitKey(req: Request): Promise<string> {
  try {
    const auth = req.headers.get("Authorization");
    if (auth?.startsWith("Bearer ")) {
      const url = Deno.env.get("SUPABASE_URL");
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
      if (url && anonKey) {
        const client = createClient(url, anonKey, {
          global: { headers: { Authorization: auth } },
          auth: { persistSession: false },
        });
        const { data } = await client.auth.getUser();
        if (data.user?.id) return `user:${data.user.id}`;
      }
    }
  } catch {
    // fall through to anon key
  }
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") ?? "";
  return `anon:${await sha256(`${ip}|${ua}`)}`;
}

/**
 * Consume one hit for the given action and return the decision.
 * Fail-open: if the RPC errors, we allow the request but log it — so a
 * DB glitch never bricks the platform.
 */
export async function enforceRateLimit(
  req: Request,
  action: string,
  explicitKey?: string,
): Promise<RateLimitResult> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return { allowed: true, reason: "no_service_key" };

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    const key = explicitKey ?? (await buildRateLimitKey(req));
    const { data, error } = await admin.rpc("check_and_consume_rate_limit", {
      _key: key,
      _action: action,
    });
    if (error) {
      console.warn("[rate-limit] rpc error", action, error.message);
      return { allowed: true, reason: "rpc_error" };
    }
    return (data ?? { allowed: true }) as RateLimitResult;
  } catch (e) {
    console.warn("[rate-limit] unexpected", (e as Error).message);
    return { allowed: true, reason: "exception" };
  }
}

/**
 * Build a standard 429 response with clear French message + Retry-After.
 */
export function rateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string> = {},
): Response {
  const retry = Math.max(1, result.retry_after_seconds ?? 60);
  const banned = !!result.banned;
  const body = {
    error: "rate_limited",
    message: banned
      ? "Trop de requêtes détectées. Votre accès est temporairement suspendu pour protéger la plateforme."
      : "Trop de requêtes, veuillez réessayer plus tard.",
    retry_after_seconds: retry,
    banned,
  };
  return new Response(JSON.stringify(body), {
    status: 429,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Retry-After": String(retry),
    },
  });
}
