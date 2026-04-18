

## Audit — Espace admin "Système"

### 1. Périmètre (6 vues, ~4 100 LOC + RH 9 sous-modules)

| Vue | LOC | Tables | État BD |
|---|---|---|---|
| `AdminParcelActionsConfig` | 424 | `parcel_actions_config` | OK (catégorie "permit" obsolète) |
| `AdminAppearance` | 690 | `app_appearance_config` | OK |
| `AdminTestMode` | 342 + 2 600 modules | `cadastral_search_config`, `cleanup_all_test_data()` | RPC OK |
| `AdminAuditLogs` | 342 | `audit_logs` | **439 857 lignes** |
| `AdminSystemHealth` | 266 | 25 tables sondées | OK |
| `AdminHR` (Espace RH) | 1 813 | 7 tables `hr_*` | 0 employé |

### 2. Anomalies critiques (P0 — sécurité / données)

**A. `audit_logs` non rotaté — 440 000 lignes (CRITIQUE perf).**
- `audit_logs.SELECT` policy = `get_current_user_role() = 'admin'`. OK pour la sécurité.
- **Mais** : `AdminAuditLogs` charge `.limit(500)` et filtre côté client. Avec 27-67 K inserts/jour (mode test), la table grossit de ~1,5 M/mois.
- 99,4 % du volume = `INSERT/DELETE` automatiques de génération test. Pas de rétention, pas d'archivage, pas de partition.
- **Stat KPI fausse** : "Total d'actions = 500" alors qu'il y en a 440 K.
→ (1) RPC `purge_old_audit_logs(_days int)` supprimant les `INSERT/DELETE` test-mode > 30 j ; (2) cron mensuel ; (3) bouton admin "Purger logs anciens" dans UI ; (4) compteur réel via `count exact, head: true`.

**B. `AdminAuditLogs` — pagination + recherche côté client uniquement.**
500 lignes max chargées → impossible de voir l'historique réel ou de chercher au-delà. Filtres `action/table` ne montrent que les 500 dernières lignes. Recherche par `record_id` inutile sur un volume réel.
→ Pagination serveur (`.range()`) + filtres SQL + recherche sur `record_id`/`user_id`/plage de dates.

**C. `AdminAuditLogs` — affichage utilisateur dégradé.**
Colonne "Utilisateur" affiche `user_id.substring(0,8)` au lieu du nom/email. Aucun JOIN avec `profiles`.
→ Hook `useAuditLogsWithProfiles` qui résout les noms via batch `.in('user_id', ids)`.

