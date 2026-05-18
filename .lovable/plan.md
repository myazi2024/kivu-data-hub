# Audit — « Ajouter une règle de zonage » (Admin › Lotissement › Zonage)

Composant audité : `src/components/admin/AdminSubdivisionZoningRules.tsx` (**1 263 lignes**, monolithe).
Le formulaire fonctionne correctement sur le chemin nominal, mais cumule plusieurs angles morts (validation, traçabilité, intégrité géographique, ergonomie, modularité).

---

## 1. Constats par criticité

### 🔴 P0 — Intégrité / sécurité fonctionnelle

1. **`location_name` ambigu** — la BDD ne stocke que le **niveau le plus précis** (ex. `"Nganda"`). `reverseGeographicLookup` retourne **le premier match** trouvé en parcourant toutes les provinces : si deux quartiers homonymes existent dans deux villes différentes, la règle peut être appliquée à la mauvaise zone. La cascade côté edge (`subdivision-request`) souffre du même biais.
2. **Pas de garantie applicative d'unicité** `(section_type, location_name)` : on s'appuie sur un message Postgres `duplicate` parsé à la chaîne ; si la contrainte unique manque côté DB, deux règles concurrentes coexistent silencieusement.
3. **Aucune traçabilité** : create / update / delete / toggle `is_active` **n'écrivent pas** dans `system_config_audit` (alors que le pattern existe ailleurs — cf. mémoire `map-config-admin-audit-fr`). Impossible de savoir qui a modifié quelle règle ni quand.
4. **Pas d'optimistic locking** : deux admins éditant la même règle écrasent leurs changements sans avertissement (`updated_at` non comparé au save).
5. **Validations côté infrastructures incomplètes** quand l'exigence est activée :
   - `require_drainage_canal=true` mais **0 matériau / 0 type / largeur vide** acceptés → contrainte vide pousse en BDD.
   - `require_solar_lighting=true` mais **tous les champs vides** acceptés.
   - `min_gps_points < 3` accepté (un polygone exige ≥ 3 sommets).
   - `min_common_space_pct` non borné [0, 100].
   - `min_road_width_m ≤ 0` accepté.

### 🟠 P1 — Cohérence métier

6. **Tarification revêtement orpheline** : la liste `road_surface_allowed_materials` accepte des clés matériaux qui peuvent **ne pas exister** (ou être désactivés) dans `subdivision_infrastructure_tariffs` catégorie `road_surface` → fee = 0 silencieux côté edge.
7. **`exclude_title_types` saisie libre** (virgules) sans picklist normalisée → typos = règle inefficace. Devrait piocher dans `propertyTitleTypes` (cf. mémoire CCC `property-title-types-specification-fr`).
8. **Pas de vérification de chevauchement** : aucun garde-fou si une règle « par défaut » est plus restrictive qu'une règle spécifique (incohérence silencieuse).
9. **Toggle `is_active` sur la liste** : pas de confirmation alors qu'une règle active bloque/débloque potentiellement toutes les demandes d'une zone.

### 🟡 P2 — UX / productivité admin

10. **Aucune recherche, tri, pagination** sur le tableau (déjà 1+ règle par province × cascade = potentiellement des centaines).
11. **Pas de duplication ("Cloner")** : recréer une règle similaire pour une commune voisine = ressaisie complète.
12. **Filtres** limités à `urban|rural|all` : pas de filtre par province, statut, ou « règles avec infrastructures requises ».
13. **`formatBreadcrumb` recalculé à chaque ligne / rendu** sans mémoïsation, boucle O(provinces × villes × communes × quartiers) → ralentissement perceptible à grande échelle.
14. **Aperçu d'impact absent** : combien de demandes en cours, combien de parcelles concernées par la règle éditée ?
15. **Pas de bouton « Tester la règle »** sur une parcelle fictive pour visualiser les blocages produits.
16. **Switchs sans `aria-label`** dans les blocs infrastructures ; chips checkbox custom sans focus visible.

### 🟢 P3 — Dette technique

17. **Monolithe 1 263 lignes** — viole `complex-dialog-modularization-strategy-fr` (seuil 1 000). À découper :
    ```text
    AdminSubdivisionZoningRules/
      index.tsx                       (orchestrateur, ~250 l)
      ZoningRulesTable.tsx
      ZoningRuleDialog/
        index.tsx                     (formulaire root)
        ScopeSection.tsx              (section_type + apply_to_default)
        GeographyCascade.tsx          (Urban + Rural unifiés)
        LotsRoadsSection.tsx
        ParentParcelSection.tsx
        InfrastructuresSection.tsx
          DrainageCanalBlock.tsx
          SolarLightingBlock.tsx
          RoadSurfaceBlock.tsx
        NotesStatusSection.tsx
      hooks/
        useZoningRulesCrud.ts         (fetch/save/delete + invalidation)
        useFormFromRule.ts            (mapping rule→form)
      helpers/
        geographicReverse.ts          (mémoïsé)
        zoningValidation.ts           (validation pure testable)
    ```
