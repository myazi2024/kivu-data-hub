# Supprimer l'onglet Autorisation d'Analytics et fiabiliser « Construction : Autorisation de bâtir »

## Constat
- L'onglet « Autorisation » (clé `building-permits`) existe dans Analytics : bloc dédié, entrée de registre, profil de carte, réglages de filtres, chargement de la table des autorisations, lignes de configuration admin.
- Le visuel « Construction : Autorisation de bâtir » existe déjà, mais son calcul est imprécis :
  - il compte chaque autorisation, pas chaque construction (une parcelle avec deux autorisations compte deux fois) ;
  - un terrain nu est compté « Sans autorisation » ;
  - les libellés sont « Construction / Régularisation / Sans autorisation » et une catégorie à zéro disparaît.

## Ce qui change
1. **Suppression de l'onglet Autorisation**
   - Retrait de l'onglet, de son icône et de son bloc dans Données foncières.
   - Suppression du fichier du bloc, de son entrée de registre, de ses variables croisées, de son profil de carte et de ses réglages de filtres.
   - Arrêt du chargement des autorisations pour Analytics (plus aucun consommateur).
   - Base : suppression des lignes de configuration admin de cet onglet ; la table des autorisations elle-même est conservée (utilisée par les demandes d'autorisation, l'admin et l'espace utilisateur).
   - Le rafraîchissement admin « permits » garde seulement le compteur des demandes en attente.
2. **Visuel « Construction : Autorisation de bâtir »** — toujours les trois valeurs, dans cet ordre, y compris à zéro :
   - Avec autorisation de bâtir
   - Avec autorisation de régularisation
   - Sans autorisation de bâtir
   - Une construction = la construction principale déclarée (hors terrain nu). Si elle a les deux types, elle compte dans « autorisation de bâtir ».
   - Les constructions supplémentaires ne sont pas comptées ici : le formulaire ne leur demande pas d'autorisation.

## Détails techniques
- Fichiers : `ProvinceDataVisualization.tsx`, `blocks/BuildingPermitsBlock.tsx` (supprimé), `analyticsTabsRegistry.ts`, `crossVariables.ts`, `mapTabProfiles.ts`, `useAnalyticsChartsConfig.ts`, `useLandDataAnalytics.tsx` (champ `buildingPermits` + requête), `adminAnalytics.ts`, `ParcelsWithTitleBlock.tsx`.
- Nouveau helper pur `permitStatusData(contribs)` dans `constructionAnalytics.ts` + tests (double type, terrain nu, zéros).
- Migration : `DELETE FROM analytics_charts_config WHERE tab_key = 'building-permits';`.
- Vérification : tests, typecheck, recherche des restes de `building-permits` côté Analytics.
