

# Réduire de moitié la taille de la légende sur la carte cadastrale

## Modifications dans `src/pages/CadastralMap.tsx`

### Desktop (lignes 1437-1467)
- Padding du bloc : `p-3` → `p-1.5`
- Titre "Légende" : `text-[10px] mb-2` → `text-[7px] mb-1`
- Chaque item : `text-xs gap-2 space-y-1.5` → `text-[7px] gap-1 space-y-0.5`
- Icônes/indicateurs : `w-3.5 h-3.5` → `w-2 h-2`, bordures et dimensions proportionnelles
- Badge "12m" : `text-[8px]` → `text-[5px]`
- Coin arrondi : `rounded-xl` → `rounded-lg`

### Mobile popover (lignes 1469-1502)
- Mêmes réductions appliquées au contenu du `PopoverContent`
- `w-52` → `w-36`
- Bouton trigger : `h-9 w-9` → `h-7 w-7`, icône `h-4 w-4` → `h-3 w-3`

### Fichier impacté

| Fichier | Modification |
|---|---|
| `src/pages/CadastralMap.tsx` | Réduire tailles police, icônes, padding et gaps dans les deux blocs légende (desktop + mobile) |