18. **`as any` implicite** via `untypedTables.subdivision_zoning_rules()` — toléré, mais une mise à jour des types Supabase générés permettrait de l'éliminer.
19. **Aucun test** : `zoningValidation` doit être testée unitairement (Vitest) sur tous les cas (cohérence parent/lot, infrastructures, revêtement).
20. **Constantes en dur** (`['beton','pvc','maconnerie',...]` drainage, `['ouvert','couvert','enterre']` types) déjà extraites dans `infrastructureConstants.ts` — devraient être importées, pas redéclarées.

---

## 2. Remédiations proposées (ordre d'exécution)

### Lot A — Intégrité données (migration + UI)
- Ajouter colonnes `province_path text[]` et `geo_levels jsonb` à `subdivision_zoning_rules` pour stocker le chemin complet (résout #1).
- Index unique partiel `(section_type, location_name, COALESCE(province_path, '{}'))` (résout #2).
- Trigger `audit_subdivision_zoning_rules` qui insère dans `system_config_audit` (action, before/after, actor) sur INSERT/UPDATE/DELETE (#3).
- Ajouter `version int default 1` + check `OLD.version = NEW.version - 1` (#4).

### Lot B — Validation
- Centraliser dans `helpers/zoningValidation.ts` :
  - bornes (`min_road_width_m > 0`, `min_common_space_pct ∈ [0,100]`, `min_gps_points ≥ 3`)
  - infrastructures cohérentes (si `require_*` → au moins 1 dimension renseignée)
  - matériaux revêtement référencés dans `subdivision_infrastructure_tariffs` catégorie `road_surface` (warning non bloquant si manquants)
- Hook React qui retourne `errors[]` typés pour affichage inline (au-delà du `toast.error`).

### Lot C — Picklists & cohérence
- `exclude_title_types` → multi-select alimenté par `useCCCFormPicklists().titleTypes` (#7).
- Importer `DRAINAGE_CANAL_MATERIALS` / `_TYPES` depuis `infrastructureConstants.ts` (#20).
- Sur ouverture du dialog, fetch `subdivision_infrastructure_tariffs` catégorie `road_surface` ; afficher un badge ⚠ sur les matériaux cochés sans tarif (#6).

### Lot D — UX admin
- Toolbar : recherche serveur (debounce 300 ms), filtre province, filtre statut, tri colonnes.
- Pagination serveur (`range` + `count: 'exact'`).
- Boutons par ligne : **Cloner**, **Tester** (#11, #15), confirmation `AlertDialog` sur `toggleActive` (#9).
- Mémoïser `formatBreadcrumb` (Map cache `location_name → breadcrumb`) (#13).
- Aperçu d'impact dans le dialog en mode édition : « N parcelles concernées · M demandes en cours » via RPC légère (#14).

### Lot E — Modularisation + tests
- Découpage selon l'arborescence proposée (#17).
- Vitest sur `zoningValidation.ts` (couverture ≥ 90 %).
- Vitest sur `geographicReverse.ts` avec cas homonymes.

### Lot F — Mémoire
- Mise à jour `mem://admin/subdivision-admin-audit-fr` : nouveau lot « Zonage hardening ».

---

## 3. Notes techniques

- `request_admin_audit` est réservé aux **demandes** (subdivision_requests). Les changements de **configuration** doivent passer par `system_config_audit` (pattern map/billing).
- Le payload `parent_parcel` envoyé à l'edge contient déjà province/ville/commune/quartier/avenue : enrichir la cascade serveur pour matcher sur **chemin complet** (et non juste `location_name`) — change cohérent avec le Lot A.
- Le test « impact d'une règle » peut être implémenté via une RPC `simulate_zoning_rule(_rule_id)` retournant `{ blocked_requests, affected_parcels, sample[] }`.

---

## 4. Hors périmètre (non audité ici)
- Logique de calcul `subdivisionFees.ts` (déjà couverte par mémoire P0).
- Flow utilisateur `StepZoningRules` (couvert par Lot F existant).
- Catalogue `subdivision_road_surface_materials` (CRUD séparé fonctionnel).

---

## 5. Recommandation
Démarrer par **Lots A + B** (intégrité + validation) qui adressent les 5 P0, puis **Lot C** (cohérence picklists) avant **D/E** (UX + dette). Total estimé : 1 migration + ~12 fichiers découpés + 2 fichiers de tests.
