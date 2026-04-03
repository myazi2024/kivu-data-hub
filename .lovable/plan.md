
# Positionnement dynamique du bloc Légende

## Problème

Le bloc Légende mobile a une position fixe (`bottom-48`, soit ~12rem) et ne s'adapte pas quand le panneau parcelle ou le dropdown Actions s'ouvre, contrairement aux boutons de zoom qui ont déjà été corrigés.

## Solution

Appliquer la même logique dynamique que les contrôles de zoom au positionnement du bloc Légende mobile.

### Dans `src/pages/CadastralMap.tsx`

1. **Légende mobile** (ligne 1489) : remplacer la classe fixe `bottom-48` par un `style={{ bottom: ... }}` dynamique calculé selon `selectedParcel`, `actionsExpanded` et `isMobile` :
   - Aucune parcelle : `bottom: 12rem` (équivalent au `bottom-48` actuel)
   - Parcelle sélectionnée, actions fermées : `bottom: 15rem`
   - Parcelle sélectionnée, actions ouvertes : `bottom: 30rem`
   - Ajouter `transition: bottom 0.3s ease` pour la fluidité

2. **Légende desktop** (ligne 1475) : même approche si nécessaire — le panneau desktop est en `bottom-right`, la légende est en `top-right` donc pas de collision. Pas de changement requis pour le desktop.

### Fichier modifié
- `src/pages/CadastralMap.tsx` : 1 modification sur le div de la légende mobile
