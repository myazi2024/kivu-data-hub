---
name: Expertise admin audit
description: P0+P1+P2 admin Expertises — RPC atomiques (assign/escalate/reject/complete), trigger invariants, signed URL certificat (RPC), bucket privé, TanStack Query, bulk actions, timeline + paiements, audit fees
type: feature
---

# Audit Admin Expertises Immobilières (P0+P1+P2)

## Backend
- RPC atomiques `assign_expertise_request`, `escalate_expertise_request`, `reject_expertise_request`, `complete_expertise_request` (audit + notifications + transitions).
- Trigger `check_expertise_completion_invariants` : interdit `completed` sans `payment_status='paid'`, `market_value_usd` et `certificate_url`.
- RPC `get_signed_expertise_certificate(p_request_id, p_ttl_seconds=600)` — accès signé 10 min, autorisé propriétaire ou staff.
- Trigger d'audit sur `expertise_fees_config` → `system_config_audit`.
- Bucket `expertise-certificates` PRIVÉ ; backfill purge des anciennes URLs publiques.
- `REVOKE EXECUTE ... FROM anon` sur tous les RPC admin.

## Frontend
- `AdminExpertiseRequests.tsx` migré TanStack Query.
- `useExpertiseProcessing` : PDF Edge → upload bucket privé (`certificates/{ref}_{uuid}.pdf`) → stocke chemin relatif (pas d'URL publique).
- `useExpertiseStats` : RPC unique pour KPIs.
- `ExpertiseRequestsTable` : sélection + bulk actions + badges SLA/escalade.
- `ExpertiseAssignDialog` : assignation expert via RPC.
- `ExpertiseAuditTimeline` + `ExpertisePaymentSection` : montés dans `ExpertiseDetailsDialog`.
- `escapeIlike` utilisé dans les filtres (anti wildcard injection).
- `crypto.randomUUID()` partout pour références/fichiers (jamais `Math.random`/`Date.now`).

## Accès certificat (règle critique)
`certificate_url` peut être :
- legacy `https://...` (ouvert tel quel)
- nouveau **chemin storage relatif** (ex. `certificates/REF_uuid.pdf`) → JAMAIS `window.open` direct.

**Toujours** passer par `openExpertiseCertificate(requestId, certificate_url)` (`src/utils/expertiseCertificateUrl.ts`) qui appelle la RPC `get_signed_expertise_certificate`. Consommateurs : `UserExpertiseRequests`, `RealEstateExpertiseRequestDialog`, `ExpertiseDetailsDialog`.
