---
name: Mutation admin audit
description: Atomic RPC process_mutation_decision/take_charge/escalate, completion invariants trigger, signed certificate via private bucket, AlertDialog, server-side search, MutationAuditTimeline + MutationPaymentSection in details
type: feature
---

## Backend (P0)

- Trigger `check_mutation_approval_invariants` : refus si `payment_status<>'paid'` ou `reviewed_by IS NULL` à l'approbation.
- Colonnes ajoutées : `mutation_requests.certificate_url`, `certificate_issued_at`.
- Bucket : on **réutilise** `expertise-certificates` (privé) pour le certificat de mutation (cohérent avec `certificateService.ts`). Stockage du **chemin relatif**.
- RPC SECURITY DEFINER (admin/super_admin uniquement, `REVOKE EXECUTE FROM anon`) :
  - `take_charge_mutation_request(uuid)` : `pending` (payée) → `in_review`, set `reviewed_by`, notifie l'utilisateur.
  - `escalate_mutation_request(uuid, text)` : `escalated=true`, `escalated_at=now()`, audit `request_admin_audit`.
  - `process_mutation_decision(uuid, action, notes, rejection_reason, certificate_url)` : `approve|reject|hold|return` atomique + notification + écriture du certificat.
  - `get_signed_mutation_certificate(uuid, ttl)` : URL signée (10 min) ; ouvert au demandeur **payé** ou aux admins.
- Trigger `audit_mutation_fees_change` → `system_config_audit` (INSERT/UPDATE/DELETE).
- Index : `(status, created_at)`, `(payment_status)`, `(user_id)` + GIN trigram pour la recherche.

## Front (P0+P1)

- Hook `useMutationProcessing` : `takeCharge`, `escalate`, `processDecision` (génère le PDF puis appelle la RPC, plus jamais de séquence non-atomique côté client).
- Util `resolveMutationCertificateUrl` / `openMutationCertificate` (RPC URL signée).
- `MutationAuditTimeline` (lecture `request_admin_audit` via `useRequestAudit('mutation_requests', id)`).
- `MutationPaymentSection` (résumé paiement local, sans fetch).
- `MutationDetailsDialog` : ajoute timeline + paiement + bouton « Télécharger le certificat » (signed URL).
- `AdminMutationRequests` :
  - Recherche **serveur** via `useDebounce(300ms)` + `escapeIlike` + `.or()` (réf, parcelle, demandeur).
  - Filtres statut/type **côté serveur** (`.eq()`).
  - Action « Prendre en charge » sur demandes `pending` payées (icône `PlayCircle`) avec `AlertDialog`.
  - Badge « Escaladée » (col Actions).
  - Désactivation/réactivation de frais via `AlertDialog` (plus de `window.confirm`).

## Invariants à respecter ensuite
- Toute nouvelle action admin sur mutations doit **passer par une RPC SECURITY DEFINER** (jamais d'UPDATE direct).
- Le certificat de mutation est **toujours stocké en chemin relatif** ; lire via `openMutationCertificate(id, value)`.
- Toute approbation impose `payment_status='paid'` + `reviewed_by` (sinon le trigger lève une exception).
