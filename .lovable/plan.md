ns# Plan de correction — Audit Lotissement (Admin > Demandes & Procédures)

## P0 — Fixes critiques bloquants (~3h)

1. **`exportDossier.ts`** — corriger les noms de champs lots : `lot.area_sqm` → `lot.areaSqm`, `lot.usage` → `lot.intendedUse` (camelCase aligné sur le designer).
2. **Double fetch sur changement de filtre** dans `AdminSubdivisionRequests` — fusionner les deux `useEffect` (un seul effet avec reset `page=1` quand les filtres changent).
3. **`HUB_SUBTAB_LABELS['subdivision-hub']`** dans `Admin.tsx` — ajouter les 9 sous-onglets (`requests`, `fees`, `zoning`, `references`, `documents`, `plan-elements`, `plan-config`, `lots`, `analytics`) pour le breadcrumb 4 niveaux.
4. **`verifyUrl` du QR** dans `generate-subdivision-plan` — utiliser `FRONTEND_URL` (env) + chemin `/verify/<code>` propre, sans `replace("//","//")`.
5. **Recherche serveur non échappée** — appliquer `escapeIlike` au `searchQuery` dans `RequestsList`/`AdminSubdivisionRequests` avant le `.or(...)`.
6. **Typings** `infrastructure_fee_usd`, `road_surface_fee_usd`, `remaining_fee_usd`, `official_plan_path`, `official_plan_version` dans le type `SubdivisionRequest`.

## P1 — Unification générateur PDF officiel (~1j)

Le générateur edge (`generate-subdivision-plan`) doit consommer la config P1/P2/P3 et plus aucun hardcode.

1. Extraire `generateSubdivisionPlanPDF.ts`, `subdivisionPlanLegend.ts`, `subdivisionPlanScale.ts`, `subdivisionPlanContext.ts` vers `supabase/functions/_shared/subdivisionPlan/` (compat Deno : remplacer imports `@/...` par chemins relatifs et `supabase` par client injecté).
2. Edge function : appelle ce shared module en passant `configSnapshot` déjà capturé (header, watermarks, paper_format, scale_tiers, report_program, footer_text, cadres, symboles).
3. Légende auto via `deriveLegend(symbols, presentTypes)` calculée depuis `subdivision_lots` + `subdivision_roads` + `plan_elements`.
4. Cadres signature dynamiques via `subdivision_signature_frames` filtrés par `applies_to` (urbain/rural) + `province_filter`.
5. Échelle normalisée via `computeNormalizedScale(bbox, drawableMm, tiers)`.
6. Bloc signalement (footer) depuis `report_program` (WhatsApp + texte récompense).
7. Filigrane d'état (`draft|test|sample|final`) selon `state` du contexte.
8. Supprimer la version PDF côté client (preview) ou la rerouter vers le shared module.

## P2 — Approbation & matérialisation atomiques (~0.5j)

1. **Migration** : RPC `approve_subdivision_atomic(_request_id, _admin_id)` qui en une seule transaction :
   - vérifie tous les frais payables (`submission_fee_usd`, `processing_fee_usd`, `infrastructure_fee_usd`, `road_surface_fee_usd`) — bloque si `remaining_fee_usd > 0`.
   - insère `subdivision_lots` + `subdivision_roads` idempotemment (`ON CONFLICT (request_id, lot_number) DO NOTHING` et idem pour roads).
   - met le statut `approved` + audit.
2. Edge `approve-subdivision` : remplace `materializeApprovedRequest` par `.rpc('approve_subdivision_atomic')`.
3. Supprimer le `.catch(console)` silencieux.

## P3 — UX & nettoyage (~0.5j)

1. **Nouvel onglet "Versions du plan"** dans `AdminSubdivisionHub` : liste `subdivision_plan_versions` (version, état, date, raison, `is_current`), bouton "Télécharger PDF" via `pdf_path` signé, bouton "Définir comme courante" (RPC).
2. **Handler `/verify/:code`** : étendre `VerifyDocument.tsx` pour le type `subdivision_plan` (lecture via RPC `verify_subdivision_plan`, affichage version + état + cadres).
3. **Menu unique `Documents ▾`** dans `RequestActionDialog` : remplacer les 3 boutons PDF (accusé, dossier, plan officiel) par un dropdown.
4. **Supprimer** : `getCachedValidation` sessionStorage, `RequestsToolbar` dupliqué, doublon `useAdminPendingCounts` vs `usePendingCount`, `processing_notes` redondant.
5. **Mémo** : créer `mem://admin/subdivision-requests-procedures-audit-fr.md` consignant les invariants (atomicité, snapshot config, légende auto, cadres dynamiques).

## Dépendances & ordre

```text
P0 (typings + breadcrumb)  →  P1 (shared module Deno)  →  P2 (RPC atomique)  →  P3 (UI + nettoyage)
```

## Détails techniques

- **Compat Deno** du shared : pas d'import `@/` ; client Supabase passé en argument ; `jspdf` via `npm:jspdf@2`.
- **Idempotence roads/lots** : index unique `(request_id, lot_number)` et `(request_id, road_ref)` avant le RPC.
- **Snapshot config** : déjà capturé en P3 précédent → réutilisé tel quel dans `subdivision_plan_versions.config_snapshot`.
- **QR** : `${FRONTEND_URL}/verify/${verification_code}` avec `verify_subdivision_plan` RPC retournant `{version, state, generated_at, frames_count}`.

## Hors scope

- Refonte du designer de lots (couvert par mémo `subdivision-lot-designer-p0-fixes`).
- Module "frais" (déjà audité dans `subdivision-admin-audit-fr`).
