

## Audit du mode test — état actuel

### Ce qui fonctionne
- **RPC `cleanup_all_test_data()`** : ordre FK-safe correct, utilise `contribution_id` pour `permit_payments`/`permit_admin_actions`, double-passe `parcel_id` + `reference_number`. Audit log OK.
- **`cleanup_all_test_data_auto()`** : harmonisée avec la RPC manuelle, cron `cleanup-test-data-daily-rpc` à 03:00 UTC OK.
- **Trigger `prevent_test_data_in_prod`** : actif sur 10 tables.
- **Données présentes en DB** : 3 510 parcelles, 3 510 contributions, 1 170 factures, 702 paiements, 293 hypothèques, 176 expertises, 176 titres, 52 mutations, 52 disputes, 52 certificats. Cohérent avec les générateurs.

### Anomalies détectées

| # | Problème | Impact | Sévérité |
|---|---|---|---|
| 1 | **`cadastral_building_permits` : 0 ligne en DB** alors que `generateBuildingPermits` est appelé. La ronde courante n'a peut-être pas été régénérée depuis l'extension, OU l'INSERT échoue silencieusement (étape 11 non-bloquante). | Couverture autorisations à zéro → registry affiche 0, dashboards tronqués. | Moyen |
| 2 | **`subdivision_requests` : 0 ligne en DB** alors que `generateSubdivisionRequests` existe (étape 13 non-bloquante). Probable échec silencieux non remonté à l'utilisateur. | Lots/voies non générés non plus → couverture lotissement à zéro. | Moyen |
| 3 | **`subdivision_lots` / `subdivision_roads` absents du registry et de la RPC cleanup**. Cascade FK depuis `subdivision_requests` couvre la suppression, mais ils ne sont pas comptés dans `count_test_data_stats` ni listés à l'export pré-purge. | Visibilité faible. | Faible |
| 4 | **`cadastral_building_permits` et `cadastral_mortgages` absents du trigger `prevent_test_data_in_prod`** (10 tables couvertes, ces deux ne le sont pas). | Risque insertion test en prod si `test_mode=false`. | Moyen |
| 5 | **Étapes 11, 12, 13 non-bloquantes silencieuses** : un échec d'insert (RLS, contrainte) est juste loggé en console et résumé en `failedSteps`, mais l'utilisateur peut ne pas voir l'avertissement. | Données partielles non détectées (cas actuel n°1 et n°2). | Moyen |
| 6 | **Mémoire `mem://admin/test-mode-hardening-fr`** ne mentionne pas la couverture lots/roads ni l'absence de trigger sur permits/mortgages. | Documentation incomplète. | Faible |

### Plan de correction

1. **Diagnostiquer pourquoi `building_permits` et `subdivision_requests` ne s'insèrent pas** : exécuter une régénération de test, capter les `console.error` dans `useTestDataActions`. Probables causes : RLS sur ces tables, ou contrainte unique sur `permit_number`.
2. **Ajouter `cadastral_building_permits` et `cadastral_mortgages` au trigger `prevent_test_data_in_prod`** (migration : étendre la liste des tables).
3. **Étendre `test_entities_registry`** avec `subdivision_lots` et `subdivision_roads` (marker via jointure `subdivision_request_id` LIKE 'TEST-%') pour visibilité dans les stats et l'export CSV.
4. **Renforcer la remontée d'erreurs** dans `useTestDataActions` : afficher le nom de chaque entité échouée dans le toast principal (déjà partiellement présent via `failedSteps`, mais ne distingue pas autorisations vs lotissements car l'étape 11 et 13 regroupent plusieurs entités).
5. **Mettre à jour `mem://admin/test-mode-hardening-fr`** pour refléter la couverture finale.

### Résultat attendu
- Couverture 100 % des entités déclarées (autorisations, lotissements + lots/voies).
- Trigger anti-prod étendu à 12 tables.
- Visibilité complète dans le dashboard stats et l'export CSV pré-purge.
- Toast d'avertissement plus précis en cas d'échec partiel.

