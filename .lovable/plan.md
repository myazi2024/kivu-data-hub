

# Boutons Zoom adaptatifs sur la carte cadastrale

## Problème

Les contrôles de zoom Leaflet (bottom-right) ont une position fixe (`margin-bottom: 12rem` sur mobile). Quand le panneau de la parcelle sélectionnée est affiché — et surtout quand le bloc "Actions" s'ouvre (jusqu'à 200-260px de plus) — les boutons de zoom se retrouvent cachés dessous car ils ne s'adaptent pas à la hauteur du panneau.

## Solution

Remplacer le positionnement CSS statique des contrôles de zoom par un **calcul dynamique** basé sur l'état du panneau et du dropdown :

### Dans `src/pages/CadastralMap.tsx`

1. **Calculer dynamiquement le `margin-bottom`** des contrôles de zoom via un `useEffect` qui observe :
   - `selectedParcel` (panneau visible ou non)
   - `actionsExpanded` (dropdown ouvert ou non)
   - `isMobile` (comportement différent)

2. **Logique de marge** :
   - Aucune parcelle sélectionnée : marge par défaut (1rem)
   - Parcelle sélectionnée, actions fermées : marge = hauteur du panneau (~10rem mobile, ~8rem desktop) + 1rem
   - Parcelle sélectionnée, actions ouvertes : marge += hauteur du dropdown (~13rem mobile, ~17rem desktop)

3. **Mise à jour via `<style>` dynamique** : remplacer le bloc `<style>` statique actuel (lignes 937-942) par un bloc dont le `margin-bottom` est une variable calculée. Ajouter une transition CSS (`transition: margin-bottom 0.3s ease`) pour que le déplacement soit fluide.

4. **Desktop** : même logique, le panneau est en `bottom-4 right-4 w-80` — les zoom controls Leaflet sont aussi `bottomright`, donc la même collision existe. Appliquer la même adaptation.

### Résultat

Les boutons +/- se déplacent fluidement vers le haut quand le panneau apparaît ou que le dropdown s'ouvre, et redescendent quand il se ferme.

