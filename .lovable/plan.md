

## Audit détaillé — Mode Test

### 1. État opérationnel actuel

| Élément | État | Source |
|---|---|---|
| Configuration `test_mode` | `enabled=false`, `auto_cleanup=false`, retention=7j | `cadastral_search_config` |
| Données TEST en BD | **0** parcelle, 0 lot, 0 enregistrement résiduel | Comptage direct |
| Cron quotidien | `cleanup-test-data-daily-rpc` actif, `0 3 * * *` UTC | `cron.job` |
| RPC critiques | `cleanup_all_test_data`, `cleanup_all_test_data_auto`, `count_test_data_stats`, `_cleanup_test_data_chunk_internal`, `cleanup_test_data_chunk`, `prevent_test_data_in_prod` — toutes présentes | `pg_proc` |
| Trigger anti-prod | Attaché à **12 tables** (parcels, contributions, invoices, codes CCC, disputes, expertise, titres, mutations, lotissements, conflits, autorisations, hypothèques) | `pg_trigger` |
| Registry | 14 entités actives, ordres 10–140, patterns spécifiques (`TEST-HYP-%`, `TEST-PC%`, `TEST-CERT-%`) | `test_entities_registry` |

### 2. Conformité au plan documenté (`docs/TEST_MODE.md`)

| Composant | Statut | Note |
|---|---|---|
| `TestEnvironmentProvider` + `useTestEnvironment` (`/test/*`) | ✅ Branché dans `App.tsx` |
| `TestEnvironmentBanner` global | ✅ Monté |
| `TestModeBanner` (≥50% TEST) sur dashboards finance | ✅ Présent |
| `applyTestFilter` côté requêtes | ✅ Utilisé dans `useLandDataAnalytics` |
| Hook `useTestMode` (realtime postgres_changes) | ✅ OK |
| Génération multi-étapes (14 steps) | ✅ Implémentée dans `useTestDataActions` |
| Garde anti-duplication avant génération | ✅ Vérifie `count(parcel_number LIKE 'TEST-%')` |
| Provisioning `service_access` via trigger P3 | ✅ Step 5 simplifié en placeholder |
| Nettoyage par lots (edge `cleanup-test-data-batch`) | ✅ JWT + rôle admin/super_admin, audit log, 23 étapes, 500/lot, 200 itérations max |
| Cron auto SQL direct (sans JWT) | ✅ Plus d'edge function dans le cron |
| Audit log (`MANUAL_TEST_DATA_CLEANUP_BATCHED`, `AUTO_TEST_DATA_CLEANUP`, `TEST_DATA_GENERATED`) | ✅ |

### 3. Anomalies & dette technique détectées

#### 🔴 Bug bloquant — `count_test_data_stats()` lève « Accès refusé »
Appel SQL direct rejeté avec `P0001 Accès refusé` (RAISE à la ligne 10). La RPC est appelée par `useTestDataStats` à chaque ouverture de l'admin Mode Test :
- Si l'utilisateur n'est pas reconnu comme admin/super_admin par la fonction, l'écran de stats reste à zéro silencieusement (le hook log `console.error` mais ne remonte pas de toast).
- À vérifier : la fonction utilise probablement `auth.uid()` + `has_role`, qui retourne `false` lors d'un appel sans contexte JWT (cas du test SQL direct). En usage réel via le client supabase, le JWT est passé — donc OK pour un admin connecté, mais aucun feedback UI si l'utilisateur courant n'est pas admin.

**Correctif suggéré** : ajouter un `toast.error('Accès refusé : rôle admin requis')` dans `useTestDataStats` quand l'erreur Postgres porte le code `P0001`.

#### 🟠 Incohérence registry ↔ frontend (`src/constants/testEntities.ts`)
La table serveur contient **14 entités** mais le constant frontend n'inclut **pas** `ownershipHistory`, `taxHistory`, `boundaryHistory`, `mortgagePayments`, `expertisePayments`, `fraudAttempts`, `permit_payments`, `permit_admin_actions` (présents dans `useTestDataStats`/edge function). Inversement, `subdivisionLots` et `serviceAccess` sont dans le constant mais ne sont pas présents dans la table serveur (qui n'a que 14 lignes listées).
- Conséquence : l'export CSV pré-purge (qui s'appuie sur `TEST_ENTITIES`) ne couvre pas tout ce que la purge supprime → risque de perte non auditée.
- Le constant utilise un cast `as never` douteux (incompatibilité de schéma masquée).

