# Revue complète des 8 onglets Analytics et corrections

## Objectif
Passer en revue, onglet par onglet, les 8 onglets visibles d'Analytics (Titre foncier, Construction, Hypothèque, Lotissement, Litiges fonciers, Location et valeur, Taxes foncières, Bornage), à l'écran et côté serveur, puis corriger les bugs, erreurs de calcul, dépendances cassées, éléments orphelins et code mort. Aucune nouvelle fonctionnalité.

## État vérifié
- L'écran Analytics référence encore 13 écrans d'onglets, alors que seuls 8 sont affichés : Demandes de titre, Contributions, Expertise, Historique de propriété, Certificats et Factures restent branchés sans être visibles.
- Ces 5 ou 6 écrans cachés seront vérifiés : s'ils ne sont accessibles nulle part (ni menu, ni carte, ni admin), ils seront supprimés avec leurs réglages, comme pour Mutation, Servitudes, Géométrie et Cohérence. Les données sources restent intactes.

## Démarche par onglet
Pour chacun des 8 onglets :
1. Chiffres clés et visuels : chaque calcul compare ce qu'il affiche avec ce que le formulaire CCC enregistre (libellés, valeurs, doubles comptes, zéros, valeurs vides).
2. Filtres : Province, Circonscription, SU/SR et lieux dépendants, période et statut s'appliquent réellement à chaque visuel.
3. Variables croisées, carte RDC et réglages admin : chaque élément référencé existe encore, et aucun réglage ne pointe vers un visuel supprimé.
4. Côté serveur : données lues (colonnes existantes, droits d'accès, confidentialité des noms), aucune lecture de données réservées aux services payés.
5. Code mort : variables, fonctions, imports, filtres et options jamais utilisés supprimés (par exemple les fonctions d'export CSV récupérées mais jamais appelées).

## Points de contrôle particuliers
- Titre foncier : types de titre, type de mutation, grevées/libres, cohérence avec les titres demandés.
- Construction : catégories (8 du CCC), autorisations (3 valeurs), location et capacité, limites et entrées.
- Hypothèque : statuts actifs/soldés selon le cycle de vie, montants en USD.
- Lotissement : statuts standard, nombre de lots, surfaces.
- Litiges fonciers : étapes de résolution, types de litige, aucune donnée personnelle.
- Location et valeur : loyers excluant locaux vacants et occupés par le propriétaire (même règle que le CCC).
- Taxes foncières : années fiscales, montants, statuts payé/impayé, aucun détail nominatif.
- Bornage : mur, mur mitoyen, limite sans mur, routes déclarées uniquement.

## Vérification
- Tests ajoutés pour chaque erreur de calcul corrigée.
- Suite complète des tests et contrôle du code.
- Compte rendu des constats et corrections dans le rapport d'audit.
- L'affichage connecté ne peut pas être vérifié à l'écran (page protégée) ; la vérification repose sur le code et les tests.

## Détails techniques
- Fichiers principaux : `ProvinceDataVisualization.tsx` (correspondance onglet → écran), `blocks/*Block.tsx`, `analyticsTabsRegistry.ts`, `crossVariables.ts`, `mapTabProfiles.ts`, `useAnalyticsChartsConfig.ts`, `useLandDataAnalytics.ts`, `useBlockFilter.ts`, utilitaires de calcul dans `src/utils/`.
- Suppression éventuelle des onglets cachés : migration `DELETE FROM analytics_charts_config WHERE tab_key IN (...)` limitée aux onglets confirmés orphelins.
