

# Fix z-index du catalogue de services

## Probleme

`CadastralResultsDialog` utilise `z-50` (équivalent CSS 50) pour son overlay, mais les éléments de la carte cadastrale utilisent `z-[800]` à `z-[1000]`. Le catalogue s'affiche donc derrière les contrôles de la carte.

## Correction — `CadastralResultsDialog.tsx`

| Element | Actuel | Nouveau |
|---------|--------|---------|
| Overlay (`div.fixed`) | `z-50` | `z-[1500]` |
| Bouton fermer | `z-50` | `z-[1501]` |
| Header sticky | `z-40` | `z-[1501]` |

Cela place le catalogue au-dessus de tous les éléments de la carte (max `z-[1000]`) et des formulaires d'action (`z-[1200]`), tout en restant sous les alertes critiques (`z-[100000]`).

