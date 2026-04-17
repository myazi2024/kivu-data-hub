

## Supprimer le bouton "Export CSV" dans Analytics

### Objectif
Retirer la fonctionnalité d'export CSV des dashboards Analytics publics.

### Analyse
Le bouton "Exporter" est rendu via le composant `AnalyticsFilters` (prop `onExport`), utilisé dans tous les blocks Analytics (`OwnershipHistoryBlock`, `TitleRequestsBlock`, etc.). Chaque block passe `onExport={() => exportCSV(...)}` provenant du hook `useBlockFilter`.

### Modifications

**1. `src/components/visualizations/filters/AnalyticsFilters.tsx`**
- Supprimer le rendu du bouton "Exporter" et l'icône `Download` associée.
- Conserver la prop `onExport` optionnelle pour ne pas casser les signatures (ou la retirer entièrement).

**Approche choisie** : retirer purement le bouton du JSX. Le plus simple et propre.

**2. Blocks Analytics (~13 fichiers dans `src/components/visualizations/blocks/*.tsx`)**
- Retirer la prop `onExport={() => exportCSV(...)}` passée à `AnalyticsFilters`.
- Conserver `exportCSV` dans `useBlockFilter` (utilisable côté admin si besoin futur), mais ne plus l'invoquer depuis l'UI publique.

### Résultat
- Plus aucun bouton "Exporter CSV" visible sur les dashboards Analytics publics (`/map` et autres vues).
- Les filtres et le reste de l'UI restent intacts.

