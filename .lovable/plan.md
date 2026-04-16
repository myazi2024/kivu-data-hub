

## Remplacer les icônes par le logo dans les titres des visuels

### Objectif
Dans chaque visuel analytics, remplacer l'icône Lucide au début du titre par le logo de l'application, et le déplacer à la fin (à droite) du titre au lieu du début.

### Fichier modifié
- `src/components/visualizations/shared/ChartCard.tsx`

### Modifications

**1. Ajouter l'import de `useAppAppearance`**
Importer le hook pour récupérer l'URL du logo depuis la config.

**2. Créer un composant `LogoIcon` interne**
Un petit composant qui utilise `useAppAppearance` pour obtenir le logo et l'affiche en tant qu'image de 12x12px (h-3 w-3).

**3. Modifier les 4 composants suivants :**

| Composant | Ligne actuelle icône | Modification |
|-----------|---------------------|--------------|
| `ChartCard` | 322 | Supprimer `{Icon && <Icon ... />}`, ajouter `<LogoIcon />` après le `CardTitle` |
| `StackedBarCard` | 422 | Idem |
| `MultiAreaChartCard` | 534 | Idem |
| `ColorMappedPieCard` | 597 | Idem |

**Structure actuelle (à modifier dans les 4 endroits) :**
```tsx
<div className="flex items-start gap-1">
  {Icon && <Icon className={`h-3 w-3 ...`} />}   <!-- SUPPRIMER -->
  <div className="min-w-0 flex-1">
    <CardTitle className="...">{title}</CardTitle>
    ...
  </div>
  ...
</div>
```

**Nouvelle structure :**
```tsx
<div className="flex items-start gap-1">
  <div className="min-w-0 flex-1">
    <div className="flex items-center gap-1">     <!-- WRAPPER FLEX -->
      <CardTitle className="...">{title}</CardTitle>
      <img src={logoUrl || '/bic-logo.png'} className="h-3 w-3 object-contain shrink-0 opacity-80" alt="" />
    </div>
    ...
  </div>
  ...
</div>
```

**4. Supprimer la prop `icon` des interfaces**
- Retirer `icon?: LucideIcon` et `iconColor?: string` des interfaces `ChartCardProps`, `StackedBarCardProps`, `MultiAreaChartCardProps`, `MultiDataPieProps` (puisqu'elles ne seront plus utilisées).

**5. Nettoyer les imports**
- Supprimer les imports d'icônes Lucide inutilisées dans `ChartCard.tsx` (seulement si elles ne sont utilisées que pour les cartes).

### Note
Les blocs qui passent actuellement des icônes (ex: `TitleRequestsBlock.tsx` avec `icon={FileText}`, `icon={Scale}`, etc.) ne verront plus leurs icônes affichées — elles seront remplacées par le logo de l'application de manière uniforme.

