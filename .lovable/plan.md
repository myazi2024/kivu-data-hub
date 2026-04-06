

# Légende carte : utiliser scopedStats au lieu de selectedProvince

## Problème
La légende contextuelle (lignes 422-432) affiche toujours les données de `selectedProvince` (Parcelles, Titres, Revenus, Densité) même quand une ville, commune ou quartier est sélectionné. Le `scopedStats` calculé dynamiquement existe déjà mais n'est pas utilisé par cette légende.

## Correction — `DRCInteractiveMap.tsx`

1. **Élargir la condition d'affichage** : remplacer `isMapZoomed && selectedProvince` par `selectedProvince` (la légende doit aussi apparaître au niveau ville/commune/quartier, pas seulement en zoom province).

2. **Utiliser `scopeLabel` pour le titre** : remplacer `selectedProvince.name` par `scopeLabel`.

3. **Utiliser `scopedStats` pour les valeurs** : remplacer `selectedProvince.parcelsCount`, `titleRequestsCount`, `revenueUsd`, `densityLevel` par `scopedStats?.parcelsCount`, etc.

```tsx
{/* Légende contextuelle — scope dynamique */}
{selectedProvince && scopedStats && (
  <div className="absolute bottom-5 left-2 z-10 bg-background/80 backdrop-blur-sm rounded px-1.5 py-1 border border-border/30 animate-fade-in">
    <div className="text-[10px] font-medium text-foreground mb-0.5">{scopeLabel}</div>
    <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
      <div className="flex justify-between gap-2"><span>Parcelles</span><span className="font-medium text-foreground">{formatNumber(scopedStats.parcelsCount)}</span></div>
      <div className="flex justify-between gap-2"><span>Titres dem.</span><span className="font-medium text-foreground">{formatNumber(scopedStats.titleRequestsCount)}</span></div>
      <div className="flex justify-between gap-2"><span>Revenus</span><span className="font-medium text-foreground">{formatCurrency(scopedStats.revenueUsd)}</span></div>
      <div className="flex justify-between gap-2"><span>Densité</span><span className="font-medium text-foreground">{scopedStats.densityLevel}</span></div>
    </div>
  </div>
)}
```

### Fichier modifié
- `src/components/DRCInteractiveMap.tsx` (lignes 421-432)

