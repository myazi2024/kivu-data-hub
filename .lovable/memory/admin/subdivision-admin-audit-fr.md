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

## Lot G — Eligibilité parcelle-mère verrouillée serveur ✅
- Edge `subdivision-request` charge la règle `subdivision_zoning_rules` via cascade géo (avenue→quartier→commune→ville / village→groupement→collectivité→territoire + `*`) et rejette en HTTP 422 `PARENT_AREA_OUT_OF_RANGE` si `area_sqm` < `parent_min_area_sqm` ou > `parent_max_area_sqm`.
- Payload `parent_parcel` enrichi (province/ville/commune/quartier/avenue + équivalents ruraux + propertyTitleType) depuis `useSubdivisionForm` pour matching précis.
- `AdminSubdivisionZoningRules.handleSave` : refuse `parent_min < min_lot_area_sqm`, `parent_max < parent_min`, et avertit (toast.warning) si `parent_min < 2 × min_lot`.
- UI admin : bloc « Surface parcelle-mère » mis en avant (`bg-primary/5 border-primary/30`) en tête de la section, helper live « ≈ N lots de X m² maximum tiendraient ».
- Tests : `useParentParcelEligibility.test.tsx` (PARENT_TOO_SMALL/LARGE/OK + fallback `*`), 4/4 verts.


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

## Lot E — Infrastructures dérivées des voies (refonte mai 2026) ✅
- L'onglet manuel `StepInfrastructures` **supprimé** : redondant avec la spec par voie (revêtement/canal/éclairage) qui est désormais la **source unique**.
- `RoadsListPanel` étendu : bloc « Revêtement » (matériau parmi `road_surface_allowed_materials` + épaisseur bornée `road_surface_min/max_thickness_cm`) rendu conditionnellement à `require_road_surface`. Badge « Revêtement manquant » dans la liste.
- `useZoningRules` expose les champs `require_road_surface`, `road_surface_allowed_materials`, `road_surface_min/max_thickness_cm`. `useZoningCompliance` valide matériau+épaisseur (codes `ROAD_SURFACE_MISSING/BAD_MATERIAL/TOO_THIN/TOO_THICK`).
- Helper partagé `infrastructureFromRoads.ts` : dérive `road_surface_<material>` (sqm = length×width), `drainage` (linear_m × sidesFactor), `street_lighting` (poles = ⌈length/spacing⌉ × sidesFactor) à partir des voies + tarifs admin.
- `useSubdivisionForm.computeFee` n'utilise plus `selectedInfrastructures` (state retiré) — recompute auto via `buildInfraItemsFromRoads`. `FeeBreakdown.infrastructures[]` enrichi de `roadId/roadName` pour traçabilité.
- L'onglet final est renommé **« Récapitulatif »** (ex « Envoi ») dans `ALL_STEP_CONFIG`. `StepSummary` affiche un tableau infra avec colonne « Voie » source.
- Edge `subdivision-request` : recalcul **server-side** des items infra à partir de `body.roads` + `subdivision_infrastructure_tariffs` (préfère section_type matchant, fallback générique). Champ `selected_infrastructures` body ignoré ; colonne DB conservée pour audit. `pathLengthM` exporté depuis `_shared/subdivisionFees.ts`.
- Type `SubdivisionRoad.surfaceType` conservé (legacy, pour drafts localStorage) mais sans UI active ; `ROAD_SURFACE_LABELS` supprimé.

## Lot F — Onglet conditionnel « Normes de zonage » (formulaire user) ✅
- `StepZoningRules.tsx` rendu en tête du formulaire **uniquement si** `useZoningCompliance` retourne une `rule` matchée pour la zone (cascade géo) — sinon onglet masqué et flow inchangé.
- `SubdivisionStep` étend l'union avec `'zoning'`. `useSubdivisionForm.steps` est mémoïsé et conditionnel à `hasZoningRule`. `isStepValid('zoning') === true` (page d'information).
- Bascule auto une fois sur `'zoning'` à l'apparition de la règle (flag `zoningSeenRef`).
- Contenu pro : intro, liste détaillée des normes (surface min/max lot, voirie, façade, % espaces communs, max lots, notes admin) avec sévérité Bloquant/Avertissement, encadré « contrôles automatiques » + engagement de conformité.

