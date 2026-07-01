
# Rate limiting anti-abus — plan complet

## Objectif

Bloquer les scripts qui frappent l'API en boucle (paiements, tuiles Mapbox, exports, RPC admin, écritures publiques), plafonner le coût VPS/Mapbox, préserver l'expérience des utilisateurs légitimes, notifier les admins en cas d'abus répété.

## Décisions retenues

- **Périmètre** : complet — edge functions + RPC coûteuses + écritures publiques + garde-fou client.
- **Quotas** : valeurs "équilibrées" (voir tableau plus bas), stockées dans une table `rate_limit_config` modifiable via l'admin, donc ajustables sans redéploiement.
- **Blocage** : ban temporaire 15 min après 5 refus 429 sur 10 min + insertion dans `fraud_attempts` + notification aux admins.
- **Identification anon** : hash SHA-256 de `IP + user-agent` (moins de faux positifs sur NAT/mobile) ; les endpoints les plus sensibles (paiements, exports) exigent en plus une session authentifiée.

## Architecture

```text
┌─────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│  Client     │───▶│ Edge function        │───▶│ RPC check_rate_limit│
│  (React)    │    │ (create-payment, …)  │    │  atomique           │
└─────────────┘    └──────────────────────┘    └─────────────────────┘
      │                     │                             │
      │ 429 + retry_after   │ 429 JSON                    │ table buckets
      ▼                     ▼                             │ table bans
  toast + backoff        early return                     │ fraud_attempts
                                                          ▼
                                                   notify admins
```

## Composants

### 1. Base de données (migration)

- `rate_limit_config(action_key text pk, window_seconds int, max_requests int, ban_after_violations int, ban_seconds int, enabled bool)` — quotas modifiables.
- `rate_limit_buckets(key text, action_key text, window_start timestamptz, count int, pk(key, action_key, window_start))` — compteurs par fenêtre glissante.
- `rate_limit_bans(key text, action_key text, banned_until timestamptz, violation_count int, reason text)` — bans actifs.
- Fonction `public.check_and_consume_rate_limit(_key text, _action text) returns jsonb` (SECURITY DEFINER, `search_path = public`) : atomique, renvoie `{allowed, remaining, retry_after_seconds, banned}`, insère dans `fraud_attempts` + `notifications` (admins via `has_role`) au 5ᵉ 429.
- Fonction `cleanup_rate_limits()` appelée par `cleanup_expired_data()`.
- GRANT EXECUTE aux rôles `authenticated`, `anon`, `service_role`.
- Seed `rate_limit_config` avec les valeurs ci-dessous.

### 2. Helper partagé edge functions

`supabase/functions/_shared/rateLimit.ts` :

- Extrait `user_id` du JWT si présent, sinon calcule `hash(ip + ua)` (SHA-256).
- Appelle la RPC via service role.
- Si `allowed=false` → renvoie `429` avec `Retry-After` et JSON `{ error: "rate_limited", message: "Trop de requêtes, veuillez réessayer plus tard.", retry_after_seconds }`.
- Export : `withRateLimit(req, actionKey, handler)`.

### 3. Edge functions instrumentées

`create-payment`, `process-mobile-money-payment`, `test-payment-provider`, `update-payment-status`, `stripe-webhook` (exclu — signature Stripe), `send-invoice-reminder`, `track-publication-download`, `proxy-mapbox-tiles`, `health-check`, `health-snapshot`, `cleanup-test-data-batch`, `approve-subdivision`, `process-refund`, `system-alerts-check`.

### 4. RPC critiques (garde côté SQL)

Wrapper interne : les RPC coûteuses (`get_admin_pending_counts`, `export_user_data`, `mark_cadastral_invoice_paid_safe`, `process_mutation_decision`, `take_charge_mutation_request`, `escalate_mutation_request`, RPC expertise/subdivision) appellent `check_and_consume_rate_limit(auth.uid()::text, '<action>')` en premier et lèvent une exception si refusé — l'erreur PostgREST est mappée en toast 429.

### 5. Client React

- `src/lib/rateLimitClient.ts` : détecteur 429 (edge + PostgREST error code `P0429`), toast standardisé « Trop de requêtes, veuillez réessayer plus tard » + compte à rebours `retry_after`, backoff exponentiel borné (max 3 retries) réservé aux GET idempotents.
- Intégration dans `useCadastralServices`, hooks paiement/mutation/expertise et fetch tuiles Mapbox.
- Debounce/guard bouton "Approuver/Payer" — désactivé pendant la fenêtre de retry.

## Quotas seed (`rate_limit_config`)

| action_key | fenêtre | max | ban après | durée ban |
|---|---|---|---|---|
| payment.create | 60 s | 5 | 5 violations / 10 min | 15 min |
| payment.mobile_money | 60 s | 5 | 5 | 15 min |
| payment.mark_paid | 60 s | 10 | 5 | 15 min |
| admin.pending_counts | 60 s | 30 | 10 | 10 min |
| admin.export_pii | 300 s | 3 | 3 | 60 min |
| mutation.decision | 60 s | 10 | 5 | 15 min |
| expertise.decision | 60 s | 10 | 5 | 15 min |
| subdivision.approve | 60 s | 5 | 5 | 15 min |
| ccc.submit | 60 s | 3 | 5 | 30 min |
| dispute.submit | 60 s | 3 | 5 | 30 min |
| mapbox.tile | 60 s | 300 | 3 | 30 min |
| public.verify_document | 60 s | 20 | 5 | 15 min |
| public.health | 60 s | 60 | — | — |
| anon.default | 60 s | 100 | 5 | 15 min |
| auth.default | 60 s | 300 | 10 | 15 min |

Modifiables depuis un nouvel écran admin (hors périmètre initial — table éditable via SQL suffit pour v1).

## Réponse HTTP standardisée

```json
HTTP/1.1 429 Too Many Requests
Retry-After: 42
Content-Type: application/json
{
  "error": "rate_limited",
  "message": "Trop de requêtes, veuillez réessayer plus tard.",
  "retry_after_seconds": 42,
  "banned": false
}
```

## Détection & alerte

- 5 refus 429 dans 10 min sur la même clé → insertion dans `fraud_attempts (attempt_type='rate_limit_ban', identifier=key, metadata={action, count})` et notification aux `super_admin` via `notifications` (title « Attaque potentielle détectée »).
- Purge quotidienne via `cleanup_expired_data()`.

## Hors périmètre

- WAF / Cloudflare / captcha.
- Ban IP permanent (le VPS n'a pas de firewall applicatif intégré ici).
- UI admin dédiée pour éditer `rate_limit_config` (v2 si besoin).

## Livrables

1. 1 migration Supabase (tables + RPC + seed + GRANTs + politique RLS lecture admin-only).
2. `supabase/functions/_shared/rateLimit.ts` + patch des ~13 edge functions listées.
3. Wrapper SQL sur ~8 RPC critiques.
4. `src/lib/rateLimitClient.ts` + intégration dans supabase client et hooks concernés.
5. Mémoire `mem://security/rate-limiting-fr` documentant le mécanisme, les quotas et la procédure d'ajustement.

## Validation

- Script Playwright dans `/tmp/browser/` : boucle 20 appels rapides sur `create-payment` puis vérifie 429 + toast.
- Requête SQL de contrôle : `SELECT * FROM rate_limit_bans WHERE banned_until > now()`.
- Vérifier qu'une utilisation normale (formulaire CCC, navigation carte) ne déclenche jamais 429.
