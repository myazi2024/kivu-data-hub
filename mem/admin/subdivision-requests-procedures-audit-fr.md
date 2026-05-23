---
name: Subdivision requests & procedures audit (P0+P1+P2)
description: Approbation atomique via RPC, edge plan PDF pilotée par configSnapshot (header, watermarks, paper, scale, report_program, footer, cadres dynamiques, légende auto)
type: feature
---

## Invariants (P0)
- `exportDossier.ts` lit `lot.areaSqm`/`lot.intendedUse` (camelCase aligné designer), fallback snake_case pour brouillons anciens.
- `AdminSubdivisionRequests` : un seul effet de fetch (filtres → `setPage(1)` puis fetch unique, plus de double appel).
- `HUB_SUBTAB_LABELS['subdivision-hub']` couvre les 9 onglets + `versions` (breadcrumb 4 niveaux).
- `generate-subdivision-plan` : code de vérif via `crypto.randomUUID()` (jamais `Math.random`), URL via `FRONTEND_URL || req.origin || SUPABASE_URL`.
- Typings `SubdivisionRequest` étendus : `infrastructure_fee_usd`, `road_surface_fee_usd`, `remaining_fee_usd`, `official_plan_path/version/generated_at`, `approved_at`.

## Approbation atomique (P2)
- RPC `public.approve_subdivision_atomic(_request_id uuid, _admin_id uuid)` SECURITY DEFINER, search_path=public.
- Vérifie `remaining_fee_usd = 0` (sinon `Outstanding fees…`) avant approbation.
- Idempotent : lots via `ON CONFLICT (subdivision_request_id, lot_number) DO NOTHING`. Roads : skip total si déjà présentes pour la demande (+ index unique partiel `(request_id, road_name) WHERE road_name IS NOT NULL`).
- Flag `cadastral_parcels.is_subdivided=true`.
- `_admin_id IS NULL` autorisé uniquement pour appel SERVICE_ROLE (webhook Stripe `finalize_after_payment`) ; l'edge function reste le gatekeeper.
- Edge `approve-subdivision` : `materializeApprovedRequest` n'utilise QUE le RPC, plus de JS de projection ni de `.catch(console)` silencieux.

## Plan officiel PDF (P1)
- `generate-subdivision-plan` consomme intégralement `configSnapshot` : `header.org_line1/2/3`, `header.title`, `watermarks.final` (text/color/opacity), `paper_format.{base_mm,min_mm,max_mm}`, `scale_tiers.tiers[]` (échelle normalisée 1:N affichée en footer), `report_program` (signalement WhatsApp + récompense), `footer_text.text`.
- Cadres signature : RPC `resolveFrames(rows, {isUrban, province})` filtre `applies_to ∈ {both, urban, rural}` + `province_filter` ; fallback minimal seulement si table vide. Plus de cadres hardcodés.
- Légende auto : `deriveLegendItems(subdivision_legend_symbols, presentTypes)` avec `presentTypes = ['north_arrow','echelle_graphique', roads?'road':_, lots?'lot':_]`.
- `config_snapshot` archivé tel quel dans `subdivision_plan_versions` (reproductibilité).
- Note : `src/utils/generateSubdivisionPlanPDF.ts` reste pour aperçu user (preview/brouillon) mais n'est plus la source du plan officiel.

## UX & nettoyage (P3)
- Hub : nouvel onglet **Versions du plan** (`?sub=versions`) — composant `AdminSubdivisionPlanVersions` listant `subdivision_plan_versions` (200 dernières), filtre client (réf/parcelle/code), téléchargement signé (RPC `get_signed_subdivision_plan` pour `is_current`, sinon `storage.createSignedUrl('subdivision-plans', pdf_path)`), action "Définir courante" (trigger flippe les autres).
- `RequestDetailsDialog` : 4 boutons header → menu unique **Documents ▾** (Dossier complet + Régénérer/Télécharger plan officiel + Certificat) ; PDF approbation visibles uniquement si `status === 'approved'`.
- `VerifyDocument` : ajoute bloc dédié `subdivision_plan` (badges `version`, `Courante`, `state`) en plus du flow générique.
- **Supprimé** : `src/hooks/usePendingCount.tsx` (zéro consommateur, doublon de `useAdminPendingCounts`), `src/components/admin/subdivision/requests/validationCache.ts` (sessionStorage remplacé par Map TTL in-memory locale au module `AdminSubdivisionRequests`).
- `RequestsToolbar` : pas de doublon avéré (instance unique), conservé.

