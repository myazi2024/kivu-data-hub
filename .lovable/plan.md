

# Masquer la barre de navigation en mode plein écran

## Problème
Actuellement, `toggleFullscreen` met `document.documentElement` en plein écran, mais la barre de navigation (`<Navigation />`) dans `Map.tsx` reste visible.

## Solution
Remonter l'état `isFullscreen` vers `Map.tsx` et conditionner l'affichage de `<Navigation />`.

### Changements

**`src/components/DRCInteractiveMap.tsx`**
- Ajouter une prop `onFullscreenChange?: (isFullscreen: boolean) => void`
- Appeler `onFullscreenChange?.(value)` dans le handler `fullscreenchange`

**`src/pages/Map.tsx`**
- Ajouter un état `isFullscreen`
- Passer `onFullscreenChange={setIsFullscreen}` à `DRCInteractiveMap`
- Conditionner le rendu de `<Navigation />` : `{!isFullscreen && <Navigation />}`

| Fichier | Modification |
|---------|-------------|
| `DRCInteractiveMap.tsx` | Ajouter prop + appel callback |
| `Map.tsx` | État + masquer Navigation |

