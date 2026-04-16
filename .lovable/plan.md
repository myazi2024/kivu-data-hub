

# Masquer le curseur avec le bloc de filtres

## Objectif

Quand le bloc de filtres disparaît après 3 secondes d'inactivité, le curseur de souris doit aussi disparaître. Les deux réapparaissent ensemble dès que l'utilisateur bouge la souris.

## Modification

**Fichier :** `src/components/visualizations/filters/AnalyticsFilters.tsx`

Dans le `useEffect` existant (lignes 250-257), ajouter/retirer la classe `cursor-none` sur `document.body` selon l'état `filtersVisible` :

```tsx
const resetIdleTimer = useCallback(() => {
  setFiltersVisible(true);
  document.body.classList.remove('cursor-none');
  clearTimeout(idleTimerRef.current);
  idleTimerRef.current = setTimeout(() => {
    setFiltersVisible(false);
    document.body.classList.add('cursor-none');
  }, 3000);
}, []);
```

Et dans le cleanup du `useEffect`, s'assurer de retirer la classe au démontage :

```tsx
return () => {
  document.removeEventListener('mousemove', resetIdleTimer);
  clearTimeout(idleTimerRef.current);
  document.body.classList.remove('cursor-none');
};
```

Ajouter dans `src/index.css` :
```css
.cursor-none, .cursor-none * {
  cursor: none !important;
}
```

Un seul fichier logique modifié + une ligne CSS.

