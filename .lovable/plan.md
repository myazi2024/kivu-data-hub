# Garder les filtres Analytics toujours affichés

## Problème
Dans Données foncières › Analytics, la barre de filtres se masque automatiquement après 3 secondes sans mouvement de souris (opacité 0 + hauteur réduite), et le curseur est masqué (`cursor-none`). Les filtres doivent rester visibles en permanence.

## Constat (vérifié)
- `src/components/visualizations/filters/AnalyticsFilters.tsx:155-187` : mécanisme « Auto-hide on mouse idle (3s) » — état `filtersVisible`, minuteur `idleTimerRef`, écouteur `mousemove`, classes conditionnelles `opacity-0 max-h-0` et classe `cursor-none` ajoutée à `document.body`.
- `src/components/visualizations/ProvinceDataVisualization.tsx:122,129-135` : un `MutationObserver` surveille la classe `cursor-none` du body pour replier la barre latérale d'onglets (`isIdle`) — dépend du même mécanisme.
- `src/index.css:718-719` : règle CSS `.cursor-none` (masque le curseur), uniquement utilisée par ce mécanisme.

## Corrections
1. **AnalyticsFilters.tsx** — supprimer tout le bloc auto-hide (état, minuteur, écouteur, effets) et rendre les classes du conteneur fixes : `opacity-100 max-h-none p-1.5` sans transition conditionnelle ni `onMouseEnter`.
2. **ProvinceDataVisualization.tsx** — supprimer l'état `isIdle`, le `MutationObserver` et les branches conditionnelles `isIdle` (largeur de colonne, overflow, libellés d'onglets) : la barre latérale reste toujours déployée avec les libellés complets.
3. **index.css** — supprimer la règle `.cursor-none` devenue orpheline.

## Hors périmètre
- Aucun changement de logique de filtrage, de cascade géographique ou de synchronisation carte ↔ filtres.
- Les autres vues géographiques (provinces, communes, quartiers, territoires) ne sont pas touchées.

## Validation
- `npx tsgo --noEmit -p tsconfig.app.json`
- `npm run test` (vitest run)
- Vérification `rg -n "cursor-none|filtersVisible|isIdle"` : aucune occurrence restante.
