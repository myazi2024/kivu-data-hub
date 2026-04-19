
Objectif: corriger définitivement l’erreur de nettoyage du mode test (`column "parcel_id" does not exist`) en réalignant la base et tous les chemins de purge sur le schéma réel.

Constat
- Le bouton « Nettoyer tout » appelle la RPC `cleanup_all_test_data()` côté base.
- Dans le code actuel du repo, `permit_payments` et `permit_admin_actions` utilisent bien `contribution_id` uniquement.
- Le schéma généré (`src/integrations/supabase/types.ts`) confirme qu’ils n’ont ni `permit_id` ni `parcel_id`.
- Le repo contient déjà une migration corrective pour `cleanup_all_test_data`, mais l’erreur utilisateur indique très probablement que la fonction active en base est encore une version plus ancienne/incohérente.
- J’ai aussi trouvé que `cleanup_all_test_data_auto()` reste sur une logique plus ancienne et doit être remise au même standard pour éviter un prochain bug.

Plan de correction
1. Créer une nouvelle migration unique qui recrée proprement :
   - `public.cleanup_all_test_data()`
   - `public.cleanup_all_test_data_auto()`
   avec un ordre FK-safe harmonisé.

2. Dans ces deux fonctions, appliquer l’ordre suivant :
   - enfants de `cadastral_contributions` via `contribution_id`
     (`fraud_attempts`, `permit_payments`, `permit_admin_actions`)
   - `cadastral_contributor_codes`
   - `cadastral_service_access`
   - `payment_transactions`
   - `cadastral_invoices`
   - `cadastral_contributions`
   - enfants de `cadastral_parcels` via `parcel_id`
     (`mutation_requests`, `subdivision_requests`, `land_title_requests`,
     `cadastral_land_disputes`, `real_estate_expertise_requests` + `expertise_payments`)
   - historiques / hypothèques / autorisations
   - `cadastral_parcels`
   - tables indépendantes (`generated_certificates`, `cadastral_boundary_conflicts`)

3. Remplacer toute logique ambiguë ou héritée par des filtres corrects :
   - `permit_payments` / `permit_admin_actions` : toujours via `contribution_id`
   - double passe sur certaines demandes :
     - par `parcel_id` pour les FK réelles
     - par `reference_number LIKE 'TEST-%'` pour les enregistrements orphelins de test

4. Aligner l’edge function `supabase/functions/cleanup-test-data/index.ts` sur exactement la même logique que la RPC pour éviter toute divergence future.

5. Vérifier `rollback.ts` et, si nécessaire, le remettre au même ordre FK-safe pour que le rollback local et la purge serveur se comportent pareil.

Détails techniques
- Pas de changement de schéma nécessaire sur les tables métier.
- Le vrai correctif est de republier une version canonique des fonctions SQL dans une nouvelle migration, plutôt que d’empiler des hypothèses sur les anciennes migrations.
- La cause la plus probable est un décalage entre le code source et la fonction réellement active en base.
- J’inclurai `SET search_path = public` dans les fonctions SQL, conformément aux règles du projet.

Résultat attendu
- Le bouton « Nettoyer tout » ne remonte plus l’erreur `parcel_id does not exist`.
- La purge manuelle et l’auto-cleanup utilisent la même logique fiable.
- Le mode test peut être nettoyé puis régénéré sans blocage.
