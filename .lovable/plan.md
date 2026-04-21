

## Correction swipe mobile sur Carte RDC (`data-no-swipe`)

### Problème identifié
Le swipe est branché sur le conteneur racine de `DRCInteractiveMap`, mais les wrappers de toutes les cartes ont `data-no-swipe` :

- provinces
- territoires
- communes
- quartiers

Comme chaque wrapper couvre toute la zone de carte, le hook `useSwipeNavigation` ignore immédiatement tout `touchstart` fait sur la carte. Résultat : le swipe fonctionne seulement en dehors de la carte, mais pas sur la Carte RDC elle-même.

### Objectif
Permettre le glissement horizontal directement sur la carte pour basculer :

- swipe gauche sur **Carte** → **Analytics**
- swipe droite sur **Analytics** → **Carte**

Sans casser les interactions existantes :

- tap sur province/commune/quartier/territoire = sélection normale
- bouton retour zoom = fonctionne toujours
- popover/info/boutons = ne déclenchent pas le swipe
- scroll vertical des analytics = reste naturel

### Plan d’implémentation

#### 1. Remplacer l’exclusion globale `data-no-swipe`
Dans `src/components/DRCInteractiveMap.tsx` :

- Retirer `data-no-swipe` des wrappers pleine carte :
  - `territoires`
  - `quartiers`
  - `communes`
  - `provinces`

Ces attributs bloquent actuellement toute la surface de swipe.

#### 2. Garder l’exclusion uniquement pour les contrôles interactifs
Remplacer la logique par une exclusion plus fine :

```ts
ignoreSelector:
  '[data-swipe-ignore], [role="dialog"], [data-radix-popper-content-wrapper], button, a, input, textarea, select'
```

Puis marquer uniquement les éléments à exclure si nécessaire avec `data-swipe-ignore`, notamment :

- boutons de bascule mobile Carte/Analytics
- bouton plein écran
- bouton partage
- bouton info/popover
- bouton retour zoom

#### 3. Laisser la carte recevoir le swipe, mais protéger les taps
Dans `src/hooks/useSwipeNavigation.ts`, ajouter une logique anti-clic fantôme :

- si le mouvement horizontal dépasse le seuil de swipe, le hook déclenche la navigation
- puis il bloque le prochain `click` synthétique pendant quelques millisecondes via un listener `click` en capture :
  - `event.preventDefault()`
  - `event.stopPropagation()`

But : éviter qu’un swipe commencé sur une province déclenche aussi un clic de sélection après le changement vers Analytics.

#### 4. Conserver la distinction tap vs swipe
La carte doit continuer à fonctionner ainsi :

- petit mouvement ou simple tap → sélection de province/commune/quartier
- vrai swipe horizontal → bascule vers Analytics, sans sélection parasite

La détection actuelle `threshold`, `flickThreshold`, `ratio` et `direction` reste conservée.

#### 5. Ajuster la mémoire projet
Mettre à jour `mem://features/land-data-analytics/interactive-map-layers-fr` pour documenter que :

- les wrappers carte ne doivent plus porter `data-no-swipe`
- seuls les contrôles UI utilisent `data-swipe-ignore`
- le hook protège contre les clics synthétiques après swipe

### Fichiers impactés

- `src/components/DRCInteractiveMap.tsx`
- `src/hooks/useSwipeNavigation.ts`
- `mem://features/land-data-analytics/interactive-map-layers-fr`

### Critères de validation

Sur mobile :

1. Depuis la carte RDC, glisser vers la gauche sur la carte affiche Analytics.
2. Depuis Analytics, glisser vers la droite revient à la carte.
3. Un simple tap sur une province sélectionne toujours la province.
4. Un swipe sur une province ne déclenche pas de sélection parasite.
5. Les boutons, popovers et contrôles restent cliquables sans déclencher le swipe.