**D. RLS `app_appearance_config` — INSERT non protégé.**
Policy INSERT = `qual: NULL` → tout authentifié peut créer une nouvelle clé de config UI (puis la mettre à jour via la policy UPDATE qui filtre, mais l'INSERT initial pollue la table).
→ Restreindre INSERT à `has_any_role(auth.uid(), ARRAY['admin','super_admin'])`.

**E. RLS `hr_employees` — INSERT non protégé.**
Policy `"HR admins can insert employees" INSERT qual: NULL` → tout utilisateur authentifié peut créer un employé (PII : salaires, contacts d'urgence, naissance).
→ Restreindre INSERT à `is_hr_admin(auth.uid())`.

**F. Salaires HR (`hr_employees.salary_usd`) en clair sans audit.**
Aucun trigger d'audit. Modification d'un salaire ne laisse aucune trace. Pas de masquage pour rôles non-RH (mais OK car `is_hr_admin` filtre déjà SELECT).
→ Trigger `audit_hr_changes` → `history_audit` (table déjà créée et sous-utilisée — 0 ligne aujourd'hui).

**G. `AdminParcelActionsConfig` — reorder non atomique.**
`saveConfig` lance N updates en `Promise.all` sans transaction → rollback partiel impossible si erreur sur la 5ᵉ action.
→ RPC `bulk_update_parcel_actions(_actions jsonb)` SECURITY DEFINER admin-only en transaction.

**H. `AdminParcelActionsConfig` — catégorie "permit" obsolète.**
La constante `CATEGORIES` contient `permit` alors que l'app utilise `Autorisation` (mémoire `terminology-standard-autorisation-fr`). Code mort `permit_regularization` filtré au runtime.
→ Renommer `permit` → `building_permit` + label "Autorisation". Migration data : update `category = 'permit'` → `'building_permit'`.

**I. `AdminSystemHealth` — liste de tables hardcodée incomplète.**
`ALL_TABLES` contient 25 noms en dur ; il manque `cadastral_service_access` (1 053 lignes), `expertise_payments` (176), `analytics_charts_config` (455), `role_permissions` (75), tous les `hr_*` (7 tables), `history_audit`, `system_config_audit`, `billing_config_audit`, `parcel_actions_config`, `app_appearance_config`, etc. → KPI "Enregistrements" sous-estimé d'environ 30 %.
→ Charger la liste dynamiquement via RPC `list_public_tables_with_count()` (déjà tendance dans le projet).

### 3. Anomalies fonctionnelles (P1)

1. **`AdminAppearance` : aucune persistance de l'historique.** Pas de versioning des thèmes (impossible de revenir à la version précédente). Pas d'audit `system_config_audit`.
2. **`AdminAppearance` : prévisualisation locale, pas d'aperçu plein-écran** (sticky preview à droite mais limité). Pas de presets prêts (Sombre Apple, Bleu corporate, etc.).
3. **`AdminAppearance` : font_family figée à 6 polices** sans option custom URL (Google Fonts).
4. **`AdminTestMode` : `useTestDataActions` fait 14 étapes séquentielles** sans isolation transactionnelle — si l'étape 8 échoue, les 7 premières restent en BD avec `is_test=true`. `cleanup_all_test_data` permet le rollback mais le UX n'incite pas à le faire.
5. **`AdminTestMode` : génération non-idempotente.** Lancer "Régénérer" 3 fois crée 3× les données (pas de unique constraint sur `parcel_number` test, dépend du suffix aléatoire).
6. **`AdminSystemHealth` : pas de stockage des métriques.** Chaque refresh écrase l'état précédent → impossible de voir un graphique de latence sur 24h.
7. **`AdminSystemHealth` : seuils latence en dur** (`>500ms = degraded`). Devraient être configurables.
8. **`AdminHR` : pas de pagination sur employés/candidats.** OK aujourd'hui (0 lignes), bloquant à 100+.
9. **`AdminHR` : aucun lien avec `auth.users`/`profiles`.** Un employé n'a pas de `user_id` → impossible de lui donner accès self-service à ses bulletins/congés.
10. **`AdminHR` : `matricule` non auto-généré par la BD** (vu dans le form, pas dans le défaut). Risque de doublons.
11. **`AdminAuditLogs` : pas de drill-down.** Cliquer sur un `record_id` n'amène pas à l'enregistrement source.
12. **`AdminAuditLogs` : pas de filtre par utilisateur ni par plage de dates.**

### 4. Manques (P2)

- **Hub "Système"** : tableau de bord transversal (santé, dernières actions audit, taille BD par table, alertes test-mode actif en prod, configurations modifiées dans les dernières 24h).
- **Métriques temporelles** : table `system_health_snapshots` + cron 5 min + graphiques 24h/7j (latence DB, edge fns, storage).
- **Alertes proactives** : webhook/notification admin si `audit_logs > 1M`, latence > 1s, edge function offline > 5min, mode test actif > 24h en prod.
- **Apparence — presets thématiques** + import/export JSON.
- **HR — self-service employé** : portail `/hr/me` (congés, bulletins, contacts) après lien `user_id`.
- **HR — workflow congés** avec approbation manager + balance auto.
- **Paramètres système globaux** : `system_settings` (timezone, devise par défaut, locale, taille upload max) avec UI dédiée.
- **Backups & exports** : bouton "Export complet config système" (zip JSON de toutes les tables `*_config`).

### 5. Plan d'implémentation par paliers

**(A) P0 (~2h)**
- Migration RLS : `app_appearance_config.INSERT` admin-only, `hr_employees.INSERT` HR-admin.
- Trigger `audit_hr_changes` sur 7 tables `hr_*` → `history_audit`.
- RPC `purge_old_audit_logs(_days int default 30)` admin-only + cron mensuel + bouton UI.
- RPC `bulk_update_parcel_actions(_actions jsonb)` transactionnel.
- Migration `parcel_actions_config.category` : `permit` → `building_permit`.
- `AdminAuditLogs` : pagination serveur (`.range()`), filtres date+user, JOIN `profiles` pour noms, compteur exact.
- `AdminSystemHealth` : RPC `list_public_tables_with_count()` dynamique.

**(B) P0 + P1 (~4h)**
- A + audit `app_appearance_config` via trigger générique → `system_config_audit` (déjà existant) ; bouton "Restaurer version" lisant les snapshots.
- `AdminTestMode` : transaction par lot dans `useTestDataActions` + idempotence (`ON CONFLICT DO NOTHING` sur `parcel_number`).
- `AdminHR` : auto-génération `matricule` côté BD (séquence `EMP-YYYY-XXXX`), lien optionnel `user_id`, pagination 20/page.
- `AdminAppearance` : presets (3 thèmes prêts) + Google Fonts URL custom.
- `AdminAuditLogs` : drill-down "Voir l'enregistrement" par `table_name + record_id`.
- Seuils latence configurables dans `system_settings`.

**(C) Plan complet (~6h)**
- B + Hub Système (`AdminSystemHub`) avec KPIs transverses.
- Table `system_health_snapshots` + cron 5min + graphiques recharts (latence, taille).
- Alertes via `notifications` (audit > seuil, latence haute, mode test prolongé).
- Self-service HR `/hr/me` (basé sur lien `user_id`).
- Workflow congés avec approbation.
- Table `system_settings` + UI dédiée (timezone, devise, locale, max upload).
- Bouton "Export config système complète" (zip JSON).

### Question

Quel périmètre dois-je implémenter ?

- **(A) P0** — corrige les RLS faillibles, audit HR, purge `audit_logs` (440 K → contrôlé), pagination serveur audit, reorder transactionnel, terminology autorisation, health dynamique.
- **(B) P0 + P1** — + versioning thème, idempotence test mode, matricule auto, presets apparence, drill-down audit, seuils configurables.
- **(C) Plan complet** — + Hub Système, snapshots métriques, alertes, self-service HR, workflow congés, settings globaux, export config.

