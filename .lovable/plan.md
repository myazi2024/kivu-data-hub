

# Boutons Zoom dynamiques sur mobile — Prise en compte de la barre de recherche

## Problème

Sur mobile, quand aucune parcelle n'est sélectionnée, la barre de recherche se positionne en bas de l'écran (`translate-y-[calc(100dvh-12rem)]`). Les boutons de zoom (bottom-right) restent à `margin-bottom: 1rem`, ce qui crée un chevauchement. De plus, quand le dropdown Actions s'ouvre, le calcul actuel ne fonctionne pas toujours correctement sur mobile.

## Solution

Modifier le calcul dynamique du `margin-bottom` des contrôles de zoom pour prendre en compte **3 états** sur mobile :

### Logique de marge mobile mise à jour

| État | margin-bottom |
|---|---|
| Aucune parcelle, recherche inactive (barre en bas) | `13rem` (au-dessus de la barre) |
| Aucune parcelle, recherche active (barre en haut) | `1rem` |
| Parcelle sélectionnée, actions fermées | `11rem` |
| Parcelle sélectionnée, actions ouvertes | `26rem` |

### Fichier modifié

**`src/pages/CadastralMap.tsx`** — Bloc `<style>` dynamique (lignes 937-948) :
- Ajouter `isSearchBarActive` dans le calcul de marge
- Sur mobile sans parcelle : si la barre de recherche est en bas (`!isSearchBarActive`), appliquer `13rem` au lieu de `1rem` pour que les boutons restent au-dessus
- Desktop inchangé (la barre de recherche ne descend pas en bas sur desktop)

