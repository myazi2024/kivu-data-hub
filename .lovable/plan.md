

# Audit detaille — Config Graphiques

## Architecture

Le module est compose de :
- **Composant principal** : `AdminAnalyticsChartsConfig.tsx` (681 lignes)
- **Sous-composants** : `ItemEditor`, `TabManager`, `FilterManager`, `CrossVariableManager`, `GlobalWatermarkConfig`
- **Hook de donnees** : `useAnalyticsChartsConfig.ts` (query, mutations, helpers)
- **Initialisation** : `useInitializedConfig.ts` (merge defaults/DB)
- **Registres statiques** : `analyticsTabsRegistry.ts` (351 lignes, 15 onglets), `crossVariables.ts` (171 lignes)

## Bugs identifies

### 1. `handleSave` sauvegarde l'onglet actif mais inclut les KPIs de `_global` / `rdc-map` (majeur)
Ligne 181 : `upsertConfig.mutateAsync(localItems[activeTab])`. Pour les onglets utilisateur, ca fonctionne. Mais si l'admin est sur `_global` et modifie le watermark, `handleSave` envoie les items `_global` qui sont de type `chart` avec `item_key: 'logo-watermark-opacity'` etc. Le mutation (ligne 218) force `chart_type: null` uniquement pour `tab`/`filter`/`cross`, mais ces items `_global` sont de type `chart` — ils passeront avec `chart_type: null` (valeur par defaut car non defini dans le registre). C'est correct par hasard mais fragile.

### 2. `handleSave` ne sauvegarde que les charts/KPIs, pas les filtres ni les croisements de l'onglet actif (logique)
Un admin qui modifie des graphiques dans un onglet puis clique "Sauvegarder" (le bouton par onglet) pense tout sauvegarder. Mais les filtres et croisements modifies dans d'autres vues ne sont pas inclus. Seul "Sauvegarder tout" les inclut. Ce n'est pas un bug mais c'est une source de confusion — le badge "Non sauvegarde" est global mais le bouton est partiel.

### 3. `CHART_TYPE_OPTIONS` duplique entre `AdminAnalyticsChartsConfig.tsx` (ligne 38) et `ItemEditor.tsx` (ligne 11)
Meme tableau copie-colle. Si un nouveau type est ajoute dans un fichier mais pas l'autre, desynchronisation.

### 4. `isFixedTypeChart` retourne `true` quand `chart_type` est `null` (faux positif potentiel)
Ligne 30-31 de `ItemEditor.tsx` : `!item.chart_type`. Or, les items `geo` du registre n'ont pas de `chart_type` defini (ex: ligne 20 du registre, `item_key: 'geo'` sans `chart_type`). Ces items sont des graphiques geographiques composes (pas des StackedBar), mais ils sont marques "Type fixe" — c'est correct dans l'intention mais le nommage/la logique est ambigue.

### 5. `GripVertical` affiche sans drag-and-drop (UX trompeur)
Ligne 92 de `ItemEditor.tsx` : l'icone `GripVertical` suggere un glisser-deposer mais seuls les boutons chevrons fonctionnent. Cela trompe l'utilisateur.

### 6. Pas de validation sur les noms d'icones Lucide (mineur)
Ligne 69-76 de `ItemEditor.tsx` : le champ `custom_icon` accepte n'importe quelle chaine. Si l'admin entre un nom invalide, le composant consommateur (`ChartCard`) echouera silencieusement ou affichera une icone par defaut sans feedback.

### 7. `computeCompletion` inexistant pour la config elle-meme (info)
Pas de validation que tous les onglets du registre ont bien des items initialises. Si un onglet est ajoute au registre mais pas aux croisements ou aux filtres, aucun avertissement.

## Problemes de logique

### 8. `handleReset` reinitialise depuis le registre statique mais ne reinitialise pas les filtres ni les croisements
Ligne 216-223 : seuls `kpis` et `charts` sont reinitialises. Si l'admin a modifie les filtres ou croisements de l'onglet, ils restent modifies apres reset. Le message "Configuration reinitialisee" est trompeur.

### 9. `desyncWarnings` ne detecte pas les onglets du registre absents de `CROSS_VARIABLE_REGISTRY`
Ligne 117-133 : la boucle ne verifie que les onglets presents dans `CROSS_VARIABLE_REGISTRY` mais pas l'inverse. Un onglet du registre sans croisements configures ne genere aucun warning.

### 10. `modifiedTabs` ne suit que les modifications de charts/KPIs, pas les changements intra-onglet pour filtres/cross
Le badge "modifie" en sidebar ne s'affiche que quand `markTabModified` est appele (= edition chart/KPI). Les modifications de filtres ou croisements n'activent pas ce badge, meme si elles concernent un onglet specifique.

### 11. `FilterManager` et `CrossVariableManager` ont leur propre `selectedTab` interne, independant de `activeTab`
Quand l'admin bascule entre les modes (Graphiques → Filtres → Croisements), chaque vue maintient sa propre selection d'onglet. Si l'admin travaille sur "Parcelles" en mode Graphiques puis passe en mode Filtres, il se retrouve sur le premier onglet, pas sur "Parcelles". Rupture de contexte.

### 12. La sauvegarde par onglet (`handleSave`) ne reinitialise pas `hasTabChanges` / `hasFilterChanges` / `hasCrossChanges`
Seul `modifiedTabs` est mis a jour. Le badge global "Non sauvegarde" peut rester affiche a tort si des modifications de filtres/tabs ont ete faites prealablement.

## Problemes de performance / maintenabilite

### 13. Le registre `analyticsTabsRegistry.ts` est un fichier monolithique de 351 lignes
Chaque modification d'un onglet necessite de toucher ce fichier. Pas de co-localisation avec les blocs visuels correspondants.

### 14. Duplication du pattern sidebar dans `AdminAnalyticsChartsConfig.tsx`
La sidebar (liste d'onglets avec badges) est renderisee 2 fois avec des variantes mineures : une pour le mode KPIs (ligne 387-408) et une pour le mode Charts (ligne 456-486). Meme structure, memes styles, memes interactions.

## Plan de corrections

| # | Severite | Action |
|---|----------|--------|
| 3 | Mineur | Extraire `CHART_TYPE_OPTIONS` dans un fichier partage et importer dans les deux composants |
| 5 | Mineur | Retirer `GripVertical` ou implementer le drag-and-drop reel |
| 8 | Moyen | Etendre `handleReset` pour reinitialiser aussi les filtres et croisements de l'onglet actif |
| 10 | Moyen | Unifier le tracking des modifications pour refletir l'etat reel par onglet (filtres + cross inclus) |
| 11 | Moyen | Propager `activeTab` vers `FilterManager` et `CrossVariableManager` pour maintenir le contexte |
| 14 | Mineur | Factoriser la sidebar en un composant partage avec props de configuration |
| 12 | Mineur | Corriger `handleSave` pour reinitialiser les flags globaux si aucune autre modification ne subsiste |

### Fichiers impactes
- `src/components/admin/AdminAnalyticsChartsConfig.tsx`
- `src/components/admin/analytics-config/ItemEditor.tsx`
- `src/components/admin/analytics-config/FilterManager.tsx`
- `src/components/admin/analytics-config/CrossVariableManager.tsx`
- `src/hooks/useInitializedConfig.ts`

