

## Audit cross-modules admin — Synthèse

État global : **stable**. TypeScript compile sans erreur, les RPCs centrales (`get_admin_dashboard_full`, `get_admin_pending_counts`, `has_role`) sont présentes et utilisées correctement, les hubs (Config, Système, Historique, Demandes) communiquent bien.

**Un seul bug bloquant détecté**, hérité de la dernière migration du Mode Test.

---

### 🔴 Bug critique — Module Test Mode (cassé depuis la dernière migration)

**Symptôme** (visible dans la console et le replay session) :
```
relation "public.real_estate_expertise_payments" does not exist
toast → "Impossible de charger les statistiques de test"
```

**Cause racine** : la migration `20260422084418` a activé `is_active=true` sur 8 entités enfants du `test_entities_registry`. Trois d'entre elles pointent vers des **noms de tables qui n'existent pas** :

| `label_key` (registry) | `table_name` (registry) | Vraie table en DB |
|---|---|---|
| `expertisePayments` | `real_estate_expertise_payments` ❌ | `expertise_payments` |
| `permitPayments` | `building_permit_payments` ❌ | `permit_payments` |
| `permitAdminActions` | `building_permit_admin_actions` ❌ | `permit_admin_actions` |

**Impact en chaîne** :
1. `count_test_data_stats()` plante au premier `EXECUTE format(...)` → toute la carte stats du Mode Test affiche "Erreur"
2. `TestDataExportButton` (CSV pré-purge) lèvera la même erreur 42P01 sur ces 3 entités
3. Le bouton « Désactiver et nettoyer » fonctionne quand même (l'edge `cleanup-test-data-batch` a sa propre liste hardcodée correcte)
4. Note : `count_test_data_stats` calcule déjà `expertisePayments` via un bloc dédié (ligne 36 de la fonction) → l'entrée registry est en plus redondante

---

### ✅ Vérifications cross-modules — RAS

| Intégration | État |
|---|---|
| Sidebar admin → `get_admin_pending_counts()` (badges 9 modules) | ✅ RPC présente, hook OK |
| Dashboard admin → `get_admin_dashboard_full()` | ✅ RPC + signature TS alignées |
| Analytics → consomme la même RPC dashboard (anti-doublon) | ✅ Documenté et appliqué |
| Hubs (Config / Système / Historique / Demandes / Contenu) → enfants | ✅ Imports cohérents |
| HR module (8 onglets) → 6 hooks Supabase + conversion candidat→employé | ✅ Aucun bug détecté |
| Edge `cleanup-test-data-batch` → liste tables hardcodée | ✅ Tables réelles utilisées |
| Trigger `prevent_test_data_in_prod` (12 tables) | ✅ Actif |
| Cron `cleanup-test-data-daily-rpc` | ✅ Actif |
| TypeScript `tsc --noEmit` (projet entier) | ✅ 0 erreur |

---

### Plan de correction (1 migration SQL)

Aligner les 3 entrées du registry sur les vrais noms de tables :

```sql
UPDATE public.test_entities_registry
SET table_name = 'expertise_payments'
WHERE label_key = 'expertisePayments' AND table_name = 'real_estate_expertise_payments';

UPDATE public.test_entities_registry
SET table_name = 'permit_payments'
WHERE label_key = 'permitPayments' AND table_name = 'building_permit_payments';

UPDATE public.test_entities_registry
SET table_name = 'permit_admin_actions'
WHERE label_key = 'permitAdminActions' AND table_name = 'building_permit_admin_actions';
```

**Vérification de la `marker_column` / `marker_pattern` à confirmer pendant l'implémentation** : les 3 tables corrigées doivent avoir une colonne marqueur cohérente avec le pattern stocké (probablement une référence/id qui matche `TEST-%`). Si le marker est invalide, on ajustera dans la même migration.

### Critères de validation

1. Console navigateur sur `/admin?tab=test-mode` : plus aucune erreur 42P01
2. Toast « Impossible de charger les statistiques de test » disparaît
3. Carte stats affiche les compteurs des 22 entités (y compris `expertisePayments`, `permitPayments`, `permitAdminActions`)
4. Bouton « Exporter CSV » génère un fichier sans section ERROR sur ces 3 entités
5. `tsc --noEmit` toujours à 0 erreur

### Fichier impacté

| Fichier | Action |
|---|---|
| Nouvelle migration SQL | UPDATE des 3 lignes du registry + vérif markers |

