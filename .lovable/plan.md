

# Réinitialiser le titre au retour à la carte complète

## Problème
Le bouton "retour" dans `DRCMapWithTooltip.tsx` appelle `zoomOut` qui réinitialise `zoomedProvinceId` en interne, mais ne notifie jamais le parent (`DRCInteractiveMap`) de remettre `selectedProvince` à `null`. Le titre et la note restent donc bloqués sur la province.

## Solution

Dans `DRCMapWithTooltip.tsx`, ajouter un callback `onProvinceDeselect` (ou réutiliser un prop existant) pour signaler au parent que la province est désélectionnée lors du zoom out.

### Changements

**`DRCMapWithTooltip.tsx`** :
- Ajouter une prop `onProvinceDeselect?: () => void` dans l'interface
- Dans `zoomOut`, appeler `onProvinceDeselect?.()` dans le callback d'animation (à côté de `setZoomedProvinceId(null)`)

**`DRCInteractiveMap.tsx`** :
- Passer `onProvinceDeselect={() => setSelectedProvince(null)}` au composant `DRCMapWithTooltip`

C'est un changement de 3-4 lignes au total.

