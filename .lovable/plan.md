

# Fix: Le bouton "Ajouter la parcelle au cadastre numerique" n'ouvre pas le formulaire CCC

## Cause

`LandTitleRequestDialog` est rendu dans `CadastralMap.tsx`. Le bouton dispatch l'evenement `open-ccc-dialog`, mais le listener est dans `CadastralSearchBar.tsx` — qui n'est **pas monte** sur la page `CadastralMap`. L'evenement est donc emis dans le vide.

`CadastralMap.tsx` possede deja son propre `showContributionDialog` et son `CadastralContributionDialog` (lignes 1544-1556), mais aucun listener pour `open-ccc-dialog`.

## Solution

Ajouter un `useEffect` dans `CadastralMap.tsx` qui ecoute `open-ccc-dialog`, exactement comme celui deja present dans `CadastralSearchBar.tsx` :

1. Recuperer `parcelNumber` depuis `event.detail`
2. Mettre a jour `searchQuery` avec ce numero
3. Appeler `setShowContributionDialog(true)`

### Detail technique

```typescript
// Dans CadastralMap.tsx, ajouter un useEffect ~ligne 160
useEffect(() => {
  const handleOpenCCC = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail?.parcelNumber) {
      setSearchQuery(detail.parcelNumber);
    }
    setShowContributionDialog(true);
  };
  window.addEventListener('open-ccc-dialog', handleOpenCCC);
  return () => window.removeEventListener('open-ccc-dialog', handleOpenCCC);
}, []);
```

### Fichier modifie
- `src/pages/CadastralMap.tsx` — ajout d'un listener `open-ccc-dialog` (~6 lignes)

