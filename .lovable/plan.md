
## Masquer la barre de défilement verticale avec les filtres et le curseur

### Modification

**Fichier :** `src/components/visualizations/filters/AnalyticsFilters.tsx`

Ajouter/retirer la classe `overflow-hidden` sur `document.documentElement` (ou `document.body`) en même temps que `cursor-none` :

- Dans `resetIdleTimer`, au timeout : `document.documentElement.style.overflow = 'hidden'`
- Dans `resetIdleTimer`, au reset : `document.documentElement.style.overflow = ''`
- Dans le cleanup : `document.documentElement.style.overflow = ''`

Cela masque la scrollbar verticale quand l'utilisateur est inactif, et la restaure dès qu'il bouge la souris.
