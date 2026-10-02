// Contrôle d'accès des fonctions internes : tâche planifiée (secret en base)
// ou administrateur connecté. Utiliser avec un client service-role.

// deno-lint-ignore no-explicit-any
type Client = any;

/** Vrai si l'en-tête x-cron-secret correspond au secret stocké en base. */
export async function isCronCaller(req: Request, admin: Client): Promise<boolean> {
  const provided = req.headers.get("x-cron-secret");
  if (!provided || provided.length < 16) return false;
  const { data } = await admin
    .from("internal_cron_secrets")
    .select("secret")
    .eq("name", "cron")
    .maybeSingle();
  if (!data?.secret) return false;
  // Comparaison à temps constant
  const a = new TextEncoder().encode(provided);
  const b = new TextEncoder().encode(String(data.secret));
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Renvoie l'id de l'utilisateur s'il est admin ou super_admin, sinon null. */
export async function getAdminUserId(req: Request, admin: Client): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const { data: { user } } = await admin.auth.getUser(auth.slice(7));
  if (!user) return null;
  const [{ data: isAdmin }, { data: isSuper }] = await Promise.all([
    admin.rpc("has_role", { _user_id: user.id, _role: "admin" }),
    admin.rpc("has_role", { _user_id: user.id, _role: "super_admin" }),
  ]);
  return isAdmin || isSuper ? user.id : null;
}

export function forbidden(corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: "Accès refusé" }), {
    status: 403,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
