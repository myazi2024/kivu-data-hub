

# Audit du mode test — Alignement post-modifications

## Anomalies détectées

### 1. Code mort : `TEST_TABLES_DELETION_ORDER` (types.ts)

Le tableau `TEST_TABLES_DELETION_ORDER` (lignes 50-78 de `src/components/admin/test-mode/types.ts`) n'est **importé nulle part**. Le nettoyage utilise désormais la RPC `cleanup_all_test_data`. Ce code mort est incomplet (manque `expertise_payments`, `cadastral_mortgage_payments`) et source de confusion.

**Action** : Supprimer `TEST_TABLES_DELETION_ORDER` de `types.ts`.

### 2. Terminologie "permis" résiduelle (3 fichiers)

Le mot "permis" subsiste dans 3 fichiers du mode test, en violation de la règle "Autorisation" :

| Fichier | Texte actuel | Correction |
|---|---|---|
| `TestModeGuide.tsx` (ligne 9) | `~700 permis` | `~700 autorisations` |
| `useTestDataActions.ts` (ligne 52) | `Bornages & hypothèques & permis` | `Bornages & hypothèques & autorisations` |
| `useTestDataActions.ts` (ligne 277-278) | `Bornages/hypothèques/permis` | `Bornages/hypothèques/autorisations` |
| `TestDataStatsCard.tsx` (ligne 165) | `bornages, hypothèques, permis` | `bornages, hypothèques, autorisations` |

### 3. Documentation `docs/TEST_MODE.md` obsolète

- La table des routes miroir ne reflète pas le renommage "Parcelle → Construction" dans les analytics
- La section "Composants" ne mentionne pas la RPC `cleanup_all_test_data` (le Edge Function n'est plus la méthode principale)
- Ajout de la mention que la RPC serveur est désormais la méthode recommandée

### 4. Aucune anomalie fonctionnelle

- Les filtres `applyTestFilter` / `isTestRoute` sont correctement appliqués dans toutes les requêtes utilisateur (13 fichiers) et dans le data fetching analytics (`useLandDataAnalytics.tsx`)
- La RPC `cleanup_all_test_data` et `count_test_data_stats` sont bien utilisées
- Les routes miroir `/test/map`, `/test/cadastral-map`, `/test/mon-compte` sont en place dans `App.tsx`
- La bannière test, le provider, et le paiement simulé fonctionnent correctement
- Le `TestDataStatsCard` utilise déjà "Autorisations" pour le label du KPI `buildingPermits`

---

## Plan de correction

### Fichiers modifiés (4)

**1. `src/components/admin/test-mode/types.ts`**
- Supprimer `TEST_TABLES_DELETION_ORDER` (code mort, lignes 49-78)

**2. `src/components/admin/test-mode/TestModeGuide.tsx`**
- Ligne 9 : `~700 permis` → `~700 autorisations`

**3. `src/components/admin/test-mode/useTestDataActions.ts`**
- Ligne 52 : `Bornages & hypothèques & permis` → `Bornages & hypothèques & autorisations`
- Lignes 277-278 : `Bornages/hypothèques/permis` → `Bornages/hypothèques/autorisations`

**4. `src/components/admin/test-mode/TestDataStatsCard.tsx`**
- Ligne 165 : `permis` → `autorisations`

**5. `docs/TEST_MODE.md`**
- Mettre à jour la section nettoyage (RPC > Edge Function)
- Supprimer la référence à l'onglet "Parcelle" dans les routes miroir (maintenant "Construction" dans analytics)

