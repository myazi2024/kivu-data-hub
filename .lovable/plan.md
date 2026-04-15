

# Ajouter le logo après "Tous droits réservés" dans Analytics et Carte RDC

## Problème

Le logo dynamique n'apparaît pas après la mention "Tous droits réservés" dans deux emplacements :
1. Le pied de chaque graphique analytics (`ChartCard` footer)
2. Le pied de la carte interactive RDC

## Modifications

### 1. `src/components/visualizations/shared/ChartCard.tsx` — ChartFooter

Le composant `ChartFooter` (ligne 111-120) affiche uniquement du texte. Ajouter le logo inline après le texte watermark, à la même échelle (7px de texte → image ~10px).

- Récupérer `logoUrl` depuis `WatermarkConfigContext`
- Ajouter une `<img>` inline après `{watermark}`, classe `h-2.5 w-2.5 inline-block ml-0.5 opacity-60`

### 2. `src/components/DRCInteractiveMap.tsx` — Pied de carte

La ligne 442 affiche `{todayStr} — {watermarkText}` en texte seul. Ajouter le logo dynamique inline.

- Importer `useAppAppearance` (ou récupérer le logo depuis le config existant)
- Ajouter une `<img>` inline après le `<span>`, même taille que le texte (10px → image ~14px), classe `h-3 w-3 inline-block ml-0.5`

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `src/components/visualizations/shared/ChartCard.tsx` | Logo inline dans `ChartFooter` |
| `src/components/DRCInteractiveMap.tsx` | Logo inline dans le pied de carte |

