

## Masquer la barre de défilement verticale avec les filtres et le curseur

### Modification

**Fichier :** `src/components/visualizations/filters/AnalyticsFilters.tsx`

Ajouter/retirer une classe CSS sur `document.body` pour masquer le scrollbar en même temps que le curseur :

- Dans `resetIdleTimer`, au timeout : ajouter `document.body.classList.add('hide-scrollbar')`
- Au reset (mouvement souris) : `document.body.classList.remove('hide-scrollbar')`
- Au cleanup (démontage) : `document.body.classList.remove('hide-scrollbar')`

**Fichier :** `src/index.css`

Ajouter la classe utilitaire :
```css
.hide-scrollbar {
  overflow: auto;
  scrollbar-width: none;
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
```

Deux lignes ajoutées dans le composant, une règle CSS.

