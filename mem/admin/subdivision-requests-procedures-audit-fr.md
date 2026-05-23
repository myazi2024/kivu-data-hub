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

## Reste à faire
- **P3** : onglet "Versions du plan" dans hub, handler `/verify/:code` type `subdivision_plan`, menu `Documents ▾` regroupant les 3 PDF, suppression `validationCache` sessionStorage, déduplication `useAdminPendingCounts` vs `usePendingCount`.
