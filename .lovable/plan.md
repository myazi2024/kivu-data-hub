# Données foncières (test) : données absentes

## Cause confirmée
- Les données de test existent bien (3 510 parcelles, 1 170 factures, 1 004 historiques de propriété, etc.) et le mode test est actif.
- À l'ouverture, la page démarre sur l'onglet carte (`rdc-map`). Or la fonction serveur qui fournit les données par onglet ne connaît pas cet onglet : elle renvoie un résultat vide. La carte, ses couleurs et le tableau sous la carte affichent donc 0, en test comme en réel.
- Le même trou existe pour tout onglet inconnu : la réponse est vide sans message.

## Corrections
1. **Onglet carte** : la fonction serveur reconnaît `rdc-map` et renvoie uniquement les colonnes de localisation nécessaires aux compteurs de la carte (parcelles, contributions, demandes de titre, litiges, hypothèques, expertises, lotissements, factures, certificats, taxes, historiques) — jamais de nom ni de montant individuel inutile.
   - Accès : admin et profils habilités ; un acheteur y accède dès qu'il a au moins un achat valide (règle déjà annoncée : la carte est visible dès le premier achat).
2. **Onglet inconnu** : erreur explicite côté serveur au lieu d'un résultat vide, affichée dans la console pour diagnostic.
3. **Onglet « Location et valeur »** : vérifier qu'il figure bien dans la configuration des visuels (il est absent de la liste des onglets configurés) et l'ajouter si nécessaire pour qu'il s'affiche en test.
4. **Orphelins à retirer** :
   - la source « mutations » est toujours vide (aucun onglet ni fonction serveur ne la fournit) : retrait du type, du chargement et du découpage par zone ;
   - toute mention restante de l'ancienne purge `cleanup_all_test_data` dans la documentation du mode test (fonction supprimée).

## Vérifications
- Comptage serveur, pour chaque onglet dont `rdc-map`, du nombre de lignes renvoyées en test et hors test.
- Tests, contrôle des types et compilation.
- Limite : votre base est externe et l'admin exige la double authentification ; je ne peux pas cliquer moi-même dans la page test, la vérification se fait côté serveur.

## Détails techniques
- Migration : `CREATE OR REPLACE get_analytics_tab_dataset` — cas `rdc-map` (sources géo réduites), garde d'accès « au moins un `analytics_visual_access` valide » pour `rdc-map`, `RAISE EXCEPTION 'unknown_tab'` sur `ELSE`.
- `useLandDataAnalytics.tsx`, `types/landAnalytics.ts`, `mapMeta.ts` : suppression de `mutationRequests`.
- `docs/TEST_MODE.md` : section RPC dépréciée retirée.
