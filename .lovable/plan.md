

# Titre dynamique de la carte RDC

## Problème
Le titre "RDC — Données réelles" est statique. Il doit afficher "République Démocratique du Congo" quand la carte entière est visible, et le nom de la province quand une province est sélectionnée.

## Changement — `src/components/DRCInteractiveMap.tsx`

Ligne 255, remplacer `<span>RDC — Données réelles</span>` par une expression conditionnelle basée sur `selectedProvince` :

```tsx
<span>{selectedProvince ? selectedProvince.name : 'République Démocratique du Congo'}</span>
```

`selectedProvince` est déjà un state dans ce composant avec une propriété `name` contenant le nom de la province.

## Fichier impacté

| Fichier | Modification |
|---------|-------------|
| `src/components/DRCInteractiveMap.tsx` | Ligne 255 — titre dynamique selon `selectedProvince` |

