

# Ajouter le mode plein écran aux Données foncières

## Objectif
Permettre aux partenaires d'afficher la page Données foncières en plein écran pour les grands écrans (salons, présentations).

## Solution
Utiliser l'API native `document.documentElement.requestFullscreen()` avec un bouton bascule dans l'en-tête de la carte.

### Changements

**`src/components/DRCInteractiveMap.tsx`**

1. Importer `Maximize, Minimize` depuis `lucide-react`
2. Ajouter un état `isFullscreen` + un `useEffect` qui écoute l'événement `fullscreenchange` pour synchroniser l'état
3. Fonction `toggleFullscreen` : appelle `requestFullscreen()` ou `exitFullscreen()`
4. Ajouter un bouton icône à côté du bouton "copier en image" (zone `bottom-5 right-2`) :
   - Icône `Maximize` → `Minimize` selon l'état
   - Tooltip "Plein écran" / "Quitter le plein écran"

### Détail technique

```tsx
const [isFullscreen, setIsFullscreen] = useState(false);

useEffect(() => {
  const handler = () => setIsFullscreen(!!document.fullscreenElement);
  document.addEventListener('fullscreenchange', handler);
  return () => document.removeEventListener('fullscreenchange', handler);
}, []);

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
};
```

Le bouton sera placé dans la zone d'actions en bas à droite de la carte, avec le même style que le bouton copie existant.

## Fichier impacté

| Fichier | Modification |
|---------|-------------|
| `src/components/DRCInteractiveMap.tsx` | État fullscreen, listener, bouton bascule |

