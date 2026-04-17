
## Raccourci clavier "F" pour basculer en plein écran sur Analytics

### Objectif
Ajouter un raccourci clavier intuitif : appuyer sur **F** bascule le mode plein écran sur la page Analytics (carte interactive).

### Analyse

La page `/map` (Analytics) utilise `DRCInteractiveMap` avec une prop `onFullscreenChange`. Il existe déjà un état `isFullscreen` géré dans le composant. Il faut :
1. Identifier la fonction de bascule existante dans `DRCInteractiveMap`
2. Ajouter un listener clavier global qui appelle cette fonction sur la touche F

### Modification

**Fichier :** `src/components/DRCInteractiveMap.tsx`

Ajouter un `useEffect` qui écoute `keydown` sur `window` :
- Si la touche est `f` ou `F` (insensible à la casse)
- Et que le focus n'est pas dans un champ de saisie (`input`, `textarea`, `[contenteditable]`)
- Alors appeler la fonction de bascule plein écran existante

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key.toLowerCase() !== 'f') return;
    const target = e.target as HTMLElement;
    if (target.matches('input, textarea, [contenteditable="true"]')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();
    toggleFullscreen(); // fonction existante
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [toggleFullscreen]);
```

### Indication visuelle (optionnelle)
Ajouter un `title="Plein écran (F)"` sur le bouton plein écran existant pour signaler le raccourci à l'utilisateur.

### Résultat
- L'utilisateur appuie sur **F** n'importe où sur `/map` → bascule plein écran
- Ne s'active pas pendant la saisie dans un formulaire
- Aucun conflit avec les raccourcis navigateur (Ctrl+F, Cmd+F)
