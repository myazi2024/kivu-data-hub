

## Ajouter le logo à droite du titre des visuels Analytics

### Objectif
Afficher le logo de l'application à droite du titre de chaque carte de visualisation, avec une taille proportionnelle au titre (text-xs).

### Modifications

**Fichier :** `src/components/visualizations/shared/ChartCard.tsx`

Dans les composants `ChartCard` (lignes 320-338) et `StackedBarCard` (lignes 420-428), modifier le `CardHeader` pour insérer le logo entre le titre et les boutons d'action :

```tsx
// Dans CardHeader, après le titre et avant les boutons d'action
<div className="flex items-center gap-0.5 shrink-0">
  {/* Logo ajouté ici */}
  <img 
    src={config.logoUrl || "/bic-logo.png"} 
    alt="" 
    className="h-3.5 w-3.5 object-contain opacity-80" 
  />
  {hasCross && (...)}
  <CopyButton ... />
</div>
```

Le logo est récupéré via le `WatermarkConfigContext` déjà existant (lignes 99-101), qui fournit l'URL du logo configuré dans l'administration.

**Taille choisie :** `h-3.5 w-3.5` (14px) — proportionnelle au titre `text-xs` (12px) et aux icônes `h-3 w-3`.

### Fichiers modifiés

| Fichier | Changement |
|---------|------------|
| `src/components/visualizations/shared/ChartCard.tsx` | Ajouter balise `<img>` logo dans le header de `ChartCard` et `StackedBarCard` |

