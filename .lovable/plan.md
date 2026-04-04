

# Fix: Bouton "Ajouter la parcelle au cadastre numerique" n'ouvre pas le formulaire CCC

## Probleme

Le bouton dispatch un evenement `open-ccc-dialog` (ligne 1425 de `LandTitleRequestDialog.tsx`), mais aucun composant n'ecoute cet evenement. Le formulaire CCC ne s'ouvre donc jamais.

## Solution

Ajouter un `useEffect` dans `CadastralSearchBar.tsx` qui ecoute l'evenement `open-ccc-dialog`, recupere le `parcelNumber` depuis `event.detail`, met a jour `searchQuery` avec ce numero, puis ouvre directement le dialogue CCC (`setShowContributionDialog(true)`).

### Detail technique

**Fichier** : `src/components/cadastral/CadastralSearchBar.tsx`

- Ajouter un listener `open-ccc-dialog` a cote du listener existant `open-cadastral-results-dialog` (ligne 77-86)
- Le handler :
  1. Recupere `event.detail.parcelNumber`
  2. Set `searchQuery` avec ce numero (pour que `CadastralContributionDialog` recoive le bon `parcelNumber`)
  3. Set `setShowContributionDialog(true)` pour ouvrir le formulaire CCC directement (sans passer par l'intro dialog)

~8 lignes ajoutees dans un seul fichier.

### Fichier modifie
- `src/components/cadastral/CadastralSearchBar.tsx`

