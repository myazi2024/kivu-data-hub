

## Audit — Espace admin "Carte & Configuration"

### 1. Périmètre identifié
<lov-tool-use id="toolu_vrtx_01Xr2vSfVBSTgXTwn9RmjmX8" name="code--search_files" integration-id="code" data="{\"query\": \"AdminMap|MapConfig|MapProvider|map_providers|cartograph\", \"include_patterns\": \"src/components/admin/**,src/pages/Admin*.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01GiNVawiVeCV9sntwNn4Nsd" name="code--list_dir" integration-id="code" data="{\"dir_path\": \"src/components/admin\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01LLE2ohbUNM38KjsWUwb7Ev" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name ILIKE '%map%' OR table_name ILIKE '%config%' OR table_name ILIKE '%cadastral_config%') ORDER BY table_name;\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01LQALSWukaUCrrSCahRGcmf" name="code--search_files" integration-id="code" data="{\"query\": \"AdminMap|map_providers|MapProvider|MapConfig\", \"include_patterns\": \"src/components/admin/**,src/pages/**\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_0126MyYUCeNTF3SME2eW2Eki" name="code--list_dir" integration-id="code" data="{\"dir_path\": \"src/components/admin\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01B37cdVUgSrPqdWuiZsaGjC" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name ILIKE '%map%' OR table_name ILIKE '%config%') ORDER BY table_name;\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_018rEpvLkjWxk5hUiX613UYJ" name="code--exec" integration-id="code" data="{\"command\": \"wc -l src/components/admin/AdminCadastralMap.tsx src/components/admin/AdminMapProviders.tsx src/components/admin/AdminCatalogConfig.tsx src/components/admin/AdminContributionConfig.tsx src/components/admin/AdminSearchBarConfig.tsx src/components/admin/AdminResultsConfig.tsx src/components/admin/AdminAppearance.tsx src/components/admin/AdminParcelActionsConfig.tsx src/components/admin/AdminTerritorialZones.tsx 2>/dev/null\", \"user_facing_description\": \"Mesure des composants config\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01CnXMG7jxErMDczXwJT2etz" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT 'map_providers' t, count(*) c, sum(case when is_active then 1 else 0 end) actifs, sum(case when is_default then 1 else 0 end) defauts FROM map_providers\\nUNION ALL SELECT 'catalog_config', count(*), sum(case when is_active then 1 else 0 end), 0 FROM catalog_config\\nUNION ALL SELECT 'cadastral_contribution_config', count(*), sum(case when is_active then 1 else 0 end), 0 FROM cadastral_contribution_config\\nUNION ALL SELECT 'cadastral_search_config', count(*), sum(case when is_active then 1 else 0 end), 0 FROM cadastral_search_config\\nUNION ALL SELECT 'cadastral_results_config', count(*), sum(case when is_active then 1 else 0 end), 0 FROM cadastral_results_config\\nUNION ALL SELECT 'cadastral_services_config', count(*), sum(case when is_active then 1 else 0 end), 0 FROM cadastral_services_config\\nUNION ALL SELECT 'parcel_actions_config', count(*), sum(case when is_active then 1 else 0 end), 0 FROM parcel_actions_config\\nUNION ALL SELECT 'app_appearance_config', count(*), 0, 0 FROM app_appearance_config;\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01QvxD63e3VexZrme6LcyToe" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT provider_key, provider_name, is_active, is_default, requires_api_key, api_key_env_name, display_order FROM map_providers ORDER BY display_order;\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01Bq2cp4qbBJ9tehMSSVx3BK" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT config_key, is_active, jsonb_typeof(config_value) FROM cadastral_contribution_config ORDER BY config_key;\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_011anBzPJVJ3gk98YrbKewqS" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT config_key, is_active FROM app_appearance_config ORDER BY config_key;\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01UQdHYn7DdTgeA2Xbv9THF8" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT count(*) territorial_zones, count(distinct province) provinces FROM territorial_zones;\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01VmHaLc8WiHi1RtDTMy9zV1" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT column_name FROM information_schema.columns WHERE table_name='app_appearance_config';\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01Qn6ibjcx6fPrPfxStKkdAf" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT column_name FROM information_schema.columns WHERE table_name='territorial_zones';\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01NhfUFSNodxDaDSuva9n5MB" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/admin/AdminCadastralMap.tsx\", \"lines\": \"1-80\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01DBdZn3m1BVJz4Vze6496uX" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT \\n (SELECT count(*) FROM cadastral_parcels WHERE deleted_at IS NULL) total_parcels,\\n (SELECT count(*) FROM cadastral_parcels WHERE deleted_at IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL) with_gps,\\n (SELECT count(*) FROM cadastral_parcels WHERE deleted_at IS NULL AND (latitude IS NULL OR longitude IS NULL)) without_gps,\\n (SELECT count(*) FROM cadastral_parcels WHERE gps_coordinates IS NOT NULL AND jsonb_array_length(gps_coordinates) > 2) with_polygon,\\n (SELECT count(*) FROM cadastral_contributions WHERE status='approved' AND parcel_number NOT ILIKE 'TEST-%') approved_real,\\n (SELECT count(*) FROM territorial_zones) zones,\\n (SELECT count(*) FROM territorial_zones WHERE coordinates IS NULL) zones_no_coords;\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01MGvxoC7Jge7kXQqCMy2nsR" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT config_key FROM app_appearance_config ORDER BY config_key;\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_013zCuiXtvJPYoGiXHZQMKyE" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/admin/AdminMapProviders.tsx\", \"lines\": \"200-400\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01MGg9ojMcZxBWPr6CC27RvB" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT \\n (SELECT count(DISTINCT trigger_name) FROM information_schema.triggers WHERE event_object_table='map_providers') triggers_map,\\n (SELECT count(*) FROM map_providers WHERE requires_api_key=true) need_key,\\n (SELECT count(*) FROM cadastral_parcels WHERE deleted_at IS NULL AND gps_coordinates IS NULL) no_polygon,\\n (SELECT count(*) FROM cadastral_parcels WHERE deleted_at IS NULL AND latitude IS NULL) no_centroid,\\n (SELECT count(*) FROM territorial_zones WHERE coordinates IS NOT NULL) zones_with_geo;\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_0139LjbqQmaZnH5PtMivSBWd" name="code--exec" integration-id="code" data="{\"command\": \"grep -l \\\"MAPBOX_ACCESS_TOKEN\\\" src -r 2>/dev/null | head -5; echo \\\"---\\\"; grep -rn \\\"{apiKey}\\\" src --include=\\\"*.ts\\\" --include=\\\"*.tsx\\\" 2>/dev/null | head -10\", \"user_facing_description\": \"Vérification utilisation clé Mapbox\"}">
</lov-tool-use>
J'ai assez de contexte. Le hook `useMapProvider.getTileUrl(apiKey)` attend une clé API, mais aucune consommation côté UI ne lui passe (les Mapbox sont dans la BD mais inutilisables). De plus, 100% des parcelles ont `latitude/longitude NULL` — la carte admin (`AdminCadastralMap`) ne peut afficher aucun point.

<lov-plan>

## Audit — Espace admin "Carte & Configuration"

### 1. Périmètre

**Composants Carte (1 210 LOC)**
| Composant | LOC | Rôle |
|---|---|---|
| `AdminCadastralMap` | 548 | Vue admin parcelles approuvées sur carte |
| `AdminMapProviders` | 662 | Gestion fournisseurs tuiles |

**Composants Configuration (~5 200 LOC, 14 écrans)**
- `AdminContributionConfig` **1 620 LOC** (>seuil 1 000) · `AdminAppearance` 690 · `AdminCatalogConfig` 549 · `AdminSearchBarConfig` 541 · `AdminTerritorialZones` 467 · `AdminParcelActionsConfig` 424 · `AdminResultsConfig` 382 · + 7 écrans de tarifs (`AdminBillingConfig`, `AdminExpertiseFeesConfig`, `AdminPermitFeesConfig`, `AdminMutationFeesConfig`, `AdminLandTitleFeesConfig`, `AdminSubdivisionFeesConfig`, `AdminCurrencyConfig`).

22 tables `*_config` côté BD.

### 2. État BD — anomalies critiques

| # | Anomalie | Mesure | Sévérité |
|---|---|---|---|
| **A1** | **0 parcelle avec centroïde** (`latitude/longitude NULL` sur 3 510). `AdminCadastralMap` filtre `parcel_number NOT ILIKE 'TEST-%'` ⇒ **0 contribution approuvée réelle** ⇒ carte admin **vide en permanence** | 0/3510 | **Critique** |
| **A2** | **2 fournisseurs Mapbox activés mais clé API non câblée** : `useMapProvider.getTileUrl(apiKey)` exige un argument, aucun consommateur ne le passe. `MAPBOX_ACCESS_TOKEN` jamais lue côté client | 2/10 | Élevée |
| **A3** | **Google Maps tuiles directes (`google_roadmap/satellite/hybrid`)** marquées `requires_api_key=false` — **violation des CGU Google** (tuiles non publiques sans contrat) | 3/10 | **Critique légal** |
| **A4** | **`map_providers` : aucun trigger** garantissant qu'1 seul `is_default=true` à la fois (passage par UPDATE manuel ligne 157, sans démarquer l'ancien) | 0 trigger | Élevée |
| **A5** | **`app_appearance_config` n'a pas de colonne `is_active`** alors que tous les autres `*_config` l'ont — incohérence schéma | — | Moyenne |
| **A6** | **35 zones territoriales** avec coordinates OK, mais **aucune table `provinces` normalisée** : `geographicData` codé en dur dans `src/lib/geographicData` (filtre province admin ne reflète pas la BD) | 35 | Moyenne |
| **A7** | **`AdminContributionConfig` 1 620 LOC** > seuil mémoire projet (1 000) | — | Moyenne |
| **A8** | **24 entrées `cadastral_contribution_config`** : aucune table de versioning / historique des modifications de picklists (impact rétroactif sur formulaires) | 24 | Moyenne |
| **A9** | **Aucun audit log** sur tables `*_config` (sauf `analytics_config_audit` et `billing_config_audit` créés récemment) — 20 tables config sans traçabilité | 20/22 | Élevée |
| **A10** | **`map_preview_settings`** stocké dans `cadastral_contribution_config` au lieu d'une table `map_config` dédiée — couplage incorrect | — | Faible |

### 3. Audit fonctionnel UI

| # | Manque/Risque | Sévérité |
|---|---|---|
| F1 | **Carte admin inutilisable** : compteur "0 parcelle GPS", pas de message d'aide ni de redirection vers la source du problème | Élevée |
| F2 | **Aperçu fournisseur Mapbox affiche OSM** (ligne 230-232) sans avertir l'admin que la clé manque | Moyenne |
| F3 | **Pas de test de validité tuile** au moment de l'ajout (URL invalide acceptée, échec silencieux à l'usage) | Moyenne |
| F4 | **Pas de lien** entre `AdminMapProviders` et `useMapConfig` (legend, defaultZoom, defaultCenter mélangés dans une autre table) | Moyenne |
| F5 | **`AdminContributionConfig` monolithique** 1 620 LOC — impossible à maintenir (24 sections JSONB dans un seul écran) | Élevée |
| F6 | **Pas de prévisualisation live** des picklists modifiés (form CCC ne se rafraîchit qu'au prochain rechargement utilisateur) | Faible |
| F7 | **Pas de snapshot/rollback** des configurations critiques (un mauvais JSON peut casser le formulaire CCC en prod sans rollback rapide) | Élevée |
| F8 | **20 tables `*_config` sans audit log** — impossible de tracer "qui a changé quoi quand" | Élevée |
| F9 | **`AdminAppearance`** modifie le thème global mais ne propose pas d'aperçu avant validation | Moyenne |
| F10 | **`AdminTerritorialZones`** gère 35 zones, pas de carte interactive d'attribution (saisie manuelle de coordonnées) | Faible |
| F11 | **Pas d'export/import JSON** des configurations (migration entre environnements impossible) | Moyenne |
| F12 | **Realtime config** (legend, picklists) : rafraîchit sans debounce → re-render coûteux du formulaire CCC ouvert | Faible |

### 4. Sécurité & cohérence

- **A3 (Google tuiles)** : risque légal, à désactiver immédiatement (sauf si contrat Google Maps Platform signé).
- **A2 (Mapbox)** : fournisseur visible côté admin mais inutilisable côté utilisateur → confusion + faux sentiment de redondance.
- **A4 (default unique)** : admin peut cliquer "définir par défaut" sans démarquer l'ancien → 2 défauts possibles, comportement UI imprévisible.
- **A8/A9 (audit)** : modification d'un picklist (ex: types de titres fonciers) impacte rétroactivement tous les formulaires sans trace ni possibilité de retour arrière.

### 5. Recommandations priorisées

**P0 — Critique (BD + sécurité)**
1. **Désactiver les 3 fournisseurs Google tuiles** (`is_active=false`) sauf si contrat signé. Ajouter avertissement légal dans `AdminMapProviders`.
2. **Trigger `enforce_single_default_provider`** : avant `UPDATE/INSERT` avec `is_default=true`, démarquer tous les autres.
3. **Edge function `proxy-mapbox-tiles`** : proxifier les tuiles Mapbox côté serveur (clé jamais exposée). Câbler `useMapProvider` pour utiliser le proxy.
4. **Bandeau "Carte vide"** dans `AdminCadastralMap` quand 0 contribution réelle approuvée + lien vers `AdminCCCContributions`.
5. **Ajout colonne `is_active`** sur `app_appearance_config` (cohérence schéma).
6. **Trigger audit générique** `log_config_change()` appliqué aux 20 tables `*_config` restantes (insertion dans `system_config_audit`).

**P1 — UX admin**
7. **Test tuile au save** dans `AdminMapProviders` : appel HEAD sur une tuile sample (z=2,x=1,y=1), refus si 4xx/5xx.
8. **Aperçu Mapbox réel** : passer la clé via le proxy P0#3 pour aperçu authentique.
9. **Snapshot/Rollback** : table `config_snapshots` + bouton "Restaurer version précédente" sur chaque écran config (P0 audit log P0#6 fournit la matière).
10. **Modulariser `AdminContributionConfig`** (1 620 LOC) en sous-onglets : `picklists/`, `validation-rules/`, `field-labels/`, `help-texts/`, `map-preview/`.
11. **Export/Import JSON** des configs (bouton ⬇️/⬆️ par écran).
12. **Aperçu live** dans `AdminAppearance` (preview fenêtre côte à côte du thème).
13. **Debounce 300 ms** sur les Realtime des hooks `useCatalogConfig`, `useResultsConfig`, `useSearchConfig`, `useMapConfig`, `useMapProvider`.

**P2 — Évolutions**
14. **Migration `geographicData` → table BD `provinces/villes/communes/quartiers`** synchronisée avec `territorial_zones`.
15. **Carte interactive** d'édition zones dans `AdminTerritorialZones` (clic pour saisir coordonnées).
16. **Sortir `map_preview_settings` de `cadastral_contribution_config`** vers nouvelle table `map_config` dédiée.
17. **Validation JSON Schema** sur chaque entrée `config_value` (refus de structure invalide en BD).
18. **Page d'index `AdminConfigHub`** unifiée listant les 22 tables config + dernier modificateur + bouton diff.

### 6. Question

Quel périmètre dois-je implémenter ?

- **(A) P0 uniquement** — désactivation Google, trigger défaut unique, proxy Mapbox edge function, bandeau carte vide, audit log générique 20 tables (~1 h 30, surtout SQL + edge fn)
- **(B) P0 + P1** — ajoute snapshot/rollback, modularisation `AdminContributionConfig` (1 620 LOC), test tuile, export/import, debounce realtime (~3 h)
- **(C) Plan complet P0+P1+P2** — ajoute migration `geographicData`→BD, carte interactive zones, séparation `map_config`, JSON Schema, hub config unifié (~5 h)

