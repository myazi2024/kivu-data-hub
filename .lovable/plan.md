

# Ajout du swipe tactile sur la Présentation BIC

## Problème

Aucun gestionnaire tactile (`onTouchStart` / `onTouchEnd`) n'existe sur le conteneur de slides. Sur mobile, le balayage horizontal ne déclenche pas le changement de slide.

## Solution

Ajouter un hook de détection de swipe directement dans le composant principal de la présentation. On détecte un swipe horizontal (seuil de 50px, avec vérification que le mouvement horizontal dépasse le vertical pour ne pas interférer avec le scroll vertical).

## Modification

**Fichier : `src/pages/PitchPartenaires.tsx`**

1. Ajouter un `useRef` pour stocker les coordonnées du touch start (`touchStartX`, `touchStartY`).

2. Ajouter `onTouchStart` et `onTouchEnd` sur le conteneur de slide (ligne ~1206) :
   - `onTouchStart` : enregistre `e.changedTouches[0].clientX` et `clientY`
   - `onTouchEnd` : calcule le delta X et Y. Si `|deltaX| > 50` et `|deltaX| > |deltaY|`, appelle `next()` (swipe gauche) ou `prev()` (swipe droite)

3. Le code sera ajouté directement dans le composant sans dépendance externe.

