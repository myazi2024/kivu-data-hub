

# Audit du mode test — Resultats

## Architecture globale

Le mode test est bien structure : un provider (`TestEnvironmentProvider`), un hook (`useTestMode`), une banniere, un filtre de requetes (`applyTestFilter`), une page admin (`AdminTestMode`), des generateurs de donnees, une fonction SQL de nettoyage, et une Edge Function de nettoyage automatique. L'ensemble couvre 19 tables et 26 provinces.

## Points positifs

1. **Isolation correcte** : `applyTestFilter` est utilise dans 13 fichiers (contributions, litiges, expertises, permis, mutations, lotissements, etc.) — bonne couverture
2. **Nettoyage SQL robuste** : `cleanup_all_test_data()` respecte l'ordre FK, inclut les `mortgage_payments` intermediaires, et nettoie aussi les notifications
3. **Edge Function de nettoyage automatique** : bien implemente avec filtre `created_at < cutoff`, gestion d'erreurs par table, et journalisation audit
4. **Progression visuelle** : 14 etapes de generation avec indicateurs temps reel
5. **Rollback en cas d'echec** : `rollbackTestData()` existe pour annuler une generation partielle
6. **Dirty-check** : le bouton "Enregistrer" n'est actif que si la config a change
7. **Dialogues de confirmation** : desactivation avec/sans nettoyage, confirmation explicite

## Problemes identifies

### P1 — Securite

1. **Edge Function `cleanup-test-data` sans JWT** (`verify_jwt = false`) : N'importe qui peut declencher le nettoyage automatique via un appel HTTP direct. La fonction utilise `SERVICE_ROLE_KEY` donc elle a un acces total. Il faut soit ajouter `verify_jwt = true`, soit verifier manuellement le JWT dans le code.

2. **`rollbackTestData` cote client** : utilise le client `anon` pour supprimer massivement des donnees. Si les RLS policies ne sont pas strictes, un utilisateur non-admin pourrait potentiellement supprimer des donnees via des requetes forgees.

### P2 — Bugs fonctionnels

3. **Nettoyage automatique sans cron configure** : La doc mentionne un "cron quotidien" mais aucun cron Supabase n'est configure pour appeler `cleanup-test-data`. Le nettoyage automatique ne s'execute donc jamais automatiquement — il faudrait soit un `pg_cron` soit un cron externe.

4. **`land_title_requests` dans la fonction SQL mal positionne** : dans `cleanup_all_test_data()`, la suppression de `land_title_requests` (ligne 109) est a l'interieur du bloc `IF parcel_ids IS NOT NULL`. Or, les demandes de titres n'ont pas de FK vers `cadastral_parcels` — si aucune parcelle test n'existe, les demandes de titres ne seront pas nettoyees.

5. **Edge Function : `mortgage_payments` non supprime** : La fonction SQL supprime `cadastral_mortgage_payments` (ligne 75-79), mais l'Edge Function ne le fait pas avant de supprimer `cadastral_mortgages`. Si des `mortgage_payments` test existent, le nettoyage automatique echouera en silence sur les hypotheques.

6. **Donnees de test generees avec `occupation_duration`** (ligne 534 de testDataGenerators.ts) : Ce champ a ete supprime du formulaire de demande de titre mais le generateur le remplit encore. Incoherence avec la logique metier actuelle.

### P3 — UX / Interface

7. **Pas de bouton "Regenerer les donnees"** : Si l'admin a deja des donnees et veut regenerer un jeu frais, il doit d'abord nettoyer puis reactiver. Un bouton explicite manque.

8. **Pas de feedback en cas d'echec partiel de generation** : Les etapes non-bloquantes (steps 5-13) attrapent les erreurs en `console.error` mais l'utilisateur voit un toast de succes meme si plusieurs tables ont echoue. Un resume des echecs serait utile.

9. **Guide d'utilisation imprecis** : Mentionne "520 parcelles" alors que le systeme genere 7 020 parcelles (26 provinces × densite variable). Information obsolete.

10. **Statistiques sans distinction production/test** : La carte de stats compte les donnees test mais ne montre pas si le mode test est actif ou non au moment du comptage.

### P4 — Performance / Technique

11. **`useTestDataStats` : requetes `in()` avec potentiellement 7 020 IDs** : Passer 7 020 UUIDs dans un `.in('parcel_id', parcelIds)` depasse la limite pratique de Supabase pour les requetes GET. Cela peut provoquer des erreurs 414 (URI trop long) ou des timeouts. Il faudrait utiliser une sous-requete SQL ou un RPC.

12. **Pas de limite sur la taille du batch `in()`** dans `rollbackTestData` : meme probleme — 7 020 IDs passes directement dans `.in()`.

## Plan de corrections

### Phase 1 — Securite (prioritaire)

1. **Securiser l'Edge Function** : Ajouter `verify_jwt = true` dans `config.toml` et verifier le role admin dans le code de la fonction
2. **Deplacer `land_title_requests`** hors du bloc conditionnel `parcel_ids` dans la fonction SQL

### Phase 2 — Bugs fonctionnels

3. **Ajouter `cadastral_mortgage_payments`** dans l'Edge Function avant la suppression des hypotheques
4. **Supprimer `occupation_duration`** du generateur de donnees test (`testDataGenerators.ts` ligne 534)
5. **Configurer un cron** pour le nettoyage automatique (ou documenter que c'est manuel)

### Phase 3 — UX

6. **Corriger le guide** : mettre a jour le nombre de parcelles (7 020)
7. **Ajouter un bouton "Regenerer"** qui nettoie puis regenere en une action
8. **Afficher un resume des echecs partiels** apres la generation

### Phase 4 — Performance

9. **Remplacer les requetes `in()` massives** par des RPC SQL dedies pour les comptages et le rollback, evitant de passer des milliers d'UUIDs en parametre

### Fichiers concernes
- `supabase/config.toml` — securite JWT
- `supabase/functions/cleanup-test-data/index.ts` — ajout mortgage_payments + verification admin
- `supabase/migrations/` — nouvelle migration pour corriger `cleanup_all_test_data()`
- `src/components/admin/test-mode/testDataGenerators.ts` — retrait `occupation_duration`
- `src/components/admin/test-mode/TestModeGuide.tsx` — correction nombre parcelles
- `src/components/admin/test-mode/useTestDataActions.ts` — bouton regenerer + resume echecs
- `src/components/admin/test-mode/TestDataStatsCard.tsx` — bouton regenerer
- `src/components/admin/test-mode/useTestDataStats.ts` — optimisation requetes
- `src/components/admin/AdminTestMode.tsx` — integration

