---
name: Subdivision admin audit
description: Audit Lotissement admin — frais serveur unifiés, voies matérialisées, audit générique, hub à onglets, modularisation, bulk actions, pagination serveur, cache validation TTL, export PDF dossier
type: feature
---

# Audit Lotissement (admin) — état P0→P3

## P0 — Cohérence financière ✅
- `_shared/subdivisionFees.ts` unifie le calcul (voirie + espaces + palier) côté Edge.
- `subdivision_roads` matérialisée pour requêtes performantes.
- Anti-dérive: triggers de cohérence sur `subdivision_requests`.

## P1 — Workflow admin ✅
- `AdminSubdivisionHub` à onglets (file / barème / zonage / lots / analytics).
- Modularisation `AdminSubdivisionRequests` (~806 → ~280 lignes orchestrateur):
  - `subdivision/requests/types.ts`, `helpers.ts`
  - `RequestsToolbar`, `RequestsList`, `RequestDetailsDialog`, `RequestActionDialog`
  - `BulkActionsBar`, `BulkReasonDialog`, `useAssignableAdmins`
- **Réassignation**: dropdown par ligne + bulk via `useAssignableAdmins` (admin/super_admin).
- **Bulk actions**: approve/reject/return/réassigner, processing en série via `approve-subdivision`.

## P2 — Données & traçabilité ✅
- `request_admin_audit` générique sur changement de statut/affectation.
- `plan_versions` pour historique du plan de lotissement.
- AlertDialog pour confirmations destructives.

## P3 — Performance & UX ✅
- **Pagination serveur**: `range(from, to)` + `count: 'exact'` dans `fetchRequests`. Refetch debouncé sur recherche (300ms), filtres et tri.
- **Cache validation conformité**: `validationCache.ts` (sessionStorage, TTL 5 min, clé `subdiv_validation_<id>`). Invalidation automatique après action (approve/reject/return) individuelle ou bulk.
- **Export CSV**: re-fetch all matching rows (limit 5000) côté serveur, plus de filtrage client.
- **Export PDF dossier**: `exportDossier.ts` (jsPDF) — bouton "Dossier PDF" dans `RequestDetailsDialog`. Sections: statut, demandeur, parcelle mère, découpage, détail lots (cap 30), frais & paiement, notes/motifs, pied de page paginé.

## Reste (low priority)
- 2 `as any` sur `.update({ assigned_to, assigned_at })` — décalage entre types Supabase générés et schema effectif (assigned_to nullable). Toléré.
- RLS audit complet `subdivision_requests` (admin/super_admin only sur update assigned_to) — déjà couvert par `request_admin_audit` mais à valider via `supabase--linter` à la prochaine itération.
