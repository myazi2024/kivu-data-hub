
# Ajuster la largeur d'une voie mitoyenne et recalculer les lots riverains

## Objectif
Faire en sorte que lorsqu'une voie créée sur une limite mitoyenne est redimensionnée, les deux lots qui la bordent soient automatiquement mis à jour :
- leurs limites suivent la nouvelle largeur de la voie
- leurs surfaces et périmètres sont recalculés
- le comportement reste cohérent pour agrandir comme pour réduire la voie

## Constat dans le code
Le redimensionnement existe déjà, mais il est incomplet pour le cas des voies mitoyennes :
- `LotCanvas.tsx` gère bien les poignées de largeur
- `StepLotDesigner.tsx` possède déjà `handleUpdateRoad` qui tente de déplacer les sommets proches de la voie
- toutefois la détection des lots impactés repose surtout sur une proximité au centre de la voie, sans mémoriser explicitement quels lots sont riverains d'une voie créée sur une limite partagée
- résultat : l'ajustement peut ne rien faire, ou ne pas modifier proprement les mesures des lots concernés

## Plan d’implémentation

### 1. Mémoriser les lots bordant une voie
Étendre le modèle de `SubdivisionRoad` pour enregistrer les lots adjacents à une voie créée :
- au minimum `affectedLotIds: string[]`
- remplir ce champ :
  - lors du tracé d’une voie sur une limite mitoyenne
  - lors de la conversion d’une arête partagée en voie
  - éventuellement lors d’une voie qui traverse un lot puis crée deux lots

Cela permettra de savoir exactement quels lots doivent bouger quand la largeur change.

### 2. Centraliser la logique géométrique d’ajustement
Extraire une fonction utilitaire réutilisable du type :
- entrée : voie, ancienne largeur, nouvelle largeur, lots, parcelle mère
- sortie : nouveaux lots recalculés

Cette fonction devra :
- calculer `deltaHalfWidth`
- retrouver la normale de la voie
- ne modifier que les lots réellement liés à la voie
- déplacer uniquement les sommets/arêtes situés sur la bordure de la voie
- recalculer `areaSqm` et `perimeterM`

L’idée est d’éviter d’avoir une logique différente entre :
- création de voie mitoyenne
- conversion d’arête en voie
- redimensionnement ultérieur

### 3. Corriger le redimensionnement interactif dans le canvas
Revoir la logique de drag de largeur dans `LotCanvas.tsx` :
- conserver quel handle est saisi (côté positif/négatif)
- projeter correctement le mouvement souris sur la normale de la voie
- rendre le calcul indépendant d’un simple `clientY`, pour qu’il fonctionne aussi sur des voies inclinées
- continuer à appeler `onUpdateRoad` en temps réel pour un retour visuel immédiat

### 4. Recalculer automatiquement les lots riverains pendant l’ajustement
Dans `StepLotDesigner.tsx`, faire en sorte que `handleUpdateRoad` :
- mette à jour la largeur de la voie
- applique le recalage géométrique aux lots référencés par `affectedLotIds`
- recalcule leurs mesures à chaque changement de largeur
- conserve les autres lots inchangés

### 5. Préserver la cohérence après suppression / fusion
Adapter aussi les cas secondaires :
- si la voie est supprimée, la fusion/restauration des lots doit rester compatible avec les lots affectés mémorisés
- si une voie est segmentée ou intersectée, chaque segment doit garder ou dériver correctement ses lots adjacents

## Fichiers impactés
| Fichier | Modification |
|---|---|
| `src/components/cadastral/subdivision/types.ts` | Ajouter les lots adjacents dans `SubdivisionRoad` |
| `src/components/cadastral/subdivision/steps/StepLotDesigner.tsx` | Enregistrer les lots riverains lors de la création et recalculer leurs géométries pendant le resize |
| `src/components/cadastral/subdivision/LotCanvas.tsx` | Corriger le drag de largeur pour les voies orientées dans n’importe quelle direction |
| `src/components/cadastral/subdivision/utils/geometry.ts` | Extraire/ajouter un utilitaire commun pour ajuster les lots bordant une voie |

## Détails techniques
```text
Créer voie mitoyenne
  -> détecter lots A et B
  -> stocker affectedLotIds = [A, B]

Resize voie
  -> delta = nouvelle demi-largeur - ancienne demi-largeur
  -> pour chaque lot affecté
       -> identifier les sommets/arêtes sur le bord de la voie
       -> les translater suivant la normale, du bon côté
       -> recalculer surface + périmètre
  -> mettre à jour le rendu en direct
```

## Résultat attendu
Après cette modification, si vous sélectionnez une voie tracée sur une limite mitoyenne et changez sa largeur :
- la voie s’élargit/rétrécit réellement
- les lots de part et d’autre suivent automatiquement
- leurs mesures sont mises à jour immédiatement
- le plan reste géométriquement cohérent
