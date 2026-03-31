

# Fix — Rapport cadastral invisible après paiement test

## Problemes identifies

### 1. z-index du Dialog de paiement (z-1200) inferieur a l'overlay parent (z-1500)

Le `CadastralPaymentDialog` utilise le composant `Dialog` de Radix qui rend via un **Portal** au niveau du `<body>`. Son overlay et contenu sont a `z-[1200]` (defini dans `src/components/ui/dialog.tsx`). Or, le `CadastralResultsDialog` parent est un `div fixed z-[1500]`.

Consequence : le dialog de paiement se retrouve DERRIERE l'overlay du catalogue. Selon le navigateur, cela peut bloquer les clics, rendre le dialog invisible, ou empecher le callback `onPaymentSuccess` de remonter correctement.

### 2. Le rapport ne s'affiche que si TOUS les services sont payes

Dans `CadastralResultCard.handlePaymentSuccess` (ligne 72) :
```
if (updatedServices.length >= catalogServiceIdsRef.current.length) {
  setShowBillingPanel(false);
}
```
Si l'utilisateur n'a achete que quelques services, `showBillingPanel` reste `true` et la fiche cadastrale n'apparait jamais. Le composant reste bloque sur le `CadastralBillingPanel`.

## Solution

### Fichier 1 : `src/components/ui/dialog.tsx`

Monter le z-index du `DialogOverlay` et `DialogContent` de `z-[1200]` a `z-[1600]` pour qu'ils apparaissent au-dessus du `CadastralResultsDialog` (z-1500).

### Fichier 2 : `src/components/cadastral/CadastralResultCard.tsx`

Modifier `handlePaymentSuccess` pour basculer vers la fiche cadastrale des qu'au moins un service est paye, meme si tous les services du catalogue n'ont pas ete achetes :

```tsx
const handlePaymentSuccess = (services: string[]) => {
  const updatedServices = [...new Set([...paidServices, ...services])];
  setPaidServices(updatedServices);
  setShowBillingPanel(false); // Toujours afficher la fiche apres paiement
  setShowInvoice(true);
  if (onPaymentSuccess) {
    onPaymentSuccess(updatedServices);
  }
};
```

L'utilisateur peut revenir au catalogue via le bouton "Catalogue" deja present dans la toolbar de `CadastralDocumentView`.

### Fichier 3 : `src/components/cadastral/CadastralResultsDialog.tsx`

Mettre a jour le header pour afficher "Fiche Cadastrale" au lieu de "Catalogue de services" quand le rapport est visible (conditionne par `paidServices.length > 0`).

## Fichiers modifies

| Fichier | Modification |
|---|---|
| `src/components/ui/dialog.tsx` | z-[1200] → z-[1600] overlay + content |
| `src/components/cadastral/CadastralResultCard.tsx` | Toujours basculer vers la fiche apres paiement |
| `src/components/cadastral/CadastralResultsDialog.tsx` | Header adaptatif (optionnel) |

