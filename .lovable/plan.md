

## Audit — Mode Test (synthèse)

État global : **fonctionnel et bien architecturé**, mais 7 incohérences/dettes identifiées entre le code, la DB et la documentation. Aucun bug bloquant ; surtout du nettoyage à faire pour aligner le frontend sur l'architecture batchée déployée côté serveur.

---

### ✅ Ce qui fonctionne bien

| Composant | État |
|---|---|
| `useTestMode` (config realtime via postgres_changes) | OK |
| `applyTestFilter` + `useTestEnvironment` (routes `/test/*`) | OK |
| Trigger `prevent_test_data_in_prod` sur 12 tables | Actif et testé |
| Cron `cleanup-test-data-daily-rpc` (03:00 UTC, RPC SQL directe) | Actif |
| Edge `cleanup-test-data-batch` (admin guard + boucle 23 étapes × 500) | Déployée et utilisée |
| Generators modularisés (15 fichiers `generators/*.ts`) | OK |
| Registry `test_entities_registry` (22 entrées) + `loadTestEntities` cache 5 min | OK |
| RPC `count_test_data_stats` + gestion P0001 → toast | OK |
| `TestModeBanner` financier (seuil min 20 + 50%) | OK |
| Garde anti-duplication dans `generateTestData` | OK |

---

### 🟠 Incohérences à corriger (P1)

#### 1. Régression critique — `handleDisableWithCleanup` appelle la RPC DEPRECATED
`src/components/admin/AdminTestMode.tsx:147` invoque `supabase.rpc('cleanup_all_test_data')` lors du flux « Désactiver et supprimer ». Cette RPC est marquée DEPRECATED et **plante en `statement_timeout` au-delà de ~14k lignes** (raison même de la création de l'edge batchée). Sur un environnement plein, ce bouton échoue silencieusement et laisse les données en place pendant que le mode test est désactivé.
→ **Fix** : remplacer par `supabase.functions.invoke('cleanup-test-data-batch')` comme dans `useTestDataActions.cleanupTestData` (gérer le même format `{ ok, failed_step, partial_total, ... }`).

#### 2. Documentation utilisateur obsolète
`TestModeGuide.tsx:11` affiche encore : *« Nettoyage manuel via la RPC `cleanup_all_test_data()` »*. Faux depuis la migration batchée.
→ **Fix** : remplacer par *« edge function `cleanup-test-data-batch` (purge par lots de 500, 23 étapes FK-safe) »*.

#### 3. Registry — 8 entrées enfants désactivées (`is_active = false`)
La mémoire annonce **22 entités actives** mais la DB n'en a que **14 actives** : `ownershipHistory`, `taxHistory`, `boundaryHistory`, `mortgagePayments`, `expertisePayments`, `fraudAttempts`, `permitPayments`, `permitAdminActions` sont toutes `is_active=false`.

**Conséquence pratique** :
- `count_test_data_stats()` (registry-driven) retourne 0 pour ces 8 entités → la carte stats UI affiche 0 même si des lignes existent.
- `TestDataExportButton` (CSV pré-purge) **n'exporte pas** ces 8 entités enfants → perte d'audit trail.
- L'edge batch les purge quand même (liste hardcodée `STEPS`), donc pas de fuite de données.

→ **Fix** : décider — soit `UPDATE test_entities_registry SET is_active = true WHERE label_key IN (…8 enfants)`, soit assumer le choix et mettre à jour la mémoire (`22 entités actives` → `14 racines + 8 enfants désactivés volontairement`).

---

### 🟡 Polish (P2)

#### 4. `TestDataStatsCard` STAT_ITEMS dupliqué
20 entrées hardcodées (`STAT_ITEMS`) doublonnent ce que `loadTestEntities()` fournit déjà. Dérive garantie au prochain ajout d'entité.
→ **Fix** : générer `STAT_ITEMS` à partir de `loadTestEntities()` (même mapping `labelKey` → `label`).

#### 5. `TestEnvironmentBanner` — visibilité réduite
Bandeau bottom-right `text-[10px] opacity-60` quasi invisible. La doc dit *« indicateur visuel pour distinguer test/production »* — l'intention est diluée. À voir si volontaire (mode discret) ou à renforcer.

#### 6. Edge `cleanup-test-data` (legacy) toujours déployée
Marquée dépréciée dans la doc mais toujours présente dans `supabase/functions/cleanup-test-data/`. Risque qu'un script externe l'appelle encore. À supprimer ou à laisser un README clair.

#### 7. Cast `as any` sur `test_entities_registry`
`src/constants/testEntities.ts:84` et `TestDataExportButton.tsx:24` castent `(supabase as any)` car la table est absente de `types.ts`. Soit normal (table admin pure), soit régénérer les types.

---

### 🟢 Sécurité — RAS

- Routes `/test/*` admin-only ✅
- Edge batch : double check JWT + `user_roles` ✅
- RPC `cleanup_test_data_chunk` : `SECURITY DEFINER` + `has_role` guard ✅
- Trigger anti-prod sur les 12 tables critiques ✅
- Registry — RLS non vérifiée dans cet audit (à faire si besoin)

---

### Plan d'action proposé (par priorité)

| # | Action | Fichier(s) | Impact |
|---|---|---|---|
| P0 | Remplacer RPC deprecated par edge batch dans `handleDisableWithCleanup` | `AdminTestMode.tsx` | **Haut** (bug fonctionnel) |
| P1 | Corriger texte du guide (RPC → edge batch) | `TestModeGuide.tsx` | Moyen |
| P1 | Décision registry : activer 8 enfants OU mettre à jour la mémoire | DB ou `test-mode-hardening-fr.md` | Moyen (cohérence audit) |
| P2 | Générer `STAT_ITEMS` dynamiquement depuis registry | `TestDataStatsCard.tsx` | Faible |
| P2 | Supprimer ou sceller edge legacy `cleanup-test-data` | `supabase/functions/cleanup-test-data/` | Faible |
| P2 | Renforcer visibilité `TestEnvironmentBanner` (optionnel) | `TestEnvironmentBanner.tsx` | Faible |

Aucun changement DB obligatoire si la décision pour le point #3 est de garder les 8 enfants désactivés.

