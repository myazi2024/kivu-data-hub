# Audit "Lotissement" — Admin · Demandes & Procédures

Périmètre exploré : `AdminSubdivisionHub` + 8 onglets (`Requests`, `FeesConfig`, `ZoningRules`, `References`, `RequiredDocs`, `PlanElements`, `Lots`, `Analytics`), composants encastrés `AdminSubdivisionInfrastructureTariffs` et `AdminSubdivisionRoadSurfaceMaterials`, edge function `subdivision-request` et helper `_shared/subdivisionFees.ts`.

## Constats

### A. Bugs / erreurs de logique

1. **Double facturation voirie (critique)**. L'edge `subdivision-request` additionne :
   - `roadTotal = roadLengthM × rate.road_fee_per_linear_m_usd` (via `computeSubdivisionFee`)
   - **+** la dérivation infrastructures (`road_surface_<material> × longueur × largeur`, `drainage_*`, `street_lighting*`).
   Si l'admin renseigne les deux (et c'est le cas par défaut), la voirie est facturée **deux fois**. Idem latente pour `common_space_fee_per_sqm_usd` (pas encore couvert côté infra mais doublon conceptuel).

2. **Sélection de tarif "*" sans matching par localisation**. `subdivision-request` fait `rates.find(location_name === '*') || rates[0]`. Le `location_name` réel (commune/ville/province de la parcelle) n'est jamais essayé en priorité → un tarif spécifique configuré dans l'admin est ignoré tant qu'aucun `*` n'existe.

3. **Certificat de lotissement généré côté navigateur** (`AdminSubdivisionRequests.submitAction` → `generateAndUploadCertificate`). Divergent du pattern moderne déjà appliqué à Mutation/Expertise (bucket privé + RPC `get_signed_*_certificate`). Le certificat finit sur un bucket sans politique d'accès maîtrisée et n'est pas re-téléchargeable proprement depuis l'admin.

4. **`handleStartReview` silencieux si `!user`** : sortie sans toast ni log.

5. **`useEffect` validation pleine de race conditions** : si l'admin change rapidement de page, les `setValidations` arrivent en désordre. Pas critique mais peut afficher un statut faux.

6. **Recherche serveur sans escape ILIKE** : `searchQuery` injecté brut dans `.or(...)`. Saisie d'un `%` ou `,` casse la requête. Le repo possède déjà `src/utils/escapeIlike.ts`.

7. **Compteur `pendingCount` re-requêté à chaque fetch** au lieu de partager `useAdminPendingCounts`. Coût + drift.

### B. Code mort / champs redondants

1. **`subdivision_rate_config.road_fee_per_linear_m_usd`** et **`common_space_fee_per_sqm_usd`** : remplacés par `subdivision_infrastructure_tariffs.road_surface_*` (et bientôt `common_space_*`). Encore lus côté serveur et côté admin (formulaire + aperçu + tableau). Sources de vérité concurrentes.
2. **`subdivision_requests.selected_infrastructures`** marqué "ignoré (manuel)" dans le code mais toujours écrit et toujours présent en base avec valeur dérivée — `infrastructure_fee_usd` + breakdown suffisent. Champ ambigu.
3. **`SubdivisionRequest` type** ne déclare pas `province / ville / commune` alors que `AdminSubdivisionAnalytics` les sélectionne. Divergence type/DB.
4. **`infrastructure_fee_usd`** n'est jamais affiché dans `RequestDetailsDialog` ni dans la liste → l'admin ne voit pas la décomposition.

### C. Fonctionnalités orphelines / UX

1. **`AdminSubdivisionInfrastructureTariffs`** monté **à l'intérieur** de `AdminSubdivisionFeesConfig` (long scroll, pas découvrable). De même `AdminSubdivisionRoadSurfaceMaterials` est dans `AdminSubdivisionZoningRules`. Aucun des deux n'apparaît dans le hub à 8 onglets, alors qu'ils méritent une visibilité 1er niveau (ou un sous-onglet dans "Frais").
2. **Analytics** : `limit(1000)` sans pagination → KPI faux dès qu'un projet dépasse ce volume; agrégation devrait être déléguée à une RPC.
3. **Analytics "Revenus approuvés"** confond `total_amount_usd` et paiement réellement encaissé (pas de jointure `payment_status`).
4. **Bulk action** boucle séquentielle d'invocations edge function (UI bloquée, pas de transaction, échec partiel non rejouable).
5. **`AdminSubdivisionLots`** : pas de lien clic → fiche demande mère, ni filtre par statut/parcelle mère, ni filtre période.

## Plan de correction optimisé

Ordre choisi : sécurité financière d'abord, dette de structure ensuite, finitions UX.

### Étape 1 — Stopper la double facturation (P0, edge function)
- Dans `subdivision-request/index.ts` : ne plus ajouter `breakdown.roadTotal` quand au moins un item infrastructure de catégorie `voirie` (clé `road_surface_*`) est produit pour la voie correspondante. Idem `commonTotal` (préparer le futur basculement).
- Conserver `road_fee_per_linear_m_usd` comme **fallback uniquement** si aucun `road_surface_*` n'est applicable. Documenter dans `_shared/subdivisionFees.ts`.
- Ajouter le matching `location_name` réel (commune → ville → province → `*`) avant fallback `rates[0]`.

