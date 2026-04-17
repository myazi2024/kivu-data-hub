
## Rendre visibles les ombres des cards Analytics

### Diagnostic
Les variables `--shadow-analytics` sont bien appliquées sur `<Card>` dans `ChartCard.tsx`, mais elles sont **visuellement coupées** par :
1. Le conteneur scroll parent dans `ProvinceDataVisualization.tsx` (ligne 156) : `overflow-x-hidden` rogne les ombres horizontales
2. Le `gap-2` (8px) entre cards dans tous les blocks : trop serré, les ombres des cards adjacentes se recouvrent et s'annulent visuellement
3. Aucun padding autour du grid : ombres des cards de bord coupées
4. Le `KpiGrid` au-dessus a le même problème

### Modifications

**1. `src/components/visualizations/ProvinceDataVisualization.tsx` (ligne 156)**

Ajouter du padding et garder `overflow-x-hidden` (nécessaire), mais le padding du contenu compensera :
```tsx
className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden p-2 lg:p-3"
```
(au lieu de `p-1 lg:p-0 lg:mt-1.5`)

**2. Tous les blocks dans `src/components/visualizations/blocks/*.tsx`**

Remplacer `gap-2` par `gap-4 md:gap-5` sur le grid de chart cards pour laisser de la place aux ombres :
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
```

Fichiers concernés (13) :
- OwnershipHistoryBlock, TitleRequestsBlock, CertificatesBlock, BuildingPermitsBlock, ExpertiseBlock, TaxesBlock, MortgagesBlock, MutationBlock, DisputesBlock, ParcelsBlock, et autres blocks listés.

**3. Vérifier `KpiGrid`** — appliquer la même logique de gap si applicable.

### Résultat
Les ombres `--shadow-analytics` (déjà définies) deviennent **réellement visibles** autour de chaque card individuellement, avec assez d'espace de respiration entre les cards et autour du grid.