## Hardening service utilisateur (mai 2026)
- Edge `subdivision-request` : header `Idempotency-Key` (court-circuit), ownership via RPC `can_subdivide_parcel` (requester.type='owner'), validation zoning étendue (min/max lot area recalculés serveur, min_road_width_m, max_lots_per_request → code `LOT_AREA_OUT_OF_RANGE`), persistance `parent_parcel_title_type/issue_date`, `requester_entity_subtype_other`, `idempotency_key`.
- Schéma `subdivision_requests` : CHECK status enum, index `(user_id, status, created_at desc)`, index unique partiel `(user_id, idempotency_key)`.
- `SubdivisionRequestDialog` : parsing erreurs typées + rebascule onglet (`PARENT_AREA_OUT_OF_RANGE`/`ROAD_INFRA_VIOLATIONS`/`LOT_AREA_OUT_OF_RANGE`/`OWNERSHIP_REQUIRED`), `useMemo` STEP_CONFIG remonté avant early-returns.
- `useSubdivisionForm` : drafts scopés `user.id+parcelNumber` (préfixe v3), auto-fill first/last/middle_name depuis `user_metadata`, `Idempotency-Key` UUID stable, `titleIssueDate` propagé.
- `UserSubdivisionRequests` : bouton « Reprendre le paiement » pour demandes `submission_payment_status='pending'`/`status='awaiting_payment'`.

## Lot H — Hardening « Ajouter une règle de zonage » (mai 2026)
- Migration : `subdivision_zoning_rules` + `province_path text[]`, `version int`, index unique `(section_type, location_name, province_path)`, trigger audit → `system_config_audit`, trigger bump `version` + `updated_at`.
- Validation centralisée : `src/components/admin/subdivision/zoningValidation.ts` (pure, 9 tests Vitest verts) — bornes (% espaces 0-100, gps≥3, road_width>0), drainage/solar exigent au moins matériau+type+dimension, revêtement matériau orphelin = warning via `knownRoadSurfaceTariffKeys`.
- `AdminSubdivisionZoningRules` : `province_path` persisté, search input, mémo `formatBreadcrumb` (Map cache), bouton **Cloner**, confirmation AlertDialog sur toggle `is_active`, drainage materials/types importés depuis `infrastructureConstants.ts`, chip ⚠ sur matériau revêtement sans tarif `road_surface_*`.

## Lot I — Anti-double-facturation voirie (mai 2026, P0)
- `subdivision-request/index.ts` : dérivation infra **avant** `computeSubdivisionFee`. Pour chaque voie produisant un `road_surface_<material>` valide, sa longueur est accumulée dans `roadLengthCoveredM`. Le tarif legacy `rate.road_fee_per_linear_m_usd` n'est appliqué qu'à `aux.roadLengthM - roadLengthCoveredM` (jamais négatif).
- `feeBreakdown` enrichi : `road_length_billable_m`, `road_length_covered_by_infra_m`, `infrastructure_total` toujours présent (même sans rate).
- Matching tarif rate_config : priorité `commune > ville > province > '*' > premier`. Avant : `'*' || ratesData[0]` ignorait les tarifs spécifiques sans `*` configuré.
- `common_space_fee_per_sqm_usd` non encore couvert par infra → reste appliqué tel quel (doublon latent à surveiller quand une catégorie `common_space_*` sera introduite).

## Lot J — P1 admin (mai 2026)
- RPC `get_signed_subdivision_certificate(p_request_id, p_ttl_seconds)` : lit `generated_certificates` (type=`lotissement`), extrait le path via regex (`/expertise-certificates/...`), retourne URL signée (bucket privé, TTL 10 min). Garde: propriétaire OU admin/super_admin.
- Helper `src/utils/subdivisionCertificateUrl.ts` (`openSubdivisionCertificate`).
- RPC `get_subdivision_admin_stats()` : compteurs serveur (statuts/paiements/escalades/revenu/lots/7j/30j) sans plafond 1000 lignes. Réservée admin.
- `AdminSubdivisionRequests` : `useAdminPendingCounts` (pendingCount.subdivisions) remplace requête locale, `escapeIlike` sur search (liste + export), bulk via `Promise.allSettled` chunké 5×, CSV des échecs auto-téléchargé.
- `RequestDetailsDialog` : bouton **Certificat** (signed URL), carte **Frais & détail** affichant `processing_fee_usd`, `infrastructure_fee_usd`, `road_surface_fee_usd`, décomposition serveur (`road_length_billable_m`/`road_length_covered_by_infra_m`/`infrastructure_total`/`lotsTotal`/`roadTotal`/`commonTotal`) depuis `fee_items.breakdown`.
- `AdminSubdivisionFeesConfig` : badges **deprecated** sur colonnes/labels `road_fee_per_linear_m_usd` + `common_space_fee_per_sqm_usd`, opacité réduite dans le formulaire, note guidant vers la section *Tarifs par type d'infrastructure*.
