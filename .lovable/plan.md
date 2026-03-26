

# Ouvrir le catalogue de services directement sur la carte cadastrale

## Probleme

Le bouton "Plus de données" sur la fiche parcelle exécute `navigate('/services?search=...')`, ce qui quitte la carte cadastrale et charge une page séparée avec une nouvelle barre de recherche. L'utilisateur perd le contexte de la carte.

## Solution

Intégrer `useCadastralSearch` et `CadastralResultsDialog` directement dans `CadastralMap.tsx` pour ouvrir le catalogue en overlay sans quitter la carte.

## Changements techniques

### Fichier : `src/pages/CadastralMap.tsx`

1. **Importer** `useCadastralSearch` et `CadastralResultsDialog`
2. **Ajouter les états** : `showServiceCatalog` (boolean) et instancier le hook `useCadastralSearch`
3. **Remplacer** le `navigate('/services?search=...')` (L1363) par une fonction qui :
   - Appelle `searchParcel(selectedParcel.parcel_number)` via le hook
   - Ouvre `showServiceCatalog = true` une fois le résultat prêt
4. **Rendre** `<CadastralResultsDialog>` en bas du composant, avec `fromMap={false}` et `onClose` qui remet `showServiceCatalog = false`
5. **Connecter l'événement** `open-cadastral-results-dialog` au même mécanisme (pour les redirections depuis les formulaires d'action comme Taxes ou Litiges)

### Comportement attendu

- Clic sur "Plus de données" → recherche RPC → overlay du catalogue s'ouvre par-dessus la carte
- La carte reste visible en arrière-plan (fond semi-transparent du dialog)
- Fermeture du catalogue → retour direct à la carte avec la parcelle toujours sélectionnée
- Les formulaires d'action (Taxes, Litiges) qui utilisent `open-cadastral-results-dialog` ouvrent aussi le catalogue en overlay

