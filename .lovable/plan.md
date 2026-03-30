

# Corriger le changement de province depuis le filtre Analytics

## Problème

Quand on passe d'une province à une autre via le filtre lieu, la carte ne suit pas. La raison : lors du `zoomOut` intermédiaire (nécessaire avant de zoomer sur la nouvelle province), deux callbacks remettent `externalProvinceId` à `null` dans le parent :

1. `onProvinceDeselect()` (appelé à la fin de l'animation de zoom out)
2. `onZoomChange(false)` → qui exécute `if (!zoomed) setExternalProvinceId(null)`

Cela annule le nouvel `externalProvinceId` qui vient d'être défini, et le useEffect ne relance jamais le zoom vers la nouvelle province.

## Solution

Modifier `DRCMapWithTooltip.tsx` pour gérer proprement la transition province→province sans que le zoom out intermédiaire n'efface l'état du parent.

### Changements dans `DRCMapWithTooltip.tsx`

**1. useEffect (lignes 359-377)** — Quand on passe d'une province à une autre via `externalZoomProvinceId`, ne pas appeler `zoomOut()` standard (qui déclenche les callbacks de reset). À la place, faire un zoom out "silencieux" qui ne notifie pas le parent, puis enchaîner avec le zoom vers la nouvelle province :

```tsx
useEffect(() => {
  if (externalZoomProvinceId && svgContent && !isAnimating) {
    if (externalZoomProvinceId !== zoomedProvinceId) {
      if (zoomedProvinceId) {
        // Zoom out silencieux (sans appeler onProvinceDeselect/onZoomChange)
        silentZoomOut(() => {
          zoomToProvince(externalZoomProvinceId);
        });
      } else {
        zoomToProvince(externalZoomProvinceId);
      }
    }
  } else if (!externalZoomProvinceId && zoomedProvinceId && !isAnimating) {
    zoomOut();
  }
}, [externalZoomProvinceId, svgContent]);
```

**2. Nouvelle fonction `silentZoomOut`** — Identique à `zoomOut` mais sans appeler `onProvinceDeselect()` ni `onZoomChange(false)`. Elle accepte un callback `onComplete` pour enchaîner le zoom suivant.

## Fichier impacté

| Fichier | Modification |
|---------|-------------|
| `src/components/DRCMapWithTooltip.tsx` | Ajouter `silentZoomOut`, modifier le useEffect de sync externe |