**Correctif suggéré** : générer `TEST_ENTITIES` côté client à partir d'un `select * from test_entities_registry` (cache 5 min), supprimer la duplication.

#### 🟠 `STEPS` de l'edge function ↔ registry désalignés
L'edge `cleanup-test-data-batch` énumère 23 étapes (incluant `permit_payments`, `permit_admin_actions`, `mortgage_payments`, `expertise_payments`, etc.) qui ne figurent pas dans `test_entities_registry`. Le registry n'est donc **pas** la source unique de vérité prétendue par la doc.

**Correctif suggéré** : (option A) compléter le registry avec ces tables enfants ; (option B) documenter que le registry ne couvre que les entités « racines » exportables, les enfants étant cascadés.

#### 🟡 Step 5 (« Lots & voies de lotissement ») marqué `done` sans action
`useTestDataActions.ts:220` met l'étape à `done` immédiatement (commentaire « placeholder, alimenté à l'étape 13 »). UX trompeuse : l'utilisateur voit un succès alors que rien n'est exécuté à cette étape. À renommer en « Provisioning service_access (auto trigger) » ou fusionner dans l'étape 13.

#### 🟡 `cleanup_all_test_data` (RPC manuelle) toujours présente mais inutilisée
Le frontend appelle exclusivement l'edge `cleanup-test-data-batch`. La RPC manuelle `cleanup_all_test_data` reste accessible mais n'a pas de garde-fou de nommage pour signaler son obsolescence. Risque : un futur dev l'appelle et bypass l'audit log batched.

**Correctif suggéré** : ajouter un `RAISE NOTICE 'Deprecated, use cleanup-test-data-batch'` ou supprimer si vraiment plus utilisée.

#### 🟡 Bannière `TestModeBanner` — calcul biaisé
Calcule le ratio sur `cadastral_invoices` uniquement. Si la prod n'a aucune facture mais quelques tests, le ratio = 100 % → bannière affichée à tort. Ajouter un seuil minimal (ex. `total >= 20`).

#### 🟢 Points conformes notables
- Aucune fuite TEST en production (12 tables protégées par trigger DB).
- Cron sans JWT en clair (RPC SQL directe).
- Patterns marqueurs spécifiques par table (évite les faux positifs sur `TEST-` en libre).
- Génération avec retry + batch + délai (`BATCH_DELAY_MS`).
- `assertInserted` empêche les pipelines silencieusement vides.

### 4. Synthèse

| Sévérité | Nombre |
|---|---|
| 🔴 Bloquant | 1 (feedback UI manquant sur RPC stats refusée) |
| 🟠 Incohérence | 2 (registry ↔ frontend ↔ edge) |
| 🟡 UX / dette | 3 (step placeholder, RPC dépréciée, ratio bannière) |
| 🟢 Conforme | 11 / 14 contrôles |

### 5. Recommandations (à valider avant implémentation)

1. **Aligner `TEST_ENTITIES` (frontend)** sur `test_entities_registry` via une requête, supprimer le constant statique.
2. **Compléter le registry** avec les 8 tables enfants utilisées par la purge (`permit_payments`, `permit_admin_actions`, `mortgage_payments`, `expertise_payments`, `ownership_history`, `tax_history`, `boundary_history`, `fraud_attempts`).
3. **Renommer la Step 5** en « Provisioning service_access (auto) » et la marquer immédiatement après génération d'invoices.
4. **Ajouter un toast erreur** dans `useTestDataStats` quand l'RPC retourne `P0001`.
5. **Durcir `TestModeBanner`** : n'afficher que si `total >= 20 ET ratio >= 50 %`.
6. **Décider** : conserver ou supprimer `cleanup_all_test_data` (RPC manuelle non utilisée) — recommandation : la conserver mais marquer `RAISE NOTICE` de dépréciation.

Aucune action corrective ne sera entreprise sans validation explicite de votre part.

