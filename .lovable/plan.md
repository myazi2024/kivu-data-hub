
Audit de l’origine du bug

- La correction précédente est bien présente dans `src/hooks/useInitializedConfig.ts` : `_global` est déjà dans `CHARTS_ONLY_TABS`. Donc le bug ne vient plus du registre.
- Le vrai problème est un bug de navigation/état dans `src/components/admin/AdminAnalyticsChartsConfig.tsx` :
  - la page s’ouvre par défaut sur `viewMode = 'tabs'`
  - or la sidebar de cette vue “Onglets” dépend de `localTabs`
- Or `localTabs` vient de `useAnalyticsTabsConfig()` dans `src/hooks/useAnalyticsChartsConfig.ts`, qui exclut volontairement `_global` et `rdc-map`.
- Résultat : même si `_global` est maintenant autorisé dans la vue “Graphiques”, il reste invisible pour l’admin à l’ouverture normale du module, car il tombe d’abord sur la vue “Onglets”.
- Deuxième cause : `AdminAnalyticsChartsConfig.tsx` ne lit aucun query param interne. Donc on ne peut pas ouvrir directement `Config Graphiques > Global` via URL.
- Troisième cause : la barre de recherche admin (`src/components/admin/AdminDashboardHeader.tsx`) n’indexe que :
  - les menus admin de 1er niveau (`menuItems`)
  - les résultats base de données
  Elle n’indexe pas les sous-entrées internes de “Config Graphiques”. La session replay confirme que chercher “Global” renvoie “Aucun résultat”.

Conclusion
- Le bug réel n’est pas un bug de visibilité du registre.
- C’est un bug de découverte + deep-linking :
  1. `_global` n’existe que dans la vue “Graphiques”
  2. la page s’ouvre sur “Onglets”
  3. la recherche ne sait pas ouvrir directement `_global`

Plan de correction

1. Corriger l’entrée dans `Config Graphiques`
- Fichier : `src/components/admin/AdminAnalyticsChartsConfig.tsx`
- Ajouter `useSearchParams`
- Remplacer les états initiaux statiques par une synchro URL :
  - `mode=tabs|kpis|charts|filters|cross`
  - `configTab=<tabKey>`
- Ouvrir `Config Graphiques` sur `charts` par défaut au lieu de `tabs`
- Si `configTab` vaut `_global` ou `rdc-map`, forcer automatiquement `mode=charts`
- Synchroniser l’URL quand l’admin change de mode ou d’onglet
- Prévoir un fallback propre si `configTab` est invalide

2. Rendre “Global” accessible directement
- Toujours dans `AdminAnalyticsChartsConfig.tsx`
- Faire en sorte que l’URL suivante ouvre directement le bon écran :
  - `/admin?tab=analytics-charts-config&mode=charts&configTab=_global`
- Garder `_global` uniquement dans la sidebar “Graphiques” (logique correcte), mais le rendre immédiatement visible grâce au mode par défaut + deep-linking

3. Intégrer cette logique dans la barre de recherche admin
- Fichier : `src/components/admin/AdminDashboardHeader.tsx`
- Ajouter un groupe de résultats “Config Graphiques”
- Générer ces résultats à partir de `ANALYTICS_TABS_REGISTRY`
- Inclure des entrées internes directes vers chaque onglet configurable, en particulier :
  - `Global`
  - `Carte RDC`
- Chaque résultat doit naviguer vers :
  - `/admin?tab=analytics-charts-config&mode=charts&configTab=<key>`
- Ajouter les mots-clés pertinents pour `Global` :
  - `global`, `filigrane`, `watermark`, `logo`

4. Aligner la recherche top-level
- Fichier : `src/components/admin/AdminSidebar.tsx`
- Compléter les `keywords` de “Config Graphiques” avec `global` et `logo`
- Cela améliore le match large, mais la vraie correction sera la nouvelle entrée interne dans la Command Palette

5. Vérifications après implémentation
- Ouvrir `/admin?tab=analytics-charts-config` :
  - la vue “Graphiques” doit être affichée par défaut
  - `Global` doit apparaître dans la sidebar
- Ouvrir `/admin?tab=analytics-charts-config&mode=charts&configTab=_global` :
  - l’éditeur filigrane doit s’ouvrir directement
- Chercher `Global`, `filigrane`, `watermark`, `logo` dans la recherche admin :
  - un résultat direct vers `Config Graphiques > Global` doit apparaître
- Vérifier le flux complet sur mobile (viewport 360px) pour confirmer que sidebar et palette restent utilisables

Section technique
- Fichiers à modifier :
  - `src/components/admin/AdminAnalyticsChartsConfig.tsx`
  - `src/components/admin/AdminDashboardHeader.tsx`
  - `src/components/admin/AdminSidebar.tsx`
- Aucun changement base de données
- La correction précédente dans `useInitializedConfig.ts` reste valide ; elle n’est pas à annuler, mais à compléter
