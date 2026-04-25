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

## Lot B — Documents requis configurables ✅
- Table `subdivision_required_documents` (doc_key unique, label, help_text, is_required, requester_types[], accepted_mime_types[], max_size_mb, display_order, is_active, metadata jsonb).
- RLS: lecture publique sur entrées actives; CRUD admin/super_admin uniquement.
- Hook `useSubdivisionRequiredDocuments(requesterType?)` — cache module 5 min, fallback hardcoded sur 3 docs legacy.
- `AdminSubdivisionRequiredDocs` (onglet « Documents » du hub) — CRUD complet, restriction par type de demandeur, formats multi-select.
- `StepDocuments.tsx` rendu data-driven: itère sur la config admin, validation MIME/taille dynamique côté client.
- `SubdivisionDocuments` étendu avec signature index `[k: string]: string|null` (clés legacy conservées pour rétrocompat). Convention: stockage sous `${doc_key}_url`.

## Lot C — Éléments de plan obligatoires configurables ✅
- Table `subdivision_plan_elements` (element_key, category, is_required, validation_rule, display_order, is_active).
- Hook `useSubdivisionPlanElements` + `getSubdivisionPlanElementsAsync` (cache 5 min, fallbacks).
- `AdminSubdivisionPlanElements` (onglet « Plan » du hub) — CRUD, toggles, ordre.
- `generateSubdivisionPlanPDF.ts` rend conditionnellement north arrow / échelle graphique / légende dynamique.

## Lot D — Tarifs détaillés par infrastructure ✅
- Table `subdivision_infrastructure_tariffs` (key, label, category, unit linear_m|sqm|unit|lot, rate_usd, section_type, min/max_total_usd, is_required).
- 9 entrées seedées (voirie principale/secondaire, drainage, éclairage, etc.).
- Hook `useSubdivisionInfrastructureTariffs({sectionType})` + `fetchInfrastructureTariffsAsync` (cache 5 min, fallback).
- `AdminSubdivisionInfrastructureTariffs` intégré dans l'onglet « Tarifs » via `AdminSubdivisionFeesConfig`.

## Lot E — Intégration infrastructures dans le formulaire ✅
- Nouveau step **Infrastructures** (`StepInfrastructures.tsx`) après Plan, avant Documents — checkbox + quantité + sous-total live, groupé par catégorie, badges « Obligatoire ».
- `useSubdivisionForm` : state `selectedInfrastructures` (key→qty), recompute fee debouncé incluant le surcoût infra, persistance dans le brouillon localStorage.
- `FeeBreakdown` étendu (`infrastructures[]`, `infrastructuresTotal`, `lotsTotal`) — `StepSummary` affiche tableau infra séparé + sous-totaux + total.
- Edge function `subdivision-request` : recalcul serveur (source de vérité) à partir de `subdivision_infrastructure_tariffs` filtrées sur `is_active`, persistance dans deux nouvelles colonnes `subdivision_requests.selected_infrastructures` (jsonb) et `infrastructure_fee_usd` (numeric).
