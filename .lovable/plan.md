

# Fix — z-index de la facture test

## Problème

`CadastralInvoice.tsx` utilise `z-50` (équivalent à `z-index: 50`) sur son overlay, alors que le `CadastralResultsDialog` parent est à `z-[1500]`. La facture est donc invisible, cachée derrière le catalogue.

## Solution

**Fichier** : `src/components/cadastral/CadastralInvoice.tsx` (ligne 164)

Changer `z-50` en `z-[1700]` sur le `div` overlay pour que la facture s'affiche au-dessus de tous les autres éléments (Dialog à `z-[1600]`, catalogue à `z-[1500]`).

```tsx
// Avant
<div className="fixed inset-0 z-50 bg-black/80 ...">

// Après
<div className="fixed inset-0 z-[1700] bg-black/80 ...">
```

Un seul fichier modifié, une seule ligne.

