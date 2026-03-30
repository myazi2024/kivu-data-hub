

# Purger toutes les données cadastrales existantes

## Contexte
Les données actuelles dans la base ont été utilisées pour des tests manuels. L'utilisateur souhaite repartir de zéro et utiliser le mode test intégré (préfixe `TEST-`) pour tous les futurs tests.

## Étape 1 — Suppression de toutes les données cadastrales

Exécuter des requêtes DELETE dans l'ordre FK-safe (enfants → parents) sur les 19+ tables concernées :

```text
Ordre de suppression :
1. fraud_attempts
2. cadastral_contributor_codes
3. cadastral_service_access
4. payment_transactions
5. cadastral_invoices
6. cadastral_contributions
7. cadastral_ownership_history
8. cadastral_tax_history
9. cadastral_boundary_history
10. cadastral_mortgages
11. cadastral_building_permits
12. cadastral_parcels
13. real_estate_expertise_requests
14. cadastral_land_disputes
15. land_title_requests
16. cadastral_boundary_conflicts
17. generated_certificates
18. mutation_requests
19. subdivision_requests
20. reseller_sales
21. notifications (type cadastral)
22. audit_logs (optionnel — historique de test)
```

Chaque DELETE supprimera **toutes** les lignes (pas de filtre `TEST-%`), puisque tout est considéré comme données de test.

## Étape 2 — Vérification de la couverture du mode test

Le mode test actuel couvre déjà 19 types d'entités (voir `useTestDataActions.ts`). Je vérifierai que toutes les fonctionnalités de l'app sont couvertes et ajouterai les entités manquantes si nécessaire (ex: `reseller_sales`, `notifications`).

## Détails techniques

- Les suppressions seront exécutées via l'outil d'insertion (DELETE SQL) — pas de migration nécessaire
- Les tables de configuration (`cadastral_services_config`, `cadastral_search_config`, `map_providers`, etc.) ne seront **pas** touchées
- Les tables utilisateurs (`profiles`, `user_roles`, `user_preferences`) ne seront **pas** touchées