### Étape 2 — Marquer obsolètes les champs legacy (P1, DB + admin)
- Migration : ajouter `COMMENT ON COLUMN` "DEPRECATED — utiliser subdivision_infrastructure_tariffs" sur `road_fee_per_linear_m_usd` et `common_space_fee_per_sqm_usd`.
- `AdminSubdivisionFeesConfig` : déplacer ces deux champs sous un panneau replié "Tarifs legacy (à migrer)" + bandeau d'alerte, masquer dans l'aperçu si un infra tariff existe.
- `selected_infrastructures` : passer la valeur à `[]` à l'insert (le breakdown vit déjà dans `feeBreakdown` JSON), et ajouter `COMMENT` "DEPRECATED — voir lots_data + fee_breakdown".

### Étape 3 — Restructurer le hub (P1, UI)
- `AdminSubdivisionHub` : extraire `AdminSubdivisionInfrastructureTariffs` et `AdminSubdivisionRoadSurfaceMaterials` du gros scroll, et passer l'onglet "Frais" à 3 sous-onglets :
  1. Tarifs de base (rate_config)
  2. Tarifs par infrastructure (déplacé)
  3. Matériaux de revêtement (déplacé depuis ZoningRules)
- Mémoriser le sous-onglet via `?sub=fees&fsub=...` pour pouvoir y deep-linker depuis le breadcrumb 4 niveaux (déjà supporté par `HUB_SUBTAB_LABELS`).

### Étape 4 — Aligner le certificat (P1, sécurité + cohérence)
- Créer le bucket privé `subdivision-certificates` + RPC `get_signed_subdivision_certificate(request_id)` (modèle copié de Mutation/Expertise).
- Déplacer `generateAndUploadCertificate` côté edge `approve-subdivision` (déjà serveur) et stocker `certificate_path`.
- `RequestDetailsDialog` : helper `openSubdivisionCertificate` (parité avec `openMutationCertificate`).

### Étape 5 — Détails & affichage admin (P2)
- `RequestDetailsDialog` : ajouter section "Décomposition des frais" lisant `fee_breakdown` + `infrastructure_fee_usd` + liste persistée des items.
- `SubdivisionRequest` type : ajouter `province | ville | commune | infrastructure_fee_usd | certificate_path`.
- `AdminSubdivisionRequests` : remplacer `pendingCount` local par `useAdminPendingCounts`. Wrapper `searchQuery` via `escapeIlike`. Toast d'erreur sur `handleStartReview`.

### Étape 6 — Analytics & lots (P2)
- Nouvelle RPC `get_subdivision_admin_stats(period_start, period_end)` retournant KPI agrégés + top zones, et utilisée par `AdminSubdivisionAnalytics` (suppression du `limit(1000)`).
- Distinguer "approuvées" vs "payées" (joindre `submission_payment_status`) dans "Revenus".
- `AdminSubdivisionLots` : ajout filtres statut/période, colonne réf demande mère cliquable (ouvre la `RequestDetailsDialog`).

### Étape 7 — Bulk actions robustes (P3)
- Convertir la boucle `for ... await invoke('approve-subdivision')` en `Promise.allSettled` borné (chunks de 5) + accumulateur d'échecs téléchargeables CSV pour ré-essai.

## Détails techniques (synthèse)

```text
Edge: subdivision-request
  - rate matching: by location_name (commune/ville/province) then '*' then first
  - dropRoadTotal if any infra item linked_to=road_surface (per road)
  - dropCommonTotal if any infra item linked_to=common_space (anticipé)

DB:
  + COMMENT ON COLUMN subdivision_rate_config.road_fee_per_linear_m_usd ...
  + COMMENT ON COLUMN subdivision_rate_config.common_space_fee_per_sqm_usd ...
  + COMMENT ON COLUMN subdivision_requests.selected_infrastructures ...
  + bucket subdivision-certificates (privé) + policies
  + RPC get_signed_subdivision_certificate(request_id uuid)
  + RPC get_subdivision_admin_stats(start tz, end tz)

UI:
  AdminSubdivisionHub → "fees" devient onglet à 3 sous-onglets
  AdminSubdivisionRequests → escapeIlike, useAdminPendingCounts, toast review
  RequestDetailsDialog → bloc décomposition + certificat signé
  AdminSubdivisionAnalytics → RPC stats
  AdminSubdivisionLots → filtres + lien parent
  Bulk actions → Promise.allSettled chunked
```

## Fichiers touchés (estimation)

- `supabase/functions/subdivision-request/index.ts`, `supabase/functions/approve-subdivision/index.ts`
- `supabase/functions/_shared/subdivisionFees.ts`
- Migration SQL (commentaires, bucket, RPC × 2)
- `src/components/admin/AdminSubdivisionHub.tsx`
- `src/components/admin/AdminSubdivisionFeesConfig.tsx` (+ nouveau wrapper sous-onglets)
- `src/components/admin/AdminSubdivisionZoningRules.tsx` (retrait du mount RoadSurfaceMaterials)
- `src/components/admin/AdminSubdivisionRequests.tsx`
- `src/components/admin/subdivision/requests/{types,RequestDetailsDialog,helpers}.ts(x)`
- `src/components/admin/AdminSubdivisionAnalytics.tsx`
- `src/components/admin/AdminSubdivisionLots.tsx`
- `src/utils/subdivisionCertificateUrl.ts` (nouveau)
- `.lovable/memory/admin/subdivision-admin-audit-fr.md` (note finale)

Étapes 1, 2, 3 sont strictement P0/P1 et apportent l'essentiel du correctif (financier + structurel). Les étapes suivantes peuvent être livrées en lots successifs.
