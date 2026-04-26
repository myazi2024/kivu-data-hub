---
name: subdivision-lot-designer-modularization
description: Modularisation StepLotDesigner — 5 panneaux présentationnels (Lots/Roads/CommonSpaces/Servitudes/Validation), analytics subdivision_lot_*, badge ✅ Plan conforme, suppression `as any`, formatage largeur voie 1 décimale, bouton "Lot" inerte désactivé.
type: feature
---

# Concepteur de lots — modularisation P1/P2

## Composants présentationnels (steps/panels/)
- `LotsListPanel` — liste des lots + LotsBulkActions intégré
- `RoadsListPanel` — liste + édition voie sélectionnée (largeur arrondie 1 décimale)
- `CommonSpacesPanel` — création/édition espaces communs
- `ServitudesPanel` — création/édition servitudes
- `ValidationPanel` — erreurs/warnings + badge "✅ Plan conforme" si zero issue

Tous les panneaux : aria-label complets, htmlFor/id sur Label/Input, types stricts (plus aucun `as any`).

## Analytics
`useAdminAnalytics().trackAdminAction({ module: 'subdivision', action })` sur :
- `lot_split` (handleSplitLot)
- `lot_merge` (handleMergeLots, meta.count)
- `lot_cut` (handleCutLot)
- `lot_convert` (handleConvertSelectedZone, meta.to)

## UX corrigée
- Bouton "Lot" du sélecteur Type de zone : `disabled + cursor-default` (au lieu d'onClick vide)
- Largeur voie : `formatWidth = round(n*10)/10` partout (slider, input, affichage)

## Hook useLotOperations — REPORTÉ
Trop de couplage avec state local (selectedLotId, atomicité setLots+setRoads+setCommonSpaces, metricFrame). À refaire dans une passe dédiée avec useReducer pour le state plan.

## Toolbar — non extraite
Reste dans le monolithe. Trop de handlers locaux à propager. À refaire si la barre grossit.

## Métriques
- `StepLotDesigner.tsx` : 1496 → 1284 lignes (-212)
- 5 panneaux extraits : 468 lignes réparties, testables séparément
