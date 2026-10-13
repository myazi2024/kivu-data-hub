# Mode test (admin) : corrections

## Bugs confirmés

1. **Le bouton d'aperçu de la purge échoue à chaque clic.** Ce bouton sert à voir ce qui serait supprimé, sans rien supprimer. La fonction serveur qu'il appelle (`count_test_data_to_cleanup`) lit trois tables qui n'existent pas (`cadastral_permit_payments`, `cadastral_permit_admin_actions`, `real_estate_expertise_payments`) et une colonne absente (`fraud_attempts.parcel_number`). Le compte n'aboutit donc jamais.
2. **« Désactiver et supprimer » désactive le mode test même si la suppression a échoué.** L'erreur de nettoyage est avalée en interne : le mode est coupé et les données de test restent visibles dans l'application réelle.
3. **Le nettoyage automatique de 3 h du matin ignore vos réglages.** Il supprime toutes les données de test chaque nuit, même quand :
   - « Nettoyage automatique » est désactivé ;
   - la durée de conservation (1 à 30 jours) n'est pas encore écoulée.
   Ces deux réglages n'ont donc aujourd'hui aucun effet.

## Code mort et doublons dans la base

- `cleanup_all_test_data` : ancienne purge en un seul bloc, appelée par aucun écran ni aucune tâche planifiée.
- `cleanup_test_data_chunk` : seconde copie complète de la logique de purge par lots, que plus rien n'appelle. La purge réelle passe par `_cleanup_test_data_chunk_internal`.

## Corrections

1. **Aperçu** : réécrire `count_test_data_to_cleanup` pour qu'il compte exactement les lignes de chaque étape de la purge réelle, avec les mêmes tables, les mêmes critères et dans le même ordre. La vérification du rôle admin est conservée.
2. **Désactivation** : le nettoyage renvoie un vrai résultat (réussi ou échoué). En cas d'échec, le mode test reste actif et un message explique quelle étape a échoué.
3. **Nettoyage automatique** : `cleanup_all_test_data_auto` lit la configuration du mode test. Il ne fait rien si le nettoyage automatique est désactivé ou si les données de test sont plus récentes que la durée de conservation (date de la dernière parcelle de test générée). Chaque passage est noté dans le journal, y compris quand il ne fait rien et pourquoi.
4. **Suppression** des deux fonctions inutilisées.

## Vérifications

- Appel de l'aperçu après correction : il renvoie bien un compte par étape.
- Contrôle du nettoyage automatique avec le réglage désactivé : rien n'est supprimé, et le journal l'indique.
- Tests, contrôle des types et compilation.
- Limite : l'écran admin est protégé par la double authentification et votre base est externe, je ne peux donc pas cliquer dans l'écran moi-même ; la vérification se fait côté serveur et par les tests.

## Détails techniques

- Une seule migration : `CREATE OR REPLACE` de `count_test_data_to_cleanup` et de `cleanup_all_test_data_auto` (`SET search_path = public`), puis `DROP FUNCTION` de `cleanup_all_test_data()` et de `cleanup_test_data_chunk(text, integer)`.
- `useTestDataActions.ts` : `cleanupTestData` renvoie `boolean` ; `AdminTestMode.handleDisableWithCleanup` s'arrête si le résultat vaut `false`.
- `AGENTS.md` : la purge de test passe uniquement par `_cleanup_test_data_chunk_internal` ; l'aperçu reprend la liste des étapes de `cleanupSteps.ts`.
