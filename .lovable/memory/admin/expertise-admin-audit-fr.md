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
Le certificat s'ouvre TOUJOURS via `openExpertiseCertificate(requestId)` → RPC `get_signed_expertise_certificate` (propriétaire, staff ou acheteur `certificate_access` confirmé). Aucune URL stockée n'est ouverte directement.

## Accès au certificat d'un autre utilisateur
- Prix = frais `fee_kind='certificate_access'` dans `expertise_fees_config` (28 USD initial), modifiable dans l'admin (carte « Accès au certificat »), exclu du devis de demande.
- Lecture du certificat existant via `get_parcel_valid_expertise_certificate` (valeur vénale seulement si accès).
- Paiements créés uniquement par `create_expertise_payment` ; relance après échec réutilise la demande déjà créée.
